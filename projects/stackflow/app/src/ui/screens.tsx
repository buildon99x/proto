// The seven screens (spec §10) + settings (remappable keys, reduce-motion).
import { useState } from "react";
import blocksJson from "../data/blocks.json";
import { stagesCfg, stageKind } from "../engine/config";
import type { Game } from "../engine/run";
import type { ShopOffer } from "../engine/types";
import { DEFAULT_KEYS, type Settings } from "../engine/persist";
import { advantageById } from "../engine/advantages";
import * as sfx from "./audio";

// ---- 1. Title ----

export function TitleScreen({
  game,
  onStart,
  onPedia,
  onSettings,
}: {
  game: Game;
  onStart: (seed?: number) => void;
  onPedia: () => void;
  onSettings: () => void;
}) {
  const [seedText, setSeedText] = useState("");
  const bests = game.runBests;
  return (
    <div className="screen title-screen">
      <p className="eyebrow">Prototype Lab</p>
      <h1>STACKFLOW</h1>
      <p className="tagline">
        Set up the chain. Watch it detonate. 3 acts · 30 stages · no timer, ever.
      </p>
      <div className="title-actions">
        <button
          className="big-btn"
          onClick={() => onStart(seedText ? hashSeed(seedText) : undefined)}
        >
          ▶ Start Run
        </button>
        <input
          className="seed-input"
          placeholder="seed (optional)"
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
        />
      </div>
      <div className="title-links">
        <button className="link-btn" onClick={onPedia}>
          📖 Blockipedia
        </button>
        <button className="link-btn" onClick={onSettings}>
          ⚙ Settings
        </button>
      </div>
      {bests.stage > 0 && (
        <div className="title-bests">
          Bests — chain {bests.chain} · single clear {bests.clear.toLocaleString()} ·
          perfects {bests.perfectClears} · act {bests.act} (stage {bests.stage})
        </div>
      )}
      <p className="hint">
        Your starting pool is the 7 classic pieces. Match 4+ of a color or fill a
        line. Chains multiply: ×1, ×2, ×4, ×7, ×11…
      </p>
    </div>
  );
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ---- 3. Bank / Press (spec §8.3 push-your-luck) ----

export function BankPressOverlay({ game, onBank, onPress }: { game: Game; onBank: () => void; onPress: () => void }) {
  const boss = game.boss;
  return (
    <div className="overlay">
      <div className="dialog">
        <h2>{boss?.kind === "act" ? `💥 ${boss.name} BROKEN!` : "Target reached!"}</h2>
        <p className="reward-line">
          Stage reward: <strong>{game.stageReward()} credits</strong>
          <span className="reward-detail">
            {" "}
            (stipend + {game.stageBlocksDestroyed} blocks
            {game.overkillCredits() > 0 && ` + ${game.overkillCredits()} overkill`})
          </span>
        </p>
        <div className="dialog-actions">
          <button className="big-btn" onClick={onBank} autoFocus>
            🏦 Bank &amp; advance
          </button>
          <button className="big-btn press-btn" onClick={onPress}>
            🔥 Press — keep stacking for overkill credits
          </button>
        </div>
        <p className="hint">
          Pressing is pure upside… except the board keeps filling toward top-out.
          Banking is always safe.
        </p>
      </div>
    </div>
  );
}

// ---- 4. Shop & quick-buy (spec §8.3 pacing) ----

function OfferCard({
  offer,
  canAfford,
  onBuy,
  free,
}: {
  offer: ShopOffer;
  canAfford: boolean;
  onBuy: () => void;
  free?: boolean;
}) {
  return (
    <div className={`offer ${canAfford ? "" : "offer-poor"}`}>
      <div className="offer-head">
        <strong>{offer.name}</strong>
        <span className="offer-kind">{offer.kind === "piece" ? "block" : "advantage"}</span>
      </div>
      <p className="offer-desc">{offer.desc}</p>
      <button className="mini-btn" disabled={!canAfford} onClick={onBuy}>
        {free ? "Take" : `Buy · ${offer.price}c`}
      </button>
    </div>
  );
}

export function ShopScreen({ game, onDone, onBuy, onReroll }: { game: Game; onDone: () => void; onBuy: (o: ShopOffer) => void; onReroll: () => void }) {
  const full = game.advantages.length >= stagesCfg.advantageSlots;
  return (
    <div className="screen shop-screen">
      <h2>🛒 Shop — after stage {game.stage}</h2>
      <p className="credits-line">💰 {game.credits} credits</p>
      {full && <p className="hint">Advantage slots full ({stagesCfg.advantageSlots}/{stagesCfg.advantageSlots}) — buying a new one replaces your first.</p>}
      <div className="offers">
        {game.shopOffers.map((o, i) => (
          <OfferCard
            key={`${o.id}-${i}`}
            offer={o}
            canAfford={game.credits >= o.price}
            onBuy={() => onBuy(o)}
          />
        ))}
        {game.shopOffers.length === 0 && <p>Sold out!</p>}
      </div>
      <div className="dialog-actions">
        <button
          className="mini-btn"
          disabled={game.credits < game.rerollCost()}
          onClick={onReroll}
        >
          🎲 Reroll · {game.rerollCost()}c
        </button>
        <button className="big-btn" onClick={onDone} autoFocus>
          Continue → stage {game.stage + 1}
        </button>
      </div>
    </div>
  );
}

export function QuickBuyOverlay({ game, onDone, onBuy }: { game: Game; onDone: () => void; onBuy: (o: ShopOffer) => void }) {
  const offer = game.shopOffers[0];
  return (
    <div className="overlay">
      <div className="dialog quickbuy">
        <h3>⚡ Quick buy</h3>
        {offer ? (
          <OfferCard offer={offer} canAfford={game.credits >= offer.price} onBuy={() => onBuy(offer)} />
        ) : (
          <p>Nothing on offer.</p>
        )}
        <p className="credits-line">💰 {game.credits}c</p>
        <button className="big-btn" onClick={onDone} autoFocus>
          Skip → stage {game.stage + 1}
        </button>
      </div>
    </div>
  );
}

// ---- 5. Treasure (spec §8.3) ----

export function TreasureScreen({ game, onPick }: { game: Game; onPick: (i: number) => void }) {
  return (
    <div className="screen treasure-screen">
      <h2>🏆 TREASURE — pick one, on the house</h2>
      <p className="tagline">The Act Boss is broken. Re-tool your engine for the next act.</p>
      <div className="offers">
        {game.treasureOffers.map((o, i) => (
          <OfferCard key={i} offer={o} canAfford onBuy={() => onPick(i)} free />
        ))}
      </div>
    </div>
  );
}

// ---- 6. Run summary (spec §8.7 fail-forward: spectacle of best moments) ----

export function SummaryScreen({ game, victory, onRestart, onTitle }: { game: Game; victory: boolean; onRestart: () => void; onTitle: () => void }) {
  const s = game.session;
  return (
    <div className="screen summary-screen">
      <h1>{victory ? "🎉 RUN COMPLETE" : "RUN OVER"}</h1>
      {!victory && <p className="tagline">{game.gameOverReason}</p>}
      <div className="summary-stats">
        <div className="stat-big">
          <span className="stat-num">{s.chain}</span>
          <span className="stat-label">biggest chain{s.chain >= game.runBests.chain && s.chain > 0 ? " ★ best" : ""}</span>
        </div>
        <div className="stat-big">
          <span className="stat-num">{s.clear.toLocaleString()}</span>
          <span className="stat-label">highest single clear</span>
        </div>
        <div className="stat-big">
          <span className="stat-num">{s.perfectClears}</span>
          <span className="stat-label">perfect clears</span>
        </div>
        <div className="stat-big">
          <span className="stat-num">
            Act {game.act} · {game.stage}
          </span>
          <span className="stat-label">reached</span>
        </div>
        <div className="stat-big">
          <span className="stat-num">{game.totalBlocksDestroyed}</span>
          <span className="stat-label">blocks destroyed</span>
        </div>
      </div>
      {game.advantages.length > 0 && (
        <p className="build-line">
          Build: {game.advantages.map((id) => advantageById(id)?.name ?? id).join(" · ")}
        </p>
      )}
      <div className="dialog-actions">
        <button className="big-btn" onClick={onRestart} autoFocus>
          ↻ One more run (R)
        </button>
        <button className="link-btn" onClick={onTitle}>
          Title
        </button>
      </div>
    </div>
  );
}

// ---- 7. Blockipedia (spec §10.7) ----

const PEDIA: { type: string; name: string; desc: string; icon: string }[] = [
  { type: "normal", name: "Block", icon: "●", desc: "Plain scoring block. Clears in full lines or same-color groups of 4+." },
  ...blocksJson.specialPieces.map((p) => ({
    type: p.blockType,
    name: p.name,
    icon: { stone: "🪨", bomb: "💣", obsidian: "🟪", vine: "🌿", combo: "✳", booster: "⭐", rune: "🔮", prism: "🔷" }[p.blockType] ?? "?",
    desc: p.desc,
  })),
  { type: "junk", name: "Junk", icon: "▦", desc: "Indestructible debris injected by bosses. Plan around it." },
];

export function BlockipediaScreen({ game, onBack }: { game: Game; onBack: () => void }) {
  const seen = new Set<string>();
  const entries = PEDIA.filter((e) => {
    if (seen.has(e.type + e.name)) return false;
    seen.add(e.type + e.name);
    return true;
  });
  return (
    <div className="screen pedia-screen">
      <h2>📖 Blockipedia</h2>
      <p className="tagline">
        Every block you have encountered across runs. {game.discovered.size} discovered.
      </p>
      <div className="pedia-grid">
        {entries.map((e) => {
          const known = game.discovered.has(e.type);
          return (
            <div key={e.type + e.name} className={`pedia-card ${known ? "" : "pedia-locked"}`}>
              <div className="pedia-icon">{known ? e.icon : "❓"}</div>
              <strong>{known ? e.name : "???"}</strong>
              <p>{known ? e.desc : "Encounter this block in a run to unlock it."}</p>
            </div>
          );
        })}
      </div>
      <button className="big-btn" onClick={onBack} autoFocus>
        Back
      </button>
    </div>
  );
}

// ---- Settings (accessibility: reduce-motion, sound, key remap — §8.7) ----

const KEY_LABELS: Record<string, string> = {
  left: "Move left",
  right: "Move right",
  down: "Move down",
  rotateCw: "Rotate CW",
  rotateCw2: "Rotate CW (alt)",
  rotateCcw: "Rotate CCW",
  rotate180: "Rotate 180°",
  lock: "Drop & lock",
  hold: "Hold",
};

export function SettingsScreen({ settings, onChange, onBack }: { settings: Settings; onChange: (s: Settings) => void; onBack: () => void }) {
  const [listening, setListening] = useState<string | null>(null);
  return (
    <div
      className="screen settings-screen"
      tabIndex={0}
      onKeyDown={(e) => {
        if (listening) {
          e.preventDefault();
          onChange({ ...settings, keys: { ...settings.keys, [listening]: e.code } });
          setListening(null);
        }
      }}
    >
      <h2>⚙ Settings</h2>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.reduceMotion}
          onChange={(e) => onChange({ ...settings, reduceMotion: e.target.checked })}
        />
        Reduce motion / photosensitivity mode (skips shakes, flashes &amp; step animation)
      </label>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.sound}
          onChange={(e) => {
            onChange({ ...settings, sound: e.target.checked });
            sfx.setSoundEnabled(e.target.checked);
          }}
        />
        Sound
      </label>
      <h3>Keys {listening && <em>— press a key for “{KEY_LABELS[listening]}”…</em>}</h3>
      <div className="key-grid">
        {Object.keys(KEY_LABELS).map((k) => (
          <button
            key={k}
            className={`key-row ${listening === k ? "key-listening" : ""}`}
            onClick={() => setListening(k)}
          >
            <span>{KEY_LABELS[k]}</span>
            <kbd>{settings.keys[k] ?? "—"}</kbd>
          </button>
        ))}
      </div>
      <div className="dialog-actions">
        <button
          className="link-btn"
          onClick={() => onChange({ ...settings, keys: { ...DEFAULT_KEYS } })}
        >
          Reset keys
        </button>
        <button className="big-btn" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

export function stageKindLabel(stage: number): string {
  const k = stageKind(stage);
  return k === "act" ? "ACT BOSS" : k === "mini" ? "MINI-BOSS" : "";
}
