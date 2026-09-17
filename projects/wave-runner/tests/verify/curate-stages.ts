/**
 * 스테이지 시드 큐레이션 — 정확한 솔버로 **여유(slack)** 를 겨냥한다.
 *
 * 2단계에서는 오토파일럿 통과율로 골랐다. 3단계의 솔버로 다시 재보니 통과 가능성은
 * 거의 모든 경로에서 참이었고(94~100%), 대신 **여유가 최선 198ms 와 최악 10ms 로**
 * 갈렸다. 통과 가능하지만 여유 10ms 인 경로는 사람에게는 불가능하다.
 *
 * 좋은 스테이지는 네 가지를 만족한다.
 *
 *  1. **공정성** — 모든 경로가 통과 가능하고, **최악 경로도 사람이 낼 수 있어야 한다.**
 *  2. **난이도** — 최선 경로의 여유가 티어별 목표 구간에 들어야 한다.
 *  3. **차별화** — 다른 스테이지와 코스가 달라야 한다. 같은 길을 다시 달리면 티어가
 *     오른 의미가 없다.
 *  4. **티어의 성격** — 티어마다 주로 묻는 것이 달라야 한다.
 *
 * ## 0.5.1 에서 바뀐 것과 그 근거
 *
 * **① 공정성에 하한이 생겼다.** 그전까지 1번 기준은 `passable` 뿐이었는데, 솔버의
 * `passable` 은 여유 3ms 도 참이다. 실제로 12스테이지 중 4개가 사람에게 불가능한
 * 경로를 품고 있었고(티어 1 의 두 스테이지는 16경로 중 8개), 검증은 전부 통과하고
 * 있었다. "보이지 않는 막다른 길 금지"가 형식적으로만 지켜지고 있었던 것이다.
 *
 * 하한을 얼마로 둘지는 다행히 예민하지 않다. 후보들의 최악 여유 분포가 **양극**이라
 * (티어 4 기준 0~10ms 48개 · 60ms 이상 145개 · 그 사이 3개) 30ms 로 잡든 60ms 로
 * 잡든 남는 후보가 같다. 50ms 는 그 골짜기 한가운데다.
 *
 * **② 최소 스프레드 기준을 없앴다.** 후보 900개 × 4티어를 전수로 풀어 보니 스프레드는
 * 어떤 값(0/20/35)에서도 병목이 아니었다. 더 나쁜 것은 방향이다 — 스프레드는 최선과
 * 최악의 차이이므로 **함정이 깊을수록 높은 점수를 받는다.** 실제로 함정이 가장 깊던
 * 두 스테이지의 스프레드가 206ms, 207ms 로 가장 높았다. 하한이 생긴 이상 이 기준은
 * 중복이면서 유해하다.
 *
 * **③ 첫 합격에서 멈추지 않는다.** 그전에는 조건을 만족하는 첫 시드를 잡고 `break`
 * 했다. 그래서 인접 티어가 같은 modal 골격으로 빨려 들어갔고, T2·3 과 T3·1 은 섹터
 * 배열이 **완전히 같아졌다.** 이제 후보를 모두 모은 뒤, 이미 채택한 코스와 같은 자리
 * 섹터가 정해진 수를 넘게 겹치면 건너뛴다(티어를 가로질러 본다).
 *
 * **④ 티어마다 성격을 요구한다.** 시드가 만들 수 있는 골격은 티어당 480여 가지로
 * 충분한데, 기준이 여유만 보니 전부 비슷한 것으로 수렴했다. 무엇을 묻는 티어인지를
 * 기준에 적어 둔다.
 *
 * ## 0.5.2 에서 더해진 것
 *
 * **⑤ 목표 사다리를 도달 가능한 범위로 다시 잡았다.** 공정성 하한이 생긴 뒤의 후보
 * 분포를 재서(티어당 900개 전수) 옮겼다. 그전 190/160/130/100 은 티어 4 에서 도달
 * 불가라 밴드 완화가 상시 걸렸다 — 목표가 목표 노릇을 못 했다.
 *
 * **⑥ 최난 구간의 지속 길이를 티어 지표로 들였다.** 여유의 최솟값만으로는 난이도의
 * 성격을 말할 수 없다 — 한 번의 실수를 묻는 146ms 와 9초 내내 묻는 146ms 는 같은
 * 숫자가 아니다. 티어 4 만 "지속형" 을 요구한다. 경계값은 `./tiers` 에 있고 측정으로
 * 정한다 — 분포가 뾰족한 쪽과 지속되는 쪽으로 갈려 있어 경계가 예민하지 않다.
 *
 * 이것이 티어 4 의 정체성을 바꾼다. 티어 4 는 "더 좁다" 가 아니라 **"더 오래 좁다"** 다.
 *
 * **⑦ 해금이 난이도를 되돌리지 못하게 했다.** ±3 에서 곡선이 역전돼 있었다(티어 3 이
 * 티어 2 보다 쉬웠다). 큐레이션이 ±2 로만 재고 ±3 은 공정성만 물었기 때문이다. 이제
 * 두 상한의 최선 여유 차이를 `AXIS_CAP_DRIFT_MS` 안으로 묶는다.
 *
 * **⑧ 섹터 커버리지를 동점 처리에 넣었다.** 목표 근접도가 비슷한 후보들 사이에서는
 * 아직 안 쓴 섹터를 데려오는 쪽을 고른다. 목표를 희생하지 않으면서 섹터를 고루 쓴다.
 *
 * ## 0.7.0 에서 바뀐 것
 *
 * **⑨ 기체 4종 전부로 잰다 — 이전 판본은 기체 하나의 큐레이션이었다.** 0.6.0 이
 * 부채로 적어 둔 바로 그것이다. 큐레이터는 `BASE_TUNING` 과 `NEUTRAL_BUILD` 로만
 * 채점하고 있었는데, 그 값(각도중심 1.0 · 폭 1.0 · 편향중심 0 · 시작 눈금 0)은
 * **정확히 표준 기체 하나**다. 기체는 축 눈금을 계수로 옮기는 곡선이 다르고 예봉은
 * 시작 눈금까지 다르므로, 같은 코스가 기체마다 다른 문제가 된다 — 그것이 설계 의도지만
 * **어느 기체에게도 불공정해서는 안 된다**는 조건이 걸려 있지 않았다. 실측으로
 * 예봉은 12스테이지 중 5개만 클리어했다(`runner-grades.json`).
 *
 * 기체별로 시드표를 따로 굽는 길도 있었으나 택하지 않았다. 같은 스테이지 번호가
 * 기체마다 다른 코스가 되면 "같은 문제를 다른 기체로" 라는 축이 사라지고, 기록·수집
 * 지문·분석기 표가 전부 갈라진다. 대신 **하나의 시드표를 4기체 전부에서 성립시킨다.**
 *
 *  - **공정성**은 `min`(기체) 으로 본다. 한 기체에게라도 막힌 길이 있으면 탈락이다
 *  - **난이도**는 기체별 최선 여유의 **평균**을 목표 밴드에 넣고, 그 위에
 *    `RUNNER_SPREAD_MS` 로 기체 사이의 편차를 묶는다. 평균만 보면 한 기체가 너그럽고
 *    다른 기체가 가혹한 코스가 목표를 통과해 버린다
 *  - **해금 드리프트**는 `max`(기체) 로 본다
 *
 * **⑩ 최난 구간은 기준 기체(표준)로 잰다.** 지속 길이는 코스의 구조적 성질이고,
 * 기체마다 최선 경로가 달라 4개를 뭉치면 무엇을 말하는 수치인지 흐려진다. 여유와 달리
 * 공정성 문제가 아니므로 기준 하나로 재는 편이 낫다.
 *
 * **⑪ 축 표를 어긋나게 읽던 버그 위에서 구운 표를 버렸다.** 0.6.0 이전의
 * `axes.valueOf` 는 `tick − axisMin` 으로 색인해, `axisMin = −2` 인 큐레이션에서
 * 표를 한 칸씩 어긋나게 읽고 있었다(눈금 0 이 1.0/42/0 이 아니라 0.86/38/−0.12).
 * 0.6.0 의 `curve()` 재작성이 이를 고쳤지만 시드를 다시 굽지 않아, 실려 있던 12스테이지는
 * **없어진 축 표 위에서 고른 것**이었다.
 *
 * **⑫ 섹터가 5개에서 4개로 줄었다**(`course.STAGE_SECTORS`). 한 판을 67초에서 53초로
 * 줄이기 위한 것이고, 게이트가 3개가 되어 경로가 8가지다. 여유의 의미는 그대로다 —
 * 섹터 기하를 건드리지 않았으므로 어느 한 순간의 난이도도 바뀌지 않았다.
 *
 * ## 완화 순서
 *
 * 조건을 다 만족하는 후보가 3개에 못 미치면 **성격 → 지속 → 편차 → 밴드 → 드리프트**
 * 순으로 푼다. **공정성과 차별화는 절대 풀지 않는다.** 함정을 되살리거나 같은 코스를
 * 다시 내느니 목표 여유에서 벗어나는 편이 낫다. 드리프트를 맨 뒤에 두는 것은 ±3 역전이
 * 0.5.2 에서 고친 바로 그 문제이기 때문이다.
 *
 * **지속을 성격보다 뒤에 푸는 이유**(0.5.5 에서 순서를 바꿨다): 지속 규칙은 티어 1~3 에
 * 뾰족함을, 티어 4 에 지속을 요구한다. 먼저 풀면 티어 3 에 지속형 코스가 들어와
 * **티어 4 의 정체성이 흐려진다.** 성격(유형 구성)은 그보다 무른 선호다.
 *
 * **기체 편차를 밴드보다 먼저 푸는 이유**: 편차가 커도 네 기체 모두 공정성 하한은 넘긴
 * 코스다. 목표 여유에서 통째로 벗어나는 것보다는 기체 사이가 고르지 않은 편이 낫다.
 *
 * 실행:
 *   pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts
 *   pnpm exec tsx projects/wave-runner/tests/verify/curate-stages.ts --probe
 *
 * `--probe` 는 시드표를 굽지 않고 **후보 분포만** 낸다. 목표 사다리·최난 구간 경계·
 * 기체 편차 상한은 전부 이 분포에서 읽어 정한 값이라, 구조를 바꾸면(섹터 수, 섹터 풀,
 * 축 표) 먼저 이걸 돌려 상수를 다시 읽어야 한다. `--candidates=N` 으로 표본을 줄인다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyTrade } from "../../app/src/game/axes";
import { STAGE_SECTORS, buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, startYFor } from "../../app/src/game/engine";
import { measure } from "../../app/src/game/geometry";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { RUNNERS, applyRunner } from "../../app/src/game/runners";
import type { Runner } from "../../app/src/game/runners";
import { SECTORS } from "../../app/src/game/sectors";
import { PEAK_RUN_RULE, targetSlackMs } from "./tiers";
import { solveCourse } from "../../app/src/game/solver";
import type { AxisKey, Build, Course, SectorType, Tuning } from "../../app/src/game/types";

const PROBE = process.argv.includes("--probe");
/**
 * 채점을 건너뛰고 `--probe` 가 떨어뜨린 캐시에서 후보를 읽는다.
 *
 * 한 번 전수 채점하는 데 10분쯤 걸리는데 기준 상수는 **조합으로** 시험해야 한다.
 * 기준을 바꾸는 것은 채점 결과를 바꾸지 않으므로(채점은 코스와 솔버만 본다) 같은
 * 캐시 위에서 사다리·밴드·편차 상한을 몇 초 만에 바꿔 볼 수 있다. 섹터 수·섹터 풀·
 * 축 표처럼 **채점을 바꾸는 것**을 건드렸다면 캐시를 다시 떠야 한다.
 */
