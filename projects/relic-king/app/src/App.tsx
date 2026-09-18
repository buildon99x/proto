import { useState } from "react";
import { ARTIFACT_BY_ID } from "./game/artifacts";
import { APPRAISAL_UNLOCK_LAB_LEVEL, LOCKED_HOLD_CAP } from "./game/balance";
import { CodexView } from "./ui/CodexView";
import { ExpeditionView } from "./ui/ExpeditionView";
import { FacilityView } from "./ui/FacilityView";
import { MarketView } from "./ui/MarketView";
import { EndingBanner, RevealModal } from "./ui/Overlays";
import { Header } from "./ui/Header";
import { OfflineSummary } from "./ui/OfflineSummary";
import { OnboardingOverlay } from "./ui/OnboardingOverlay";
import { RankTableModal } from "./ui/RankTableModal";
import { RulesModal } from "./ui/RulesModal";
import { SettingsModal } from "./ui/SettingsModal";
import { TipBanner } from "./ui/TipBanner";
import { VaultView } from "./ui/VaultView";
import { useGame } from "./ui/useGame";

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

  const sealedT2 = world.pending.filter(
    (p) => ARTIFACT_BY_ID[p.artifactId].tier === 2 && world.lab < APPRAISAL_UNLOCK_LAB_LEVEL[2]
  ).length;
  const vaultBadge = world.theftEvents.length + (sealedT2 >= LOCKED_HOLD_CAP ? 1 : 0);
  const marketBadge = world.blackMarket.listings.filter((l) => l.kind === "stolen").length;
  const badges: Partial<Record<TabId, number>> = { vault: vaultBadge, market: marketBadge };

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
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {badges[t.id] ? <i className="dot">{badges[t.id]}</i> : null}
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
      <OfflineSummary game={game} onNavigate={(t) => setTab(t)} />
      {game.onboardingPending ? <OnboardingOverlay game={game} onDone={game.dismissOnboarding} /> : null}
      {modal === "settings" ? <SettingsModal game={game} onClose={() => setModal(null)} /> : null}
      {modal === "rules" ? <RulesModal game={game} onClose={() => setModal(null)} /> : null}
      {modal === "rank" ? <RankTableModal game={game} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
