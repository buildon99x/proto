import { ARTIFACT_BY_ID } from "../game/artifacts";
import { SITE_BY_ID, TIER_NAME } from "../game/balance";
import { clock, duration, josa, won } from "../game/format";
import { TIER_COLOR, TIER_GLOW } from "../render/palette";
import { Sprite } from "./Sprite";
import type { Game } from "./useGame";

/** 게임 안에서 유일하게 플레이어를 방해해도 되는 UI */
export function TipBanner({ game }: { game: Game }) {
  const tip = game.world.tip;
  if (!tip) return null;
  const a = ARTIFACT_BY_ID[tip.artifactId];
  const site = SITE_BY_ID[tip.site];
  const here = game.world.activeSite === tip.site && game.world.sites[tip.site].layer >= tip.layer;
  const reachable = game.world.sites[tip.site].unlocked && game.world.sites[tip.site].layer >= tip.layer;

  return (
    <div className={`tip${here ? " tip-here" : ""}`} role="alert">
      <span className="tip-mark">제보</span>
      <span className="tip-text">
        <strong>{site.name} {tip.layer}층</strong>에서 반응 — {a.name}{" "}
        <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em>
        {tip.rivals.length > 0 ? <em className="muted"> · 같은 제보를 받은 수집가 {tip.rivals.length}명</em> : null}
      </span>
      <span className="tip-clock">{clock(tip.remain)}</span>
      {here ? (
        <span className="tip-here-mark">발굴 중</span>
      ) : (
        <button type="button" disabled={!reachable} onClick={() => game.goTo(tip.site)}>
          {reachable ? "이 발굴지로 이동" : `${tip.layer}층까지 파야 한다`}
        </button>
      )}
    </div>
  );
}

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

export function OfflineModal({ game }: { game: Game }) {
  const o = game.offline;
  if (!o) return null;
  return (
    <div className="modal-back">
      <div className="modal">
        <h2>{duration(o.seconds)} 동안</h2>
        <ul className="offline-list">
          <li>유물 {o.drops}점 발굴</li>
          <li>자금 +{won(Math.max(0, game.world.funds - o.fundsBefore))} ₩</li>
          {o.lost.length === 0 ? (
            <li className="muted">잃은 유물 없음 — 자는 동안 국보·유일은 빼앗기지 않는다.</li>
          ) : (
            o.lost.map((l, i) => {
              const name = ARTIFACT_BY_ID[l.artifactId].name;
              return (
                <li key={i} className="lost-note">
                  {l.owner}{josa(l.owner, "이가")} '{name}'{josa(name, "을를")} 가져갔다.
                </li>
              );
            })
          )}
        </ul>
        <button type="button" onClick={game.dismissOffline}>확인</button>
      </div>
    </div>
  );
}

export function EndingBanner({ game }: { game: Game }) {
  if (!game.world.ended) return null;
  return (
    <div className="ending">
      도감을 채우고 자산 1위에 올랐다 — <strong>유물왕</strong>. 발굴은 계속된다.
    </div>
  );
}
