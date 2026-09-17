import { useState } from "react";
import { CodexView } from "./ui/CodexView";
import { DigView } from "./ui/DigView";
import { EndingBanner, OfflineModal, RevealModal, TipBanner } from "./ui/Overlays";
import { Header } from "./ui/Header";
import { VaultView } from "./ui/VaultView";
import { WorldView } from "./ui/WorldView";
import { useGame } from "./ui/useGame";

const TABS = [
  { id: "dig", label: "발굴" },
  { id: "vault", label: "소장고" },
  { id: "world", label: "세계" },
  { id: "codex", label: "도감" }
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const game = useGame();
  const [tab, setTab] = useState<TabId>("dig");
  const pending = game.world.pending.length;

  return (
    <div className="app">
      <Header world={game.world} />
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
            {t.id === "vault" && pending > 0 ? <i className="dot">{pending}</i> : null}
          </button>
        ))}
      </nav>

      <main className="body">
        {tab === "dig" ? <DigView game={game} /> : null}
        {tab === "vault" ? <VaultView game={game} /> : null}
        {tab === "world" ? <WorldView game={game} /> : null}
        {tab === "codex" ? <CodexView game={game} /> : null}
      </main>

      <RevealModal game={game} />
      <OfflineModal game={game} />
    </div>
  );
}
