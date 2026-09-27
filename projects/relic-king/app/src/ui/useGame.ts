import { useCallback, useEffect, useRef, useState } from "react";
import { ARTIFACT_BY_ID } from "../game/artifacts";
import { AUTO_ROUTINE_INTERVAL_SECONDS } from "../game/balance";
import {
  advance, applyOffline, auctionSpares, blindSell, blindSellAll, buyBlackMarketListing, buyGear,
  buyHumidityLevel, buyLab, buyMuseumMarketing, buyRestorationLevel, buySecurityLevel, buyTeamGear, buyTeamWorker,
  buyVaultLevel, buyWorker, buildAuctionHouse, buildMuseum, click, createPersistentRecord, createTeam,
  createWorld, dispatchExpedition, displayArtifact, emergencyDispatch, focusDig, fullRanking, hireEmergencyCrew, sampleRanks,
  hireAuctioneer, hireCurator, hireForeman, listAtAuction, listManyAtAuction, relocateBase, runAutoRoutine, sellArtifactCopies,
  sellSpares, sellTierAtMost, sellVaultItems, setRoutine, setWanted, switchSite, undisplayArtifact, unlockSite, unlockTeamSlot,
  upgradeAuctionGrade, upgradeMuseumGrade
} from "../game/engine";
import { addGhost, encodeCard, makeCard, parseCard, removeGhost } from "../game/rivalcard";
import { clear, clearRecord, exportText, importText, load, loadRecord, save, saveRecord } from "../game/save";
import type { PersistentRecord, SiteId, Tier, World } from "../game/types";
import { shouldOfferFirstBase, shouldOfferExpansionFork } from "./baseChoice";
import { DISPLAY_NUDGE_SEEN_KEY } from "./DisplayNudge";
import { playCue } from "./sound";

/**
 * 연출 1건. `phase`가 spec.md §9.2의 두 사건을 가른다 —
 * `acquired`는 **소유 확정①**(드랍 즉시, 감정소 레벨과 무관, spec.md §3.3 "T4 유일"
 * 행), `appraised`는 **지식 공개③**(감정 완료 — 이름·내력·평가액이 여기서 열린다).
 */
export type Reveal = { artifactId: string; value: number; phase: "acquired" | "appraised" };
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
/**
 * 한 프레임이 이보다 오래 끊기면 "자리를 비웠다"로 보고 `applyOffline()`에 넘긴다
 * (v0.3.2 결함 1 — `eval.md` §19.1). `applyOffline()` 자체가 60초 미만을 무시하므로
 * 같은 값을 쓴다.
 */
const BACKGROUND_GAP_SECONDS = 60;
/** 배경 탭 안전망의 점검 주기(실시간 ms). 배경 탭에서 브라우저가 타이머를
 *  1분까지 늦춰도 동작은 같다 — 늦게 깨어나면 그만큼 더 긴 구간을 한 번에 정산한다. */
const BACKGROUND_KEEPALIVE_MS = 5000;
/** 탭을 열어 둔 채 진짜로 방치할 때도 미감정 잉여가 정리되고 인부·장비·
 *  감정소가 자란다(척추 4번) — `advance()`/`step()` 자체는 이 배경 자동화를
 *  부르지 않는다(오프라인 적분 스텝 무관성을 깨기 때문, `engine.ts`의
 *  `runAutoRoutine`·`applyOffline` 주석 참조). 대신 UI 애니메이션 프레임
 *  루프가 이 주기로 직접 불러 준다 — 이 타이머 자체는 "언제 부를지"만 정할
 *  뿐 무엇을 팔지·살지·살 수 있는지는 전부 엔진 함수 안의 판단이라 "게임
 *  로직을 UI에 두지 않는다"는 원칙과 부딪히지 않는다. qa/sim 스크립트는 이
 *  UI 코드를 전혀 거치지 않으므로 스텝 무관성 검증과도 무관하다. */
/**
 * 첫 거점 카드(`FirstBaseChooser`)를 이미 한 번 띄웠는가. 한 번 자동으로 띄우고, 그 뒤로는
 * 발굴 탭 "내 거점"에서 사람이 연다. v0.6.6 전의 "본거지를 정하자" 온보딩 키
 * (`relic-king/onboarding-seen-v1`)는 쓰지 않는다 — 그 모달은 없어졌다.
 */
