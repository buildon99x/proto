import { spriteUrl } from "../render/sprite";
import { TIER_COLOR } from "../render/palette";
import type { Artifact, CodexState } from "../game/types";

const TIER_BADGE = ["·", "◆", "◈", "★", "✦"];

/**
 * v0.2 5종 CodexState(spec.md §13.3)를 받는다. "known"(테두리·배지 표시 대상)은
 * owned·owned_unidentified 둘 다다 — 이름을 아는지와 무관하게 "지금 갖고 있다"가
 * 기준이다(§13.3). unseen·discovered_not_owned·lost는 실루엣/회색 처리로 같은
 * 계열(정보 없음 또는 더는 가질 수 없음)로 묶는다.
 */
export function Sprite({ artifact, size = 48, state = "owned" }: {
  artifact: Artifact;
  size?: number;
  state?: CodexState;
}) {
  const url = spriteUrl(artifact);
  const known = state === "owned" || state === "owned_unidentified";
  const filter =
    state === "unseen" || state === "discovered_not_owned" ? "brightness(0) saturate(0) opacity(0.55)"
    : state === "lost" ? "grayscale(1) brightness(0.65)"
    : "none";
  return (
    <span
      className={`sprite sprite-${state}`}
      style={{
        width: size,
        height: size,
        borderColor: known ? TIER_COLOR[artifact.tier] : "#3a352e",
        borderWidth: known ? Math.max(1, Math.round(artifact.tier / 2) + 1) : 1
      }}
    >
      {url ? <img src={url} width={size - 8} height={size - 8} alt="" style={{ filter }} /> : null}
      {known && artifact.tier >= 2 ? (
        <i className="sprite-badge" style={{ color: TIER_COLOR[artifact.tier] }}>
          {TIER_BADGE[artifact.tier]}
        </i>
      ) : null}
    </span>
  );
}
