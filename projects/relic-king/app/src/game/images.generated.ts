/**
 * **자동 생성 파일 — 직접 고치지 마세요.**
 *
 *   node scripts/fetch-images.mjs --plan     # 후보 조회(네트워크 필요)
 *   node scripts/fetch-images.mjs --apply    # 검수된 후보를 내려받아 이 파일을 만든다
 *
 * 실사 이미지 메타데이터(v0.4 — notes/decisions.md G72). 이미지 파일은
 * `app/public/artifacts/`에 들어가 번들에 그대로 복사되고, 런타임은 외부 요청을
 * 하지 않는다.
 *
 * **지금은 0장이다.** 이 환경은 egress 프록시에서 `*.wikimedia.org`가 막혀 있어
 * 수집을 돌릴 수 없다(scripts/README.md "실사 이미지 수집" 참조). 0장 상태에서도
 * 빌드·스모크·화면이 멀쩡해야 한다는 게 이 파일이 비어 있는 채로 커밋되는 이유다.
 */
import type { ArtifactImage } from "./types";

export const ARTIFACT_IMAGES: Record<string, ArtifactImage> = {};

/** 수집 실행 기록. `generatedAt`이 null이면 한 번도 돌지 않았다는 뜻이다 */
export const IMAGE_MANIFEST: {
  generatedAt: string | null;
  source: string;
  count: number;
  bytes: number;
} = {
  generatedAt: null,
  source: "wikimedia-commons",
  count: 0,
  bytes: 0
};
