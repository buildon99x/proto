import { useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import { APPRAISE_FEE, BLIND_SELL_RATE, TIER_NAME, appraiseSeconds } from "../game/balance";
import { won } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import { Sprite } from "./Sprite";
import type { Tier } from "../game/types";
import type { Game } from "./useGame";

const AUTO_OPTIONS: { label: string; value: Tier | null }[] = [
  { label: "끄기", value: null },
  { label: "흔함", value: 0 },
  { label: "희귀 이하", value: 1 },
  { label: "진귀 이하", value: 2 }
];

export function VaultView({ game }: { game: Game }) {
  const { world } = game;
  const [selected, setSelected] = useState<number | null>(null);
  const picked = world.vault.find((v) => v.uid === selected);

  return (
    <div className="vault">
      <section className="card">
        <h3>
          미감정 <span className="muted">{world.pending.length} / 20</span>
        </h3>
        <p className="muted small">
          감정을 기다릴 것인가, 지금 {Math.round(BLIND_SELL_RATE * 100)}%에 털 것인가.
          감정에는 1점당 {appraiseSeconds(world.lab).toFixed(1)}초와 추정가의 2%가 든다.
        </p>
        {world.pending.length === 0 ? (
          <p className="empty">대기 중인 유물이 없다.</p>
        ) : (
          <>
            <ul className="pending-list">
              {world.pending.slice(0, 12).map((p) => {
                const fee = Math.round(p.estimate * APPRAISE_FEE);
                const stalled = world.funds < fee;
                return (
                <li key={p.uid}>
                  <span className="card-back">?</span>
                  <span className="pending-info">
                    <em className={stalled ? "stalled" : "muted"}>
                      {stalled ? `자금 부족 — 감정비 ${won(fee)} ₩ 필요` : `감정까지 ${p.remain.toFixed(1)}초`}
                    </em>
                    <span>추정 {won(p.estimate)} ₩</span>
                  </span>
                  <button type="button" className="ghost" onClick={() => game.blind(p.uid)}>
                    {won(Math.round(p.estimate * BLIND_SELL_RATE))} ₩에 팔기
                  </button>
                </li>
                );
              })}
            </ul>
            <button type="button" className="ghost wide" onClick={game.blindAll}>
              전부 미감정 매각
            </button>
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h3>소장고 <span className="muted">{world.vault.length}점</span></h3>
          <label className="auto-sell">
            자동 매각
            <select
              value={world.settings.autoSellBelow === null ? "off" : String(world.settings.autoSellBelow)}
              onChange={(e) =>
                game.setAutoSell(e.target.value === "off" ? null : (Number(e.target.value) as Tier))
              }
            >
              {AUTO_OPTIONS.map((o) => (
                <option key={o.label} value={o.value === null ? "off" : String(o.value)}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted small">
          팔면 자금이 늘고 <strong>순위는 떨어진다.</strong> 자산 점수는 소장 중인 유물의 평가액 합이다.
        </p>
        {world.vault.length === 0 ? (
          <p className="empty">아직 소장한 유물이 없다.</p>
        ) : (
          <div className="vault-grid">
            {world.vault.slice(-120).reverse().map((v) => {
              const a = ARTIFACT_BY_ID[v.artifactId];
              return (
                <button key={v.uid} type="button" onClick={() => setSelected(v.uid)} title={a.name}>
                  <Sprite artifact={a} size={44} />
                </button>
              );
            })}
          </div>
        )}
        {picked ? <Detail game={game} uid={picked.uid} value={picked.value} /> : null}
      </section>
    </div>
  );
}

function Detail({ game, uid, value }: { game: Game; uid: number; value: number }) {
  const item = game.world.vault.find((v) => v.uid === uid);
  if (!item) return null;
  const a = ARTIFACT_BY_ID[item.artifactId];
  return (
    <div className="detail">
      <Sprite artifact={a} size={72} />
      <div className="detail-body">
        <h4>
          {a.name}{" "}
          <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em>
        </h4>
        <p className="muted small">{a.era} · {a.origin} · 현 소장처 {a.holder}</p>
        <p className="note">{a.note}</p>
        {a.disputed ? <p className="disputed">반환 논쟁 — {a.disputed}</p> : null}
        <div className="detail-actions">
          <strong>{won(value)} ₩</strong>
          <button type="button" className="ghost" onClick={() => game.sell(item.uid)}>
            매각
          </button>
        </div>
      </div>
    </div>
  );
}
