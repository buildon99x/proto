import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

/**
 * 프로토타입의 런 결말 수집.
 *
 * 하는 일은 넷뿐이다 — 크기 확인, 스키마 검증, 프로젝트 허용 목록 대조, Blob 에 쓰기.
 * 클라이언트가 응답에서 얻을 것이 없으므로 본문 없이 204 로 끝낸다.
 *
 * **상한이 위생이 아니라 데이터를 지키는 장치다.** Hobby 의 Blob 한도를 넘기면
 * 스토어 접근이 30일 막히고, 그동안 이미 모은 것을 내보내는 것도 막힌다. 그래서
 * 폭주하는 재시도 루프 하나가 지금까지의 수집을 통째로 잠글 수 있다.
 *
 * 설계 근거: projects/wave-runner/notes/telemetry/death-log.md
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 본문 상한. 이벤트 50건이 10KB 남짓이라 세 배의 여유다 */
const MAX_BYTES = 32 * 1024;
const MAX_EVENTS = 50;
/** 설치 id 하나가 분당 보낼 수 있는 요청 수 */
const RATE_LIMIT = 6;
const RATE_WINDOW_MS = 60_000;

/**
 * 검증 규칙은 `projects/wave-runner/tests/verify/telemetry.ts` 가 거울로 들고 있다.
 * 한쪽을 고치면 다른 쪽도 고쳐야 한다 — 그 검증기가 "클라이언트가 만드는 이벤트를
 * 서버가 그대로 통과시키는가"를 보는 유일한 장치다.
 */
const KINDS = new Set(["death", "clear", "abort"]);
const MODES = new Set(["stage", "endless"]);

/**
 * 이벤트에서 살려 둘 키. **모르는 키는 버린다** — 저장되는 것이 곧 나중에 분석기가
 * 읽는 것이므로, 스키마 밖의 값이 조용히 섞여 들어갈 자리를 남기지 않는다.
 */
const NUMERIC_KEYS = [
  "ts", "tier", "no", "seed", "att", "cap", "t",
  "pi", "x", "lx", "y", "gw", "gd", "dist", "sec",
  "hold", "fps", "prac", "dev", "hud", "mob"
] as const;
const STRING_KEYS = ["k", "mode", "pre", "lanes", "pid"] as const;

/**
 * 인스턴스 메모리 레이트 리미터. 서버리스라 인스턴스마다 따로 세지만, 막으려는 것은
 * 작정한 공격자가 아니라 폭주하는 재시도 루프다. 상태를 두려고 스토어를 하나 더
 * 붙이는 것이 이 규모에서는 비용이 더 크다.
 */
const hits = new Map<string, { n: number; resetAt: number }>();

