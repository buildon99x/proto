import { useCallback, useEffect, useRef, useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import {
  advance, applyOffline, blindSell, blindSellAll, buyGear, buyLab, buyWorker, click,
  createWorld, sellTierAtMost, sellVaultItem, switchSite, unlockSite
} from "../game/engine";
import { clear, exportText, importText, load, save } from "../game/save";
import type { SiteId, Tier, World } from "../game/types";

export type Reveal = { artifactId: string; value: number };
export type OfflineSummary = {
  seconds: number;
  drops: number;
  lost: { artifactId: string; owner: string }[];
  fundsBefore: number;
};

const SAVE_INTERVAL = 10;
const UI_INTERVAL = 100;

export function useGame() {
  const worldRef = useRef<World | null>(null);
  const [, bump] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [offline, setOffline] = useState<OfflineSummary | null>(null);

  if (worldRef.current === null) {
    const loaded = load();
    const w = loaded ?? createWorld();
    worldRef.current = w;
    if (loaded) {
      const fundsBefore = w.funds;
      const result = applyOffline(w);
      if (result) {
        setOffline({
          seconds: result.seconds,
          drops: result.report.drops.length,
          lost: result.report.lost,
          fundsBefore
        });
      }
    }
  }

  const world = worldRef.current!;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let uiAcc = 0;
    let saveAcc = 0;
    const revealQueue: Reveal[] = [];

    const frame = (now: number) => {
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      const report = advance(world, dt, false, 0.25);

      for (const a of report.appraised) {
        if (a.tier >= 3) revealQueue.push({ artifactId: a.artifactId, value: a.value });
      }

      uiAcc += dt * 1000;
      saveAcc += dt;
      if (uiAcc >= UI_INTERVAL) {
        uiAcc = 0;
        world.lastTickAt = Date.now();
        bump((v) => v + 1);
        if (revealQueue.length > 0) {
          setReveal((cur) => cur ?? revealQueue.shift() ?? null);
        }
      }
      if (saveAcc >= SAVE_INTERVAL) {
        saveAcc = 0;
        save(world);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    const onHide = () => {
      world.lastTickAt = Date.now();
      save(world);
    };
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
    };
  }, [world]);

  const act = useCallback(
    (fn: (w: World) => unknown) => {
      fn(world);
      bump((v) => v + 1);
    },
    [world]
  );

  return {
    world,
    reveal,
    offline,
    dismissReveal: () => setReveal(null),
    dismissOffline: () => setOffline(null),
    dig: () => act(click),
    buyWorker: () => act(buyWorker),
    buyGear: () => act(buyGear),
    buyLab: () => act(buyLab),
    unlock: (site: SiteId) => act((w) => unlockSite(w, site)),
    goTo: (site: SiteId) => act((w) => switchSite(w, site)),
    sell: (uid: number) => act((w) => sellVaultItem(w, uid)),
    sellTier: (tier: Tier) => act((w) => sellTierAtMost(w, tier)),
    blind: (uid: number) => act((w) => blindSell(w, uid)),
    blindAll: () => act(blindSellAll),
    setAutoSell: (tier: Tier | null) =>
      act((w) => {
        w.settings.autoSellBelow = tier;
      }),
    exportSave: () => exportText(world),
    importSave: (text: string) => {
      const next = importText(text);
      worldRef.current = next;
      save(next);
      window.location.reload();
    },
    reset: () => {
      clear();
      window.location.reload();
    },
    artifact: (id: string) => ARTIFACT_BY_ID[id]
  };
}

export type Game = ReturnType<typeof useGame>;
