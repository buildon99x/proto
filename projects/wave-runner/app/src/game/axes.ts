import type { AxisKey, Build, Tuning } from "./types";

/**
 * 축 눈금 −3..+3 을 실제 계수로 옮기는 표.
 *
 * 눈금 0 이 1단계 기저 비행과 같은 값이다 — 문법도 기준선도 바뀌지 않고,
 * 바뀌는 것은 그 하나의 동작을 얼마나 날카롭게 / 빠르게 / 치우치게 수행하느냐뿐이다.
 */
const TABLE: Record<AxisKey, number[]> = {
  //         −3    −2    −1     0    +1    +2    +3
  slope: [0.62, 0.74, 0.86, 1.0, 1.16, 1.34, 1.54],
  speed: [30, 34, 38, 42, 47, 52, 58],
  bias: [-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36]
};

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
  const idx = clampAxis(tick, t) - t.axisMin;
  const table = TABLE[axis];
  return table[Math.max(0, Math.min(table.length - 1, idx))];
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
