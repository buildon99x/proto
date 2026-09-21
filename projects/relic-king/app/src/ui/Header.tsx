import { DROP_INTERVAL_FLOOR_SECONDS, SITE_BY_ID, dropThreshold, layerCost } from "../game/balance";
import { digPower, effectiveDropMod, fullRanking, playerAssets } from "../game/engine";
import { teamDigPower } from "../game/expedition";
import { clock, won } from "../game/format";
import type { Foreman, SiteId, World } from "../game/types";
import type { AxisRankRow } from "../game/engine";

/** 헤더 6항목 상시(spec.md §3.2, notes/ux-v02.md §1.1). "현재 층과 진척"은 팀별로
 *  갈라져 발굴 탭의 팀 카드로 이동했다 — 대신 "다음 드랍까지 남은 시간"만 압축해
 *  가장 임박한 발굴 1건(팀 또는 레거시 직접 발굴)으로 보여준다. */
export function Header({
  world, record, onOpenSettings, onOpenRules, onOpenRankTable
}: {
  world: World; record: import("../game/types").PersistentRecord;
  onOpenSettings: () => void; onOpenRules: () => void; onOpenRankTable: () => void;
}) {
  const rows = fullRanking(world, record);
  const place = axisPlace(rows, "rank");
  const assetPlace = axisPlace(rows, "asset");
  const codexPlace = axisPlace(rows, "codex");
  const famePlace = axisPlace(rows, "fame");

  const dig = totalDigPower(world);
  const nextDrop = nextDropInfo(world);

  const seasonDaysLeft = Math.max(0, Math.ceil((world.seasonState.endsAt - world.t) / 86400));

  return (
    <header className="header">
      <div className="header-row">
        <Stat label="자산" value={`${won(playerAssets(world))} ₩`} accent />
        <Stat label="자금" value={`${won(world.funds)} ₩`} />
        <button type="button" className="stat stat-rank" onClick={onOpenRankTable}>
          <span className="stat-label">종합 {place}위</span>
          <strong className="stat-value rank-detail">
            자산{assetPlace}위 · 도감{codexPlace}위 · 명성{famePlace}위
          </strong>
        </button>
        <Stat label="발굴력" value={`${dig.total.toFixed(1)}/s${dig.activeTeams > 0 ? `(${dig.activeTeams}팀)` : ""}`} />
        <Stat label="시즌" value={`D-${seasonDaysLeft}`} className="header-season" />
        <div className="header-icons">
          <button type="button" className="icon-btn" onClick={onOpenSettings} title="설정·세이브" aria-label="설정·세이브">
            ⚙
          </button>
          <button type="button" className="icon-btn" onClick={onOpenRules} title="규칙" aria-label="규칙">
            📋
          </button>
        </div>
      </div>
      <div className="header-nextdrop muted">
        {nextDrop ? `다음 드랍 — ${nextDrop.label} ${SITE_BY_ID[nextDrop.site].city} ${nextDrop.layer}층 · ${clock(nextDrop.seconds)} 후` : "다음 드랍 — 발굴 중인 곳 없음"}
        {nextDrop?.floorBound ? (
          <em className="floor-note" title={`드랍 간격의 하한은 ${DROP_INTERVAL_FLOOR_SECONDS}초다. 이 거점은 이미 그 하한이라 발굴력을 더 올려도 드랍이 빨라지지 않는다 — 회수한 자금은 새 거점·시설·발굴단에 써야 순위로 돌아온다.`}>
            {" "}· 최소 간격 {DROP_INTERVAL_FLOOR_SECONDS}초 도달
          </em>
        ) : null}
      </div>
    </header>
  );
}

