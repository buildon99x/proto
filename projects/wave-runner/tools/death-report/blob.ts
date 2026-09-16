/**
 * Blob 스토어에 닿는 공통부.
 *
 * 스토어는 **비공개**다. 공개 스토어는 URL 만 알면 누구나 받아 가고, 우리가 모으는
 * 것은 개인정보가 아니지만 남의 플레이 기록을 아무나 긁어갈 이유도 없다. 비공개는
 * 읽기마다 인증을 요구하므로 여기서 자격을 한곳에 모은다.
 *
 * 자격은 둘 중 하나다.
 *   - `BLOB_READ_WRITE_TOKEN` — `vercel env pull` 로 로컬 `.env` 에 받아 두는 값
 *   - `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID` — 연결된 프로젝트에서 자동으로 채워지는 값
 * 둘 다 없으면 개발 폴백(`.telemetry/`)만 쓸 수 있다.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
export const LOCAL_DIR = path.join(REPO_ROOT, ".telemetry");

/** 우리가 자격을 찾는 파일들. `vercel env pull` 의 기본 출력은 `.env.local` 이다 */
export const ENV_FILES = [".env.local", ".env"];

/**
 * `.env` · `.env.local` 을 읽어 비어 있는 환경변수만 채운다.
 *
 * `vercel env pull` 이 떨어뜨리는 파일을 그대로 쓰기 위한 최소 파서다. 따옴표와
 * `export` 접두사만 다루면 충분하고, 이미 설정된 값은 절대 덮어쓰지 않는다 —
 * 셸에서 준 토큰이 파일에 밀리면 디버깅이 불가능해진다.
 *
 * **줄 끝의 `\r` 을 반드시 떼야 한다.** Windows 에서 받은 파일은 CRLF 이고,
 * 정규식의 `.` 은 `\r` 을 먹으므로 토큰 끝에 제어문자가 붙은 채 인증에 쓰인다.
 * 그러면 "토큰이 만료됐다" 같은 엉뚱한 오류가 나고 원인을 찾을 길이 없다.
 */
export function loadEnvFiles(): void {
  for (const name of ENV_FILES) {
    const file = path.join(REPO_ROOT, name);
    if (!existsSync(file)) continue;
    for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(raw);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key]) continue;
      const value = rawValue.trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
      if (value) process.env[key] = value;
    }
  }
}

/**
 * 자격을 못 찾았을 때 **어디까지 됐는지** 알려주기 위한 조사.
 * 값은 절대 읽지 않는다 — 키 이름과 파일 존재 여부만 본다.
 */
export function diagnose(): string[] {
  const out: string[] = [];
  out.push(`레포 루트로 보는 곳: ${REPO_ROOT}`);

  const linked = existsSync(path.join(REPO_ROOT, ".vercel", "project.json"));
  out.push(linked ? "`.vercel/project.json` 있음 — 프로젝트가 연결돼 있다" : "`.vercel/` 없음 — `vercel link` 를 아직 안 했다");

  let found = false;
  for (const name of ENV_FILES) {
    const file = path.join(REPO_ROOT, name);
    if (!existsSync(file)) continue;
    found = true;
    const keys = readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((l) => /^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=/.exec(l)?.[1])
      .filter((k): k is string => Boolean(k));
    const blob = keys.filter((k) => k.startsWith("BLOB_") || k.startsWith("VERCEL_OIDC"));
    out.push(
      `${name} 있음 — 키 ${keys.length}개` +
        (blob.length > 0 ? `, 그중 ${blob.join(" · ")}` : ", **BLOB_/VERCEL_OIDC 키 없음**")
    );
  }
  if (!found) out.push(`${ENV_FILES.join(" · ")} 둘 다 없음 — \`vercel env pull\` 을 아직 안 했다`);
  return out;
}

export interface Credentials {
  kind: "token" | "oidc" | "none";
  /** SDK 호출에 그대로 펼쳐 넣는 옵션 */
  options: { token?: string; oidcToken?: string; storeId?: string };
  note: string;
}

export function credentials(): Credentials {
  loadEnvFiles();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    return { kind: "token", options: { token }, note: "BLOB_READ_WRITE_TOKEN" };
  }
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  const storeId = process.env.BLOB_STORE_ID;
  if (oidcToken && storeId) {
    return { kind: "oidc", options: { oidcToken, storeId }, note: `OIDC · 스토어 ${storeId}` };
  }
  return {
    kind: "none",
    options: {},
    note:
      "자격 없음 — `vercel env pull` 로 BLOB_READ_WRITE_TOKEN 을 받거나, " +
      "Vercel 프로젝트에 Blob 스토어를 연결해야 한다"
  };
}

/** 이벤트가 쌓이는 경로의 접두사. 지문까지 넣어야 다른 버전의 코스와 섞이지 않는다 */
export const prefixFor = (project = "wave-runner", fp?: string) =>
  `tele/${project}/${fp ? `${fp}/` : ""}`;