const FROM_CACHE = process.argv.includes("--from-cache");
const CANDIDATES = Number(process.argv.find((a) => a.startsWith("--candidates="))?.split("=")[1] ?? 900);
/** 굽지 않고 결과만 본다 — 기준을 시험할 때 시드표를 건드리지 않기 위한 것. */
const DRY = process.argv.includes("--dry");

const GATES = STAGE_SECTORS - 1;
const PATHS = 1 << GATES;

const SLACK_BAND_MS = 25;
/**
 * 두 축 상한 사이에서 최선 여유가 흔들려도 되는 폭.
 *
 * **해금은 출발점이 넓어지는 것이지 난이도를 되돌리는 것이 아니다.** ±3 은 게이트
 * 제안을 바꾸므로 같은 코스도 다른 질문이 되는데, 이 값을 묶지 않으면 한 스테이지가
 * ±2 에서 143ms · ±3 에서 200ms 가 되어 해금하는 순간 쉬워진다. 실제로 그래서
 * 티어 곡선이 ±3 에서 역전돼 있었다.
 *
 * 0.5.5 에서 30 → 20 으로 조였다. 30 에서는 티어 1·2 가 −28ms 짜리 후보를 잡아
 * ±3 곡선에서 티어 2 와 3 이 158ms 로 동률이 됐다 — 역전은 아니어도 두 티어가
 * 구분되지 않는다.
 */
