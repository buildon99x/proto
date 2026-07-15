// The seven screens (spec §10) + settings (remappable keys, reduce-motion).
// Korean UI (spec §10 localization); every string comes from ./strings, and
// each item carries a `data-tip` tooltip explanation.
import { useState } from "react";
import blocksJson from "../data/blocks.json";
import { stagesCfg, stageKind } from "../engine/config";
import type { Game } from "../engine/run";
import type { ShopOffer } from "../engine/types";
import { DEFAULT_KEYS, type Settings } from "../engine/persist";
import { advantageById } from "../engine/advantages";
import { T, TIP } from "./strings";
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
      <p className="eyebrow">{T.eyebrow}</p>
      <h1>STACKFLOW</h1>
      <p className="tagline">{T.tagline}</p>
      <div className="title-actions">
        <button
          className="big-btn"
          data-tip={TIP.start}
          onClick={() => onStart(seedText ? hashSeed(seedText) : undefined)}
        >
          {T.start}
        </button>
        <input
          className="seed-input"
          placeholder={T.seedPlaceholder}
          data-tip={TIP.seed}
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
        />
      </div>
      <div className="title-links">
        <button className="link-btn" data-tip={TIP.pedia} onClick={onPedia}>
          {T.pedia}
        </button>
        <button className="link-btn" data-tip={TIP.settings} onClick={onSettings}>
          {T.settings}
        </button>
      </div>
      {bests.stage > 0 && (
        <div className="title-bests" data-tip={TIP.bests} tabIndex={0}>
          {T.bests(bests)}
        </div>
      )}
      <p className="hint">{T.titleHint}</p>
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
        <h2>{boss?.kind === "act" ? T.bossBroken(boss.name) : T.targetReached}</h2>
        <p className="reward-line">
          {T.stageReward} <strong>{T.creditsUnit(game.stageReward())}</strong>
          <span className="reward-detail">
            {T.rewardDetail(game.stageBlocksDestroyed, game.overkillCredits())}
          </span>
        </p>
        <div className="dialog-actions">
          <button className="big-btn" data-tip={TIP.bank} onClick={onBank} autoFocus>
            {T.bank}
          </button>
          <button className="big-btn press-btn" data-tip={TIP.press} onClick={onPress}>
            {T.press}
          </button>
        </div>
        <p className="hint">{T.bankPressHint}</p>
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
    <div className={`offer ${canAfford ? "" : "offer-poor"}`} data-tip={offer.desc} tabIndex={0}>
      <div className="offer-head">
        <strong>{offer.name}</strong>
        <span className="offer-kind">{offer.kind === "piece" ? T.kindBlock : T.kindAdvantage}</span>
      </div>
      <p className="offer-desc">{offer.desc}</p>
      <button className="mini-btn" disabled={!canAfford} onClick={onBuy}>
        {free ? T.take : T.buy(offer.price)}
      </button>
    </div>
  );
}

export function ShopScreen({ game, onDone, onBuy, onReroll }: { game: Game; onDone: () => void; onBuy: (o: ShopOffer) => void; onReroll: () => void }) {
  const full = game.advantages.length >= stagesCfg.advantageSlots;
  return (
    <div className="screen shop-screen">
      <h2>{T.shopTitle(game.stage)}</h2>
      <p className="credits-line" data-tip={TIP.credits} tabIndex={0}>{T.creditsLine(game.credits)}</p>
      {full && <p className="hint">{T.slotsFull(stagesCfg.advantageSlots)}</p>}
      <div className="offers">
        {game.shopOffers.map((o, i) => (
          <OfferCard
            key={`${o.id}-${i}`}
            offer={o}
            canAfford={game.credits >= o.price}
            onBuy={() => onBuy(o)}
          />
        ))}
        {game.shopOffers.length === 0 && <p>{T.soldOut}</p>}
      </div>
      <div className="dialog-actions">
        <button
          className="mini-btn"
          data-tip={TIP.reroll}
          disabled={game.credits < game.rerollCost()}
          onClick={onReroll}
        >
          {T.reroll(game.rerollCost())}
        </button>
        <button className="big-btn" onClick={onDone} autoFocus>
          {T.continueTo(game.stage + 1)}
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
        <h3>{T.quickBuy}</h3>
        {offer ? (
          <OfferCard offer={offer} canAfford={game.credits >= offer.price} onBuy={() => onBuy(offer)} />
        ) : (
          <p>{T.nothingOnOffer}</p>
        )}
        <p className="credits-line" data-tip={TIP.credits} tabIndex={0}>{T.creditsShort(game.credits)}</p>
        <button className="big-btn" onClick={onDone} autoFocus>
          {T.skipTo(game.stage + 1)}
        </button>
      </div>
    </div>
  );
}

