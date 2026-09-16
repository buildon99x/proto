/**
 * 수집된 런 결말을 내려받아 NDJSON 한 덩어리로 만든다.
 *
 * SDK 로 직접 부른다 — `vercel` CLI 를 거치면 표 출력 형식과 플래그 이름에 기대게 되고,
 * 무엇보다 **1000개를 넘는 순간 조용히 잘린다.** 커서 페이지네이션이 필요하다.
 *
 *   pnpm exec tsx projects/wave-runner/tools/death-report/pull.ts [옵션]
 *     --fp <지문>      그 지문만 받는다 (권장)
 *     --project <id>   기본 wave-runner
 *     --out <파일>     기본 deaths.ndjson
 *     --local          배포본 대신 개발 폴백(.telemetry/) 에서 모은다
 *     --since <날짜>   YYYY-MM-DD 이후에 올라온 것만
 *
 * **지문이 다른 데이터는 절대 합산하지 않는다.** 0.5.5 에서 시드표가 통째로 갈렸듯
 * 코스는 버전마다 다른 코스이고, 섞으면 어긋난 티가 나지 않는다. 지문 없이 받았다면
 * 보고서가 가장 큰 지문만 쓰고 나머지는 세어서 알려 준다.
 */
import { get, list } from "@vercel/blob";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LOCAL_DIR, credentials, prefixFor } from "./blob";

const argv = process.argv.slice(2);
const flag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const has = (name: string) => argv.includes(`--${name}`);

const project = flag("project") ?? "wave-runner";
const fp = flag("fp");
const out = flag("out") ?? "deaths.ndjson";
const since = flag("since");

function collectLocal(): string[] {
  const root = path.join(LOCAL_DIR, prefixFor(project, fp));
  const files: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".ndjson")) files.push(full);
    }
  };
  walk(root);
  return files.sort();
}

async function main() {
  if (has("local")) {
    const files = collectLocal();
    if (files.length === 0) {
      console.error(`${path.join(LOCAL_DIR, prefixFor(project, fp))} 아래에 아무것도 없다.`);
      process.exit(1);
    }
    const body = files.map((f) => readFileSync(f, "utf8")).join("");
    writeFileSync(out, body);
    console.log(`${out} ← 로컬 ${files.length}개 · 이벤트 ${body.split("\n").filter(Boolean).length}건`);
    return;
  }

  const cred = credentials();
  if (cred.kind === "none") {
    console.error(cred.note);
    console.error("개발 중 쌓인 것을 보려면 --local 을 쓴다.");
    process.exit(1);
  }

  const prefix = prefixFor(project, fp);
  const cutoff = since ? new Date(`${since}T00:00:00Z`).getTime() : 0;

  // 목록은 1000개씩 끊겨 온다. 커서가 없어질 때까지 돈다.
  const blobs: Array<{ pathname: string; size: number }> = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const page = await list({ prefix, cursor, limit: 1000, ...cred.options });
    pages += 1;
    for (const b of page.blobs) {
      if (!b.pathname.endsWith(".ndjson")) continue;
      if (cutoff && new Date(b.uploadedAt).getTime() < cutoff) continue;
      blobs.push({ pathname: b.pathname, size: b.size });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  if (blobs.length === 0) {
    console.error(`접두사 '${prefix}' 에 해당하는 객체가 없다. (자격: ${cred.note})`);
    process.exit(1);
  }

  // 이름에 밀리초 타임스탬프가 들어 있어 이름순이 곧 시간순이다.
  blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));

  const chunks: string[] = [];
  let done = 0;
  for (const b of blobs) {
    // 비공개 스토어라 URL 을 그냥 받을 수 없다 — 인증을 거쳐 스트림으로 온다.
    // 목록에 있던 것이 사라졌을 수 있다(보관 정리·동시 삭제). null 이면 건너뛴다.
    const res = await get(b.pathname, { access: "private", ...cred.options });
    if (!res || res.statusCode !== 200) continue;
    chunks.push(await new Response(res.stream).text());
    done += 1;
    if (done % 50 === 0) process.stderr.write(`  ${done}/${blobs.length}\r`);
  }

  const body = chunks.join("");
  writeFileSync(out, body.endsWith("\n") || body === "" ? body : `${body}\n`);
  const events = body.split("\n").filter(Boolean).length;
  const bytes = blobs.reduce((a, b) => a + b.size, 0);
  console.log(
    `${out} ← 객체 ${done}개 · 이벤트 ${events}건 · ${(bytes / 1024).toFixed(0)}KB` +
      ` (접두사 ${prefix} · 목록 ${pages}쪽 · 자격 ${cred.note})`
  );
}

main().catch((error) => {
  console.error("실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