const AXIS_CAP_DRIFT_MS = 20;
/**
 * 기체 사이에서 최선 여유가 벌어져도 되는 폭(최대 − 최소).
 *
 * 난이도 밴드를 기체 평균으로 재기 때문에 필요한 짝이다. 평균만 보면 표준에게 200ms
 * 이고 예봉에게 90ms 인 코스가 "목표 145ms" 로 통과해 버린다 — 티어 곡선이 기체마다
 * 다른 사다리가 된다. 값은 `--probe` 의 편차 분포에서 읽는다.
 */
const RUNNER_SPREAD_MS = 70;
/**
 * 목표 근접도가 이만큼 안에서 비슷하면, 아직 안 쓴 섹터를 데려오는 후보를 먼저 고른다.
 * 난이도를 희생하지 않으면서 섹터를 고루 쓰기 위한 동점 처리다.
 */
const COVERAGE_TIE_MS = 16;
/** 출발 정착 구간 — 출발 집합이 점 하나라 좁게 나오는 자리이고 난이도가 아니다. */
const SETTLE_X = 24;
/**
 * 최악 경로도 넘어야 하는 여유. 사람의 탭 타이밍 산포보다 좁은 경로는 이론상 통과
 * 가능해도 통과할 수 없다. **측정값이 아니라 가정이다** — 다만 후보 분포가 양극이라
 * 30~60ms 어디로 잡아도 결과가 같아, 이 가정에 대한 민감도가 낮다.
 *
 * 0.7.0 부터 **네 기체 중 가장 나쁜 기체**의 최악 경로가 이 값을 넘어야 한다.
 */
