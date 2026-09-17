import { useState } from "react";
import { ARTIFACTS } from "../game/artifacts";
import { SITES, TIER_NAME } from "../game/balance";
import { codexProgress } from "../game/engine";
import { josa, percent } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import { Sprite } from "./Sprite";
import type { Artifact } from "../game/types";
import type { Game } from "./useGame";

export function CodexView({ game }: { game: Game }) {
  const { world } = game;
  const [picked, setPicked] = useState<Artifact | null>(null);
  const progress = codexProgress(world);

  return (
    <div className="codex">
      <section className="card">
        <div className="card-head">
          <h3>도감</h3>
          <span className="muted">
            소장 {progress.owned} · 소실 {progress.lost} · 전체 {progress.total} ({percent(progress.owned / progress.total)})
          </span>
        </div>

        {SITES.map((site) => (
          <div key={site.id} className="codex-site">
            <h4>{site.name} <em className="muted">{site.anchor}</em></h4>
            <div className="codex-grid">
              {ARTIFACTS.filter((a) => a.site === site.id)
                .sort((a, b) => b.tier - a.tier)
                .map((a) => {
                  const state = world.codex[a.id];
                  return (
                    <button key={a.id} type="button" onClick={() => setPicked(a)} title={state === "unseen" ? "미발견" : a.name}>
                      <Sprite artifact={a} size={44} state={state} />
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
        <p className="disclaimer">평가액은 게임 내 가상 단위이며 실제 감정가가 아닙니다.</p>
      </section>

      <section className="card codex-detail">
        {picked ? <Entry artifact={picked} game={game} /> : <p className="empty">유물을 고르면 내력이 나온다.</p>}
      </section>
    </div>
  );
}

function Entry({ artifact, game }: { artifact: Artifact; game: Game }) {
  const state = game.world.codex[artifact.id];
  const entry = game.world.ledger[artifact.id];
  const owner = entry.owners.find((o) => o !== "player");
  const ownerName = game.world.rivals.find((r) => r.id === owner)?.name;

  return (
    <div className="entry">
      <Sprite artifact={artifact} size={96} state={state} />
      <h4>
        {state === "unseen" ? "미발견 유물" : artifact.name}{" "}
        <em style={{ color: TIER_COLOR[artifact.tier] }}>{TIER_NAME[artifact.tier]}</em>
      </h4>
      {state === "unseen" ? (
        <p className="muted">
          {artifact.minLayer}층 이상에서 나온다. 세계 재고{" "}
          {entry.total === Infinity ? "무한" : `${entry.remaining} / ${entry.total}`}.
        </p>
      ) : (
        <>
          <p className="muted small">{artifact.era} · {artifact.origin}</p>
          <p className="muted small">현 소장처 {artifact.holder}</p>
          <p className="note">{artifact.note}</p>
          {artifact.disputed ? <p className="disputed">반환 논쟁 — {artifact.disputed}</p> : null}
          <p className="muted small">
            세계 재고 {entry.total === Infinity ? "무한" : `${entry.remaining} / ${entry.total}`}
          </p>
          {state === "lost" ? (
            <p className="lost-note">
              {ownerName ?? "다른 수집가"}{josa(ownerName ?? "다른 수집가", "이가")} 가졌다.
              세계에 남은 수량 0 — 더는 발굴로 얻을 수 없다.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
