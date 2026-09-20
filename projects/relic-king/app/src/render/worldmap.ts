import { MAP_DOT_PX, MAP_WORLD_DOT_GRID_H, MAP_WORLD_DOT_GRID_W, SITES, SITE_BY_ID } from "../game/balance";
import { PALETTE, RAMPS, TIER_COLOR } from "./palette";
import { WORLD_RASTER_H, WORLD_RASTER_W, isLandDot } from "./worldmap-raster";
import type { SiteId } from "../game/types";

/**
 * 세계지도 — 실제 해안선 위의 12거점(notes/world-map.md §6, notes/decisions.md G8·G69).
 *
 * 해안선은 **빌드타임에 굽는다**: `scripts/build-worldmap.mjs`가 Natural Earth
 * 1:110m 육지 지오메트리를 320×160 이진 비트맵으로 래스터해
 * `render/worldmap-raster.ts`에 정적 상수로 커밋하고, 런타임은 그걸 읊기만 한다.
 * 타일 서버·CDN·폰트 등 외부 리소스를 런타임에 부르지 않는다는 협상불가 항목은
 * 그대로다 — v0.3까지 이 파일 상단에 있던 "외부 네트워크가 차단돼 파이프라인이
 * 범위 밖"이라는 전제는 **틀렸음이 확인돼** 폐기했다(npm 레지스트리는 열려 있고,
 * devDependency로 받아 정적 산출물로 굽는 것은 런타임 의존이 아니다).
 *
 * 줌은 3단 중 세계·권역 2단을 여기서 다룬다(유적 줌은 `render/strata.ts`).
 */

export const MAP_W = MAP_WORLD_DOT_GRID_W * MAP_DOT_PX; // 640
export const MAP_H = MAP_WORLD_DOT_GRID_H * MAP_DOT_PX; // 320

/** 정거방형(equirectangular) 도법 — 위경도를 320×160 도트 그리드 좌표로 투영한다 */
export function projectToGrid(lat: number, lon: number): { gx: number; gy: number } {
  const gx = ((lon + 180) / 360) * MAP_WORLD_DOT_GRID_W;
  const gy = ((90 - lat) / 180) * MAP_WORLD_DOT_GRID_H;
  return { gx, gy };
}