const BASE_CHOOSER_SEEN_KEY = "relic-king/first-base-offered-v1";
/** "다음 확장" 갈림길(v0.6.8)을 한 번 띄웠는가 — 첫 거점 카드와 같은 방식이다 */
const EXPANSION_FORK_SEEN_KEY = "relic-king/expansion-fork-offered-v1";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return true; // localStorage 접근 불가 — 매번 뜨는 것보다 안전한 쪽으로
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* 사생활 모드 등 — 무시 */
  }
}

/**
 * "자리를 비운 동안"을 정산하고 복귀 요약 재료를 만든다. 세 곳이 공유한다 —
 * 첫 마운트(세이브를 열었을 때), 배경 탭에서 돌아온 프레임, `visibilitychange`.
 * 이 함수가 없던 시절엔 **첫 마운트만** 정산했고, 그래서 탭을 닫으면 오프라인
 * 진척을 받고 탭을 열어 두면 아무것도 못 받는 역전이 있었다(`eval.md` §19.1).
 */
function catchUpOffline(w: World, record: PersistentRecord): OfflineSummary | null {
  const fundsBefore = w.funds;
  const codexBefore = Object.values(w.codex).filter((s) => s === "owned" || s === "owned_unidentified").length;
  const rankBefore = rankSnapshot(w, record);
  const result = applyOffline(w, Date.now(), record);
  if (!result) return null;
  return {
    seconds: result.seconds,
    drops: result.report.drops.length,
    lost: result.report.lost,
    fundsBefore,
    codexBefore,
    rankBefore,
    rankAfter: rankSnapshot(w, record)
  };
}

