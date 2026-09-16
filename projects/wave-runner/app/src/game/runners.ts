import type { Build, RunnerId, Tuning } from "./types";

/**
 * 기체 — 축 눈금을 실제 계수로 옮기는 **곡선**이 다른 것이지, 시작 눈금만 다른 것이 아니다.
 *
 * 프리셋(시작 오프셋)과 기체를 둘 다 두면 홈 화면의 선택이 2단이 되고 인지 비용이 두 배다.
 * 기체가 시작 빌드까지 정하고 프리셋은 흡수됐다.
 *
 * ## 이번 범위는 각도뿐이다
 *
 * 측정해 보면 **전진 속도는 지그재그 각도를 전혀 바꾸지 않는다**
 * (`tests/verify/angles.ts`). 각도는 `atan(rate / speed)` 이고
 * `rate = slope × (1 ± bias) × speed` 라 속도가 약분되기 때문이다. 그래서 각도 베리에이션은
 * `slopeCenter` · `slopeSpan` · `biasSpan` 셋으로 완결되고, 속도 곡선
 * (`speedCenter` / `speedSpan`)은 전 기체가 1.0 — 다음 단계의 자리다.
 *
 * ## 중심과 폭
 *
 * **양날은 폭이 아니라 중심에서 나온다 — 측정으로 뒤집힌 결론이다.**
 *
 * 기획 단계의 가설은 반대였다: 폭이 양날이고(좁으면 램프를 못 따라가고 넓으면 다루기 어렵다)
 * 중심은 난이도 슬라이더라고 봤다. `runner-probe.ts` 로 재 보니 **폭은 전 섹터에서 좁을수록
 * 유리했다** — 하방이 없으면 축이 아니라 스탯이라는, 2단계에서 관성과 크기를 탈락시킨 바로
 * 그 모양이다. 반대로 중심은 부호가 뒤집혔다. 완만한 기체는 미세 조정이 필요한 곳에서 낫고
 * 램프를 쫓아야 하는 곳에서 못하다.
 *
 * 그래서 기체의 정체성은 **중심**이 지고, 폭은 그 위에 얹는 **난이도 성분**으로 쓴다.
 * 편향 폭만은 예외다 — 편향에는 부호가 있어 오르는 회랑과 내려가는 회랑에서 유불리가
 * 그대로 뒤집힌다.
 *
 * `tests/verify/runner-probe.ts` 가 그 양날을 수용 시험으로 검사한다.
 */
export interface Runner {
  id: RunnerId;
  name: string;
  /** 한 줄 — 무엇을 묻는 기체인가 */
  note: string;
  /** 눈금 0 의 각도를 통째로 민다 (1.0 = 표준) */
  slopeCenter: number;
  /** 각도 눈금 한 칸의 크기 (1.0 = 표준) */
  slopeSpan: number;
  /** 편향 눈금 한 칸의 크기 (1.0 = 표준) */
  biasSpan: number;
  /**
   * 눈금 0 의 편향 — **영구적인 치우침**. 0 이면 눈금 0 에서 상승과 하강이 대칭이다.
   *
   * 축 합 불변식(`slope + speed + bias == 0`)은 **눈금**의 합이지 값의 합이 아니므로
   * 여기에 중심을 넣어도 불변식은 그대로다. 기획 단계에서 이걸 반대로 적어 편향 중심을
   * 배제했는데, 프로브가 그 판단을 뒤집었다 — 편향은 부호가 있어 오르는 회랑과 내려가는
   * 회랑에서 유불리가 정확히 뒤집히므로, **가장 깨끗한 양날이 여기서 나온다.**
   */
  biasCenter: number;
  startBuild: Build;
}

/**
 * 실루엣은 손으로 그리지 않고 곡선에서 파생시킨다.
 *
 * "실루엣이 곧 성능 설명서"를 리뷰 노트가 아니라 **코드가 지키게** 하려면 모양이 수치의
 * 함수여야 한다. 그래서 프로브가 정체성으로 지목한 두 값에 묶는다 — 코의 기울기는
 * **각도 중심**(가파른 기체는 코가 가파르다), 위아래 비대칭은 **편향 중심**(위로 흐르는
 * 기체는 위쪽이 두껍다). 폭은 꼬리의 두께로만 나타난다.
 *
 * 히트박스는 모든 기체가 `radius` 로 같다(크기는 하방이 없어 축에서 탈락한 스탯이다).
 * 보이는 것과 판정이 어긋나 보이지 않도록 **모든 실루엣을 같은 외접원에 정규화**한다.
 */
export interface Silhouette {
  /** 외접원 반지름 1 로 정규화된 다각형 */
  points: Array<[number, number]>;
}