function toPx(g: number): number {
  return g * MAP_DOT_PX;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── 지도 상수 총람 ────────────────────────────────────────────────
// 색은 전부 `palette.ts`의 고정 40색에서만 고르고 알파로만 누른다. 이 파일에
// 색 리터럴(#rrggbb, rgba(255,...))을 새로 적지 않는다 — 지층·유물·UI가 같은
// 팔레트를 공유한다는 palette.ts의 전제를 지도도 그대로 따른다.

/** 바다 = 배경. 육지 = 흙빛을 알파로 눌러 마커·라벨보다 항상 뒤로 물러나게 한다. */
const SEA_COLOR = PALETTE.sky;
const LAND_COLOR = hexToRgba(PALETTE.soil[3], 0.62);
/** 해안(바다에 접한 육지 도트)만 한 단계 밝게 — 대륙 윤곽이 읽히는 건 이 선 덕이다 */
const COAST_COLOR = hexToRgba(PALETTE.rock[2], 0.55);
const GRID_COLOR = hexToRgba(PALETTE.paper, 0.07);
const GRID_AXIS_COLOR = hexToRgba(PALETTE.paper, 0.14);
const LINK_COLOR = hexToRgba(PALETTE.paper, 0.09);
const LINK_ACTIVE_COLOR = hexToRgba(PALETTE.gold[3], 0.55);
const LABEL_COLOR = hexToRgba(PALETTE.paper, 0.92);
const LABEL_SHADOW = hexToRgba(PALETTE.ink, 0.85);
const LEADER_COLOR = hexToRgba(PALETTE.paper, 0.35);

/**
 * 마커 5상태의 색·크기·모양을 한 곳에 모은다(작업 지시 D1). 지도 밖 UI
 * (`WorldMapCanvas`의 범례, `WorldExplorer` 목록의 상태 뱃지)가 같은 의미를
 * 표기할 때 이 표를 그대로 읽는다 — 두 군데서 따로 색을 고르면 어긋난다.
 *
 * **색만으로 구분하지 않는다**(색각 이상 대응): base는 마름모, visited는 찬 원,
 * unvisited는 빈 원, selected는 두른 고리, rival-target은 점선 고리다.
 */
export type WorldMapMarkerState = "base" | "visited" | "unvisited";
export type WorldMapMarkerKind = WorldMapMarkerState | "selected" | "rival-target";

export const MARKER_STYLE: Record<WorldMapMarkerKind, {
  color: string; radius: number; glyph: string; label: string;
}> = {
  base: { color: PALETTE.gold[3], radius: 4, glyph: "◆", label: "본거지" },
  visited: { color: RAMPS.silver.ramp[3], radius: 3, glyph: "●", label: "방문함" },
  unvisited: { color: PALETTE.rock[2], radius: 2.5, glyph: "○", label: "미방문" },
  selected: { color: PALETTE.gold[3], radius: 7, glyph: "◎", label: "선택" },
  "rival-target": { color: TIER_COLOR[4], radius: 9, glyph: "⊘", label: "라이벌 추격" }
};

/** 라벨 폰트 — `styles.css`의 본문 스택과 같은 폰트를 쓴다(작업 지시 D2).
 *  9px monospace는 한글에서 CJK 폴백으로 새 버려 앱의 나머지와 어긋났다. */
const LABEL_FONT_PX = 10;
const LABEL_FONT = `${LABEL_FONT_PX}px "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif`;

/** 권역 줌(notes/world-map.md §6) — 선택한 거점을 화면 중심에 고정하고 그
 *  주변을 MAP_REGION_ZOOM_FACTOR배 확대한다. null이면 세계 줌. */
export type MapZoom = { center: SiteId; factor: number } | null;

export type WorldMapView = {
  /** 거점별 마커 상태 — base(본거지, 로컬 시세 프리미엄) > visited(방문만) > unvisited */
  markerState: Record<SiteId, WorldMapMarkerState>;
  /** 강조 표시할 거점(선택 중) */
  selected?: SiteId | null;
  /** 키보드 포커스가 얹힌 거점 — selected와 별개다(포커스만으로 파견하지 않는다) */
  focused?: SiteId | null;
  /** 현재 이동 중이거나 현지작업 중인 발굴단의 목적지 — 연결선을 굵게 그린다 */
  activeTeamTargets?: SiteId[];
  /** 라이벌이 지금 쫓고 있는(제보 급파 중) 거점 — 마커에 라이벌 표시를 덧그린다 */
  rivalTargets?: SiteId[];
};

/** 렌더 결과 자기보고 — 라벨을 몇 개 그렸고 몇 개 생략했는지. 스모크가 이 값으로
 *  "생략 0건"을 단언한다(척추 5번의 지도판: 숨기지 않고 세어 보여 준다). */
export type WorldMapRenderStats = { labelsDrawn: number; labelsOmitted: number };

// ── 해안선 래스터 ─────────────────────────────────────────────────

/** 바다에 접한 육지 도트 = 해안. 모듈 로드 시 1회만 계산해 캐싱한다. */
const COAST_MASK: Uint8Array = (() => {
  const out = new Uint8Array(WORLD_RASTER_W * WORLD_RASTER_H);
  for (let gy = 0; gy < WORLD_RASTER_H; gy++) {
    for (let gx = 0; gx < WORLD_RASTER_W; gx++) {
      if (!isLandDot(gx, gy)) continue;
      if (!isLandDot(gx - 1, gy) || !isLandDot(gx + 1, gy) || !isLandDot(gx, gy - 1) || !isLandDot(gx, gy + 1)) {
        out[gy * WORLD_RASTER_W + gx] = 1;
      }
    }
  }
  return out;
})();

/**
 * 세계 줌 육지 레이어는 매 렌더 같은 그림이다 — 도트 15,566개를 `fillRect`로 다시
 * 그리는 대신 오프스크린 캔버스에 1회 굽고 `drawImage`로 얹는다. 지도는 게임 틱마다
 * 다시 그려지므로(마커·연결선이 바뀐다) 이 한 겹이 매번 낭비될 자리였다.
 * 모듈 로드가 아니라 첫 렌더 때 만든다 — 이 모듈이 DOM 없는 환경에 끌려 들어가도
 * 로드만으로는 터지지 않게.
 */
let worldLandLayer: HTMLCanvasElement | null = null;

function worldLandCache(): HTMLCanvasElement {
  if (worldLandLayer) return worldLandLayer;
  const c = document.createElement("canvas");
  c.width = MAP_W;
  c.height = MAP_H;
  const g = c.getContext("2d")!;
  paintLand(g, MAP_DOT_PX, 0, 0, 0, WORLD_RASTER_W, 0, WORLD_RASTER_H);
  worldLandLayer = c;
  return c;
}

/** 같은 색이 연속하는 동안 `fillStyle` 대입을 건너뛴다 — 도트마다 대입하면
 *  캔버스가 매번 색을 파싱한다. */
function paintLand(
  ctx: CanvasRenderingContext2D, scale: number, originX: number, originY: number,
  gx0: number, gx1: number, gy0: number, gy1: number
) {
  let current = "";
  for (let gy = gy0; gy < gy1; gy++) {
    for (let gx = gx0; gx < gx1; gx++) {
      // 날짜변경선을 넘겨 크롭해도 지구는 이어져 있다 — 경도만 감아 준다
      const sx = ((gx % WORLD_RASTER_W) + WORLD_RASTER_W) % WORLD_RASTER_W;
      if (!isLandDot(sx, gy)) continue;
      const color = COAST_MASK[gy * WORLD_RASTER_W + sx] ? COAST_COLOR : LAND_COLOR;
      if (color !== current) {
        ctx.fillStyle = color;
        current = color;
      }
      ctx.fillRect(originX + gx * scale, originY + gy * scale, scale, scale);
    }
  }
}

/**
 * 해안선을 그린다. 세계 줌은 도트 1개 = MAP_DOT_PX(2px), 권역 줌은 같은 비트맵을
 * factor배로 키운 **최근접 이웃 리샘플**이다(벡터 재투영이 아니다 — 픽셀 그리드를
 * 유지하는 게 의도다, world-map.md §6). 권역 줌에서 화면에 들어오는 그리드 범위만
 * 훑으므로 4배 확대라도 그리는 사각형 수는 오히려 준다.
 */
function drawLand(ctx: CanvasRenderingContext2D, zoom: MapZoom) {
  if (!zoom) {
    ctx.drawImage(worldLandCache(), 0, 0);
    return;
  }
  const scale = zoom.factor * MAP_DOT_PX;
  const center = SITE_BY_ID[zoom.center];
  const c = projectToGrid(center.lat, center.lon);
  const originX = MAP_W / 2 - c.gx * scale;
  const originY = MAP_H / 2 - c.gy * scale;
  paintLand(
    ctx, scale, originX, originY,
    Math.floor(-originX / scale) - 1,
    Math.ceil((MAP_W - originX) / scale) + 1,
    Math.max(0, Math.floor(-originY / scale) - 1),
    Math.min(WORLD_RASTER_H, Math.ceil((MAP_H - originY) / scale) + 1)
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, zoom: MapZoom) {
  // 위경도 그리드 — "숫자를 숨기지 않는다"는 척추 5번의 지도판(좌표계 공개).
  // 권역 줌은 4배 확대라 30도 간격이면 선이 한두 개밖에 안 들어온다 — 10도로 촘촘히.
  const step = zoom ? 10 : 30;
  const center = zoom ? SITE_BY_ID[zoom.center] : null;
  const c = center ? projectToGrid(center.lat, center.lon) : null;
  const toScreen = (lat: number, lon: number) => {
    const g = projectToGrid(lat, lon);
    if (!c) return { x: toPx(g.gx), y: toPx(g.gy) };
    return {
      x: MAP_W / 2 + (g.gx - c.gx) * zoom!.factor * MAP_DOT_PX,
      y: MAP_H / 2 + (g.gy - c.gy) * zoom!.factor * MAP_DOT_PX
    };
  };

  ctx.lineWidth = 1;
  ctx.strokeStyle = GRID_COLOR;
  for (let lon = -180; lon <= 180; lon += step) {
    const x = Math.round(toScreen(0, lon).x) + 0.5;
    if (x < 0 || x > MAP_W) continue;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_H);
    ctx.stroke();
  }
  for (let lat = -90; lat <= 90; lat += step) {
    const y = Math.round(toScreen(lat, 0).y) + 0.5;
    if (y < 0 || y > MAP_H) continue;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_W, y);
    ctx.stroke();
  }
  // 적도·본초자오선은 조금 더 밝게
  ctx.strokeStyle = GRID_AXIS_COLOR;
  const origin = toScreen(0, 0);
  ctx.beginPath();
  ctx.moveTo(0, Math.round(origin.y) + 0.5);
  ctx.lineTo(MAP_W, Math.round(origin.y) + 0.5);
  ctx.moveTo(Math.round(origin.x) + 0.5, 0);
  ctx.lineTo(Math.round(origin.x) + 0.5, MAP_H);
  ctx.stroke();
}

