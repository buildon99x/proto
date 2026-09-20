import { SITES, MAX_GEAR_LEVEL, dropThreshold, gearCost, labCost, layerExpectedValue, workerCost } from "../game/balance";
import { advance, blindSellAll, buyGear, buyLab, buyWorker, createWorld, digPower, sellTierAtMost, switchSite, unlockSite } from "../game/engine";
import type { SiteId, World } from "../game/types";
const SIGMA = process.argv.includes("--sigma1") ? 4 : 1;
const HOURS = Number(process.argv[process.argv.indexOf("--hours")+1] || 400);
const STEP = 2;
function bestSite(w: World): SiteId {
  const unlocked = SITES.filter((s) => w.sites[s.id].unlocked);
  const young = unlocked.find((s) => w.sites[s.id].layer < 10 && s.id !== "korea");
  if (young) return young.id;
  let best = unlocked[0].id; let bestRate = -1;
  for (const s of unlocked) { const sp = w.sites[s.id];
    const rate = layerExpectedValue(s.id, sp.layer) / dropThreshold(s.id, sp.layer);
    if (rate > bestRate) { bestRate = rate; best = s.id; } }
  return best;
}
function act(w: World) {
  sellTierAtMost(w, SIGMA as any);
  if (w.pending.length >= 18) blindSellAll(w);
  for (const s of SITES) if (!w.sites[s.id].unlocked && w.funds >= s.unlockCost) unlockSite(w, s.id);
  for (let i = 0; i < 60; i++) {
    const wc = workerCost(w.workers), gc = gearCost(w.gear), lc = labCost(w.lab);
    if (w.lab < 6 && w.funds >= lc && lc <= wc * 3) buyLab(w);
    else if (w.gear < MAX_GEAR_LEVEL && gc <= wc * 6 && w.funds >= gc) buyGear(w);
    else if (w.funds >= wc) buyWorker(w);
    else break;
  }
  switchSite(w, bestSite(w));
}
const w = createWorld();
const M: number[] = [];  // hourly funds
let nextH = 0;
for (let t = 0; t < HOURS*3600; t += STEP) {
  act(w); advance(w, STEP, false, STEP); w.ended = false;
  if (w.t/3600 >= nextH) { M.push(w.funds); nextH++; }
}
console.log(`policy sigma=${SIGMA===4?1:"<1"}  D_final=${digPower(w).toFixed(0)}/s gear=${w.gear} workers=${w.workers}`);
function ma(arr:number[], win:number, i:number){ if(i<win-1) return NaN; let s=0; for(let k=i-win+1;k<=i;k++) s+=arr[k]; return s/win; }
console.log("t  raw24growth  smoothed(7d)MA growth  natural24/t  excess_raw  excess_smooth");
for (let t=48; t+24<M.length; t+=24) {
  const raw = (M[t+24]-M[t])/M[t];
  const s1 = ma(M,168,t), s2 = ma(M,168,t+24);
  const sm = (isNaN(s1)||isNaN(s2)) ? NaN : (s2-s1)/s1;
  console.log(`${t}h  raw=${(raw*100).toFixed(1)}%  sm=${isNaN(sm)?"n/a":(sm*100).toFixed(1)+"%"}  nat=${(24/t*100).toFixed(1)}%  ex_raw=${((raw-24/t)*100).toFixed(1)}%  ex_sm=${isNaN(sm)?"n/a":((sm-24/t)*100).toFixed(1)+"%"}`);
}
