// HUD (spec §10.2): progress vs target, boss banner + Break gauge,
// Overdrive meter, credits, advantages, previews, hold, run-bests.
// Korean UI with per-item tooltips (spec §10).
import { scoring, stagesCfg, withinAct } from "../engine/config";
import { advantageById } from "../engine/advantages";
import { rotatedCells } from "../engine/grid";
import type { Game, QueuedPiece } from "../engine/run";
import { blockClass, blockGlyph } from "./Board";
import { T, TIP } from "./strings";
import type { Block } from "../engine/types";

function qpBlock(q: QueuedPiece, i: number): Block {
  return {
    type: q.def.blockType,
    color:
      q.def.blockType === "obsidian" || q.def.blockType === "junk"
        ? -1
        : q.def.blockType === "prism"
          ? -2
          : (q.colors[i] ?? q.colors[0] ?? 0),
    group: q.def.group,
  };
}

export function PiecePreview({ q }: { q: QueuedPiece }) {
  const cells = rotatedCells(q.def.cells, 0);
  const maxC = Math.max(...cells.map(([c]) => c)) + 1;
  const maxR = Math.max(...cells.map(([, r]) => r)) + 1;
  const byPos = new Map<string, Block>();
  cells.forEach(([c, r], i) => byPos.set(`${r},${c}`, qpBlock(q, i)));
  const out = [];
  for (let r = 0; r < maxR; r++)
    for (let c = 0; c < maxC; c++) {
      const b = byPos.get(`${r},${c}`);
      out.push(
        <div key={`${r},${c}`} className={`pcell ${b ? blockClass(b) : "pcell-empty"}`}>
          {b ? blockGlyph(b) : ""}
        </div>,
      );
    }
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
        <div className="stage-line" data-tip={TIP.stage} tabIndex={0}>
          <strong>{T.actLabel(game.act)}</strong> · {T.stageWithin(withinAct(game.stage))}
          <span className="stage-global"> {T.globalStage(game.stage)}</span>
        </div>
        {boss && (
          <div className={`boss-banner ${isActBoss ? "boss-act" : "boss-mini"}`} data-tip={boss.desc} tabIndex={0}>
            <div className="boss-name">
              {isActBoss ? T.actBossPrefix : T.miniBossPrefix}
              {boss.name}
              {boss.phase === 2 && T.phase2}
            </div>
            <div className="boss-desc">{boss.desc}</div>
            {isActBoss && (
              <div className="break-gauge" data-tip={TIP.breakGauge} tabIndex={0}>
                <div className="break-fill" style={{ width: `${pct * 100}%` }} />
                <span className="break-label">{T.breakGauge(Math.floor(pct * 100))}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="hud-block">
        <div className="score-line" data-tip={TIP.score} tabIndex={0}>
          <span className="score">{T.score(game.score)}</span>
          <span className="target">{T.target(game.target)}</span>
        </div>
        {!isActBoss && (
          <div className="progress" data-tip={TIP.progress}>
            <div className="progress-fill" style={{ width: `${pct * 100}%` }} />
          </div>
        )}
        {pressing && (
          <div className="press-line">
            {T.pressing(game.overkillCredits())}
            <button className="mini-btn" data-tip={TIP.bank} onClick={onBank}>
              {T.bankNow}
            </button>
          </div>
        )}
      </div>

      <div className="hud-block">
        <div className="meter-label" data-tip={TIP.overdrive} tabIndex={0}>
          {T.overdrive}{" "}
          {game.overdriveLeft > 0 && (
            <strong className="od-active">{T.overdriveActive(game.overdriveLeft)}</strong>
          )}
        </div>
        <div className="od-meter" data-tip={TIP.overdrive}>
          <div
            className={`od-fill ${game.overdriveLeft > 0 ? "od-burning" : ""}`}
            style={{ width: `${(game.overdrive / scoring.overdrive.max) * 100}%` }}
          />
        </div>
        <div className="credits" data-tip={TIP.credits} tabIndex={0}>{T.creditsLine(game.credits)}</div>
      </div>

      <div className="hud-block">
        <div className="meter-label" data-tip={TIP.next} tabIndex={0}>{T.next}</div>
        {game.hidesPreview() ? (
          <div className="preview-hidden">{T.hidden}</div>
        ) : (
          <div className="previews">
            {game.queue.slice(0, game.mods.previews).map((q, i) => (
              <PiecePreview key={i} q={q} />
            ))}
          </div>
        )}
        {game.mods.hold && (
          <>
            <div className="meter-label" data-tip={TIP.hold} tabIndex={0}>{T.holdSlot}</div>
            {game.hold ? <PiecePreview q={game.hold} /> : <div className="preview-hidden">{T.dash}</div>}
          </>
        )}
      </div>

      {game.advantages.length > 0 && (
        <div className="hud-block">
          <div className="meter-label" data-tip={TIP.advantages} tabIndex={0}>
            {T.advantages(game.advantages.length, stagesCfg.advantageSlots)}
          </div>
          <ul className="adv-list">
            {game.advantages.map((id) => {
              const a = advantageById(id);
              return (
                <li key={id} data-tip={a?.desc} tabIndex={0}>
                  {a?.name ?? id}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="hud-block bests">
        <div className="meter-label" data-tip={TIP.bests} tabIndex={0}>{T.runBests}</div>
        <div>{T.bestsLine(game.runBests.chain, game.runBests.clear)}</div>
        <div>{T.thisRun(game.session.chain, game.session.perfectClears)}</div>
      </div>

      <div className="hud-block controls-hint" data-tip={TIP.controls} tabIndex={0}>
        {T.controlsHint}
      </div>
    </aside>
  );
}
