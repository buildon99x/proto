import { spriteUrl } from "../render/sprite";
import { TIER_COLOR } from "../render/palette";
import type { Artifact } from "../game/types";

const TIER_BADGE = ["·", "◆", "◈", "★", "✦"];

export function Sprite({ artifact, size = 48, state = "owned" }: {
  artifact: Artifact;
  size?: number;
  state?: "owned" | "unseen" | "lost";
}) {
  const url = spriteUrl(artifact);
  const filter =
    state === "unseen" ? "brightness(0) saturate(0) opacity(0.55)"
    : state === "lost" ? "grayscale(1) brightness(0.65)"
    : "none";
  return (
    <span
      className={`sprite sprite-${state}`}
      style={{
        width: size,
        height: size,
        borderColor: state === "owned" ? TIER_COLOR[artifact.tier] : "#3a352e",
        borderWidth: state === "owned" ? Math.max(1, Math.round(artifact.tier / 2) + 1) : 1
      }}
    >
      {url ? <img src={url} width={size - 8} height={size - 8} alt="" style={{ filter }} /> : null}
      {state === "owned" && artifact.tier >= 2 ? (
        <i className="sprite-badge" style={{ color: TIER_COLOR[artifact.tier] }}>
          {TIER_BADGE[artifact.tier]}
        </i>
      ) : null}
    </span>
  );
}
