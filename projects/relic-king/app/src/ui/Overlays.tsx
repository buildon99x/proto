import { ARTIFACT_BY_ID } from "../game/artifacts";
import { TIER_NAME } from "../game/balance";
import { won } from "../game/format";
import { TIER_COLOR, TIER_GLOW } from "../render/palette";
import { Sprite } from "./Sprite";
import type { Game } from "./useGame";

export function RevealModal({ game }: { game: Game }) {
  if (!game.reveal) return null;
  const a = ARTIFACT_BY_ID[game.reveal.artifactId];
  return (
    <div className="modal-back" onClick={game.dismissReveal}>
      <div className={`modal reveal tier-${a.tier}`} style={{ boxShadow: `0 0 60px ${TIER_GLOW[a.tier]}` }} onClick={(e) => e.stopPropagation()}>
        {a.tier === 4 ? <p className="unique-badge">세계에 단 하나</p> : null}
        <Sprite artifact={a} size={128} />
        <h2>{a.name}</h2>
        <p className="tier-line" style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]} · {won(game.reveal.value)} ₩</p>
        <p className="muted small">{a.era} · {a.origin} · 현 소장처 {a.holder}</p>
        <p className="note">{a.note}</p>
        {a.disputed ? <p className="disputed">반환 논쟁 — {a.disputed}</p> : null}
        <button type="button" onClick={game.dismissReveal}>확인</button>
      </div>
    </div>
  );
}

export function EndingBanner({ game }: { game: Game }) {
  if (!game.world.ended) return null;
  return (
    <div className="ending">
      도감을 채우고 종합 순위 1위에 올랐다 — <strong>유물왕</strong>. 발굴은 계속된다.
    </div>
  );
}