export function silhouetteOf(runner: Runner): Silhouette {
  // 뒤로 젖혀진 두 날은 **실제 상승·하강 각도 그대로** 뻗는다. 그래서 코가 벌어진 각이
  // 곧 그 기체의 꼭지각이고(표준 90° · 둔각 79° · 예봉 102°), 눈으로 잰 것이 손끝과 같다.
  const riseAng = Math.atan(runner.slopeCenter * (1 + runner.biasCenter));
  const fallAng = Math.atan(runner.slopeCenter * (1 - runner.biasCenter));
  // 날의 길이도 치우침을 따라 갈린다. 각도 차이(몇 도)만으로는 눈에 띄지 않아서,
  // 위로 흐르는 기체는 위 날이 눈에 띄게 길다.
  const lenUp = 1.25 * (1 + runner.biasCenter * 1.8);
  const lenDown = 1.25 * (1 - runner.biasCenter * 1.8);
  // 꼬리의 파임은 폭의 역수다 — 극단이 없는 기체일수록 뭉툭하다.
  const notch = 0.75 / Math.max(0.5, runner.slopeSpan);

  const raw: Array<[number, number]> = [
    [1, 0],
    [1 - lenUp * Math.cos(riseAng), -lenUp * Math.sin(riseAng)],
    [1 - notch, 0],
    [1 - lenDown * Math.cos(fallAng), lenDown * Math.sin(fallAng)]
  ];
  // 히트박스는 전부 같으므로 외접원도 같아야 한다 — 보이는 것과 판정이 어긋나 보이면 안 된다.
  const max = Math.max(...raw.map(([x, y]) => Math.hypot(x, y)));
  return { points: raw.map(([x, y]) => [x / max, y / max] as [number, number]) };
}

/**
 * 기획서의 여섯 중 넷이 빠졌다가 셋이 남았다. 둘 다 프로브가 정한 것이다.
 *
 * - **각인**(속도 중심·폭이 정체성) — 속도 곡선이 들어오기 전에는 표준과 구분되지 않는다.
 * - **잔상**(가장 넓은 폭) — 폭만 넓은 기체는 **전 섹터에서 불리했다**(−10~−32%).
 *   하방이 아니라 상방이 없는 것이라 방향만 반대일 뿐, 축이 아니라 스탯인 것은 같다.
 *   잔상의 정체성은 원래 재생 스킬의 대가였으므로 스킬 단계에서 다시 본다.
 */
export const RUNNERS: Runner[] = [
  {
    id: "dart",
    name: "표준",
    note: "45° 기준선. 모든 측정의 기준",
    slopeCenter: 1.0,
    slopeSpan: 1.0,
    biasSpan: 1.0,
    biasCenter: 0,
    startBuild: { slope: 0, speed: 0, bias: 0 }
  },
  {
    id: "blunt",
    name: "둔각",
    note: "완만하다. 미세 조정이 필요한 곳에 강하고 램프를 못 따라간다",
    slopeCenter: 0.82,
    slopeSpan: 0.8,
    biasSpan: 0.9,
    biasCenter: 0,
    startBuild: { slope: 0, speed: 0, bias: 0 }
  },
  {
    id: "spike",
    name: "예봉",
    note: "가파르다. 램프를 따라잡지만 좁은 통로에서 오버슈트한다",
    slopeCenter: 1.24,
    slopeSpan: 1.1,
    biasSpan: 1.1,
    biasCenter: 0,
    startBuild: { slope: 1, speed: -1, bias: 0 }
  },
  {
    id: "ring",
    name: "환",
    note: "가만 두면 위로 흐른다. 오르는 회랑과 내려가는 회랑이 딴판이다",
    slopeCenter: 1.0,
    slopeSpan: 0.95,
    biasSpan: 0.95,
    biasCenter: 0.15,
    // 치우침이 이미 정체성이므로 시작 눈금까지 편향을 더 얹지 않는다 — 그러면
    // 가파른 하강 회랑에서 전 경로가 막힌다(`runner-paths.ts` 가 잡았다).
    startBuild: { slope: 0, speed: 0, bias: 0 }
  }
];

export const RUNNER_BY_ID = new Map(RUNNERS.map((r) => [r.id, r]));

export const DEFAULT_RUNNER: Runner = RUNNERS[0];

export function runnerById(id: string): Runner {
  return RUNNER_BY_ID.get(id as RunnerId) ?? DEFAULT_RUNNER;
}

/**
 * 기체의 곡선을 튜닝에 접는다.
 *
 * `resolve(build, tuning)` 의 시그니처를 건드리지 않는 것이 요점이다 — 솔버·오토파일럿·
 * 카메라·검증 스크립트가 전부 `Tuning` 하나만 받고 있으므로, 곡선이 거기 들어가면
 * 기체가 그 전부에 자동으로 반영된다. 축 상한(`axisCap`)이 이미 같은 방식이다.
 */
export function applyRunner(base: Tuning, runner: Runner): Tuning {
  return {
    ...base,
    slopeCenter: runner.slopeCenter,
    slopeSpan: runner.slopeSpan,
    biasSpan: runner.biasSpan,
    // 편향 중심은 눈금 0 의 기준값이므로 튜닝 패널의 기준값 위에 얹는다.
    bias: base.bias + runner.biasCenter
  };
}