const FAIRNESS_FLOOR_MS = 50;
/** 이미 채택한 코스와 **같은 자리에 같은 섹터**가 이 개수를 넘으면 거부한다. */
const MAX_SAME_SLOT = 2;

/**
 * 큐레이션은 **출발 상한 ±2** 로 판정한다.
 *
 * 축 상한 ±3 은 해금 상품이므로 처음 이 스테이지를 만나는 사람은 ±2 다. 게이트
 * 제안이 상한에 걸린 쌍을 거르게 된 뒤로는 상한이 제안 자체를 바꾸므로, 넓은
 * 쪽으로 재면 실제로 플레이될 코스가 아닌 것을 재게 된다.
 */
const START_CAP = 2;
const capped = (cap: number): Tuning => ({ ...BASE_TUNING, axisMax: cap, axisMin: -cap });
/** 코스 기하를 뽑을 때 쓰는 튜닝. 섹터·게이트 길이는 기체와 무관하므로 아무 기체나 같다. */
const GEOMETRY_TUNING = capped(START_CAP);

/**
 * 기체마다 둘씩 — 처음 만나는 조건(±2)과 해금한 사람의 조건(±3).
 *
 * `applyRunner` 가 곡선을 튜닝에 접으므로 솔버는 기체를 모른 채 그대로 푼다.
 * 시작 빌드도 기체가 정한다 — 예봉은 눈금 0 에서 출발하지 않는다.
 */
interface Lens {
  runner: Runner;
  start: Tuning;
  open: Tuning;
}
const LENSES: Lens[] = RUNNERS.map((runner) => ({
  runner,
  start: applyRunner(capped(START_CAP), runner),
  open: applyRunner(capped(3), runner)
}));
/** 최난 구간을 재는 기준 기체. 구조적 성질이라 하나로 재는 편이 뜻이 분명하다. */
const REFERENCE = LENSES[0];

const tradeWith = (t: Tuning) => (b: Build, tr: { plus: keyof Build; minus: keyof Build }) =>
  applyTrade(b, { plus: tr.plus as AxisKey, minus: tr.minus as AxisKey }, t);

const LANES_OF = (path: number): Array<"top" | "bot"> => {
  const lanes: Array<"top" | "bot"> = [];
  for (let g = 0; g < GATES; g += 1) lanes.push((path >> g) & 1 ? "bot" : "top");
  return lanes;
};

interface Sweep {
  allPassable: boolean;
  best: number;
  worst: number;
  bestPath: number;
}

/** 한 기체·한 상한에서 전 경로를 풀어 통과 여부와 여유 범위를 낸다(ms). */
function sweep(course: Course, startY: number, lens: Lens, tuning: Tuning): Sweep {
  const trade = tradeWith(tuning);
  let best = 0;
  let worst = Number.POSITIVE_INFINITY;
  let bestPath = 0;
  let allPassable = true;

  for (let path = 0; path < PATHS; path += 1) {
    const res = solveCourse(
      course.pieces, { ...lens.runner.startBuild }, tuning, startY, LANES_OF(path), trade, 1 / 90
    );
    if (!res.passable) {
      allPassable = false;
      continue;
    }
    const ms = res.minSlackSec * 1000;
    if (ms > best) {
      best = ms;
      bestPath = path;
    }
    worst = Math.min(worst, ms);
  }
  return { allPassable, best, worst: Number.isFinite(worst) ? worst : 0, bestPath };
}

