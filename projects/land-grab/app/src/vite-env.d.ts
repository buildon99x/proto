/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 온라인 세계 서버의 주소. 스킴까지 포함한다 (`https://...`).
   * 비우면 `net/endpoint.ts` 의 기본값을 쓴다.
   */
  readonly VITE_LAND_GRAB_SERVER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