// ── 좌표·히트 판정 ────────────────────────────────────────────────

/** 그 줌 상태에서 각 거점이 캔버스의 어느 픽셀에 그려지는지. 마커를 그릴 때와
 *  클릭 좌표를 거점으로 되짚을 때(hit test) 양쪽에서 공유한다. */
export function siteScreenPositions(zoom: MapZoom): Record<SiteId, { x: number; y: number }> {
  const out = {} as Record<SiteId, { x: number; y: number }>;
  if (!zoom) {
    for (const s of SITES) {
      const { gx, gy } = projectToGrid(s.lat, s.lon);
      out[s.id] = { x: toPx(gx), y: toPx(gy) };
    }
    return out;
  }
  const center = SITE_BY_ID[zoom.center];
  const c = projectToGrid(center.lat, center.lon);
  for (const s of SITES) {
    const g = projectToGrid(s.lat, s.lon);
    out[s.id] = {
      x: MAP_W / 2 + (g.gx - c.gx) * zoom.factor * MAP_DOT_PX,
      y: MAP_H / 2 + (g.gy - c.gy) * zoom.factor * MAP_DOT_PX
    };
  }
  return out;
}

/** 탭 목표의 최소 크기(CSS px). 캔버스 내부 좌표가 아니라 **화면에 보이는 크기**
 *  기준이다 — 640×320 캔버스가 375px 폭으로 줄어 그려지면 내부 10px 반경은 실제
 *  손가락 밑에서 6px도 안 된다. 호출부가 캔버스 스케일을 역산해 넘긴다. */
