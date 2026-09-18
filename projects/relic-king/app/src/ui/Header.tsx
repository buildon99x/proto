import { SITE_BY_ID, dropThreshold, layerCost } from "../game/balance";
import { codexProgress, digPower, playerAssets, ranking } from "../game/engine";
import { clock, rate, won } from "../game/format";
import type { World } from "../game/types";

export function Header({ world }: { world: World }) {
  const site = SITE_BY_ID[world.activeSite];
  const sp = world.sites[world.activeSite];
  const rank = ranking(world);
  const place = rank.findIndex((r) => r.id === "player") + 1;
  const d = digPower(world);
  const layerPct = Math.min(1, sp.layerProgress / layerCost(site.id, sp.layer));
  const nextDrop = Math.max(0, (dropThreshold(site.id, sp.layer, d) - sp.dropProgress) / Math.max(d, 0.001));
  const codex = codexProgress(world);

  return (
    <header className="header">
      <Stat label="자산" value={`${won(playerAssets(world))} ₩`} accent />
      <Stat label="자금" value={`${won(world.funds)} ₩`} />
      <Stat label="순위" value={`${place}위`} />
      <Stat label="발굴력" value={`${rate(d)}/s`} />
      <div className="header-depth">
        <div className="header-depth-top">
          <span>{site.name} {sp.layer}층</span>
          <span className="muted">{site.eras[sp.layer - 1]}</span>
        </div>
        <div className="bar" role="progressbar" aria-valuenow={Math.round(layerPct * 100)}>
          <i style={{ width: `${layerPct * 100}%` }} />
        </div>
        <div className="header-depth-bot muted">
          다음 유물 {clock(nextDrop)} · 도감 {codex.owned}/{codex.total}
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`stat${accent ? " stat-accent" : ""}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </div>
  );
}