export function useGame() {
  const worldRef = useRef<World | null>(null);
  // 계정 영구 기록(spec.md §13.4) — save.ts의 별도 키(RECORD_KEY)에서 불러온다
  // (마무리 패스 G56이 G51.4의 "영속화 미구현" 보고를 닫는다). step()/advance()가
  // 이 같은 참조를 계속 돌려써야 시즌 롤오버·엔딩 판정이 세션 내내 일관된다.
  const recordRef = useRef<PersistentRecord>(loadRecord() ?? createPersistentRecord());
  const [, bump] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  /** 지금 연출이 떠 있는지를 상태와 나란히 들고 다닌다. 아래 프레임 루프가
   *  "다음 연출을 꺼낼까"를 판단할 때 setState 갱신 함수 **안에서** 큐를 건드리면
   *  안 되기 때문이다 — React StrictMode(개발 모드)는 갱신 함수를 두 번 부르고,
   *  그러면 큐가 두 번 shift 돼 연출 하나가 조용히 사라진다. 유일(T4) 획득 연출이
   *  이 큐를 타게 된 뒤로는(v0.3.2) 그 한 건이 재미 정의 ① 그 자체다. */
  const revealRef = useRef<Reveal | null>(null);
  const [offline, setOffline] = useState<OfflineSummary | null>(null);
  const [baseChooserOpen, setBaseChooserOpen] = useState(false);
  const baseChooserSeenRef = useRef(false);
  const [expansionForkOpen, setExpansionForkOpen] = useState(false);
  const expansionForkSeenRef = useRef(false);

  if (worldRef.current === null) {
    const loaded = load();
    const w = loaded ?? createWorld();
    worldRef.current = w;
    baseChooserSeenRef.current = readFlag(BASE_CHOOSER_SEEN_KEY);
    expansionForkSeenRef.current = readFlag(EXPANSION_FORK_SEEN_KEY);
    if (loaded) {
      const summary = catchUpOffline(w, recordRef.current);
      if (summary) setOffline(summary);
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
      const rawDt = (now - last) / 1000;
      last = now;

      // 프레임이 오래 끊겼다 = 배경 탭·창 가림·기기 절전. 그 시간을 버리지 않고
      // 오프라인으로 정산하고, 복귀 요약도 첫 마운트와 똑같이 띄운다.
      if (rawDt >= BACKGROUND_GAP_SECONDS) {
        const summary = catchUpOffline(world, recordRef.current);
        if (summary) {
          runAutoRoutine(world);
          routineAcc = 0;
          setOffline((cur) => cur ?? summary);
        }
        world.lastTickAt = Date.now();
        save(world);
        saveRecord(recordRef.current);
        bump((v) => v + 1);
        raf = requestAnimationFrame(frame);
        return;
      }

      // 예전엔 여기서 0.5초로 잘랐고 그 위는 **버려졌다** — 창을 가리거나 무거운
      // 탭 하나만 있어도 그 시간이 사라졌다. 위 분기가 60초에서 이미 오프라인으로
      // 넘기므로, 그 아래 구간은 온라인 효율 그대로 전부 따라잡는다.
      const dt = rawDt;
      const report = advance(world, dt, false, 0.25, recordRef.current);

      // 소유 확정①(spec.md §3.3·§9.2) — 유일(T4)은 **드랍 그 순간** 연출한다.
      // 감정소 레벨이 낮아 봉인 보관으로 들어가더라도 이 연출은 재생된다.
      for (const d of report.drops) {
        if (d.tier === 4) {
          revealQueue.push({ artifactId: d.artifactId, value: 0, phase: "acquired" });
          playCue("uniqueAcquired", world.settings.muted);
        }
      }

      routineAcc += dt;
      if (routineAcc >= AUTO_ROUTINE_INTERVAL_SECONDS) {
        routineAcc = 0;
        runAutoRoutine(world);
        // 순위 성장률 표본(v0.5). step()이 아니라 여기서 찍는 이유는
        // `World.rankSample` 주석에 있다 — 오프라인 적분 스텝 무관성을 지킨다.
        sampleRanks(world, recordRef.current);
      }

      for (const a of report.appraised) {
        if (a.tier >= 3) revealQueue.push({ artifactId: a.artifactId, value: a.value, phase: "appraised" });
      }
      // 첫 거점 카드(v0.6.6, decision-tree-10h.md P1) — 첫 해금 비용이 모이고
      // 제보 레이스가 결판난 뒤에 한 번 띄운다. 첫 레이스를 덮지 않기 위해서다.
      if (!baseChooserSeenRef.current && shouldOfferFirstBase(world)) {
        baseChooserSeenRef.current = true;
        writeFlag(BASE_CHOOSER_SEEN_KEY);
        setBaseChooserOpen(true);
      } else if (!expansionForkSeenRef.current && shouldOfferExpansionFork(world)) {
        // 다음 확장(v0.6.8) — 셋째 거점과 둘째 발굴단 중 하나를 고르는 순간. 한 번 띄운다.
        expansionForkSeenRef.current = true;
        writeFlag(EXPANSION_FORK_SEEN_KEY);
        setExpansionForkOpen(true);
      }

      uiAcc += dt * 1000;
      saveAcc += dt;
      if (uiAcc >= UI_INTERVAL) {
        uiAcc = 0;
        world.lastTickAt = Date.now();
        bump((v) => v + 1);
        if (revealQueue.length > 0 && revealRef.current === null) {
          const next = revealQueue.shift()!;
          revealRef.current = next;
          setReveal(next);
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

    /** 떠날 때 — 지금까지를 확정해 저장한다. 돌아올 때 이 시각이 기준이 된다. */
    const onLeave = () => {
      world.lastTickAt = Date.now();
      save(world);
      saveRecord(recordRef.current);
    };
    /**
     * 돌아올 때 — 비운 시간을 정산한다. 예전에는 이 경로도 `onLeave`와 같은
     * 함수였고, 그래서 돌아오는 순간 `lastTickAt`을 현재 시각으로 덮어써
     * **비운 시간을 스스로 지웠다**. 이제 정산이 먼저다(`applyOffline`이 자기
     * `lastTickAt`을 갱신한다). 프레임 루프의 gap 감지와 둘 다 두는 이유는
     * 브라우저마다 어느 쪽이 먼저 오는지가 다르기 때문이다 — 먼저 도착한 쪽이
     * 정산하면 나머지 한쪽은 60초 미만이라 자동으로 아무 일도 하지 않는다.
     */
    const onReturn = () => {
      const summary = catchUpOffline(world, recordRef.current);
      if (summary) {
        runAutoRoutine(world);
        setOffline((cur) => cur ?? summary);
      }
      last = performance.now();
      onLeave();
      bump((v) => v + 1);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
      else onReturn();
    };
    /**
     * 안전망. 배경 탭에서는 `requestAnimationFrame`이 **아예 멈춘다** — 그래서
     * 프레임 루프의 gap 감지만으로는 부족하다(실측: CDP로 탭을 얼려 보면 복귀 후에도
     * 프레임이 돌아오지 않아 게임이 영영 멈춘 채였다, `eval.md` §19.1). 타이머는
     * 스로틀링을 받을지언정 계속 돌므로, 이쪽이 "자리를 비웠다"를 실제로 잡아낸다.
     * 프레임 루프가 정상이면 `lastTickAt`이 늘 신선해서 이 콜백은 아무 일도 하지 않는다.
     */
    const keepAlive = window.setInterval(() => {
      if ((Date.now() - world.lastTickAt) / 1000 < BACKGROUND_GAP_SECONDS) return;
      const summary = catchUpOffline(world, recordRef.current);
      if (!summary) return;
      runAutoRoutine(world);
      setOffline((cur) => cur ?? summary);
      last = performance.now();
      save(world);
      saveRecord(recordRef.current);
      bump((v) => v + 1);
    }, BACKGROUND_KEEPALIVE_MS);

    document.addEventListener("visibilitychange", onVisibility);
    // freeze/resume 은 Page Lifecycle API 의 이벤트로 **document** 에서 발생한다
    // (window 에 붙이면 잡히지 않는다 — 실측으로 확인).
    document.addEventListener("resume", onReturn);
    document.addEventListener("freeze", onLeave);
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(keepAlive);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("resume", onReturn);
      document.removeEventListener("freeze", onLeave);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("beforeunload", onLeave);
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
    dismissReveal: () => {
      revealRef.current = null;
      setReveal(null);
    },
    dismissOffline: () => setOffline(null),

    /** 첫 거점 카드(`FirstBaseChooser`). 자동으로는 한 번만 뜨고, 발굴 탭에서 다시 연다. */
    baseChooserOpen,
    openBaseChooser: () => setBaseChooserOpen(true),
    closeBaseChooser: () => setBaseChooserOpen(false),
    /** "다음 확장"(`ExpansionFork`) — 셋째 거점 대 둘째 발굴단. 한 번 뜨고, 발굴 탭에서 다시 연다. */
    expansionForkOpen,
    openExpansionFork: () => setExpansionForkOpen(true),
    closeExpansionFork: () => setExpansionForkOpen(false),

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
    /** 소장고 다중 선택(v0.5.2) — 고른 사본(uid)을 한 번에 매각·경매 등록 */
    sellMany: (uids: number[]) => act((w) => sellVaultItems(w, uids)),
    auctionMany: (uids: number[]) => act((w) => listManyAtAuction(w, uids)),
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
    sellSpares: (tier: Tier | null) =>
      act((w) => (w.settings.spareDestination === "auction" ? auctionSpares(w, tier) : sellSpares(w, tier))),
    /** 중복분을 어디로 보낼지(v0.3.4) — 기준 티어와 별개의 축이다. */
    setSpareDestination: (dest: "sell" | "auction") =>
      act((w) => {
        w.settings.spareDestination = dest;
      }),
    /** 팀 등록증의 빈칸 — 찾는 한 점(G109). 규칙에 효력이 없고 표시만 바뀐다 */
    setWanted: (artifactId: string) => act((w) => setWanted(w, artifactId)),
    setMuted: (muted: boolean) =>
      act((w) => {
        w.settings.muted = muted;
      }),
    setAutoReinvest: (enabled: boolean) =>
      act((w) => {
        w.settings.autoReinvest = enabled;
      }),
    setAutoFocusTips: (enabled: boolean) =>
      act((w) => {
        w.settings.autoFocusTips = enabled;
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
    hireEmergencyCrew: () => act(hireEmergencyCrew),
    setRoutine: (teamId: string, enabled: boolean, target?: SiteId | "auto") =>
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

    // ── 기록패(플레이어 간 비동기 경쟁, notes/decisions.md G76) ──────────
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
        localStorage.removeItem(BASE_CHOOSER_SEEN_KEY);
        localStorage.removeItem(EXPANSION_FORK_SEEN_KEY);
        localStorage.removeItem(DISPLAY_NUDGE_SEEN_KEY);
      } catch {
        /* 무시 */
      }
      window.location.reload();
    },
    artifact: (id: string) => ARTIFACT_BY_ID[id]
  };
}

export type Game = ReturnType<typeof useGame>;
