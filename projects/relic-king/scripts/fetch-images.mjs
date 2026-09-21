#!/usr/bin/env node
/**
 * 실사 이미지 수집 — 위키미디어 커먼즈 (v0.4, notes/decisions.md G72).
 *
 *   node scripts/fetch-images.mjs --plan            # 후보 조회 → candidates.json (네트워크 필요)
 *   node scripts/fetch-images.mjs --apply           # 검수된 후보를 내려받아 생성 파일을 만든다
 *   node scripts/fetch-images.mjs --apply --dry-run # 내려받지 않고 계획만 출력
 *
 * ── 왜 두 단계인가 ──────────────────────────────────────────────────────
 * 커먼즈 검색 결과를 그대로 게임 데이터로 승격하면 "금관"으로 검색해 엉뚱한 사진이
 * 들어올 수 있다. 이 게임은 실존이 전제라 그게 치명적이다. 그래서 `--plan`은
 * 후보를 파일로 떨어뜨리기만 하고, 사람이 보고 지운 다음 `--apply`가 그 파일만
 * 읽는다 — `scripts/build-artifacts.mjs`가 어휘표를 필터로 쓰는 것과 같은 구조다.
 *
 * ── 라이선스 게이트 ────────────────────────────────────────────────────
 * 허용: 퍼블릭 도메인 · CC0 · CC BY (2.0/2.5/3.0/4.0).
 * 거부: **CC BY-SA 등 전파조건이 붙은 것 전부**, NC·ND, 공정이용 근거 파일,
 *       라이선스를 판정할 수 없는 것. 근거는 notes/artifacts-dataset.md §6.
 * 거부는 조용히 넘기지 않고 이유와 함께 보고서에 남긴다.
 *
 * ── 런타임 외부 요청 금지 ──────────────────────────────────────────────
 * 내려받은 파일은 `app/public/artifacts/`에 들어가 번들에 그대로 복사된다.
 * 빌드된 산출물은 네트워크 없이 돈다(프로젝트 AGENTS.md 협상불가 항목).
 *
 * ── 이 환경에서는 못 돈다 ──────────────────────────────────────────────
 * egress 프록시가 `*.wikimedia.org`를 CONNECT 403으로 막는다. 허용 목록에
 * 아래 도메인이 들어가야 `--plan`이 돈다:
 *   commons.wikimedia.org · upload.wikimedia.org
 */
import { mkdir, readFile, writeFile, stat, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HINTS = path.join(ROOT, "data/commons-images.json");
const CANDIDATES = path.join(ROOT, "data/commons-images.candidates.json");
const IMAGE_DIR = path.join(ROOT, "app/public/artifacts");
const OUT_TS = path.join(ROOT, "app/src/game/images.generated.ts");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "relic-king-asset-pipeline/0.4 (prototype-lab; offline game asset collection)";

// ── 예산 ──────────────────────────────────────────────────────────────────
// launcher는 단일 Vercel 프로젝트로 나간다. 이미지 증가분 상한은 작업 지시 §3-3의
// 권고(5MB)보다 한 단계 아래로 잡았다 — 480px 썸네일이면 종당 30~60KB라
// T2 이상 186종을 다 채워도 이 안에 들어온다.
const THUMB_WIDTH = 480;
const MAX_FILE_BYTES = 96 * 1024;
const MAX_TOTAL_BYTES = 4.5 * 1024 * 1024;

const ALLOWED = new Map([
  ["pd", "pd"], ["publicdomain", "pd"], ["public domain", "pd"],
  ["cc-pd-mark", "pd"], ["cc pdm 1.0", "pd"], ["pd-old", "pd"], ["pd-art", "pd"],
  ["cc0", "cc0"], ["cc0 1.0", "cc0"],
  ["cc-by-4.0", "cc-by-4.0"], ["cc by 4.0", "cc-by-4.0"],
  ["cc-by-3.0", "cc-by-3.0"], ["cc by 3.0", "cc-by-3.0"],
  ["cc-by-2.5", "cc-by-2.5"], ["cc by 2.5", "cc-by-2.5"],
  ["cc-by-2.0", "cc-by-2.0"], ["cc by 2.0", "cc-by-2.0"]
]);
const LICENSE_URL = {
  pd: undefined,
  cc0: "https://creativecommons.org/publicdomain/zero/1.0/",
  "cc-by-4.0": "https://creativecommons.org/licenses/by/4.0/",
  "cc-by-3.0": "https://creativecommons.org/licenses/by/3.0/",
  "cc-by-2.5": "https://creativecommons.org/licenses/by/2.5/",
  "cc-by-2.0": "https://creativecommons.org/licenses/by/2.0/"
};
const SERVABLE = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const i = argv.indexOf(f);
  return i > -1 && argv[i + 1] ? argv[i + 1] : d;
};