function rateLimited(key: string, now: number): boolean {
  const seen = hits.get(key);
  if (!seen || now >= seen.resetAt) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { n: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  seen.n += 1;
  return seen.n > RATE_LIMIT;
}

function allowedProjects(): Set<string> {
  const raw = process.env.TELEMETRY_PROJECTS ?? "wave-runner";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

const shortText = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= max ? v : null;

/**
 * `lanes` 만은 빈 문자열이 정상이다 — **첫 게이트 전에 죽은 런**이 그렇고, 그것이
 * 신규 플레이어의 가장 흔한 사망이다. 여기를 비워 두지 않으면 가장 필요한 데이터가
 * 통째로 거부된다.
 */
const laneText = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.length <= max ? v : null;

/** 스키마 밖의 것을 떨어내고 정규화한다. 하나라도 어긋나면 null — 부분 저장은 하지 않는다 */
function normalizeEvent(raw: unknown): Record<string, number | string | number[]> | null {
  if (typeof raw !== "object" || raw === null) return null;
  const src = raw as Record<string, unknown>;

  const k = shortText(src.k, 8);
  const mode = shortText(src.mode, 8);
  if (!k || !KINDS.has(k) || !mode || !MODES.has(mode)) return null;

  const out: Record<string, number | string | number[]> = { k, mode };

  for (const key of STRING_KEYS) {
    if (key === "k" || key === "mode") continue;
    const v = src[key];
    if (v === undefined) continue;
    // lanes 는 게이트 수만큼 길어진다. Endless 라도 한 런에 수백 개를 넘지 않는다.
    const text = key === "lanes" ? laneText(v, 512) : shortText(v, 64);
    if (text === null) return null;
    out[key] = text;
  }

  for (const key of NUMERIC_KEYS) {
    const v = src[key];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    out[key] = v;
  }

  const bld = src.bld;
  if (bld !== undefined) {
    if (!Array.isArray(bld) || bld.length !== 3) return null;
    if (!bld.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    out.bld = bld as number[];
  }

  if (typeof out.ts !== "number") return null;
  return out;
}

const stamp = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/**
 * 저장. 배포에서는 Blob 이고, **토큰이 없는 개발에서는 로컬 파일**이다.
 *
 * 폴백을 두는 이유는 확인 가능성이다 — 스토어를 붙이기 전에는 성공 경로를 한 번도
 * 밟아 볼 수 없고, 그러면 "수집된다"를 배포해 봐야만 알게 된다. 프로덕션에서는
 * 절대 파일로 새지 않도록 두 조건(토큰 없음 + 프로덕션 아님)을 모두 요구한다.
 */
async function store(pathname: string, ndjson: string): Promise<void> {
  // OIDC 도 자격이다 — `vercel dev` 처럼 토큰 대신 OIDC 가 오는 환경에서 파일로 새면
  // "로컬에서는 되는데 배포하면 다르다"가 생긴다.
  const hasStore =
    Boolean(process.env.BLOB_READ_WRITE_TOKEN) ||
    (Boolean(process.env.VERCEL_OIDC_TOKEN) && Boolean(process.env.BLOB_STORE_ID));
  if (!hasStore && process.env.NODE_ENV !== "production") {
    // Blob 의 addRandomSuffix 와 같은 자리에 접미사를 넣는다 — 확장자가 살아 있어야
    // 같은 도구로 읽힌다.
    const suffix = Math.random().toString(36).slice(2, 8);
    const local = pathname.replace(/\.ndjson$/, `-${suffix}.ndjson`);
    const file = path.join(process.cwd(), "..", ".telemetry", local);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, ndjson, "utf8");
    return;
  }
  await put(pathname, ndjson, {
    access: "private",
    addRandomSuffix: true,
    contentType: "application/x-ndjson"
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ project: string }> }) {
  const { project } = await ctx.params;
  if (!allowedProjects().has(project)) {
    return new Response(null, { status: 404 });
  }

  const text = await req.text();
  // 바이트가 아니라 코드 단위지만, 상한의 목적은 정확한 계량이 아니라 폭주 차단이다.
  if (text.length > MAX_BYTES) {
    return new Response(null, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return new Response(null, { status: 400 });
  }

  const envelope = body as Record<string, unknown>;
  const fp = shortText(envelope.fp, 16);
  const iid = shortText(envelope.iid, 64);
  const sid = shortText(envelope.sid, 64);
  const events = envelope.events;

  // 지문은 경로가 되므로 문자 집합을 좁게 고정한다 — 경로 주입을 막는 가장 싼 방법이다.
  if (envelope.v !== 1 || !fp || !/^[0-9a-f]{1,16}$/.test(fp) || !iid || !sid) {
    return new Response(null, { status: 400 });
  }
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) {
    return new Response(null, { status: 400 });
  }

  if (rateLimited(`${project}:${iid}`, Date.now())) {
    return new Response(null, { status: 429 });
  }

  const rows: string[] = [];
  for (const raw of events) {
    const event = normalizeEvent(raw);
    if (!event) return new Response(null, { status: 400 });
    rows.push(JSON.stringify({ ...event, iid, sid, fp }));
  }

  const now = Date.now();
  const pathname = `tele/${project}/${fp}/${stamp(now)}/${now}.ndjson`;

  try {
    await store(pathname, `${rows.join("\n")}\n`);
  } catch (error) {
    // 토큰 미설정·스토어 정지·한도 초과. 클라이언트는 5xx 를 보고 큐에 남긴다.
    // 응답 본문에는 아무것도 싣지 않고 런타임 로그로만 남긴다 — 왜 503 인지 모르면
    // 한도 잠금과 설정 누락을 구분할 수 없다.
    console.error(`[telemetry] ${project} put 실패:`, error);
    return new Response(null, { status: 503 });
  }

  return new Response(null, { status: 204 });
}
