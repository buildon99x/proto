import { mulberry32 } from "./rand";
import type { AxisKey, AxisTrade, Build, Tuning } from "./types";

/**
 * 축 눈금 −3..+3 을 실제 계수로 옮기는 표.
 *
 * 눈금 0 이 1단계 기저 비행과 같은 값이다 — 문법도 기준선도 바뀌지 않고,
 * 바뀌는 것은 그 하나의 동작을 얼마나 날카롭게 / 빠르게 / 치우치게 수행하느냐뿐이다.
 *
 * **이 표는 표준 기체의 것이고, 기체는 이 표를 다시 읽는 방식이 다르다**(아래 `curve`).
 */
const TABLE: Record<AxisKey, number[]> = {
  //         −3    −2    −1     0    +1    +2    +3
  slope: [0.62, 0.74, 0.86, 1.0, 1.16, 1.34, 1.54],
  speed: [30, 34, 38, 42, 47, 52, 58],
  bias: [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36]
};

const TABLE_MID = 3;

/**
 * 표를 **소수 눈금**에서 읽는다. 폭(span)이 눈금을 늘이거나 줄여 읽게 하는 장치이고,
 * 정수 눈금에서 폭 1.0 이면 표의 값을 그대로 돌려준다 — 그래서 **표준 기체의 계수는
 * 2단계의 표와 소수점까지 같고**, 그 위에서 구운 스테이지 시드와 여유 수치가 그대로 산다.
 *
 * 표 밖(|눈금×폭| > 3)은 끝의 비율로 기하 외삽한다. 잘라 버리면 폭이 큰 기체에서
 * +2 와 +3 이 같은 값이 되어 **그 기체만 축이 죽는다.**
 */
function readTable(axis: AxisKey, tick: number): number {
  const table = TABLE[axis];
  const pos = tick + TABLE_MID;
  if (pos >= 0 && pos <= table.length - 1) {
    const lo = Math.floor(pos);
    const hi = Math.min(table.length - 1, lo + 1);
    return table[lo] + (table[hi] - table[lo]) * (pos - lo);
  }
  if (axis === "bias") {
    // 편향은 원래 선형이므로 외삽도 선형이다.
    return table[TABLE_MID] + (table[TABLE_MID + 1] - table[TABLE_MID]) * tick;
  }
  if (pos > table.length - 1) {
    const last = table[table.length - 1];
    const ratio = last / table[table.length - 2];
    return last * Math.pow(ratio, pos - (table.length - 1));
  }
  const first = table[0];
  const ratio = first / table[1];
  return first * Math.pow(ratio, -pos);
}

/**
 * 기체의 곡선으로 읽은 축 값.
 *
 * - **중심**은 눈금 0 의 값을 통째로 민다. 부호를 바꾸지 못한다
 * - **폭**은 눈금 한 칸의 크기다. 여기서 양날이 나온다 — 좁으면 극단이 없고 넓으면 다루기 어렵다
 *
 * 편향에는 중심이 없다. 0 을 중심으로 대칭인 축이라 중심을 밀면 "가만히 두면 한쪽으로
 * 흐른다"가 기체의 성질이 되어, 세 축의 합이 0 이라는 불변식과 어긋난다.
 */
function curve(axis: AxisKey, tick: number, t: Tuning): number {
  if (axis === "slope") return t.slope * t.slopeCenter * (readTable("slope", tick * t.slopeSpan) / TABLE.slope[TABLE_MID]);
  if (axis === "speed") return t.speed * t.speedCenter * (readTable("speed", tick * t.speedSpan) / TABLE.speed[TABLE_MID]);
  return readTable("bias", tick * t.biasSpan) + t.bias;
}

/**
 * 편향의 절대 상한. |편향| ≥ 1 이면 한쪽 수직 속도가 0 이하가 되어 **중립이 생긴다** —
 * "가만히 있는 선택지는 없다"는 문법층의 첫 조항이 깨진다. 폭이 큰 기체에서 실제로
 * 닿을 수 있는 거리이므로 규칙으로 막는다. `runner-probe.ts` 가 이 불변식을 검사한다.
 */
const BIAS_LIMIT = 0.92;

export const AXES: AxisKey[] = ["slope", "speed", "bias"];

export const AXIS_LABEL: Record<AxisKey, string> = {
  slope: "각도",
  speed: "속도",
  bias: "편향"
};

/** 축마다 색을 고정한다. 런 내내 바뀌지 않으므로 형태를 읽기 전에 색으로 판별된다. */
export const AXIS_COLOR: Record<AxisKey, string> = {
  slope: "#3de1ff",
  speed: "#ffb347",
  bias: "#e07bff"
};

