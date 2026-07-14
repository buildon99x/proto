// HUD (spec §10.2): progress vs target, boss banner + Break gauge,
// Overdrive meter, credits, advantages, previews, hold, run-bests.
import { scoring, stagesCfg, withinAct } from "../engine/config";
import { advantageById } from "../engine/advantages";
import { rotatedCells } from "../engine/grid";
import type { Game, QueuedPiece } from "../engine/run";
import { blockClass, blockGlyph } from "./Board";
import type { Block } from "../engine/types";

function qpBlock(q: QueuedPiece): Block {
  return {
    type: q.def.blockType,
    color:
      q.def.blockType === "obsidian" || q.def.blockType === "junk"
        ? -1
        : q.def.blockType === "prism"
          ? -2
          : q.color,
    group: q.def.group,
  };
}

export function PiecePreview({ q }: { q: QueuedPiece }) {
  const cells = rotatedCells(q.def.cells, 0);
  const maxC = Math.max(...cells.map(([c]) => c)) + 1;
  const maxR = Math.max(...cells.map(([, r]) => r)) + 1;
  const b = qpBlock(q);
  const set = new Set(cells.map(([c, r]) => `${r},${c}`));
  const out = [];
  for (let r = 0; r < maxR; r++)
    for (let c = 0; c < maxC; c++)
      out.push(
        <div
          key={`${r},${c}`}
          className={`pcell ${set.has(`${r},${c}`) ? blockClass(b) : "pcell-empty"}`}
        >
          {set.has(`${r},${c}`) ? blockGlyph(b) : ""}
        </div>,
      );
  return (
    <div className="preview" style={{ gridTemplateColumns: `repeat(${maxC}, 14px)` }}>
      {out}
    </div>
  );
}

export function Hud({ game, onBank }: { game: Game; onBank: () => void }) {
  const pct = Math.min(1, game.score / game.target);
  const boss = game.boss;
  const isActBoss = boss?.kind === "act";
  const pressing = game.targetHitThisStage && game.phase === "play";

  return (
    <aside className="hud">
      <div className="hud-block">
        <div className="stage-line">
          <strong>Act {game.act}</strong> · Stage {withinAct(game.stage)}/10
          <span className="stage-global"> (#{game.stage})</span>
        </div>
        {boss && (
          <div className={`boss-banner ${isActBoss ? "boss-act" : "boss-mini"}`}>
            <div className="boss-name">
              {isActBoss ? "⚔ ACT BOSS — " : "☠ "}
              {boss.name}
              {boss.phase === 2 && " · PHASE 2"}
            </div>
            <div className="boss-desc">{boss.desc}</div>
            {isActBoss && (
              <div className="break-gauge">
                <div className="break-fill" style={{ width: `${pct * 100}%` }} />
                <span className="break-label">BREAK {Math.floor(pct * 100)}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hud-block">
        <div className="score-line">
          <span className="score">{game.score.toLocaleString()}</span>
          <span className="target">/ {game.target.toLocaleString()}</span>
        </div>
        {!isActBoss && (
          <div className="progress">
            <div className="progress-fill" style={{ width: `${pct * 100}%` }} />
          </div>
        )}
        {pressing && (
          <div className="press-line">
            PRESSING · overkill +{game.overkillCredits()}c
            <button className="mini-btn" onClick={onBank}>
              Bank now
            </button>
          </div>
        )}
      </div>

      <div className="hud-block">
        <div className="meter-label">
          Overdrive{" "}
          {game.overdriveLeft > 0 && (
            <strong className="od-active">×2 ({game.overdriveLeft} left)</strong>
          )}
        </div>
        <div className="od-meter">
          <div
            className={`od-fill ${game.overdriveLeft > 0 ? "od-burning" : ""}`}
            style={{ width: `${(game.overdrive / scoring.overdrive.max) * 100}%` }}
          />
        </div>
        <div className="credits">💰 {game.credits} credits</div>
      </div>

      <div className="hud-block">
        <div className="meter-label">Next</div>
        {game.hidesPreview() ? (
          <div className="preview-hidden">?? hidden ??</div>
        ) : (
          <div className="previews">
            {game.queue.slice(0, game.mods.previews).map((q, i) => (
              <PiecePreview key={i} q={q} />
            ))}
          </div>
        )}
        {game.mods.hold && (
          <>
            <div className="meter-label">Hold (C)</div>
            {game.hold ? <PiecePreview q={game.hold} /> : <div className="preview-hidden">—</div>}
          </>
        )}
      </div>

      {game.advantages.length > 0 && (
        <div className="hud-block">
          <div className="meter-label">
            Advantages {game.advantages.length}/{stagesCfg.advantageSlots}
          </div>
          <ul className="adv-list">
            {game.advantages.map((id) => {
              const a = advantageById(id);
              return (
                <li key={id} title={a?.desc}>
                  {a?.name ?? id}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="hud-block bests">
        <div className="meter-label">Run bests</div>
        <div>chain {game.runBests.chain} · clear {game.runBests.clear.toLocaleString()}</div>
        <div>
          this run: chain {game.session.chain} · perfects {game.session.perfectClears}
        </div>
      </div>

      <div className="hud-block controls-hint">
        ←→↓ move · ↑/X cw · Z ccw · A 180° · Space drop
      </div>
    </aside>
  );
}