/**
 * 최선 경로에서 최난 구간이 이어지는 최대 길이.
 *
 * 최선×1.25 이내를 "최난 구간" 으로 본다. 절대값이 아니라 그 스테이지 자신의 최난
 * 대비로 재는 이유는, 묻는 것이 "얼마나 좁은가" 가 아니라 **"가장 좁은 상태가 얼마나
 * 오래 가는가"** 이기 때문이다.
 */
function peakRunOf(course: Course, startY: number, s: Sweep): number {
  const res = solveCourse(
    course.pieces,
    { ...REFERENCE.runner.startBuild },
    REFERENCE.start,
    startY,
    LANES_OF(s.bestPath),
    tradeWith(REFERENCE.start),
    1 / 90,
    true
  );
  const limit = s.best * 1.25;
  let run = 0;
  let peak = 0;
  for (const piece of res.perPiece) {
    const t = piece.trace;
    if (!t) continue;
    for (let k = 0; k < t.survival.length; k += 1) {
      if (t.startX + k * t.dx < SETTLE_X) continue;
      const ms = (measure(t.survival[k]) / (2 * t.rate)) * 1000;
      if (ms <= limit) {
        run += t.dx;
        if (run > peak) peak = run;
      } else {
        run = 0;
      }
    }
  }
  return Math.round(peak);
}

interface Score {
  allPassable: boolean;
  /** 기체별 최선 여유의 평균 — 난이도 밴드가 보는 값 */
  bestMs: number;
  /** 네 기체 중 가장 나쁜 최악 경로 — 공정성이 보는 값 */
  worstMs: number;
  /** 기체 사이 최선 여유의 최대 − 최소 */
  runnerSpreadMs: number;
  /** ±3 에서의 최선 여유가 ±2 대비 흔들린 폭의 최댓값(기체 가로질러) */
  driftMs: number;
  /** 최난 구간이 이어지는 최대 길이(월드 단위). 뾰족한가 평평한가 */
  peakRun: number;
  /** 기체별 최선 여유 — 보고용 */
  perRunner: number[];
}

const EMPTY: Score = {
  allPassable: false, bestMs: 0, worstMs: 0, runnerSpreadMs: 0, driftMs: 0, peakRun: 0, perRunner: []
};

/**
 * 여유 목표는 처음 만나는 조건(±2)으로 재고, 공정성은 두 상한 · 네 기체 모두에서 묻는다.
 * 축 상한을 해금했다고, 혹은 기체를 바꿨다고 보이지 않는 막다른 길이 생기면
 * 그건 해금도 베리에이션도 아니라 함정이다.
 */
function score(seed: number, tier: number): Score {
  const course = buildStageCourse(tier, 1, GEOMETRY_TUNING, seed);
  const startY = startYFor(course);

  const starts: Sweep[] = [];
  for (const lens of LENSES) {
    const s = sweep(course, startY, lens, lens.start);
    if (!s.allPassable) return EMPTY;
    starts.push(s);
  }

  const bests = starts.map((s) => s.best);
  const worstMs = Math.min(...starts.map((s) => s.worst));
  const bestMs = bests.reduce((a, b) => a + b, 0) / bests.length;
  // 공정성 하한에서 떨어질 후보에 ±3 사웝과 추적 솔브를 쓰지 않는다 — 여기가 가장 비싼 자리다.
  if (worstMs < FAIRNESS_FLOOR_MS) return { ...EMPTY, bestMs, worstMs, perRunner: bests };

  let driftMs = 0;
  for (let i = 0; i < LENSES.length; i += 1) {
    const open = sweep(course, startY, LENSES[i], LENSES[i].open);
    if (!open.allPassable) return EMPTY;
    driftMs = Math.max(driftMs, Math.abs(open.best - starts[i].best));
  }

  return {
    allPassable: true,
    bestMs,
    worstMs,
    runnerSpreadMs: Math.max(...bests) - Math.min(...bests),
    driftMs,
    peakRun: peakRunOf(course, startY, starts[0]),
    perRunner: bests
  };
}

/**
 * 티어마다 주로 묻는 것. 유형 구성으로 표현한다.
 *
 * 자리가 5개에서 4개로 줄어 개수 기준을 다시 읽었다. 티어 1 은 4자리 중 3자리를
 * 요구하면 후보가 말라 2자리(절반)로 내렸다 — 5자리 시절의 3/5 과 같은 비율이다.
 */
