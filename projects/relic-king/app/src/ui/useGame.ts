import { useCallback, useEffect, useRef, useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import {
  advance, applyOffline, blindSell, blindSellAll, buyBlackMarketListing, buyGear, buyHumidityLevel,
  buyLab, buyMuseumMarketing, buyRestorationLevel, buySecurityLevel, buyTeamGear, buyTeamWorker,
  buyVaultLevel, buyWorker, buildAuctionHouse, buildMuseum, click, createPersistentRecord, createTeam,
  createWorld, dispatchExpedition, displayArtifact, emergencyDispatch, focusDig, fullRanking,
  hireAuctioneer, hireCurator, hireForeman, listAtAuction, relocateBase, sellArtifactCopies,
  sellTierAtMost, setRoutine, switchSite, undisplayArtifact, unlockSite, unlockTeamSlot,
  upgradeAuctionGrade, upgradeMuseumGrade
} from "../game/engine";
import { clear, exportText, importText, load, save } from "../game/save";
import type { PersistentRecord, SiteId, Tier, World } from "../game/types";

export type Reveal = { artifactId: string; value: number };
export type RankSnapshot = { asset: number; codex: number; fame: number; composite: number };
export type OfflineSummary = {
  seconds: number;
  drops: number;
  lost: { artifactId: string; owner: string }[];
  fundsBefore: number;
  codexBefore: number;
  rankBefore: RankSnapshot;
  rankAfter: RankSnapshot;
};

function rankSnapshot(w: World, record: PersistentRecord): RankSnapshot {
  const rows = fullRanking(w, record);
  const place = (key: "asset" | "codex" | "fame" | "rank") =>
    [...rows].sort((a, b) => b[key] - a[key]).findIndex((r) => r.id === "player") + 1;
  return { asset: place("asset"), codex: place("codex"), fame: place("fame"), composite: place("rank") };
}

const SAVE_INTERVAL = 10;
const UI_INTERVAL = 100;
const ONBOARDING_SEEN_KEY = "relic-king/onboarding-seen-v1";

function readOnboardingSeen(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SEEN_KEY) === "1";
  } catch {
    return true; // localStorage 접근 불가 — 매번 뜨는 것보다 안전한 쪽으로
  }
}

function writeOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
  } catch {
    /* 사생활 모드 등 — 무시 */
  }
}

