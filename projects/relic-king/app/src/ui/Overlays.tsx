import { ARTIFACT_BY_ID } from "../game/artifacts";
import { TIER_NAME } from "../game/balance";
import { usd } from "../game/format";
import { TIER_COLOR, TIER_GLOW } from "../render/palette";
import { Sprite } from "./Sprite";
import type { Game } from "./useGame";

/**
 * 연출 모달. spec.md §9.2가 가른 두 사건을 각각 그린다.
 *
 * - `acquired` — **소유 확정①**. 유일(T4)이 손에 들어온 그 순간이고, 감정소
 *   레벨과 무관하게 재생된다(spec.md §3.3 "T4 유일" 행). 이때는 아직 감정 전이라
 *   **이름·내력·평가액을 말하지 않는다** — 그건 ③의 몫이다. 재미 정의 ①("세상에
 *   하나뿐인 것을 내가 가졌다")이 걸리는 지점이 바로 여기다.
 * - `appraised` — **지식 공개③**. 감정이 끝나 이름·내력·평가액이 열린다.
 */
export function RevealModal({ game }: { game: Game }) {
  if (!game.reveal) return null;
  const { phase } = game.reveal;
  const a = ARTIFACT_BY_ID[game.reveal.artifactId];
  const acquired = phase === "acquired";
  return (
    <div className="modal-back" onClick={game.dismissReveal}>
      <div
        className={`modal reveal tier-${a.tier}${acquired ? " reveal-acquired" : ""}`}
        style={{ boxShadow: `0 0 60px ${TIER_GLOW[a.tier]}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {a.tier === 4 ? <p className="unique-badge">세계에 단 하나</p> : null}
        <Sprite artifact={a} size={128} />
        {acquired ? (
          <>
            <h2>손에 들어왔다</h2>
            <p className="tier-line" style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]} · 소유 확정</p>
            <p className="muted small">
              세계 재고를 통째로 가져왔다 — 이제 누구도 이 유물을 가질 수 없다.
            </p>
            <p className="note">이름과 내력은 감정이 끝나면 공개된다.</p>
          </>
        ) : (
          <>
            <h2>{a.name}</h2>
            <p className="tier-line" style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]} · {usd(game.reveal.value)}</p>
            <p className="muted small">{a.era} · {a.origin} · 현 소장처 {a.holder}</p>
            <p className="note">{a.note}</p>
            {a.disputed ? <p className="disputed">반환 논쟁 — {a.disputed}</p> : null}
          </>
        )}
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