export const MAP_MIN_HIT_CSS_PX = 44;

/** 표시 스케일(캔버스 내부 폭 / CSS 폭)을 받아 히트 반경을 캔버스 좌표로 환산한다 */
export function hitRadiusForScale(canvasPerCssPx: number): number {
  return (MAP_MIN_HIT_CSS_PX / 2) * canvasPerCssPx;
}

/**
 * 캔버스 좌표에서 가장 가까운 거점을 찾는다. radiusPx 안에 아무 마커도 없으면 null.
 *
 * 밀집 구간(지중해~메소포타미아 6거점)에서는 44px 목표가 서로 겹친다 — 겹치는
 * 버튼을 실제 DOM 요소로 깔면 위에 쌓인 놈이 아래를 가려 어떤 거점은 영영 못
 * 누른다. 그래서 포인터 판정은 **가장 가까운 마커가 이긴다**로 두고(사각지대 0),
 * 겹침 문제 자체를 없앴다. 키보드·스크린리더용 포커스 타겟은 별도 오버레이가 맡는다.
 */
export function pickSiteAt(px: number, py: number, zoom: MapZoom, radiusPx = 10): SiteId | null {
  const positions = siteScreenPositions(zoom);
  let best: SiteId | null = null;
  let bestDist = radiusPx;
  for (const s of SITES) {
    const p = positions[s.id];
    const d = Math.hypot(p.x - px, p.y - py);
    if (d <= bestDist) {
      bestDist = d;
      best = s.id;
    }
  }
  return best;
}

// ── 라벨 배치 ─────────────────────────────────────────────────────

/**
 * 라벨 충돌 회피 — 마커 주변 후보 위치를 순서대로 시도하는 그리디 배치.
 * 세계 줌에서 지중해~메소포타미아 6거점이 가로 55px 안에 몰려 있어 고정 오프셋
 * 하나로는 자리가 안 난다.
 *
 * **도시명으로 바뀌면서 라벨이 길어졌다**(멕시코 → 멕시코시티, 로마 → 폼페이).
 * 후보를 더 늘리는 대신 이 순서를 유지한 채 폰트를 본문 스택 10px로 바꿔
 * 실측 폭을 다시 쟀고, 12개가 전부 자리를 잡는 것을 스모크(`라벨 생략 0건`
 * 단언)로 고정했다. 그래도 터지는 날이 오면 후보를 늘리는 쪽이 아니라
 * "권역 줌에서만 전체 라벨, 세계 줌에서는 밀집 구간 묶음 표기"로 가야 한다 —
 * 후보를 늘리면 리더선이 길어져 어느 라벨이 어느 점의 것인지 되레 안 읽힌다.
 */