export function useGame() {
  const worldRef = useRef<World | null>(null);
  // 계정 영구 기록(spec.md §13.4) — 이번 단계는 시즌 롤오버 자동 발동을 배선하지
  // 않는다(엔진 루프에 트리거가 없다, notes/decisions.md G55 보고 대상). 그래도
  // fameScore·fullRanking이 이 타입을 요구하므로 빈 기록을 세션 동안 들고 있는다.
  const recordRef = useRef<PersistentRecord>(createPersistentRecord());
  const [, bump] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [offline, setOffline] = useState<OfflineSummary | null>(null);
  const [onboardingPending, setOnboardingPending] = useState(false);
  const onboardingSeenRef = useRef(false);

  if (worldRef.current === null) {
    const loaded = load();
    const w = loaded ?? createWorld();
    worldRef.current = w;
    onboardingSeenRef.current = readOnboardingSeen();
    // 이미 진행된(이 기능 이전) 세이브라면 놀라게 하지 않고 조용히 "본 것"으로 친다 —
    // 온보딩은 "진짜 첫 감정" 시점에만 자연스럽다(ux-v02.md §1.5).
    if (!onboardingSeenRef.current && (w.vault.length > 0 || w.pending.length > 0 || w.stats.sold > 0 || w.stats.blindSold > 0)) {
      onboardingSeenRef.current = true;
      writeOnboardingSeen();
    }
    if (loaded) {
      const fundsBefore = w.funds;
      const codexBefore = Object.values(w.codex).filter((s) => s === "owned" || s === "owned_unidentified").length;
      const rankBefore = rankSnapshot(w, recordRef.current);
      const result = applyOffline(w);
      if (result) {
        setOffline({
          seconds: result.seconds,
          drops: result.report.drops.length,
          lost: result.report.lost,
          fundsBefore,
          codexBefore,
          rankBefore,
          rankAfter: rankSnapshot(w, recordRef.current)
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
      if (!onboardingSeenRef.current && report.appraised.length > 0) {
        onboardingSeenRef.current = true;
        writeOnboardingSeen();
        setOnboardingPending(true);
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
    <T,>(fn: (w: World) => T): T => {
      const r = fn(world);
      bump((v) => v + 1);
      return r;
    },
    [world]
  );

  return {
    world,
    record: recordRef.current,
    reveal,
    offline,
    dismissReveal: () => setReveal(null),
    dismissOffline: () => setOffline(null),

    onboardingPending,
    dismissOnboarding: () => setOnboardingPending(false),
    chooseHomeBase: (site: SiteId) =>
      act((w) => {
        relocateBase(w, site);
        setOnboardingPending(false);
      }),

    // ── 레거시 단독 발굴(spec.md §8.1 — v0.1부터 그대로, 병행 진행 축) ──────
    dig: () => act(click),
    buyWorker: () => act(buyWorker),
    buyGear: () => act(buyGear),
    buyLab: () => act(buyLab),
    goTo: (site: SiteId) => act((w) => switchSite(w, site)),

    // ── base(거점 보유) ──────────────────────────────────────────────────
    openBase: (site: SiteId) => act((w) => unlockSite(w, site)),
    relocateBase: (site: SiteId) => act((w) => relocateBase(w, site)),

    // ── 소장고 ──────────────────────────────────────────────────────────
    sell: (artifactId: string, count: number) => act((w) => sellArtifactCopies(w, artifactId, count)),
    sellTier: (tier: Tier) => act((w) => sellTierAtMost(w, tier)),
    blind: (uid: number) => act((w) => blindSell(w, uid)),
    blindAll: () => act(blindSellAll),
    setAutoSell: (tier: Tier | null) =>
      act((w) => {
        w.settings.autoSellBelow = tier;
      }),
    setMuted: (muted: boolean) =>
      act((w) => {
        w.settings.muted = muted;
      }),

    // ── 발굴단·스텝(spec.md §8) ─────────────────────────────────────────
    hireForeman: (site: SiteId, slot: number) => act((w) => hireForeman(w, site, slot)),
    unlockTeamSlot: () => act(unlockTeamSlot),
    createTeam: (foremanId: string) => act((w) => createTeam(w, foremanId)),
    buyTeamWorker: (teamId: string) => act((w) => buyTeamWorker(w, teamId)),
    buyTeamGear: (teamId: string) => act((w) => buyTeamGear(w, teamId)),
    dispatch: (teamId: string, target: SiteId) => act((w) => dispatchExpedition(w, teamId, target)),
    emergencyDispatch: (teamId: string) => act((w) => emergencyDispatch(w, teamId)),
    focusDig: (teamId: string) => act((w) => focusDig(w, teamId)),
    setRoutine: (teamId: string, enabled: boolean, target?: SiteId) =>
      act((w) => setRoutine(w, teamId, enabled, target)),

    // ── 시설 업그레이드(spec.md §9) ─────────────────────────────────────
    buyVaultLevel: () => act(buyVaultLevel),
    buyHumidityLevel: () => act(buyHumidityLevel),
    buyRestorationLevel: () => act(buyRestorationLevel),
    buySecurityLevel: () => act(buySecurityLevel),

    // ── 박물관(spec.md §10) ─────────────────────────────────────────────
    buildMuseum: (site: SiteId) => act((w) => buildMuseum(w, site)),
    upgradeMuseumGrade: (site: SiteId) => act((w) => upgradeMuseumGrade(w, site)),
    buyMuseumMarketing: (site: SiteId) => act((w) => buyMuseumMarketing(w, site)),
    hireCurator: (site: SiteId, slot: number) => act((w) => hireCurator(w, site, slot)),
    display: (uid: number, site: SiteId, slot: number) => act((w) => displayArtifact(w, uid, site, slot)),
    undisplay: (uid: number) => act((w) => undisplayArtifact(w, uid)),

    // ── 경매장(spec.md §11) ─────────────────────────────────────────────
    buildAuctionHouse: (site: SiteId) => act((w) => buildAuctionHouse(w, site)),
    upgradeAuctionGrade: (site: SiteId) => act((w) => upgradeAuctionGrade(w, site)),
    hireAuctioneer: (site: SiteId, slot: number) => act((w) => hireAuctioneer(w, site, slot)),
    listAtAuction: (uid: number, site: SiteId) => act((w) => listAtAuction(w, uid, site)),

    // ── 암시장(spec.md §11.5) ────────────────────────────────────────────
    buyBlackMarketListing: (id: number) => act((w) => buyBlackMarketListing(w, id)),

    // ── 세이브 ──────────────────────────────────────────────────────────
    exportSave: () => exportText(world),
    importSave: (text: string) => {
      const next = importText(text);
      worldRef.current = next;
      save(next);
      window.location.reload();
    },
    reset: () => {
      clear();
      try {
        localStorage.removeItem(ONBOARDING_SEEN_KEY);
      } catch {
        /* 무시 */
      }
      window.location.reload();
    },
    artifact: (id: string) => ARTIFACT_BY_ID[id]
  };
}

export type Game = ReturnType<typeof useGame>;
