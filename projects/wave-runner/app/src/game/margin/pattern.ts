/**
 * 유형별 질감의 **형상 정의**. 캔버스에 의존하지 않는 순수 데이터다.
 *
 * 두 가지 이유로 렌더와 분리했다. 하나는 검증기가 브라우저 없이 잉크 면적과
 * 대비를 계산할 수 있어야 하기 때문이고, 다른 하나는 질감의 구분이 **밝기가
 * 아니라 결의 방향**에 있기 때문이다 — 방향은 형상의 성질이지 색의 성질이 아니다.
 *
 * 대비 상한이 1.5:1 이라 네 유형을 밝기로 가를 수 없다. 대신 가로 굵게(협곡) ·
 * 가로 가늘게(회랑) · 방향 없음(산개) · 세로(맥동)로 가른다. 방향은 전주의적으로
 * 읽히고 저대비에서 살아남는 거의 유일한 속성이다.
 *
 * 설계 근거: docs/design/margin-texture.md §3.1
 */
import { mulberry32 } from "../rand";
import type { SectorType } from "../types";

/**
 * 질감 전용 난수 시드.
 *
 * 코스 조립과 게이트 제안이 쓰는 스트림에 **한 바이트도 닿지 않는다.**
 * 0.3.1 의 버그가 정확히 이 통로로 들어왔다 — 렌더가 난수를 건드리면
 * 프레임 타이밍이 코스를 바꾼다.
 */
export const TEXTURE_SEED = 0x5a17;

export type TextureShape =
  /** 가로 결 — 타일 폭 전체를 가로지른다 */
  | { kind: "band"; y: number; h: number; accent: boolean }
  /** 세로 리브 — 타일 높이 전체를 가로지른다 */
  | { kind: "rib"; x: number; w: number }
  /** 자갈 — 타일 경계에서 감싼다 */
  | { kind: "pebble"; x: number; y: number; r: number };

export type Grain = "horizontal-coarse" | "horizontal-fine" | "vertical" | "none";

export interface TexturePattern {
  type: SectorType;
  /** 타일 한 변의 월드 길이. 결의 주기가 이 값을 정확히 나눠야 이음매가 생기지 않는다 */
  tile: number;
  grain: Grain;
  shapes: TextureShape[];
}

const TYPE_INDEX: Record<SectorType, number> = { gorge: 0, corridor: 1, scatter: 2, pulse: 3 };

/**
 * 협곡 — 층진 단층. 층 간격 8, 두께 1.0, 4층마다 한 단계 진하게, 층마다 ±0.8 지터.
 * "층이 있다 = 오르내린다"로 읽힌다.
 *
 * 지터를 층 안에서 x 에 따라 흔들지 않고 **층마다 하나씩** 주는 것은 이음매 때문이다.
 * x 방향으로 흔들면 타일 경계에서 결이 끊긴다.
 */
function gorgePattern(rand: () => number): TexturePattern {
  const tile = 32;
  const spacing = 8;
  const shapes: TextureShape[] = [];
  for (let i = 0; i < tile / spacing; i += 1) {
    const jitter = (rand() * 2 - 1) * 0.8;
    shapes.push({ kind: "band", y: spacing / 2 + i * spacing + jitter, h: 1.0, accent: i === 0 });
  }
  return { type: "gorge", tile, grain: "horizontal-coarse", shapes };
}

/** 회랑 — 흐르는 결. 간격 3, 두께 0.4, 지터 없음. 끊김이 없어야 "길게 이어진다"가 된다 */
function corridorPattern(): TexturePattern {
  const tile = 24;
  const spacing = 3;
  const shapes: TextureShape[] = [];
  for (let i = 0; i < tile / spacing; i += 1) {
    shapes.push({ kind: "band", y: spacing / 2 + i * spacing, h: 0.4, accent: false });
  }
  return { type: "corridor", tile, grain: "horizontal-fine", shapes };
}

/** 산개 — 자갈. 방향이 없다는 것 자체가 신호다 */
function scatterPattern(rand: () => number): TexturePattern {
  const tile = 24;
  // 개수는 잉크 총량 균형이 정한다 — 벽 면적이 41%뿐이라 다른 유형보다 촘촘해야 한다
  const count = 20;
  const shapes: TextureShape[] = [];
  for (let i = 0; i < count; i += 1) {
    shapes.push({
      kind: "pebble",
      x: rand() * tile,
      y: rand() * tile,
      r: 0.8 + rand() * 0.8
    });
  }
  return { type: "scatter", tile, grain: "none", shapes };
}

/**
 * 맥동 — 세로 리브. 간격 12 고정.
 *
 * 리브 간격을 셔터 주기 × 현재 속도로 두면 벽이 위상계가 된다. 매력적이지만
 * 맥동의 핵심 난이도가 "도착 위상을 감으로 맞추는 것"이므로, 그것을 벽에 적어
 * 주면 유형의 정체성 자체가 사라진다. 고정한다.
 */
function pulsePattern(): TexturePattern {
  const tile = 24;
  const spacing = 12;
  const shapes: TextureShape[] = [];
  for (let i = 0; i < tile / spacing; i += 1) {
    shapes.push({ kind: "rib", x: spacing / 2 + i * spacing, w: 1.6 });
  }
  return { type: "pulse", tile, grain: "vertical", shapes };
}

const CACHE = new Map<SectorType, TexturePattern>();

/** 같은 유형은 언제나 같은 형상을 준다 — 난수는 전용 시드에서만 나온다 */
export function texturePattern(type: SectorType): TexturePattern {
  const hit = CACHE.get(type);
  if (hit) return hit;
  const rand = mulberry32(TEXTURE_SEED + TYPE_INDEX[type]);
  const made =
    type === "gorge"
      ? gorgePattern(rand)
      : type === "corridor"
        ? corridorPattern()
        : type === "scatter"
          ? scatterPattern(rand)
          : pulsePattern();
  CACHE.set(type, made);
  return made;
}

/** 검증기가 쓴다 — 타일 면적 대비 잉크가 덮는 면적 */
export function inkArea(p: TexturePattern): number {
  let area = 0;
  for (const s of p.shapes) {
    if (s.kind === "band") area += s.h * p.tile;
    else if (s.kind === "rib") area += s.w * p.tile;
    else area += Math.PI * s.r * s.r;
  }
  return area / (p.tile * p.tile);
}