const TIER_CHARACTER: Record<number, { note: string; holds: (types: SectorType[]) => boolean }> = {
  1: {
    note: "협곡·회랑 위주 — 동사를 몸에 익히는 자리",
    holds: (t) => t.filter((x) => x === "gorge" || x === "corridor").length >= 2
  },
  2: { note: "산개 2개 이상 — 경로를 엮는다", holds: (t) => t.filter((x) => x === "scatter").length >= 2 },
  3: { note: "맥동 2개 이상 — 타이밍을 묻는다", holds: (t) => t.filter((x) => x === "pulse").length >= 2 },
  4: { note: "3유형 이상 — 종합", holds: (t) => new Set(t).size >= 3 }
};

interface Candidate {
  seed: number;
  s: Score;
  ids: string[];
  types: SectorType[];
}

const sectorsOf = (tier: number, seed: number) => {
  const pieces = buildStageCourse(tier, 1, GEOMETRY_TUNING, seed).pieces.filter((p) => p.kind === "sector");
  return {
    ids: pieces.map((p) => p.sector!.id),
    types: pieces.map((p) => p.sector!.type)
  };
};

const sameSlots = (a: string[], b: string[]) => a.filter((v, i) => v === b[i]).length;

const seedFor = (tier: number, i: number) => (tier * 7919 + i * 2654435761) >>> 0;

const quantiles = (xs: number[], qs: number[]) => {
  const a = [...xs].sort((p, q) => p - q);
  return qs.map((q) => (a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : NaN));
};

/* ------------------------------------------------------------------ 분포 조사 */

if (PROBE) {
  console.log(
    `분포 조사 — 섹터 ${STAGE_SECTORS} · 게이트 ${GATES} · 경로 ${PATHS} · 기체 ${RUNNERS.length}종 · 후보 ${CANDIDATES}/티어\n`
  );
  /**
   * 채점 결과를 통째로 떨어뜨린다. 한 번 채점하는 데 티어당 몇 분이 들고 상수는
   * 조합으로 시험해야 하므로, 상수를 바꿀 때마다 다시 푸는 것은 낭비다.
   * 기준을 바꿔 보는 쪽은 이 파일만 읽으면 된다.
   */
  const cache: Array<{ tier: number; seed: number; s: Score; ids: string[]; types: SectorType[] }> = [];
  for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    const pool: Candidate[] = [];
    let nPassable = 0;
    for (let i = 0; i < CANDIDATES; i += 1) {
      const seed = seedFor(tier, i);
      const s = score(seed, tier);
      if (s.perRunner.length > 0) nPassable += 1;
      if (!s.allPassable) continue;
      const c = { seed, s, ...sectorsOf(tier, seed) };
      pool.push(c);
      cache.push({ tier, ...c });
    }
    const bests = pool.map((c) => c.s.bestMs);
    const spreads = pool.map((c) => c.s.runnerSpreadMs);
    const peaks = pool.map((c) => c.s.peakRun);
    const drifts = pool.map((c) => c.s.driftMs);
    const q = (xs: number[]) =>
      quantiles(xs, [0, 0.1, 0.5, 0.9, 0.99]).map((v) => v.toFixed(0).padStart(5)).join(" ");
    console.log(`티어 ${tier}  전기체통과 ${nPassable}/${CANDIDATES} → 공정성 통과 ${pool.length}`);
    if (pool.length === 0) {
      console.log("        후보 없음\n");
      continue;
    }
    console.log(`                    최소   p10   p50   p90   p99`);
    console.log(`        최선여유(평균) ${q(bests)}  (현 목표 ${targetSlackMs(tier)} ±${SLACK_BAND_MS})`);
    console.log(`        기체편차       ${q(spreads)}  (현 상한 ${RUNNER_SPREAD_MS})`);
    console.log(`        최난구간       ${q(peaks)}`);
    console.log(`        해금드리프트   ${q(drifts)}  (현 상한 ${AXIS_CAP_DRIFT_MS})`);
    const chars = pool.filter((c) => TIER_CHARACTER[tier].holds(c.types)).length;
    const band = pool.filter((c) => Math.abs(c.s.bestMs - targetSlackMs(tier)) <= SLACK_BAND_MS).length;
    const peakOk = pool.filter((c) => PEAK_RUN_RULE[tier](c.s.peakRun)).length;
    const spreadOk = pool.filter((c) => c.s.runnerSpreadMs <= RUNNER_SPREAD_MS).length;
    const driftOk = pool.filter((c) => c.s.driftMs <= AXIS_CAP_DRIFT_MS).length;
    console.log(
      `        현 기준 각각 남는 수 — 성격 ${chars} · 밴드 ${band} · 지속 ${peakOk} · 편차 ${spreadOk} · 드리프트 ${driftOk}`
    );
    const joint = pool.filter(
      (c) =>
        TIER_CHARACTER[tier].holds(c.types) &&
        Math.abs(c.s.bestMs - targetSlackMs(tier)) <= SLACK_BAND_MS &&
        PEAK_RUN_RULE[tier](c.s.peakRun) &&
        c.s.runnerSpreadMs <= RUNNER_SPREAD_MS &&
        c.s.driftMs <= AXIS_CAP_DRIFT_MS
    ).length;
    console.log(`        전부 동시에 만족 ${joint} (필요 ${STAGES_PER_TIER})\n`);
  }
  const cacheOut = process.env.CURATE_CACHE;
  if (cacheOut) {
    writeFileSync(cacheOut, `${JSON.stringify(cache)}\n`, "utf8");
    console.log(`채점 ${cache.length}건을 ${cacheOut} 에 떨어뜨렸다.`);
  }
  process.exit(0);
}

