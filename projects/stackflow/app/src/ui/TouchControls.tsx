// On-screen touch controls for mobile (spec §11: keyboard-only → tappable).
// Turn-based game, no game loop, so one tap == one discrete action is enough.
// Wired straight to the `act` seam from useGame; every act.* handler already
// guards against `busy` internally, so buttons need no extra gating for logic —
// the dimming below is cosmetic feedback only.
import type { PointerEvent as ReactPointerEvent } from "react";
import type { useGame } from "./useGame";
import { T } from "./strings";

type Act = ReturnType<typeof useGame>["act"];

export function TouchControls({
  act,
  showHold,
  busy,
}: {
  act: Act;
  showHold: boolean; // game.mods.hold
  busy: boolean;
}) {
  // Fire on pointerdown (no ~300ms tap delay; unifies touch/mouse/pen) and
  // preventDefault to suppress the synthetic click, text selection, double-tap
  // zoom, and focus-stealing (so a later Space/Enter can't re-fire the button).
  const press = (fn: () => void) => (e: ReactPointerEvent) => {
    e.preventDefault();
    fn();
  };

  return (
    <div
      className="touch-controls"
      role="group"
      aria-label={T.controlsAria}
      data-busy={busy}
    >
      <div className="tc-cluster tc-move">
        <button className="tc-btn" aria-label={T.aria.left} onPointerDown={press(act.left)}>
          ◀
        </button>
        <button className="tc-btn" aria-label={T.aria.down} onPointerDown={press(act.down)}>
          ▼
        </button>
        <button className="tc-btn" aria-label={T.aria.right} onPointerDown={press(act.right)}>
          ▶
        </button>
      </div>

      <div className="tc-cluster tc-rotate">
        <button
          className="tc-btn"
          aria-label={T.aria.rotateCcw}
          onPointerDown={press(act.rotateCcw)}
        >
          ↺
        </button>
        <button
          className="tc-btn"
          aria-label={T.aria.rotate180}
          onPointerDown={press(act.rotate180)}
        >
          ⤾
        </button>
        <button
          className="tc-btn"
          aria-label={T.aria.rotateCw}
          onPointerDown={press(act.rotateCw)}
        >
          ↻
        </button>
      </div>

      <div className="tc-cluster tc-action">
        {showHold && (
          <button
            className="tc-btn tc-hold"
            aria-label={T.aria.hold}
            onPointerDown={press(act.hold)}
          >
            {T.holdBtn}
          </button>
        )}
        <button className="tc-btn tc-drop" aria-label={T.aria.drop} onPointerDown={press(act.drop)}>
          {T.dropBtn}
        </button>
      </div>
    </div>
  );
}
