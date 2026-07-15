// UI orchestration: owns the Game instance, plays cascades back
// step-by-step (spec §12 legibility), routes keyboard input.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Game, type LockOutcome } from "../engine/run";
import { scoring } from "../engine/config";
import type { Grid, LinkResult } from "../engine/types";
import { loadSettings, saveSettings, type Settings } from "../engine/persist";
import { T } from "./strings";
import * as sfx from "./audio";

export interface Fx {
  /** grid snapshot to draw during playback (null = live game grid) */
  grid: Grid | null;
  clearing: Set<string>; // "r,c" cells flashing out this step
  link: number; // live chain counter value
  multiplier: number;
  popup: string | null; // "+1,240" style
  banner: string | null; // INSANE COMBO! / OVERDRIVE! / PERFECT CLEAR!
  shake: number; // 0..3 tiers
  flash: boolean; // full-board flash
  slowmo: boolean;
}

const IDLE_FX: Fx = {
  grid: null,
  clearing: new Set(),
  link: 0,
  multiplier: 0,
  popup: null,
  banner: null,
  shake: 0,
  flash: false,
  slowmo: false,
};

export function useGame() {
  const gameRef = useRef<Game | null>(null);
  if (!gameRef.current) gameRef.current = new Game();
  const game = gameRef.current;
  const [, setTick] = useState(0);
  const force = useCallback(() => setTick((t) => t + 1), []);
  const [fx, setFx] = useState<Fx>(IDLE_FX);
  const [busy, setBusy] = useState(false);
  const [settings, setSettingsState] = useState<Settings>(() => loadSettings());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    sfx.setSoundEnabled(settings.sound);
  }, [settings.sound]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
  }, []);

  const newRun = useCallback(
    (seed?: number) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      gameRef.current = new Game(seed);
      gameRef.current.startRun();
      setFx(IDLE_FX);
      setBusy(false);
      force();
    },
    [force],
  );

  const schedule = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const finishOutcome = useCallback(
    (out: LockOutcome) => {
      setBusy(false);
      setFx(IDLE_FX);
      if (out.gameOver) sfx.gameOverSting();
      else if (out.bossBroken) sfx.bossBreak();
      force();
    },
    [force],
  );

  /** step-by-step cascade playback (reduce-motion collapses to instant) */
  const playback = useCallback(
    (out: LockOutcome) => {
      const seq: LinkResult[] = [...out.links, ...out.autoLinks];
      sfx.lockThud();
      if (seq.length === 0 || settings.reduceMotion) {
        if (seq.length > 0) sfx.chainBlip(out.maxLink);
        if (out.perfectClear || out.overdriveTriggered) sfx.overdriveFanfare();
        if (out.insaneCombo) sfx.insaneCombo();
        finishOutcome(out);
        return;
      }
      setBusy(true);
      const maxLink = Math.max(...seq.map((l) => l.link));
      let t = 60;
      seq.forEach((l, i) => {
        const pre = i === 0 ? out.gridAfterDeposit : seq[i - 1].gridAfter;
        const isBiggest = l.link === maxLink && l.link >= 3;
        const stepDur = 300 + (isBiggest ? 120 : 0); // ~120ms dilation on the biggest link (§12)
        schedule(() => {
          sfx.chainBlip(l.link);
          setFx({
            grid: pre,
            clearing: new Set(l.cleared.map((c) => `${c.r},${c.c}`)),
            link: l.link,
            multiplier: l.multiplier,
            popup: T.scorePopup(l.score),
            banner: l.link >= scoring.juiceTierUpLink ? T.hugeChain : null,
            shake: Math.min(3, Math.floor(l.link / 2)),
            flash: false,
            slowmo: isBiggest,
          });
        }, t);
        t += stepDur;
        schedule(() => {
          setFx((f) => ({ ...f, grid: l.gridAfter, clearing: new Set(), slowmo: false }));
        }, t);
        t += 140;
      });
      schedule(() => {
        const banners: string[] = [];
        if (out.perfectClear) banners.push(T.perfectClearBanner);
        if (out.overdriveTriggered) banners.push(T.overdriveBanner);
        if (out.insaneCombo) banners.push(T.insaneCombo);
        if (out.newBest === "chain") banners.push(T.newBestChain);
        if (banners.length) {
          if (out.perfectClear || out.overdriveTriggered) sfx.overdriveFanfare();
          if (out.insaneCombo) sfx.insaneCombo();
          setFx((f) => ({
            ...f,
            banner: banners.join("  "),
            flash: out.perfectClear,
            popup: T.scorePopup(out.totalScore),
          }));
          schedule(() => finishOutcome(out), 900);
        } else {
          finishOutcome(out);
        }
      }, t);
    },
    [finishOutcome, schedule, settings.reduceMotion],
  );

  const drop = useCallback(() => {
    if (busy) return;
    const out = game.hardDrop();
    if (out) playback(out);
    force();
  }, [busy, game, playback, force]);

  const act = useMemo(
    () => ({
      left: () => {
        if (!busy && game.move(-1, 0)) force();
      },
      right: () => {
        if (!busy && game.move(1, 0)) force();
      },
      down: () => {
        if (!busy) {
          const dir = game.gravityUp() ? -1 : 1;
          if (game.move(0, dir)) force();
        }
      },
      rotateCw: () => {
        if (!busy && game.rotate(1)) force();
      },
      rotateCcw: () => {
        if (!busy && game.rotate(-1)) force();
      },
      rotate180: () => {
        if (!busy && game.rotate(2)) force();
      },
      hold: () => {
        if (!busy && game.holdPiece()) force();
      },
      drop,
    }),
    [busy, game, drop, force],
  );

  // DANGER heartbeat: tempo scales with fill (spec §8.7)
  useEffect(() => {
    if (game.phase !== "play" || game.danger < 0.15 || !settings.sound) return;
    const interval = Math.max(320, 1100 - game.danger * 900);
    const id = window.setInterval(() => sfx.heartbeat(), interval);
    return () => clearInterval(id);
  });

  return { game, fx, busy, act, newRun, force, settings, setSettings };
}
