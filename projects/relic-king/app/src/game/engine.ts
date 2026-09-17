import {
  APPRAISE_FEE, BASE_DIG, BLIND_SELL_RATE, CATCHUP_MAX, CATCHUP_SLOPE,
  CLICK_COMBO_MAX, CLICK_COMBO_STEP, CLICK_COMBO_WINDOW, CLICK_FACTOR, CLICK_RATE_CAP,
  CODEX_GOAL, GEAR_MULT, LAYERS_PER_SITE, MAX_GEAR_LEVEL, OFFLINE_CAP_SECONDS, OFFLINE_EFFICIENCY,
  PENDING_CAP, SITES, SITE_BY_ID, TIER_STOCK_PER_SPECIES, TIP_DURATION_MAX, TIP_DURATION_MIN,
  TIP_FIRST_DELAY, TIP_MEAN_INTERVAL, TIP_PLAYER_HIT, TIP_RIVAL_HIT, WORKER_DIG,
  appraiseSeconds, dropThreshold, gearCost, labCost, layerCost, layerExpectedValue,
  tierValue, tierWeights, workerCost
} from "./balance";
import { ARTIFACTS, ARTIFACT_BY_ID, artifactsOf } from "./artifacts";
import { josa } from "./format";
import { Rng } from "./rng";
import type {
  Artifact, Ledger, LogKind, OwnerId, RivalState, SiteId, StepReport, Tier, World
} from "./types";

const RIVAL_SEED: { id: string; name: string; baseDig: number; favSite: SiteId; sellBelow: Tier }[] = [
  { id: "r1", name: "이무진", baseDig: 1.35, favSite: "korea", sellBelow: 1 },
  { id: "r2", name: "박준서", baseDig: 1.15, favSite: "korea", sellBelow: 2 },
  { id: "r3", name: "H. 뮐러", baseDig: 1.0, favSite: "egypt", sellBelow: 1 },
  { id: "r4", name: "A. 파리드", baseDig: 0.9, favSite: "egypt", sellBelow: 0 },
  { id: "r5", name: "L. 로시", baseDig: 0.85, favSite: "rome", sellBelow: 2 },
  { id: "r6", name: "서하윤", baseDig: 0.75, favSite: "rome", sellBelow: 0 }
];

let uidCounter = 1;
export function nextUid(): number {
  return uidCounter++;
}

export function createLedger(): Ledger {
  const ledger: Ledger = {};
  for (const a of ARTIFACTS) {
    const total = TIER_STOCK_PER_SPECIES[a.tier];
    ledger[a.id] = { total, remaining: total, owners: [] };
  }
  return ledger;
}

export function createWorld(seed = 20260917): World {
  const sites = {} as World["sites"];
  for (const s of SITES) {
    sites[s.id] = { layer: 1, layerProgress: 0, dropProgress: 0, unlocked: s.unlockCost === 0 };
  }
  const codex: Record<string, "unseen"> = {};
  for (const a of ARTIFACTS) codex[a.id] = "unseen";

  return {
    version: 1,
    t: 0,
    lastTickAt: Date.now(),
    // 감정에는 추정가의 2%가 든다. 종잣돈이 0이면 첫 유물을 감정조차 못 해
    // 첫 1분이 완전히 죽는다(스모크로 확인). 인부 한 명 값을 쥐여 주고 시작한다.
    funds: 30_000,
    sites,
    activeSite: "korea",
    workers: 0,
    gear: 0,
    lab: 1,
    pending: [],
    vault: [],
    ledger: createLedger(),
    rivals: RIVAL_SEED.map((r) => ({
      ...r,
      workers: 0,
      gear: 0,
      funds: 0,
      layer: 1,
      layerProgress: 0,
      dropProgress: 0,
      vaultValue: 0,
      owned: [],
      catchup: 1
    })),
    codex,
    tip: null,
    nextTipIn: TIP_FIRST_DELAY,
    log: [{ t: 0, kind: "system", text: "경주 고분군에서 발굴을 시작했다." }],
    settings: { autoSellBelow: null, muted: false },
    stats: { drops: 0, clicks: 0, sold: 0, blindSold: 0, racesWon: 0, racesLost: 0 },
    clickCombo: 1,
    clickComboUntil: 0,
    clickSecond: 0,
    clickAccum: 0,
    rngState: seed >>> 0,
    ended: false
  };
}

// ── 파생값 ────────────────────────────────────────────────

export function digPower(w: World): number {
  return (BASE_DIG + w.workers * WORKER_DIG) * Math.pow(GEAR_MULT, w.gear);
}

