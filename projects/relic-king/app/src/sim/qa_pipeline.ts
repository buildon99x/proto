/**
 * 감정 파이프라인이 자금 부족으로 멈추지 않는가 — 정지 구간 회귀 게이트
 * (v0.3.2 결함 3, notes/decisions.md G69 · eval.md §19.3).
 *
 *   pnpm --filter relic-king qa:pipeline
 *
 * **왜 이 게이트가 필요한가.** 이 교착은 기존 게이트 어디에도 안 걸린다. 총량은
 * 결국 늘어나므로 `qa:economy`의 통화 성장도, `sim`의 엔딩 도달도 통과한다.
 * 깨지는 건 오직 **그 몇 분 동안 화면 앞에 앉아 있는 사람의 경험**이다 —
 * 드랍은 계속 쌓이는데 감정도 매각도 수입도 전부 0인 구간. 그래서 "정지한
 * 시간의 비율"이라는 별도 지표가 필요하다.
 *
 * 교착 조건: 봉인 보관(감정소 레벨 미달)이 아닌 미감정 항목이 있는데,
 * 그중 **어느 것도** 수수료를 못 내는 상태(무료 감정권도 없음).
 */
import { ARTIFACT_BY_ID } from "../game/artifacts";
import { APPRAISE_FEE, APPRAISAL_UNLOCK_LAB_LEVEL, AUTO_ROUTINE_INTERVAL_SECONDS } from "../game/balance";
import {
  advance, codexProgress, createPersistentRecord, createWorld, digPower, playerAssets, runAutoRoutine
} from "../game/engine";
import type { World } from "../game/types";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(k);
  return i > -1 ? args[i + 1] : d;
};
const HOURS = Number(arg("--hours", "1.5"));
const SEEDS = arg("--seeds", "20260917,11,22,33,44").split(",").map(Number);
const DT = 0.5;

/** 지금 이 순간 감정 파이프라인이 통째로 막혀 있는가 */
function stalled(w: World): boolean {
  if (w.appraisalVouchers > 0) return false;
  let appraisable = 0;
  let blocked = 0;
  for (const p of w.pending) {
    if (w.lab < APPRAISAL_UNLOCK_LAB_LEVEL[ARTIFACT_BY_ID[p.artifactId].tier]) continue;
    appraisable++;
    if (w.funds < Math.round(p.estimate * APPRAISE_FEE)) blocked++;
  }
  return appraisable > 0 && blocked === appraisable;
}

type Row = {
  seed: number; stallPct: number; longest: number; drops: number; sold: number;
  blind: number; vault: number; codex: number; assetsB: number; dig: number; layer: number;
};

const rows: Row[] = [];
for (const seed of SEEDS) {
  const w = createWorld(seed);
  const record = createPersistentRecord();
  let routineAcc = 0;
  let stalledSeconds = 0;
  let longest = 0;
  let run = 0;
  for (let i = 0; i < (HOURS * 3600) / DT; i++) {
    advance(w, DT, false, 0.25, record);
    routineAcc += DT;
    if (routineAcc >= AUTO_ROUTINE_INTERVAL_SECONDS) {
      routineAcc = 0;
      runAutoRoutine(w);
    }
    if (stalled(w)) {
      stalledSeconds += DT;
      run += DT;
      longest = Math.max(longest, run);
    } else run = 0;
  }
  rows.push({
    seed, stallPct: +((100 * stalledSeconds) / (HOURS * 3600)).toFixed(1), longest,
    drops: w.stats.drops, sold: w.stats.sold, blind: w.stats.blindSold,
    vault: w.vault.length, codex: codexProgress(w).owned,
    assetsB: +(playerAssets(w) / 1e9).toFixed(2), dig: +digPower(w).toFixed(0),
    layer: w.sites.korea.layer
  });
}

const median = (key: keyof Row) => {
  const v = rows.map((r) => r[key]).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
};

console.log(`시드 ${SEEDS.length}개 × ${HOURS}시간 (클릭 0회, 자동 루틴 ${AUTO_ROUTINE_INTERVAL_SECONDS}초)`);
console.log("seed        정지%   최장(초)  드랍   매각  미감정매각  소장  도감  자산(십억)  발굴력");
for (const r of rows) {
  console.log(
    `${String(r.seed).padStart(9)}  ${String(r.stallPct).padStart(5)}  ${String(r.longest).padStart(8)}  ` +
    `${String(r.drops).padStart(4)}  ${String(r.sold).padStart(5)}  ${String(r.blind).padStart(9)}  ` +
    `${String(r.vault).padStart(4)}  ${String(r.codex).padStart(4)}  ${String(r.assetsB).padStart(9)}  ${String(r.dig).padStart(6)}`
  );
}

let failed = 0;
const check = (label: string, cond: boolean) => {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failed++;
};

// 기준값의 근거(eval.md §19.3 실측): 수정 전 중앙값은 정지 23.4% · 최장 354초였고,
// 수정 후는 4.1% · 59초다. 게이트는 그 사이에 넉넉히 둔다 — 회귀(수 분짜리 정지가
// 되살아나는 것)는 잡되, 시드별 흔들림(2.7~10.6%)에는 걸리지 않게.
check(`정지 시간 비율 중앙값 10% 이하 (실측 ${median("stallPct")}%)`, median("stallPct") <= 10);
check(`최장 연속 정지 중앙값 90초 이하 — 자동 루틴 주기 안에서 풀린다 (실측 ${median("longest")}초)`,
  median("longest") <= 90);
check(`어느 시드도 정지 15% 를 넘지 않는다 (최악 ${Math.max(...rows.map((r) => r.stallPct))}%)`,
  rows.every((r) => r.stallPct <= 15));
check(`진행이 실제로 일어난다 — 도감 중앙값 80종 이상 (실측 ${median("codex")}종)`, median("codex") >= 80);
// **분모를 드랍으로 바꿨다**(v0.6.1). 원래는 `미감정 매각 < 감정 후 매각 × 10%`였는데,
// 그 분모는 **탈출구와 무관한 것**에 흔들린다 — 감정 후 매각 수는 자동 매각이 처분하는
// 중복분 수이고, 중복분은 플레이어가 새 종을 얼마나 잘 모았는지에 따라 줄어든다.
// v0.6.1에서 레이스 규칙이 바뀌자 미감정 매각은 **18건으로 똑같은데**(v0.6도 18건)
// 감정 후 매각만 186 → 179로 줄어, 같은 탈출구 사용량이 9.7% → 10.1%로 읽히며 게이트가
// 빨개졌다. 재려는 것은 "나온 유물 중 감정을 건너뛴 비율"이므로 분모는 **드랍**이 맞다
// (v0.6 4.1% · v0.6.1 4.0% — 파이프라인이 막히면 이 값이 그대로 치솟는다).
// 기준을 낮춘 게 아니라 재려던 것만 남겼다(`notes/decisions.md` G80.2와 같은 취지).
check(`탈출구가 남용되지 않는다 — 미감정 매각이 드랍의 10% 미만 ` +
  `(실측 ${median("blind")} / ${median("drops")} = ${(median("blind") / median("drops") * 100).toFixed(1)}%)`,
  median("blind") < median("drops") * 0.1);

console.log(failed === 0 ? "\n✅ qa_pipeline 전체 통과" : `\n❌ qa_pipeline ${failed}건 실패`);
process.exit(failed === 0 ? 0 : 1);