/* -------------------------------------------------------------------- 큐레이션 */

const table: Record<string, number> = {};
/** 차별화는 티어를 가로질러 본다 — T2·3 과 T3·1 이 같아졌던 것이 그래서다. */
const takenCourses: string[][] = [];
/** 커버리지 동점 처리용 — 지금까지 한 번이라도 쓴 섹터. */
const usedSectors = new Set<string>();
const lines: string[] = [];

interface Gates {
  peak: boolean;
  character: boolean;
  spread: boolean;
  band: boolean;
  drift: boolean;
}
const ALL_GATES: Gates = { peak: true, character: true, spread: true, band: true, drift: true };

/** `--from-cache` 일 때만 채워진다. 티어별로 미리 갈라 둔다. */
const cached = new Map<number, Candidate[]>();
if (FROM_CACHE) {
  const file = process.env.CURATE_CACHE;
  if (!file) throw new Error("--from-cache 에는 CURATE_CACHE 환경변수가 필요하다.");
  const rows: Array<{ tier: number; seed: number; s: Score; ids: string[]; types: SectorType[] }> = JSON.parse(
    readFileSync(file, "utf8")
  );
  for (const r of rows) {
    const list = cached.get(r.tier) ?? [];
    list.push({ seed: r.seed, s: r.s, ids: r.ids, types: r.types });
    cached.set(r.tier, list);
  }
  console.log(`캐시에서 후보 ${rows.length}건을 읽었다 — 채점은 건너뛴다(${file}).\n`);
}

