import { useMemo, useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import { APPRAISE_FEE, BLIND_SELL_RATE, TIER_NAME, appraiseSeconds } from "../game/balance";
import { won } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import { Sprite } from "./Sprite";
import type { Artifact, Tier } from "../game/types";
import type { Game } from "./useGame";

const AUTO_OPTIONS: { label: string; value: Tier | null }[] = [
  { label: "끄기", value: null },
  { label: "흔함", value: 0 },
  { label: "희귀 이하", value: 1 },
  { label: "진귀 이하", value: 2 }
];

type Stack = { artifact: Artifact; count: number; unit: number; total: number };

export function VaultView({ game }: { game: Game }) {
  const { world } = game;
  const [selected, setSelected] = useState<string | null>(null);

  /**
   * 소장고는 사본이 아니라 **유물 종류**로 묶는다.
   * 낱개로 늘어놓으면 새 유물이 들어올 때마다 격자 전체가 한 칸씩 밀려서,
   * 겨냥해 둔 버튼이 손가락 아래에서 다른 유물로 바뀐다. 묶어서 티어·이름 순으로
   * 고정하면 수량만 올라가고 자리는 그대로다.
   */
  const stacks = useMemo<Stack[]>(() => {
    const byId = new Map<string, Stack>();
    for (const item of world.vault) {
      const hit = byId.get(item.artifactId);
      if (hit) {
        hit.count += 1;
        hit.total += item.value;
      } else {
        byId.set(item.artifactId, {
          artifact: ARTIFACT_BY_ID[item.artifactId],
          count: 1,
          unit: item.value,
          total: item.value
        });
      }
    }
    return [...byId.values()].sort(
      (a, b) => b.artifact.tier - a.artifact.tier || a.artifact.name.localeCompare(b.artifact.name, "ko")
    );
  }, [world.vault]);

  const picked = stacks.find((s) => s.artifact.id === selected) ?? null;

  return (
    <div className="vault">
      <section className="card vault-pending">
        <h3>
          미감정 <span className="muted">{world.pending.length} / 20</span>
        </h3>
        <p className="muted small">
          감정을 기다릴 것인가, 지금 {Math.round(BLIND_SELL_RATE * 100)}%에 털 것인가.
          감정에는 1점당 {appraiseSeconds(world.lab).toFixed(1)}초와 추정가의 2%가 든다.
        </p>
        <div className="pending-body">
          {world.pending.length === 0 ? (
            <p className="empty">대기 중인 유물이 없다.</p>
          ) : (
            <ul className="pending-list">
              {world.pending.slice(0, 20).map((p) => {
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
                      {won(Math.round(p.estimate * BLIND_SELL_RATE))} ₩
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <button
          type="button"
          className="ghost wide"
          disabled={world.pending.length === 0}
          onClick={game.blindAll}
        >
          전부 미감정 매각
        </button>
      </section>

      <section className="card vault-main">
        <div className="card-head">
          <h3>
            소장고 <span className="muted">{world.vault.length}점 · {stacks.length}종</span>
          </h3>
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

        {stacks.length === 0 ? (
          <p className="empty">아직 소장한 유물이 없다.</p>
        ) : (
          <div className="vault-grid">
            {stacks.map((s) => (
              <button
                key={s.artifact.id}
                type="button"
                className={`stack${selected === s.artifact.id ? " picked" : ""}`}
                onClick={() => setSelected(s.artifact.id)}
                title={`${s.artifact.name} ×${s.count}`}
              >
                <Sprite artifact={s.artifact} size={44} />
                {s.count > 1 ? <i className="stack-count">{s.count}</i> : null}
              </button>
            ))}
          </div>
        )}

        {picked ? <Detail game={game} stack={picked} /> : null}
      </section>
    </div>
  );
}

function Detail({ game, stack }: { game: Game; stack: Stack }) {
  const a = stack.artifact;
  return (
    <div className="detail">
      <Sprite artifact={a} size={72} />
      <div className="detail-body">
        <h4>
          {a.name} {stack.count > 1 ? <span className="muted">×{stack.count}</span> : null}{" "}
          <em style={{ color: TIER_COLOR[a.tier] }}>{TIER_NAME[a.tier]}</em>
        </h4>
        <p className="muted small">{a.era} · {a.origin} · 현 소장처 {a.holder}</p>
        <p className="note">{a.note}</p>
        {a.disputed ? <p className="disputed">반환 논쟁 — {a.disputed}</p> : null}
        <div className="detail-actions">
          <strong>{won(stack.total)} ₩</strong>
          <button type="button" className="ghost" onClick={() => game.sell(a.id, 1)}>
            1점 매각 {won(stack.unit)} ₩
          </button>
          {stack.count > 1 ? (
            <button type="button" className="ghost" onClick={() => game.sell(a.id, stack.count)}>
              전부 매각
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
