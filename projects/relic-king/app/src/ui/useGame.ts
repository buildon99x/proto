import { useCallback, useEffect, useRef, useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import { AUTO_ROUTINE_INTERVAL_SECONDS } from "../game/balance";
import {
  advance, applyOffline, blindSell, blindSellAll, buyBlackMarketListing, buyGear,
  buyHumidityLevel, buyLab, buyMuseumMarketing, buyRestorationLevel, buySecurityLevel, buyTeamGear, buyTeamWorker,
  buyVaultLevel, buyWorker, buildAuctionHouse, buildMuseum, click, createPersistentRecord, createTeam,
  createWorld, dispatchExpedition, displayArtifact, emergencyDispatch, focusDig, fullRanking, sampleRanks,
  hireAuctioneer, hireCurator, hireForeman, listAtAuction, relocateBase, runAutoRoutine, sellArtifactCopies,
  sellSpares, sellTierAtMost, setRoutine, switchSite, undisplayArtifact, unlockSite, unlockTeamSlot,
  upgradeAuctionGrade, upgradeMuseumGrade
} from "../game/engine";
import { addGhost, encodeCard, makeCard, parseCard, removeGhost } from "../game/rivalcard";
import { clear, clearRecord, exportText, importText, load, loadRecord, save, saveRecord } from "../game/save";
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
/** 탭을 열어 둔 채 진짜로 방치할 때도 미감정 잉여가 정리되고 인부·장비·
 *  감정소가 자란다(척추 4번) — `advance()`/`step()` 자체는 이 배경 자동화를
 *  부르지 않는다(오프라인 적분 스텝 무관성을 깨기 때문, `engine.ts`의
 *  `runAutoRoutine`·`applyOffline` 주석 참조). 대신 UI 애니메이션 프레임
 *  루프가 이 주기로 직접 불러 준다 — 이 타이머 자체는 "언제 부를지"만 정할
 *  뿐 무엇을 팔지·살지·살 수 있는지는 전부 엔진 함수 안의 판단이라 "게임
 *  로직을 UI에 두지 않는다"는 원칙과 부딪히지 않는다. qa/sim 스크립트는 이
 *  UI 코드를 전혀 거치지 않으므로 스텝 무관성 검증과도 무관하다. */
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
  // 계정 영구 기록(spec.md §13.4) — save.ts의 별도 키(RECORD_KEY)에서 불러온다
  // (마무리 패스 G56이 G51.4의 "영속화 미구현" 보고를 닫는다). step()/advance()가
  // 이 같은 참조를 계속 돌려써야 시즌 롤오버·엔딩 판정이 세션 내내 일관된다.
  const recordRef = useRef<PersistentRecord>(loadRecord() ?? createPersistentRecord());
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
      const result = applyOffline(w, Date.now(), recordRef.current);
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
    let routineAcc = 0;
    const revealQueue: Reveal[] = [];

    const frame = (now: number) => {
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      const report = advance(world, dt, false, 0.25, recordRef.current);

      routineAcc += dt;
      if (routineAcc >= AUTO_ROUTINE_INTERVAL_SECONDS) {
        routineAcc = 0;
        runAutoRoutine(world);
        // 순위 성장률 표본(v0.5). step()이 아니라 여기서 찍는 이유는
        // `World.rankSample` 주석에 있다 — 오프라인 적분 스텝 무관성을 지킨다.
        sampleRanks(world, recordRef.current);
      }

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
        saveRecord(recordRef.current);
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    const onHide = () => {
      world.lastTickAt = Date.now();
      save(world);
      saveRecord(recordRef.current);
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
    /** 소장고 중복분 자동 매각 기준(G68). 기준을 바꾼 그 순간에는 팔지 않는다 —
     *  실제 정리는 다음 자동 루틴 틱이나 "지금 정리" 버튼이 한다. 드롭다운을
     *  훑어보는 것만으로 소장품이 사라지면 안 된다. */
    setAutoSellSpare: (tier: Tier | null) =>
      act((w) => {
        w.settings.autoSellSpareBelow = tier;
      }),
    sellSpares: (tier: Tier | null) => act((w) => sellSpares(w, tier)),
    setMuted: (muted: boolean) =>
      act((w) => {
        w.settings.muted = muted;
      }),
    setAutoReinvest: (enabled: boolean) =>
      act((w) => {
        w.settings.autoReinvest = enabled;
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

    // ── 기록패(플레이어 간 비동기 경쟁, notes/decisions.md G70) ──────────
    /** 지금 내 상태를 기록패 코드 문자열로 굽는다 */
    makeCardText: () => encodeCard(makeCard(world, recordRef.current)),
    /** 상대의 기록패를 받아들인다. 읽지 못하면 null — 예외를 던지지 않는다 */
    receiveCard: (text: string): string | null => {
      const card = parseCard(text);
      if (!card) return null;
      return act((w) => addGhost(w, card).name);
    },
    dropGhost: (id: string) => act((w) => removeGhost(w, id)),
    setOwnerName: (name: string) => {
      recordRef.current.ownerName = name.slice(0, 12).trim() || recordRef.current.ownerName;
      saveRecord(recordRef.current);
      bump((v) => v + 1);
    },

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
      clearRecord();
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