type LabelCandidate = { dx: number; dy: number; align: "left" | "right"; leader?: boolean };

const WORLD_LABEL_CANDIDATES: LabelCandidate[] = [
  { dx: 6, dy: -3, align: "left" }, // 우상단 — 기본값
  { dx: -6, dy: -3, align: "right" }, // 좌상단
  { dx: 6, dy: 13, align: "left" }, // 우하단
  { dx: -6, dy: 13, align: "right" }, // 좌하단
  // 아래부터는 리더선을 달고 사다리처럼 멀어진다
  { dx: 11, dy: -14, align: "left", leader: true },
  { dx: -11, dy: -14, align: "right", leader: true },
  { dx: 11, dy: 24, align: "left", leader: true },
  { dx: -11, dy: 24, align: "right", leader: true },
  { dx: 14, dy: -25, align: "left", leader: true },
  { dx: -14, dy: -25, align: "right", leader: true },
  { dx: 14, dy: 35, align: "left", leader: true },
  { dx: -14, dy: 35, align: "right", leader: true },
  { dx: 17, dy: -36, align: "left", leader: true },
  { dx: -17, dy: -36, align: "right", leader: true },
  { dx: 17, dy: 46, align: "left", leader: true },
  { dx: -17, dy: 46, align: "right", leader: true }
];

type LabelRect = { x0: number; y0: number; x1: number; y1: number };

function rectsOverlap(a: LabelRect, b: LabelRect): boolean {
  return a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
}

/** 라벨 사각형의 여백. 1px로 두면 두 라벨이 경계를 딱 맞대 "붙어 보이는" 상태가
 *  충돌 판정을 통과한다 — 겹치지 않아도 읽히지 않으면 같은 결함이다. */
const LABEL_PAD = 2;
/** 마커 자체도 라벨이 피해야 할 장애물이다. base 마커가 가장 크다. */
const MARKER_HALF = MARKER_STYLE.base.radius + 1;

function candidateRect(x: number, y: number, textW: number, c: LabelCandidate): LabelRect {
  const ax = x + c.dx;
  const ay = y + c.dy;
  const [x0, x1] = c.align === "right" ? [ax - textW, ax] : [ax, ax + textW];
  return { x0: x0 - LABEL_PAD, y0: ay - LABEL_FONT_PX - LABEL_PAD, x1: x1 + LABEL_PAD, y1: ay + LABEL_PAD };
}

function pickLabelPlacement(
  x: number, y: number, textW: number, placed: LabelRect[]
): { c: LabelCandidate; rect: LabelRect } | null {
  for (const c of WORLD_LABEL_CANDIDATES) {
    const rect = candidateRect(x, y, textW, c);
    if (rect.x0 < 0 || rect.x1 > MAP_W || rect.y0 < 0 || rect.y1 > MAP_H) continue; // 화면 밖으로 새면 후보 탈락
    if (!placed.some((p) => rectsOverlap(p, rect))) return { c, rect };
  }
  return null;
}

/** 해안선 위에 얹힌 글자가 도트에 섞이지 않게 얇은 그림자를 깐다 */
function fillLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.fillStyle = LABEL_SHADOW;
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = LABEL_COLOR;
  ctx.fillText(text, x, y);
}

// ── 본체 ─────────────────────────────────────────────────────────