for (let tier = 1; tier <= MAX_TIER; tier += 1) {
  let pool: Candidate[] = [];
  let nPassable = -1;
  if (FROM_CACHE) {
    pool = cached.get(tier) ?? [];
  } else {
    nPassable = 0;
    for (let i = 0; i < CANDIDATES; i += 1) {
      const seed = seedFor(tier, i);
      const s = score(seed, tier);
      if (s.perRunner.length > 0) nPassable += 1;
      // 공정성은 절대 풀지 않는 관문이다.
      if (!s.allPassable) continue;
      pool.push({ seed, s, ...sectorsOf(tier, seed) });
    }
  }

  const picked: Candidate[] = [];
  const admits = (c: Candidate, g: Gates) =>
    (!g.band || Math.abs(c.s.bestMs - targetSlackMs(tier)) <= SLACK_BAND_MS) &&
    (!g.drift || c.s.driftMs <= AXIS_CAP_DRIFT_MS) &&
    (!g.spread || c.s.runnerSpreadMs <= RUNNER_SPREAD_MS) &&
    (!g.peak || PEAK_RUN_RULE[tier](c.s.peakRun)) &&
    (!g.character || TIER_CHARACTER[tier].holds(c.types)) &&
    !picked.includes(c) &&
    takenCourses.every((t) => sameSlots(t, c.ids) <= MAX_SAME_SLOT);

  /**
   * 목표에 가장 가까운 것을 고르되, `COVERAGE_TIE_MS` 안에서 비슷한 후보들 사이에서는
   * 아직 안 쓴 섹터를 더 많이 데려오는 쪽을 택한다. 매번 다시 훑는 이유는 채택할
   * 때마다 "안 쓴 섹터" 집합과 중복 제약이 함께 바뀌기 때문이다.
   */
  const take = (g: Gates) => {
    while (picked.length < STAGES_PER_TIER) {
      const avail = pool.filter((c) => admits(c, g));
      if (avail.length === 0) return;
      const dist = (c: Candidate) => Math.abs(c.s.bestMs - targetSlackMs(tier));
      const nearest = Math.min(...avail.map(dist));
      const tied = avail.filter((c) => dist(c) <= nearest + COVERAGE_TIE_MS);
      tied.sort((a, b) => {
        const na = new Set(a.ids.filter((id) => !usedSectors.has(id))).size;
        const nb = new Set(b.ids.filter((id) => !usedSectors.has(id))).size;
        return nb - na || dist(a) - dist(b);
      });
      const chosen = tied[0];
      picked.push(chosen);
      takenCourses.push(chosen.ids);
      chosen.ids.forEach((id) => usedSectors.add(id));
    }
  };

  // 완화 순서 — 공정성과 차별화는 여기 없다. 절대 풀지 않는다.
  const relaxations: Array<[string, Gates]> = [
    ["완화 없음", ALL_GATES],
    ["성격 완화", { ...ALL_GATES, character: false }],
    ["지속까지 완화", { ...ALL_GATES, character: false, peak: false }],
    ["기체편차까지 완화", { ...ALL_GATES, character: false, peak: false, spread: false }],
    ["밴드까지 완화", { peak: false, character: false, spread: false, band: false, drift: true }],
    ["드리프트까지 완화", { peak: false, character: false, spread: false, band: false, drift: false }]
  ];
  let usedRelaxation = relaxations[0][0];
  for (const [label, gates] of relaxations) {
    take(gates);
    usedRelaxation = label;
    if (picked.length >= STAGES_PER_TIER) break;
  }

  // 티어 안에서는 쉬운 것부터 — 같은 티어라도 1 → 3 으로 갈수록 조여지는 편이 낫다.
  picked.sort((a, b) => b.s.bestMs - a.s.bestMs);

  lines.push(
    `티어 ${tier}  ${TIER_CHARACTER[tier].note}\n` +
      `        전기체통과 ${nPassable < 0 ? "캐시" : `${nPassable}/${CANDIDATES}`}` +
      ` → 공정성 하한 통과 ${pool.length} → 채택 ${picked.length}/${STAGES_PER_TIER} (${usedRelaxation})`
  );
  picked.forEach((c, i) => {
    // 시드표 키는 `tier:no` 다. meta 의 `stageKey` 는 기체가 붙은 다른 키이고,
    // course.ts 의 SEEDS 조회가 이 형식을 읽는다.
    table[`${tier}:${i + 1}`] = c.seed;
    const off = c.s.bestMs - targetSlackMs(tier);
    const per = c.s.perRunner.map((v, k) => `${RUNNERS[k].name} ${v.toFixed(0)}`).join(" · ");
    lines.push(
      `  ${tier}·${i + 1}  seed ${String(c.seed).padStart(10)}` +
        `  최선 ${c.s.bestMs.toFixed(0).padStart(3)}ms (목표 ${targetSlackMs(tier)}, ${off >= 0 ? "+" : ""}${off.toFixed(0)})` +
        `  최악 ${c.s.worstMs.toFixed(0).padStart(3)}ms` +
        `  기체편차 ${c.s.runnerSpreadMs.toFixed(0).padStart(3)}ms` +
        `  해금드리프트 ${c.s.driftMs.toFixed(0)}ms` +
        `  최난구간 ${String(c.s.peakRun).padStart(3)}단위\n` +
        `         ${c.ids.join(" → ")}\n` +
        `         기체별 최선 ${per}`
    );
  });
  if (picked.length < STAGES_PER_TIER) {
    lines.push(`  ⚠ 티어 ${tier}: 후보가 모자란다. CANDIDATES 를 늘리거나 목표를 조정해야 한다.`);
  }
}

lines.forEach((l) => console.log(l));

// 얻어진 차별화와 커버리지를 그 자리에서 확인한다 — 기준이 실제로 먹었는지는 결과로만 안다.
let worstOverlap = 0;
for (let i = 0; i < takenCourses.length; i += 1)
  for (let j = i + 1; j < takenCourses.length; j += 1)
    worstOverlap = Math.max(worstOverlap, sameSlots(takenCourses[i], takenCourses[j]));
const missing = SECTORS.filter((x) => !usedSectors.has(x.id)).map((x) => x.id);
console.log(
  `\n코스 중복 최악 ${worstOverlap}/${STAGE_SECTORS} (기준 ${MAX_SAME_SLOT})` +
    `   섹터 커버리지 ${usedSectors.size}/${SECTORS.length}` +
    (missing.length ? `   미등장: ${missing.join(", ")}` : "")
);

if (DRY) {
  console.log("\n--dry — 시드표를 굽지 않았다.");
} else {
  const out = path.join(fileURLToPath(new URL("../../app/src/game/stage-seeds.json", import.meta.url)));
  writeFileSync(out, `${JSON.stringify(table, null, 2)}\n`, "utf8");
  console.log(`${Object.keys(table).length}개 시드를 ${path.basename(out)} 에 구웠다.`);
}