export function rivalDig(r: RivalState): number {
  return (BASE_DIG + r.workers * WORKER_DIG) * Math.pow(GEAR_MULT, r.gear) * r.baseDig * r.catchup;
}

export function playerAssets(w: World): number {
  return w.vault.reduce((sum, v) => sum + v.value, 0);
}

export type RankRow = { id: OwnerId; name: string; assets: number; dig: number; catchup: number };

export function ranking(w: World): RankRow[] {
  const rows: RankRow[] = [
    { id: "player", name: "나", assets: playerAssets(w), dig: digPower(w), catchup: 1 },
    ...w.rivals.map((r) => ({
      id: r.id, name: r.name, assets: r.vaultValue, dig: rivalDig(r), catchup: r.catchup
    }))
  ];
  return rows.sort((a, b) => b.assets - a.assets);
}

export function codexProgress(w: World): { owned: number; lost: number; total: number } {
  let owned = 0;
  let lost = 0;
  for (const a of ARTIFACTS) {
    const s = w.codex[a.id];
    if (s === "owned") owned++;
    else if (s === "lost") lost++;
  }
  return { owned, lost, total: ARTIFACTS.length };
}

// ── 스텝 ──────────────────────────────────────────────────

function log(w: World, kind: LogKind, text: string) {
  w.log.unshift({ t: w.t, kind, text });
  if (w.log.length > 60) w.log.length = 60;
}

function available(w: World, a: Artifact): boolean {
  return w.ledger[a.id].remaining > 0;
}

function take(w: World, a: Artifact, owner: OwnerId, report: StepReport) {
  const entry = w.ledger[a.id];
  if (entry.remaining !== Infinity) entry.remaining -= 1;
  entry.owners.push(owner);

  if (owner === "player") {
    w.codex[a.id] = "owned";
    w.pending.push({
      uid: nextUid(),
      artifactId: a.id,
      remain: appraiseSeconds(w.lab),
      estimate: layerExpectedValue(a.site, w.sites[a.site].layer)
    });
    w.stats.drops += 1;
    report.drops.push({ artifactId: a.id, tier: a.tier });
    if (w.pending.length > PENDING_CAP) {
      const overflow = w.pending.shift();
      if (overflow) {
        w.funds += Math.round(overflow.estimate * BLIND_SELL_RATE);
        w.stats.blindSold += 1;
        log(w, "system", `미감정 큐가 넘쳐 1점을 자동으로 처분했다.`);
      }
    }
  } else {
    const rival = w.rivals.find((r) => r.id === owner)!;
    rival.owned.push(a.id);
    const value = tierValue(a.tier, a.valueFactor);
    if (a.tier <= rival.sellBelow) rival.funds += value;
    else rival.vaultValue += value;

    if (entry.remaining === 0 && w.codex[a.id] !== "owned") {
      w.codex[a.id] = "lost";
      report.lost.push({ artifactId: a.id, owner: rival.name });
      log(w, "lost", `${rival.name}${josa(rival.name, "이가")} '${a.name}'${josa(a.name, "을를")} 가져갔다. 세계에 남은 수량 0.`);
    } else if (a.tier >= 2) {
      log(w, "rival", `${rival.name}${josa(rival.name, "이가")} '${a.name}'${josa(a.name, "을를")} 발굴했다. (남은 수량 ${entry.remaining})`);
    }
  }
}

function pickTier(w: World, rng: Rng, site: SiteId, layer: number, cap: Tier): Tier {
  const weights = tierWeights(site, layer);
  let roll = rng.next() * 100;
  for (let t = 0; t < 5; t++) {
    roll -= weights[t];
    if (roll <= 0) return Math.min(t, cap) as Tier;
  }
  return 0;
}

function candidates(w: World, site: SiteId, tier: Tier, layer: number): Artifact[] {
  return artifactsOf(site, tier).filter((a) => a.minLayer <= layer && available(w, a));
}