// ---- 5. Treasure (spec §8.3) ----

export function TreasureScreen({ game, onPick }: { game: Game; onPick: (i: number) => void }) {
  return (
    <div className="screen treasure-screen">
      <h2>{T.treasureTitle}</h2>
      <p className="tagline">{T.treasureSub}</p>
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
      <h1>{victory ? T.runComplete : T.runOver}</h1>
      {!victory && <p className="tagline">{game.gameOverReason}</p>}
      <div className="summary-stats">
        <div className="stat-big">
          <span className="stat-num">{s.chain}</span>
          <span className="stat-label">{T.statBiggestChain}{s.chain >= game.runBests.chain && s.chain > 0 ? T.best : ""}</span>
        </div>
        <div className="stat-big">
          <span className="stat-num">{s.clear.toLocaleString("ko-KR")}</span>
          <span className="stat-label">{T.statSingleClear}</span>
        </div>
        <div className="stat-big">
          <span className="stat-num">{s.perfectClears}</span>
          <span className="stat-label">{T.statPerfects}</span>
        </div>
        <div className="stat-big">
          <span className="stat-num">{T.reached(game.act, game.stage)}</span>
          <span className="stat-label">{T.statReached}</span>
        </div>
        <div className="stat-big">
          <span className="stat-num">{game.totalBlocksDestroyed}</span>
          <span className="stat-label">{T.statBlocks}</span>
        </div>
      </div>
      {game.advantages.length > 0 && (
        <p className="build-line">
          {T.buildLine(game.advantages.map((id) => advantageById(id)?.name ?? id).join(" · "))}
        </p>
      )}
      <div className="dialog-actions">
        <button className="big-btn" onClick={onRestart} autoFocus>
          {T.oneMore}
        </button>
        <button className="link-btn" onClick={onTitle}>
          {T.toTitle}
        </button>
      </div>
    </div>
  );
}

// ---- 7. Blockipedia (spec §10.7) ----

const PEDIA: { type: string; name: string; desc: string; icon: string }[] = [
  { type: "normal", name: T.normalBlockName, icon: "●", desc: T.normalBlockDesc },
  ...blocksJson.specialPieces.map((p) => ({
    type: p.blockType,
    name: p.name,
    icon: { stone: "🪨", bomb: "💣", obsidian: "🟪", vine: "🌿", combo: "✳", booster: "⭐", rune: "🔮", prism: "🔷" }[p.blockType] ?? "?",
    desc: p.desc,
  })),
  { type: "junk", name: T.junkName, icon: "▦", desc: T.junkDesc },
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
      <h2>{T.pediaTitle}</h2>
      <p className="tagline">{T.pediaSub(game.discovered.size)}</p>
      <div className="pedia-grid">
        {entries.map((e) => {
          const known = game.discovered.has(e.type);
          return (
            <div
              key={e.type + e.name}
              className={`pedia-card ${known ? "" : "pedia-locked"}`}
              data-tip={known ? e.desc : T.lockedDesc}
              tabIndex={0}
            >
              <div className="pedia-icon">{known ? e.icon : "❓"}</div>
              <strong>{known ? e.name : T.locked}</strong>
              <p>{known ? e.desc : T.lockedDesc}</p>
            </div>
          );
        })}
      </div>
      <button className="big-btn" onClick={onBack} autoFocus>
        {T.back}
      </button>
    </div>
  );
}

// ---- Settings (accessibility: reduce-motion, sound, key remap — §8.7) ----

const KEY_LABELS = T.keyLabels;

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
      <h2>{T.settingsTitle}</h2>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.reduceMotion}
          onChange={(e) => onChange({ ...settings, reduceMotion: e.target.checked })}
        />
        {T.reduceMotion}
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
        {T.sound}
      </label>
      <h3>{T.keys} {listening && <em>{T.pressKeyFor(KEY_LABELS[listening])}</em>}</h3>
      <div className="key-grid">
        {Object.keys(KEY_LABELS).map((k) => (
          <button
            key={k}
            className={`key-row ${listening === k ? "key-listening" : ""}`}
            onClick={() => setListening(k)}
          >
            <span>{KEY_LABELS[k]}</span>
            <kbd>{settings.keys[k] ?? T.dash}</kbd>
          </button>
        ))}
      </div>
      <div className="dialog-actions">
        <button
          className="link-btn"
          onClick={() => onChange({ ...settings, keys: { ...DEFAULT_KEYS } })}
        >
          {T.resetKeys}
        </button>
        <button className="big-btn" onClick={onBack}>
          {T.back}
        </button>
      </div>
    </div>
  );
}

export function stageKindLabel(stage: number): string {
  const k = stageKind(stage);
  return k === "act" ? T.actBossLabel : k === "mini" ? T.miniBossLabel : "";
}
