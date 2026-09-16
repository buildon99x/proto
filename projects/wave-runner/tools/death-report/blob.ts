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

/**
 * `.env` · `.env.local` 을 읽어 비어 있는 환경변수만 채운다.
 *
 * `vercel env pull` 이 떨어뜨리는 파일을 그대로 쓰기 위한 최소 파서다. 따옴표와
 * `export` 접두사만 다루면 충분하고, 이미 설정된 값은 절대 덮어쓰지 않는다 —
 * 셸에서 준 토큰이 파일에 밀리면 디버깅이 불가능해진다.
 */
export function loadEnvFiles(): void {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(REPO_ROOT, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!m) continue;
      const [, key, rawValue] = m;
      if (process.env[key]) continue;
      const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
      if (value) process.env[key] = value;
    }
  }
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