function Stat({ label, value, accent, className }: { label: string; value: string; accent?: boolean; className?: string }) {
  return (
    <div className={`stat${accent ? " stat-accent" : ""}${className ? ` ${className}` : ""}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </div>
  );
}

function axisPlace(rows: AxisRankRow[], key: "asset" | "codex" | "fame" | "rank"): number {
  const sorted = [...rows].sort((a, b) => b[key] - a[key]);
  return sorted.findIndex((r) => r.id === "player") + 1;
}

/** 헤더·발굴 탭이 공유하는 "지금 이 순간 총 발굴력" — 레거시 단독 발굴 +
 *  on_site 상태인 발굴단 전부. engine.ts의 내부 집계(instantDigIncomeRate)와
 *  같은 항을 더하되, 화면 표시용으로 이 파일에서 다시 합산한다(순수 조회,
 *  World를 바꾸지 않는다). */
export function totalDigPower(world: World): { total: number; activeTeams: number } {
  let total = digPower(world);
  let activeTeams = 0;
  for (const team of world.teams) {
    if (team.status !== "on_site") continue;
    const foreman = world.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
    total += teamDigPower(team.workers, team.gearLevel, foreman?.leadership ?? 0);
    activeTeams++;
  }
  return { total, activeTeams };
}

type NextDropInfo = { label: string; site: SiteId; layer: number; seconds: number; floorBound: boolean };

/**
 * 그 거점의 드랍 간격이 **하한(`DROP_INTERVAL_FLOOR_SECONDS`)에 붙었는가.**
 * 붙으면 `dropThreshold`가 `floor × dig`를 돌려주므로 간격이 발굴력과 무관하게
 * 8초로 고정된다 — 즉 **그 거점에서는 발굴력을 더 올려도 유물이 더 나오지 않는다**
 * (층 돌파는 계속 빨라지므로, 최대 층에서는 순수하게 무의미해진다).
 * `eval.md` §18.3이 "드랍 횟수가 정확히 같다"로 관측한 그 구간이고,
 * §19.5가 "화면이 그걸 말하지 않는다"로 결함 판정한 지점이다.
 */
export function isDropFloorBound(world: World, site: SiteId, dig: number): boolean {
  if (dig <= 0) return false;
  const sp = world.sites[site];
  const dropMod = effectiveDropMod(world, site);
  const base = dropThreshold(site, sp.layer, 0, dropMod);
  return DROP_INTERVAL_FLOOR_SECONDS * dig >= base;
}

/** 가장 임박한 드랍 1건(레거시 또는 on_site 발굴단) — 헤더의 "다음 드랍" 압축 표시용 */
export function nextDropInfo(world: World): NextDropInfo | null {
  const bySite = new Map<SiteId, { dig: number; label: string }>();
  const d0 = digPower(world);
  if (d0 > 0) bySite.set(world.activeSite, { dig: d0, label: "직접 발굴" });
  world.teams.forEach((team, idx) => {
    if (team.status !== "on_site") return;
    const foreman = world.staff.find((s) => s.id === team.foremanId && s.role === "foreman") as Foreman | undefined;
    const d = teamDigPower(team.workers, team.gearLevel, foreman?.leadership ?? 0);
    const hit = bySite.get(team.targetSite);
    if (hit) {
      hit.dig += d;
      hit.label = `${idx + 1}팀`;
    } else {
      bySite.set(team.targetSite, { dig: d, label: `${idx + 1}팀` });
    }
  });

  let best: NextDropInfo | null = null;
  for (const [site, { dig, label }] of bySite) {
    const sp = world.sites[site];
    const threshold = dropThreshold(site, sp.layer, dig, effectiveDropMod(world, site));
    const seconds = Math.max(0, (threshold - sp.dropProgress) / dig);
    if (!best || seconds < best.seconds) {
      best = { label, site, layer: sp.layer, seconds, floorBound: isDropFloorBound(world, site, dig) };
    }
  }
  return best;
}

export function layerProgressRatio(world: World, site: SiteId): number {
  const sp = world.sites[site];
  return Math.min(1, sp.layerProgress / layerCost(site, sp.layer));
}
