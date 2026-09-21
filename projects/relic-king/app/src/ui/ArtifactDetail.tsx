import { useState } from "react";
import type { Artifact, ImageLicense } from "../game/types";

/**
 * 실사 디테일 블록 (v0.4 — notes/decisions.md G73).
 *
 * `note`(2~3문장)와 나란히 두지 않고 **접힌 채로** 붙인다. 카드 뒤집기 연출의
 * 리듬을 지키면서 밀도를 올리는 방법이다(작업 지시 §3-4) — 드랍 연출
 * (`Overlays.tsx` RevealModal)은 이 컴포넌트를 쓰지 않는다.
 *
 * **디테일도 이미지도 없을 때는 출처 줄만 남는다.** 실사 이미지는 egress 정책이
 * 열리는 다음 세션에 수집되므로(scripts/fetch-images.mjs), 지금은 전부 0장이고
 * 그 상태에서 화면이 멀쩡해야 한다 — 이 컴포넌트의 모든 절이 독립적으로 옵셔널인
 * 이유다.
 */

const LICENSE_LABEL: Record<ImageLicense, string> = {
  pd: "퍼블릭 도메인",
  cc0: "CC0 1.0",
  "cc-by-4.0": "CC BY 4.0",
  "cc-by-3.0": "CC BY 3.0",
  "cc-by-2.5": "CC BY 2.5",
  "cc-by-2.0": "CC BY 2.0"
};

/** 번들 내 이미지 경로를 문서 기준 상대경로로 만든다. 런타임 외부 요청은 없다 */
function bundled(file: string): string {
  return `${import.meta.env.BASE_URL}${file}`;
}

export function ArtifactDetailBlock({ artifact }: { artifact: Artifact }) {
  const [open, setOpen] = useState(false);
  const { detail, image, source } = artifact;
  const hasBody = Boolean(detail || image);
  const hasUrlSources = source.some((s) => s.startsWith("http"));
  if (!hasBody && !hasUrlSources) return null;

  return (
    <div className="artifact-detail">
      <button type="button" className="detail-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "▾" : "▸"} {image ? "실물 사진과 상세" : hasBody ? "상세" : "출처"}
      </button>
      {open ? (
        <div className="detail-panel">
          {image ? (
            <figure className="real-photo">
              <img
                src={bundled(image.file)}
                width={image.width}
                height={image.height}
                alt={`${artifact.name} 실물 사진`}
                loading="lazy"
              />
              <figcaption>
                실제로는 이렇게 생겼다 · {LICENSE_LABEL[image.license]}
                {image.credit ? ` · ${image.credit}` : ""}{" "}
                <a href={image.sourceUrl} target="_blank" rel="noreferrer noopener">원본</a>
                {image.licenseUrl ? (
                  <>
                    {" "}
                    <a href={image.licenseUrl} target="_blank" rel="noreferrer noopener">라이선스</a>
                  </>
                ) : null}
              </figcaption>
            </figure>
          ) : null}

          {detail?.specs && detail.specs.length > 0 ? (
            <dl className="detail-specs">
              {detail.specs.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {detail?.story ? <p className="detail-story">{detail.story}</p> : null}
          {detail?.provenance ? (
            <p className="detail-provenance"><b>소장 경위</b> {detail.provenance}</p>
          ) : null}

          <p className="detail-sources">
            출처{" "}
            {source.map((s, i) => (
              <span key={s}>
                {i > 0 ? " · " : ""}
                {s.startsWith("http") ? (
                  <a href={s} target="_blank" rel="noreferrer noopener">{hostOf(s)}</a>
                ) : (
                  s
                )}
              </span>
            ))}
            {detail?.refs?.map((r) => (
              <span key={r}>
                {" · "}
                <a href={r} target="_blank" rel="noreferrer noopener">{hostOf(r)}</a>
              </span>
            ))}
          </p>

          {detail?.sourceStatus === "pending" ? (
            <p className="detail-pending">
              이 상세는 1차 자료 대조 전이다 — 이름·연대·소장처(위)는 검증된 값이고,
              이 블록의 계측값·경위만 검증 대기 상태다.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