function drawMarker(
  ctx: CanvasRenderingContext2D, x: number, y: number, state: WorldMapMarkerState
) {
  const style = MARKER_STYLE[state];
  ctx.lineWidth = 1.5;
  if (state === "base") {
    // 마름모 — 색을 못 봐도 모양만으로 본거지가 구분된다
    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.moveTo(x, y - style.radius);
    ctx.lineTo(x + style.radius, y);
    ctx.lineTo(x, y + style.radius);
    ctx.lineTo(x - style.radius, y);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.arc(x, y, style.radius, 0, Math.PI * 2);
  if (state === "visited") {
    ctx.fillStyle = style.color;
    ctx.fill();
  } else {
    // 빈 원 — 안을 비워 "아직 안 가 본 곳"을 모양으로도 말한다
    ctx.fillStyle = SEA_COLOR;
    ctx.fill();
    ctx.strokeStyle = style.color;
    ctx.stroke();
  }
}

/** 지도 캔버스를 그린다(세계 줌 또는 권역 줌). `ctx.canvas`는 반드시
 *  MAP_W×MAP_H(640×320)이어야 한다. */
export function drawWorldMap(
  ctx: CanvasRenderingContext2D, view: WorldMapView, zoom: MapZoom = null
): WorldMapRenderStats {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = SEA_COLOR;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  // 그리는 순서: 바다 → 육지(해안선) → 위경도 그리드선 → 연결선 → 마커 → 라벨.
  // 가독성이 항상 우선이라 지형은 언제나 맨 아래다. 권역 줌에도 같은 해안선을
  // 그린다(v0.3은 `if (!zoom)` 가드 때문에 권역 줌 배경이 맨 바다였다).
  drawLand(ctx, zoom);
  drawGrid(ctx, zoom);

  const positions = siteScreenPositions(zoom);
  const bases = SITES.filter((s) => view.markerState[s.id] === "base");
  const activeTargets = new Set(view.activeTeamTargets ?? []);
  const rivalTargets = new Set(view.rivalTargets ?? []);

  // 연결선 — 보유 본거지에서 다른 모든 거점까지, 실제 원정이 거리를 지불한다는
  // 감각을 지도만 보고도 알 수 있게 한다(world-map.md §2)
  for (const base of bases) {
    const from = positions[base.id];
    for (const s of SITES) {
      if (s.id === base.id) continue;
      const to = positions[s.id];
      const active = activeTargets.has(s.id);
      ctx.strokeStyle = active ? LINK_ACTIVE_COLOR : LINK_COLOR;
      ctx.lineWidth = active ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  }

  const onScreen = (p: { x: number; y: number }) =>
    p.x >= -20 && p.x <= MAP_W + 20 && p.y >= -20 && p.y <= MAP_H + 20;

  for (const s of SITES) {
    const p = positions[s.id];
    if (!onScreen(p)) continue; // 권역 줌에서 화면 밖은 건너뛴다
    const state = view.markerState[s.id] ?? "unvisited";

    if (view.selected === s.id || view.focused === s.id) {
      const ring = MARKER_STYLE.selected;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = view.selected === s.id ? 1.5 : 1;
      if (view.focused === s.id && view.selected !== s.id) ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (rivalTargets.has(s.id)) {
      const ring = MARKER_STYLE["rival-target"];
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawMarker(ctx, p.x, p.y, state);
  }

  // 라벨 — 맨 마지막(마커·연결선보다 위). base > visited > unvisited 순으로 먼저
  // 자리를 잡아야 밀집 구간에서 보유·방문 거점 라벨이 우선 살아남는다.
  ctx.font = LABEL_FONT;
  ctx.textBaseline = "bottom";

  const priority: Record<WorldMapMarkerState, number> = { base: 0, visited: 1, unvisited: 2 };
  const order = [...SITES].sort((a, b) => {
    const pa = priority[view.markerState[a.id] ?? "unvisited"];
    const pb = priority[view.markerState[b.id] ?? "unvisited"];
    return pa - pb;
  });
  // 모든 마커를 먼저 장애물로 깔아 둔다 — 라벨이 남의 점 위에 얹히면 둘 다 안 읽힌다
  const placedRects: LabelRect[] = SITES.map((s) => {
    const { x, y } = positions[s.id];
    return { x0: x - MARKER_HALF, y0: y - MARKER_HALF, x1: x + MARKER_HALF, y1: y + MARKER_HALF };
  });

  let labelsDrawn = 0;
  let labelsOmitted = 0;
  for (const s of order) {
    const p = positions[s.id];
    if (!onScreen(p)) continue;
    const textW = ctx.measureText(s.city).width;
    const placement = pickLabelPlacement(p.x, p.y, textW, placedRects);
    if (!placement) {
      labelsOmitted++;
      continue;
    }
    placedRects.push(placement.rect);
    const ax = p.x + placement.c.dx;
    const ay = p.y + placement.c.dy;
    if (placement.c.leader) {
      ctx.strokeStyle = LEADER_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ax, ay);
      ctx.stroke();
    }
    ctx.textAlign = placement.c.align;
    fillLabel(ctx, s.city, ax, ay);
    labelsDrawn++;
  }
  ctx.textAlign = "left";

  return { labelsDrawn, labelsOmitted };
}
