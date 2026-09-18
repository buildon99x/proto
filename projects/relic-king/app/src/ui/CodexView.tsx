import { useState } from "react";
import { ARTIFACTS } from "../game/artifacts";
import { SEASON_LENGTH_WEEKS, SITES, TIER_NAME } from "../game/balance";
import { codexProgress } from "../game/engine";
import { duration, josa, percent } from "../game/format";
import { TIER_COLOR } from "../render/palette";
import { Sprite } from "./Sprite";
import type { Artifact } from "../game/types";
import type { Game } from "./useGame";

type SubTab = "codex" | "ledger";

/**
 * 도감 탭(notes/ux-v02.md §1.3·§1.6) — [도감][원장] 서브탭. 원장 서브탭이
 * v0.1 세계 탭의 "세계 원장"·"활동 기록" 두 섹션을 흡수한다(A12 대응표).
 */
export function CodexView({ game }: { game: Game }) {
  const [sub, setSub] = useState<SubTab>("codex");
  return (
    <div className="codex-wrap">
      <nav className="subtabs" role="tablist">
        <button type="button" className={sub === "codex" ? "active" : ""} onClick={() => setSub("codex")}>도감</button>
        <button type="button" className={sub === "ledger" ? "active" : ""} onClick={() => setSub("ledger")}>원장</button>
      </nav>
      {sub === "codex" ? <CodexGrid game={game} /> : <Ledger game={game} />}
    </div>
  );
}

function CodexGrid({ game }: { game: Game }) {
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
                  const title = state === "unseen" ? "미발견" : state === "owned_unidentified" ? "감정 중 — ???" : a.name;
                  return (
                    <button key={a.id} type="button" onClick={() => setPicked(a)} title={title}>
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

  const known = state === "owned" || state === "discovered_not_owned" || state === "lost";

  return (
    <div className="entry">
      <Sprite artifact={artifact} size={96} state={state} />
      <h4>
        {state === "unseen" ? "미발견 유물" : state === "owned_unidentified" ? "감정 중인 유물" : artifact.name}{" "}
        <em style={{ color: TIER_COLOR[artifact.tier] }}>{TIER_NAME[artifact.tier]}</em>
      </h4>
      {state === "owned_unidentified" ? (
        <p className="muted">소유는 확정됐지만 아직 감정 전이다. 감정이 끝나면 이름·내력·평가액이 공개된다.</p>
      ) : known ? (
        <>
          <p className="muted small">{artifact.era} · {artifact.origin}</p>
          <p className="muted small">현 소장처 {artifact.holder}</p>
          <p className="note">{artifact.note}</p>
          {artifact.disputed ? <p className="disputed">반환 논쟁 — {artifact.disputed}</p> : null}
          <p className="muted small">
            세계 재고 {entry.total === Infinity ? "무한" : `${entry.remaining} / ${entry.total}`}
          </p>
          {state === "discovered_not_owned" ? (
            <p className="muted small">현재는 소장 중이 아니다 — 다시 발굴하거나 얻어야 한다.</p>
          ) : null}
          {state === "lost" ? (
            <p className="lost-note">
              {ownerName ?? "다른 수집가"}{josa(ownerName ?? "다른 수집가", "이가")} 가졌다.
              세계에 남은 수량 0 — 더는 발굴로 얻을 수 없다.
            </p>
          ) : null}
        </>
      ) : (
        <p className="muted">
          {artifact.minLayer}층 이상에서 나온다. 세계 재고{" "}
          {entry.total === Infinity ? "무한" : `${entry.remaining} / ${entry.total}`}.
        </p>
      )}
    </div>
  );
}

function Ledger({ game }: { game: Game }) {
  const { world } = game;
  const uniques = ARTIFACTS.filter((a) => a.tier === 4);
  const daysLeft = Math.max(0, Math.ceil((world.seasonState.endsAt - world.t) / 86400));

  return (
    <div className="ledger-wrap">
      <section className="card season-card">
        <h3>시즌 {world.seasonState.season}</h3>
        <p className="muted small">
          {SEASON_LENGTH_WEEKS}주 시즌 · 종료까지 D-{daysLeft}. 종료 시점 종합 순위 1위가 그 시즌의 "유물왕"으로
          영구 기록된다.
        </p>
      </section>

      <section className="card">
        <h3>세계 원장 — 유일 유물</h3>
        <ul className="ledger-list">
          {uniques.map((a) => {
            const e = world.ledger[a.id];
            const owner = e.owners[0];
            const mine = owner === "player";
            return (
              <li key={a.id}>
                <span style={{ color: TIER_COLOR[4] }}>✦</span>
                <span className="ledger-name">{a.name}</span>
                <span className={`ledger-state ${owner ? (mine ? "mine" : "gone") : "open"}`}>
                  {owner === undefined
                    ? "세상에 남아 있음"
                    : mine
                      ? "내 소장"
                      : `${world.rivals.find((r) => r.id === owner)?.name ?? owner} 소장`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h3>활동 기록</h3>
        <ul className="log-list">
          {world.log.slice(0, 40).map((l, i) => (
            <li key={`${l.t}-${i}`} className={`log-${l.kind}`}>
              <em className="muted">{duration(l.t)}</em> {l.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
