import { useState } from "react";
import { ARTIFACT_BY_ID } from "./game/artifacts";
import { APPRAISAL_UNLOCK_LAB_LEVEL, LOCKED_HOLD_CAP, THEFT_RECOVERY_WINDOW_HOURS } from "./game/balance";
import { countdown } from "./game/format";
import { CodexView } from "./ui/CodexView";
import { ExpeditionView } from "./ui/ExpeditionView";
import { FacilityView } from "./ui/FacilityView";
import { MarketView } from "./ui/MarketView";
import { EndingBanner, RevealModal } from "./ui/Overlays";
import { Header } from "./ui/Header";
import { OfflineSummary } from "./ui/OfflineSummary";
import { DisplayNudge } from "./ui/DisplayNudge";
import { FirstBaseChooser } from "./ui/FirstBaseChooser";
import { ExpansionFork } from "./ui/ExpansionFork";
import { RankTableModal } from "./ui/RankTableModal";
import { RulesModal } from "./ui/RulesModal";
import { SettingsModal } from "./ui/SettingsModal";
import { TipBanner } from "./ui/TipBanner";
import { VaultView } from "./ui/VaultView";
import { armAudio } from "./ui/sound";
import { useGame } from "./ui/useGame";

// 합성음은 첫 사용자 입력 뒤에만 켤 수 있다(자동재생 정책). 리스너만 먼저 건다.
armAudio();

const TABS = [
  { id: "dig", label: "발굴" },
  { id: "vault", label: "소장고" },
  { id: "facility", label: "시설" },
  { id: "market", label: "시장" },
  { id: "codex", label: "도감" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const game = useGame();
  const { world } = game;
  const [tab, setTab] = useState<TabId>("dig");
  const [modal, setModal] = useState<"settings" | "rules" | "rank" | null>(null);

  // 탭 전환 시 스크롤을 유지하면 이전 탭에서 스크롤해 둔 위치 그대로 새 탭이 열려,
  // 짧은 탭에서는 콘텐츠가 상단 sticky 헤더 밑에 가려 보인다(G58, mobile-03-vault
  // 스크린샷에서 실측 — "다음 드랍" 줄과 미감정 항목이 겹쳐 보였다).
  const changeTab = (id: TabId) => {
    setTab(id);
    window.scrollTo(0, 0);
  };

  const sealedT2 = world.pending.filter(
    (p) => ARTIFACT_BY_ID[p.artifactId].tier === 2 && world.lab < APPRAISAL_UNLOCK_LAB_LEVEL[2]
  ).length;
  // 장물 배지는 "72시간 우선권"이 살아 있는 동안만 센다(notes/decisions.md G55.9
  // 공백을 G56에서 listedAt 필드로 닫는다) — 그냥 kind==="stolen" 전체가 아니라
  // 상장 후 THEFT_RECOVERY_WINDOW_HOURS가 지나지 않은 것만 카운트한다.
  const stolenListings = world.blackMarket.listings.filter(
    (l) => l.kind === "stolen" && world.t - l.listedAt <= THEFT_RECOVERY_WINDOW_HOURS * 3600
  );
  /**
   * L2는 **시한부 뱃지**다(notes/ux-v02.md §7) — 건수가 아니라 "언제까지"가 이
   * 계층의 존재 이유다. 예전엔 숫자만 찍어서, 72시간 회수 창이 3시간 남았는지
   * 70시간 남았는지 구분할 수 없었다(`eval.md` §19.4). 기한이 있는 항목은
   * **가장 급한 하나의 남은 시간**을, 기한이 없는 항목(봉인 가득참)은 건수를 쓴다.
   */
  const badges: Partial<Record<TabId, { text: string; title: string; urgent: boolean }>> = {};
  const theftRemain = world.theftEvents.map((e) => e.recoveryDeadlineOnlineSeconds - world.onlineElapsedSeconds);
  if (theftRemain.length > 0) {
    const soonest = Math.min(...theftRemain);
    badges.vault = {
      text: countdown(soonest),
      title: `도난 ${theftRemain.length}건 — 가장 급한 회수 기한 ${countdown(soonest)} 남음(온라인 기준)`,
      urgent: soonest <= 6 * 3600
    };
  } else if (sealedT2 >= LOCKED_HOLD_CAP) {
    badges.vault = { text: String(sealedT2), title: `봉인 보관 ${sealedT2}점 — 감정소를 올리면 풀린다(방치해도 손실 없음)`, urgent: false };
  }
  if (stolenListings.length > 0) {
    const soonest = Math.min(...stolenListings.map((l) => THEFT_RECOVERY_WINDOW_HOURS * 3600 - (world.t - l.listedAt)));
    badges.market = {
      text: countdown(soonest),
      title: `암시장에 내 도난 유물 ${stolenListings.length}건 — 우선권 ${countdown(soonest)} 남음`,
      urgent: soonest <= 6 * 3600
    };
  }

  return (
    <div className="app">
      <Header
        world={world}
        record={game.record}
        onOpenSettings={() => setModal("settings")}
        onOpenRules={() => setModal("rules")}
        onOpenRankTable={() => setModal("rank")}
      />
      <TipBanner game={game} />
      <EndingBanner game={game} />

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => changeTab(t.id)}
          >
            {t.label}
            {badges[t.id] ? (
              <i className={`dot${badges[t.id]!.urgent ? " dot-urgent" : ""}`} title={badges[t.id]!.title}>
                {badges[t.id]!.text}
              </i>
            ) : null}
          </button>
        ))}
      </nav>

      <main className="body">
        {tab === "dig" ? <ExpeditionView game={game} /> : null}
        {tab === "vault" ? <VaultView game={game} /> : null}
        {tab === "facility" ? <FacilityView game={game} /> : null}
        {tab === "market" ? <MarketView game={game} /> : null}
        {tab === "codex" ? <CodexView game={game} /> : null}
      </main>

      <RevealModal game={game} />
      <OfflineSummary game={game} onNavigate={(t) => changeTab(t)} />
      <DisplayNudge game={game} />
      {game.baseChooserOpen ? <FirstBaseChooser game={game} /> : null}
      {game.expansionForkOpen && !game.baseChooserOpen ? <ExpansionFork game={game} /> : null}
      {modal === "settings" ? <SettingsModal game={game} onClose={() => setModal(null)} /> : null}
      {modal === "rules" ? <RulesModal game={game} onClose={() => setModal(null)} /> : null}
      {modal === "rank" ? <RankTableModal game={game} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