function rollDrop(
  w: World, rng: Rng, site: SiteId, layer: number, owner: OwnerId, offline: boolean, report: StepReport
) {
  // 제보 레이스: 조건을 만족하면 대상 유물이 직접 걸린다
  const tip = w.tip;
  if (tip && tip.site === site && layer >= tip.layer) {
    const target = ARTIFACT_BY_ID[tip.artifactId];
    if (available(w, target)) {
      const hit = owner === "player" ? TIP_PLAYER_HIT : tip.rivals.includes(owner) ? TIP_RIVAL_HIT : 0;
      if (hit > 0 && rng.chance(hit)) {
        take(w, target, owner, report);
        if (owner === "player") {
          w.stats.racesWon += 1;
          report.won.push(target.id);
          log(w, "won", `제보를 따라 '${target.name}'${josa(target.name, "을를")} 먼저 확보했다.`);
        } else {
          w.stats.racesLost += 1;
        }
        w.tip = null;
        w.nextTipIn = rng.range(TIP_MEAN_INTERVAL * 0.5, TIP_MEAN_INTERVAL * 1.5);
        return;
      }
    }
  }

  // 영구 상실은 플레이어가 그 자리에 있었을 때만 일어난다(notes/mda.md §5.2).
  // 그래서 라이벌은 **제보 레이스 밖에서는 유일(T4)을 뽑지 못하고**, 오프라인 중에는
  // 진귀(T2) 이하만 가져간다. 유일 유물을 잃는 경로는 위의 레이스 하나뿐이다.
  const cap: Tier = owner === "player" ? 4 : offline ? 2 : 3;
  let tier = pickTier(w, rng, site, layer, cap);
  let pool = candidates(w, site, tier, layer);
  while (pool.length === 0 && tier > 0) {
    tier = (tier - 1) as Tier;
    pool = candidates(w, site, tier, layer);
  }
  if (pool.length === 0) return;
  take(w, rng.pick(pool), owner, report);
}

function digPlayer(w: World, rng: Rng, dt: number, eff: number, report: StepReport) {
  const site = w.activeSite;
  const sp = w.sites[site];
  const progress = digPower(w) * dt * eff;
  sp.layerProgress += progress;
  sp.dropProgress += progress;

  let guard = 0;
  while (sp.layer < LAYERS_PER_SITE && sp.layerProgress >= layerCost(site, sp.layer) && guard++ < 64) {
    sp.layerProgress -= layerCost(site, sp.layer);
    sp.layer += 1;
    report.layerUps += 1;
    log(w, "system", `${SITE_BY_ID[site].name} ${sp.layer}층 — ${SITE_BY_ID[site].eras[sp.layer - 1]}`);
  }
  if (sp.layer >= LAYERS_PER_SITE) sp.layerProgress = Math.min(sp.layerProgress, layerCost(site, sp.layer));

  guard = 0;
  while (sp.dropProgress >= dropThreshold(site, sp.layer) && guard++ < 512) {
    sp.dropProgress -= dropThreshold(site, sp.layer);
    rollDrop(w, rng, site, sp.layer, "player", eff < 1, report);
  }
}

function digRival(w: World, r: RivalState, rng: Rng, dt: number, eff: number, report: StepReport) {
  const site = r.favSite;
  const progress = rivalDig(r) * dt * eff;
  r.layerProgress += progress;
  r.dropProgress += progress;

  let guard = 0;
  while (r.layer < LAYERS_PER_SITE && r.layerProgress >= layerCost(site, r.layer) && guard++ < 64) {
    r.layerProgress -= layerCost(site, r.layer);
    r.layer += 1;
  }

  guard = 0;
  while (r.dropProgress >= dropThreshold(site, r.layer) && guard++ < 512) {
    r.dropProgress -= dropThreshold(site, r.layer);
    rollDrop(w, rng, site, r.layer, r.id, eff < 1, report);
  }

  // 라이벌도 같은 비용 곡선·같은 상한으로 재투자한다 (Fair Progression: 같은 규칙)
  for (let i = 0; i < 12; i++) {
    const wc = workerCost(r.workers);
    const gc = gearCost(r.gear);
    if (r.gear < MAX_GEAR_LEVEL && gc <= wc * 6 && r.funds >= gc) {
      r.funds -= gc;
      r.gear += 1;
    } else if (r.funds >= wc) {
      r.funds -= wc;
      r.workers += 1;
    } else break;
  }
}

