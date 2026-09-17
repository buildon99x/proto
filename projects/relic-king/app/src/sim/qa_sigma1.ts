import { SITES, MAX_GEAR_LEVEL, dropThreshold, gearCost, labCost, layerExpectedValue, workerCost } from "../game/balance";
import { advance, blindSellAll, buyGear, buyLab, buyWorker, createWorld, digPower, playerAssets, sellTierAtMost, switchSite, unlockSite } from "../game/engine";
import type { SiteId, World } from "../game/types";

const CAP = process.argv.includes("--nocap") ? Infinity : MAX_GEAR_LEVEL;
const STEP = 2;

function bestSite(w: World): SiteId {
  const unlocked = SITES.filter((s) => w.sites[s.id].unlocked);
  const young = unlocked.find((s) => w.sites[s.id].layer < 10 && s.id !== "korea");
  if (young) return young.id;
  let best = unlocked[0].id; let bestRate = -1;
  for (const s of unlocked) {
    const sp = w.sites[s.id];
    const rate = layerExpectedValue(s.id, sp.layer) / dropThreshold(s.id, sp.layer);
    if (rate > bestRate) { bestRate = rate; best = s.id; }
  }
  return best;
}
function act(w: World) {
  sellTierAtMost(w, 4);          // sigma = 1
  if (w.pending.length >= 18) blindSellAll(w);
  for (const s of SITES) if (!w.sites[s.id].unlocked && w.funds >= s.unlockCost) unlockSite(w, s.id);
  for (let i = 0; i < 60; i++) {
    const wc = workerCost(w.workers), gc = gearCost(w.gear), lc = labCost(w.lab);
    if (w.lab < 6 && w.funds >= lc && lc <= wc * 3) buyLab(w);
    else if (w.gear < CAP && gc <= wc * 6 && w.funds >= gc) buyGear(w);
    else if (w.funds >= wc) buyWorker(w);
    else break;
  }
  switchSite(w, bestSite(w));
}
const w = createWorld();
const marks = [1, 6, 24, 72, 168];
let mi = 0;
const total = 168 * 3600;
const hist: {h:number;M:number}[] = [];
for (let t = 0; t < total; t += STEP) {
  act(w); advance(w, STEP, false, STEP);
  w.ended = false;
  const h = w.t / 3600;
  if (mi < marks.length && h >= marks[mi]) {
    console.log(`t=${marks[mi]}h  D=${digPower(w).toFixed(0)}/s  funds=${w.funds.toExponential(3)}  gear=${w.gear} workers=${w.workers}`);
    mi++;
  }
  if (Math.abs(h - Math.round(h)) < 0.0004 && Math.round(h) !== hist.at(-1)?.h) hist.push({h: Math.round(h), M: w.funds});
}
console.log("assets", playerAssets(w).toExponential(3));
// 24h growth excess check on funds series
for (const t0 of [24, 48, 72, 120, 144]) {
  const a = hist.find(x=>x.h===t0)?.M, b = hist.find(x=>x.h===t0+24)?.M;
  if (a && b) console.log(`M(${t0})=${a.toExponential(2)} M(${t0+24})=${b.toExponential(2)} growth=${((b-a)/a*100).toFixed(1)}%  24/t=${(24/t0*100).toFixed(1)}%  excess=${(((b-a)/a - 24/t0)*100).toFixed(1)}%`);
}