export const NEUTRAL_BUILD: Build = { slope: 0, speed: 0, bias: 0 };

export function clampAxis(value: number, t: Tuning): number {
  return Math.max(t.axisMin, Math.min(t.axisMax, Math.round(value)));
}

function valueOf(axis: AxisKey, tick: number, t: Tuning): number {
  const v = curve(axis, clampAxis(tick, t), t);
  if (axis === "bias") return Math.max(-BIAS_LIMIT, Math.min(BIAS_LIMIT, v));
  return v;
}

export interface Resolved {
  slope: number;
  speed: number;
  /** 상승 시 수직 속도 크기 */
  riseRate: number;
  /** 하강 시 수직 속도 크기 */
  fallRate: number;
}

/**
 * 빌드를 실제 물리 계수로 푼다.
 *
 * 편향은 상승과 하강의 속도를 서로 반대로 민다. 편향이 걸린 기체는
 * 가만 두면 한쪽으로 흐르므로, **올라가는 통로와 내려가는 통로에서 유불리가 뒤집힌다.**
 * 3축 중 이것만이 구간 유형에 따라 부호가 바뀌는 성질을 설계상 보장한다.
 */
export function resolve(build: Build, t: Tuning): Resolved {
  const slope = valueOf("slope", build.slope, t);
  const speed = valueOf("speed", build.speed, t);
  const bias = valueOf("bias", build.bias, t);
  return {
    slope,
    speed,
    riseRate: slope * (1 + bias) * speed,
    fallRate: slope * (1 - bias) * speed
  };
}

/** 빌드가 적용된 튜닝. 카메라·솔버 등 Tuning 을 받는 쪽이 그대로 쓴다. */
export function applyBuild(base: Tuning, build: Build): Tuning {
  const r = resolve(build, base);
  return { ...base, slope: r.slope, speed: r.speed, bias: valueOf("bias", build.bias, base) };
}

export function applyTrade(build: Build, trade: { plus: AxisKey; minus: AxisKey }, t: Tuning): Build {
  return {
    ...build,
    [trade.plus]: clampAxis(build[trade.plus] + 1, t),
    [trade.minus]: clampAxis(build[trade.minus] - 1, t)
  };
}

/** 이미 극단에 닿아 더 올릴 수 없는 축은 게이트 제안에서 빠진다. */
export function canOffer(build: Build, trade: { plus: AxisKey; minus: AxisKey }, t: Tuning): boolean {
  return build[trade.plus] < t.axisMax && build[trade.minus] > t.axisMin;
}

export function tradeLabel(trade: { plus: AxisKey; minus: AxisKey }): string {
  return `${AXIS_LABEL[trade.plus]}+ ${AXIS_LABEL[trade.minus]}−`;
}

const ALL_TRADES: AxisTrade[] = AXES.flatMap((plus) =>
  AXES.filter((minus) => minus !== plus).map((minus) => ({ plus, minus }))
);

/**
 * 게이트가 내놓을 두 제안.
 *
 * **빌드를 입력으로 받는 것이 핵심이다.** 코스를 조립할 때 미리 뽑아 두면 그 사이
 * 플레이어의 축이 상한에 닿아, 오를 축은 삼켜지고 내릴 축만 먹히는 일이 생긴다 —
 * 화면은 여전히 화살표와 막대를 그리는데 실제로는 순손해다. 그래서 제안은 지날
 * 때가 되어서야 정해지고, `canOffer` 로 양쪽이 모두 살아 있는 쌍만 남긴다.
 *
 * 시드가 고정이므로 (코스 시드, 지나온 선택)이 같으면 제안도 같다 —
 * "같은 스테이지는 같은 코스"는 그대로다.
 */
export function gateOffer(seed: number, build: Build, t: Tuning): { top: AxisTrade; bot: AxisTrade } {
  const rand = mulberry32(seed);
  const usable = ALL_TRADES.filter((trade) => canOffer(build, trade, t));
  // 모든 축이 막힌 빌드는 세 축 합이 0 인 이상 나오지 않지만, 상한을 바꾸는
  // 개발 패널 같은 경로가 있으므로 전체 목록으로 물러난다.
  const pool = usable.length >= 2 ? usable : ALL_TRADES;
  const i = Math.floor(rand() * pool.length);
  let j = Math.floor(rand() * (pool.length - 1));
  if (j >= i) j += 1;
  return { top: pool[i], bot: pool[j] };
}