function runAppraisal(w: World, dt: number, report: StepReport) {
  if (w.pending.length === 0) return;
  const done: typeof w.pending = [];
  const keep: typeof w.pending = [];

  // 병렬 처리: 큐의 모든 항목이 동시에 감정된다. 감정소 레벨은 1점당 소요 시간을 줄인다.
  for (const item of w.pending) {
    const fee = Math.round(item.estimate * APPRAISE_FEE);
    if (w.funds < fee) {
      keep.push(item); // 자금 부족 — 대기. 미감정 매각으로 언제든 풀 수 있다
      continue;
    }
    item.remain -= dt;
    if (item.remain > 1e-9) keep.push(item);
    else {
      w.funds -= fee;
      done.push(item);
    }
  }
  w.pending = keep;

  for (const item of done) {
    const artifact = ARTIFACT_BY_ID[item.artifactId];
    const value = tierValue(artifact.tier, artifact.valueFactor);
    report.appraised.push({ artifactId: artifact.id, tier: artifact.tier, value });

    const auto = w.settings.autoSellBelow;
    if (auto !== null && artifact.tier <= auto) {
      w.funds += value;
      w.stats.sold += 1;
    } else {
      w.vault.push({ uid: nextUid(), artifactId: artifact.id, value });
    }
  }
}

function spawnTip(w: World, rng: Rng) {
  const pool = ARTIFACTS.filter((a) => {
    if (a.tier < 2) return false;
    if (!w.sites[a.site].unlocked) return false;
    if (!available(w, a)) return false;
    return a.minLayer <= w.sites[a.site].layer;
  });
  if (pool.length === 0) {
    w.nextTipIn = 30;
    return;
  }
  // 높은 티어를 강하게 선호한다 — 제보는 유일·국보가 주인공이다
  const weighted: Artifact[] = [];
  for (const a of pool) {
    const n = a.tier === 4 ? 12 : a.tier === 3 ? 5 : 1;
    for (let i = 0; i < n; i++) weighted.push(a);
  }
  const target = rng.pick(weighted);
  const rivalIds = w.rivals
    .filter((r) => r.favSite === target.site && r.layer >= target.minLayer)
    .map((r) => r.id);
  const chosen = rivalIds.slice(0, 1 + rng.int(0, 3));

  w.tip = {
    artifactId: target.id,
    site: target.site,
    layer: target.minLayer,
    remain: rng.range(TIP_DURATION_MIN, TIP_DURATION_MAX),
    rivals: chosen
  };
  log(w, "system", `제보 — ${SITE_BY_ID[target.site].name} ${target.minLayer}층에서 반응. 대상: ${target.name}`);
}

function updateCatchup(w: World) {
  const rows = ranking(w);
  const leader = Math.max(rows[0].assets, 1);
  for (const r of w.rivals) {
    const own = Math.max(r.vaultValue, 1);
    r.catchup = Math.min(CATCHUP_MAX, 1 + CATCHUP_SLOPE * Math.log10(leader / own));
  }
}

function checkEnding(w: World) {
  if (w.ended) return;
  const { owned, total } = codexProgress(w);
  if (owned / total < CODEX_GOAL) return;
  if (ranking(w)[0].id !== "player") return;
  w.ended = true;
  log(w, "system", "도감을 채우고 자산 1위에 올랐다. 유물왕.");
}

const emptyReport = (): StepReport => ({ drops: [], appraised: [], lost: [], won: [], layerUps: 0 });

/** dt 초만큼 세계를 전진시킨다. offline=true 면 효율 60% + 라이벌 상위 티어 차단 */
export function step(w: World, dt: number, offline = false): StepReport {
  const report = emptyReport();
  if (dt <= 0) return report;
  const rng = new Rng(w.rngState);
  const eff = offline ? OFFLINE_EFFICIENCY : 1;

  w.t += dt;
  digPlayer(w, rng, dt, eff, report);
  for (const r of w.rivals) digRival(w, r, rng, dt, eff, report);
  runAppraisal(w, dt, report);

  if (!offline) {
    if (w.tip) {
      w.tip.remain -= dt;
      if (w.tip.remain <= 0) {
        const expired = ARTIFACT_BY_ID[w.tip.artifactId].name;
        log(w, "system", `제보가 만료됐다. '${expired}'${josa(expired, "은는")} 아직 세상에 남아 있다.`);
        w.tip = null;
        w.nextTipIn = rng.range(TIP_MEAN_INTERVAL * 0.5, TIP_MEAN_INTERVAL * 1.5);
      }
    } else {
      w.nextTipIn -= dt;
      if (w.nextTipIn <= 0) spawnTip(w, rng);
    }
  }

  updateCatchup(w);
  checkEnding(w);
  w.rngState = rng.state;
  return report;
}

/** 큰 dt 를 고정 스텝으로 쪼개 적분한다. 오프라인 복귀와 시뮬이 같은 경로를 탄다 */
export function advance(w: World, seconds: number, offline = false, stepSize = 1): StepReport {
  const total = emptyReport();
  let left = Math.max(0, seconds);
  let guard = 0;
  while (left > 1e-6 && guard++ < 200_000) {
    const dt = Math.min(stepSize, left);
    const r = step(w, dt, offline);
    total.drops.push(...r.drops);
    total.appraised.push(...r.appraised);
    total.lost.push(...r.lost);
    total.won.push(...r.won);
    total.layerUps += r.layerUps;
    left -= dt;
  }
  return total;
}