const MIN_TIER = Number(val("--tier", "2"));
const LIMIT = Number(val("--limit", "0")) || Infinity;

function stripHtml(s) {
  return String(s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/** extmetadata → 허용 라이선스 식별자, 또는 거부 이유 */
function judgeLicense(meta) {
  const raw = [meta?.License?.value, meta?.LicenseShortName?.value, meta?.UsageTerms?.value]
    .map((v) => stripHtml(v).toLowerCase())
    .filter(Boolean);
  if (raw.length === 0) return { reject: "라이선스 필드 없음" };
  const joined = raw.join(" | ");
  if (/\bsa\b|share.?alike|by-sa/.test(joined)) return { reject: `전파조건(SA): ${joined}` };
  if (/\bnc\b|noncommercial|non-commercial/.test(joined)) return { reject: `비상업(NC): ${joined}` };
  if (/\bnd\b|noderiv/.test(joined)) return { reject: `변경금지(ND): ${joined}` };
  if (/fair use|fairuse/.test(joined)) return { reject: `공정이용 근거: ${joined}` };
  for (const r of raw) {
    const hit = ALLOWED.get(r);
    if (hit) return { license: hit };
    // "pd-old-100", "pd-art (pd-old-100)" 같은 변형
    if (/^pd[-\s]/.test(r) || /^public domain/.test(r)) return { license: "pd" };
  }
  return { reject: `허용 목록 밖: ${joined}` };
}

function creditOf(meta) {
  const artist = stripHtml(meta?.Artist?.value);
  const credit = stripHtml(meta?.Credit?.value);
  const attribution = stripHtml(meta?.Attribution?.value);
  return attribution || artist || credit || "위키미디어 커먼즈 기여자";
}

async function api(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", ...params })) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error(`commons api ${res.status} ${res.statusText}`);
  return res.json();
}

async function loadArtifacts() {
  // artifacts.ts는 TypeScript라 tsx로 실행해야 한다. 이 스크립트는 순수 node이므로
  // 자식 프로세스로 tsx를 띄워 필요한 필드만 JSON으로 받는다.
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const snippet = `
    import { ARTIFACTS } from "./app/src/game/artifacts";
    process.stdout.write(JSON.stringify(ARTIFACTS.map((a) => ({
      id: a.id, name: a.name, tier: a.tier, site: a.site, holder: a.holder, era: a.era
    }))));
  `;
  const tmp = path.join(ROOT, ".fetch-images-probe.ts");
  await writeFile(tmp, snippet);
  try {
    const { stdout } = await run("npx", ["tsx", tmp], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(stdout);
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

// ════════════════════════════════════════════════════════════════════════
// --plan
// ════════════════════════════════════════════════════════════════════════
async function plan() {
  const artifacts = (await loadArtifacts()).filter((a) => a.tier >= MIN_TIER);
  const hints = await readJson(HINTS, {});
  const targets = artifacts.slice(0, LIMIT === Infinity ? undefined : LIMIT);
  console.log(`후보 조회: T${MIN_TIER} 이상 ${targets.length}종 · 썸네일 ${THUMB_WIDTH}px`);

  const accepted = [];
  const rejected = [];
  for (const a of targets) {
    const hint = hints[a.id] ?? {};
    let pages = [];
    try {
      if (hint.file) {
        const r = await api({
          action: "query",
          titles: hint.file.startsWith("File:") ? hint.file : `File:${hint.file}`,
          prop: "imageinfo",
          iiprop: "url|size|mime|extmetadata",
          iiurlwidth: THUMB_WIDTH
        });
        pages = (r.query?.pages ?? []).filter((p) => !p.missing);
      } else {
        const query = hint.query || `${a.name} ${a.holder}`;
        const r = await api({
          action: "query",
          generator: "search",
          gsrsearch: query,
          gsrnamespace: 6,
          gsrlimit: 6,
          prop: "imageinfo",
          iiprop: "url|size|mime|extmetadata",
          iiurlwidth: THUMB_WIDTH
        });
        pages = r.query?.pages ?? [];
      }
    } catch (err) {
      rejected.push({ id: a.id, reason: `조회 실패: ${err.message}` });
      continue;
    }

    let picked = null;
    const tried = [];
    for (const p of pages) {
      const info = p.imageinfo?.[0];
      if (!info) continue;
      const ext = SERVABLE[info.mime];
      if (!ext) {
        tried.push(`${p.title}: 미지원 형식 ${info.mime}`);
        continue;
      }
      const verdict = judgeLicense(info.extmetadata);
      if (verdict.reject) {
        tried.push(`${p.title}: ${verdict.reject}`);
        continue;
      }
      picked = {
        id: a.id,
        name: a.name,
        tier: a.tier,
        site: a.site,
        commonsTitle: p.title,
        pageUrl: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title)}`,
        thumbUrl: info.thumburl ?? info.url,
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        ext,
        license: verdict.license,
        credit: creditOf(info.extmetadata),
        description: stripHtml(info.extmetadata?.ImageDescription?.value).slice(0, 400)
      };
      break;
    }
    if (picked) accepted.push(picked);
    else rejected.push({ id: a.id, name: a.name, reason: tried.length ? tried.join(" / ") : "결과 없음" });
    process.stdout.write(picked ? "." : "x");
  }
  process.stdout.write("\n");

  await writeFile(
    CANDIDATES,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        thumbWidth: THUMB_WIDTH,
        minTier: MIN_TIER,
        note:
          "사람이 검수한 뒤 --apply 가 이 파일만 읽는다. 엉뚱한 사진은 항목째로 지운다.",
        accepted,
        rejected
      },
      null,
      2
    ) + "\n"
  );
  console.log(`후보 ${accepted.length}종 / 탈락 ${rejected.length}종 → ${path.relative(ROOT, CANDIDATES)}`);
  console.log("검수한 뒤: node scripts/fetch-images.mjs --apply");
}

// ════════════════════════════════════════════════════════════════════════
// --apply
// ════════════════════════════════════════════════════════════════════════
async function apply() {
  const data = await readJson(CANDIDATES, null);
  if (!data) {
    console.error(`${path.relative(ROOT, CANDIDATES)} 가 없다. 먼저 --plan 을 돌려라.`);
    process.exit(1);
  }
  const dry = has("--dry-run");
  await mkdir(IMAGE_DIR, { recursive: true });

  const entries = [];
  let total = 0;
  const skipped = [];
  for (const c of data.accepted ?? []) {
    // 검수를 통과한 항목도 라이선스를 한 번 더 판정한다 — 손으로 고친 파일이
    // 게이트를 우회하지 못하게.
    if (!LICENSE_URL.hasOwnProperty(c.license)) {
      skipped.push(`${c.id}: 허용 목록 밖 라이선스(${c.license})`);
      continue;
    }
    if (!c.credit) {
      skipped.push(`${c.id}: 저작자 표기 없음`);
      continue;
    }
    const rel = `artifacts/${c.id}${c.ext}`;
    const dest = path.join(ROOT, "app/public", rel);
    if (dry) {
      console.log(`[dry] ${c.id} ← ${c.commonsTitle} (${c.license})`);
      entries.push({ ...c, file: rel, bytes: 0 });
      continue;
    }
    const res = await fetch(c.thumbUrl, { headers: { "user-agent": UA } });
    if (!res.ok) {
      skipped.push(`${c.id}: 내려받기 실패 ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_FILE_BYTES) {
      skipped.push(`${c.id}: 파일 상한 초과 ${(buf.length / 1024).toFixed(0)}KB > ${MAX_FILE_BYTES / 1024}KB`);
      continue;
    }
    if (total + buf.length > MAX_TOTAL_BYTES) {
      skipped.push(`${c.id}: 총 예산 ${(MAX_TOTAL_BYTES / 1024 / 1024).toFixed(1)}MB 초과 — 여기서 멈춘다`);
      break;
    }
    await writeFile(dest, buf);
    total += buf.length;
    entries.push({ ...c, file: rel, bytes: buf.length });
    process.stdout.write(".");
  }
  if (!dry) process.stdout.write("\n");

  const body = entries
    .map((e) => {
      const licenseUrl = LICENSE_URL[e.license];
      return `  ${JSON.stringify(e.id)}: {
    file: ${JSON.stringify(e.file)},
    width: ${e.width},
    height: ${e.height},
    bytes: ${e.bytes},
    license: ${JSON.stringify(e.license)},
    credit: ${JSON.stringify(e.credit)},
    sourceUrl: ${JSON.stringify(e.pageUrl)},${licenseUrl ? `\n    licenseUrl: ${JSON.stringify(licenseUrl)},` : ""}
    fetchedAt: ${JSON.stringify(new Date().toISOString())}
  }`;
    })
    .join(",\n");

  const header = `/**
 * **자동 생성 파일 — 직접 고치지 마세요.**
 *
 *   node scripts/fetch-images.mjs --plan     # 후보 조회(네트워크 필요)
 *   node scripts/fetch-images.mjs --apply    # 검수된 후보를 내려받아 이 파일을 만든다
 *
 * 실사 이미지 메타데이터(v0.4 — notes/decisions.md G72). 이미지 파일은
 * \`app/public/artifacts/\`에 들어가 번들에 그대로 복사되고, 런타임은 외부 요청을
 * 하지 않는다. 허용 라이선스는 퍼블릭 도메인 · CC0 · CC BY 뿐이다
 * (notes/artifacts-dataset.md §6).
 */
import type { ArtifactImage } from "./types";

export const ARTIFACT_IMAGES: Record<string, ArtifactImage> = {
${body}
};

/** 수집 실행 기록. \`generatedAt\`이 null이면 한 번도 돌지 않았다는 뜻이다 */
export const IMAGE_MANIFEST: {
  generatedAt: string | null;
  source: string;
  count: number;
  bytes: number;
} = {
  generatedAt: ${JSON.stringify(new Date().toISOString())},
  source: "wikimedia-commons",
  count: ${entries.length},
  bytes: ${total}
};
`;
  if (dry) {
    console.log(`[dry] ${entries.length}종 · ${OUT_TS} 를 쓰지 않았다`);
  } else {
    await writeFile(OUT_TS, header);
    console.log(`이미지 ${entries.length}종 · ${(total / 1024 / 1024).toFixed(2)}MB → ${path.relative(ROOT, IMAGE_DIR)}`);
    console.log(`메타데이터 → ${path.relative(ROOT, OUT_TS)}`);
  }
  if (skipped.length > 0) {
    console.log(`\n건너뜀 ${skipped.length}종:`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
  console.log("\n다음: pnpm --filter relic-king qa:artifacts && pnpm --filter relic-king build");
}

async function main() {
  if (has("--plan")) return plan();
  if (has("--apply")) return apply();
  const dir = await readdir(IMAGE_DIR).catch(() => []);
  const bytes = (
    await Promise.all(dir.map(async (f) => (await stat(path.join(IMAGE_DIR, f))).size))
  ).reduce((a, b) => a + b, 0);
  console.log(`실사 이미지 수집 (위키미디어 커먼즈)

현재 상태: ${dir.length}장 · ${(bytes / 1024).toFixed(0)}KB  (${path.relative(ROOT, IMAGE_DIR)})

  --plan [--tier 2] [--limit N]   후보 조회 → data/commons-images.candidates.json
  --apply [--dry-run]             검수된 후보를 내려받아 images.generated.ts 생성

필요한 egress 허용 도메인:
  commons.wikimedia.org
  upload.wikimedia.org

허용 라이선스: 퍼블릭 도메인 · CC0 · CC BY (2.0/2.5/3.0/4.0)
거부: CC BY-SA 등 전파조건 · NC · ND · 공정이용 · 판정 불가
예산: 파일당 ${MAX_FILE_BYTES / 1024}KB · 합계 ${(MAX_TOTAL_BYTES / 1024 / 1024).toFixed(1)}MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