export function applyOffline(w: World, nowMs = Date.now()): { seconds: number; report: StepReport } | null {
  const raw = (nowMs - w.lastTickAt) / 1000;
  w.lastTickAt = nowMs;
  if (raw < 60) return null;
  const seconds = Math.min(raw, OFFLINE_CAP_SECONDS);
  const report = advance(w, seconds, true, 10);
  return { seconds, report };
}

// ── 액션 ──────────────────────────────────────────────────

export function click(w: World): boolean {
  const now = w.t;
  if (now > w.clickComboUntil) w.clickCombo = 1;
  w.clickCombo = Math.min(CLICK_COMBO_MAX, w.clickCombo + CLICK_COMBO_STEP);
  w.clickComboUntil = now + CLICK_COMBO_WINDOW;

  const second = Math.floor(now);
  if (second !== w.clickSecond) {
    w.clickSecond = second;
    w.clickAccum = 0;
  }
  const d = digPower(w);
  const cap = d * CLICK_RATE_CAP;
  const gain = Math.min(d * CLICK_FACTOR * w.clickCombo, Math.max(0, cap - w.clickAccum));
  if (gain <= 0) return false;
  w.clickAccum += gain;
  w.stats.clicks += 1;

  const sp = w.sites[w.activeSite];
  sp.layerProgress += gain;
  sp.dropProgress += gain;
  return true;
}

export function buyWorker(w: World): boolean {
  const cost = workerCost(w.workers);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.workers += 1;
  return true;
}

export function buyGear(w: World): boolean {
  if (w.gear >= MAX_GEAR_LEVEL) return false;
  const cost = gearCost(w.gear);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.gear += 1;
  return true;
}

export function buyLab(w: World): boolean {
  const cost = labCost(w.lab);
  if (w.funds < cost) return false;
  w.funds -= cost;
  w.lab += 1;
  for (const item of w.pending) item.remain = Math.min(item.remain, appraiseSeconds(w.lab));
  return true;
}

export function unlockSite(w: World, site: SiteId): boolean {
  const def = SITE_BY_ID[site];
  if (w.sites[site].unlocked || w.funds < def.unlockCost) return false;
  w.funds -= def.unlockCost;
  w.sites[site].unlocked = true;
  w.activeSite = site;
  log(w, "system", `${def.name} — ${def.anchor} 발굴을 시작했다.`);
  return true;
}

export function switchSite(w: World, site: SiteId): boolean {
  if (!w.sites[site].unlocked) return false;
  w.activeSite = site;
  return true;
}

export function blindSell(w: World, uid: number): boolean {
  const idx = w.pending.findIndex((p) => p.uid === uid);
  if (idx < 0) return false;
  const [item] = w.pending.splice(idx, 1);
  w.funds += Math.round(item.estimate * BLIND_SELL_RATE);
  w.stats.blindSold += 1;
  return true;
}

export function blindSellAll(w: World): number {
  let gained = 0;
  for (const item of w.pending) {
    gained += Math.round(item.estimate * BLIND_SELL_RATE);
    w.stats.blindSold += 1;
  }
  w.pending = [];
  w.funds += gained;
  return gained;
}

/** 같은 유물의 사본을 n점 판다. 소장고가 유물 종류별로 묶여 있으므로 이 단위가 필요하다 */
export function sellArtifactCopies(w: World, artifactId: string, count: number): number {
  let gained = 0;
  let left = count;
  const keep: typeof w.vault = [];
  for (const item of w.vault) {
    if (left > 0 && item.artifactId === artifactId) {
      gained += item.value;
      w.stats.sold += 1;
      left -= 1;
    } else keep.push(item);
  }
  w.vault = keep;
  w.funds += gained;
  return gained;
}

export function sellTierAtMost(w: World, tier: Tier): number {
  let gained = 0;
  const keep: typeof w.vault = [];
  for (const item of w.vault) {
    if (ARTIFACT_BY_ID[item.artifactId].tier <= tier) {
      gained += item.value;
      w.stats.sold += 1;
    } else keep.push(item);
  }
  w.vault = keep;
  w.funds += gained;
  return gained;
}

export const costs = { workerCost, gearCost, labCost };
