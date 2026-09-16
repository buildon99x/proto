/**
 * 런 결말 수집.
 *
 * **"죽은 위치"를 그대로 저장하면 틀린 곳을 고치게 된다.** 중립이 없는 조작에서는
 * 생존 회랑을 벗어난 지점과 벽에 닿는 지점이 언제나 떨어져 있어, 사망 x 를 그대로
 * 집계하면 좁은 섹터가 앞 섹터의 죄를 뒤집어쓴다. 그래서 여기서는 **원인을 계산하지
 * 않고 재구성에 필요한 최소 입력만** 보낸다 — 이탈 지점은 오프라인 분석기가 솔버로
 * 코스를 되살려 구한다(notes/telemetry/death-log.md §1.1).
 *
 * 세 가지를 지킨다.
 *
 * 1. **주행 경로에 네트워크를 넣지 않는다.** brief 의 "사망에서 다음 시도까지 0.5초"가
 *    불변 조항이다. 사망 콜백은 큐에 넣기만 하고, 전송은 배치로 따로 나간다.
 * 2. **코스 지문 없이는 아무것도 보내지 않는다.** 0.5.5 에서 시드표가 통째로 갈렸듯
 *    코스는 버전마다 다른 코스다. 지문이 다르면 합산해서는 안 되고, 지문은 난이도를
 *    결정하는 모든 입력의 내용 해시라 손으로 올리는 것을 잊을 수 없다.
 * 3. **집계는 사망이 아니라 런의 결말 셋을 센다.** Stage 는 스스로 재시작하므로
 *    사망만 세면 분모가 없고, 그만두고 떠난 사람은 abort 로만 잡힌다.
 */
import { NEUTRAL_BUILD, resolve } from "./axes";
import { measure } from "./geometry";
import type { Span } from "./geometry";
import { SECTORS } from "./sectors";
import SEEDS from "./stage-seeds.json";
import tuningJson from "./tuning.json";
import type { GameState } from "./engine";
import type { AxisKey, Tuning } from "./types";

/**
 * 프로덕션에서 게임은 런처와 **같은 출처**의 iframe(`/runs/wave-runner/`)이므로
 * 절대 경로 하나로 닿는다. `sendBeacon` 은 프리플라이트를 할 수 없어 이 점이 중요하다.
 * 개발에서는 vite 가 `/api` 를 런처로 프록시해 같은 조건을 만든다.
 */
const ENDPOINT = "/api/telemetry/wave-runner";

const QUEUE_KEY = "wave-runner/tele/q/v1";
const IID_KEY = "wave-runner/tele/iid/v1";

/** 한 번에 보내는 이벤트 수. 32KB 상한(서버)에 여유 있게 들어간다 */
const BATCH_MAX = 50;
/** 큐 상한. 넘치면 **오래된 것부터** 버린다 — 최신이 더 가치 있다 */
const QUEUE_MAX = 500;
const FLUSH_MS = 15_000;
/** 연속 실패 시 간격을 두 배씩 늘린다. 5단계면 8분 — 죽은 엔드포인트를 두드리지 않는다 */
const BACKOFF_MAX = 5;

// ── 이벤트 ────────────────────────────────────────────────────

export interface RunEvent {
  k: "death" | "clear" | "abort";
  ts: number;

  mode: "stage" | "endless";
  tier?: number;
  no?: number;
  seed?: number;
  /** 이 코스에서 몇 번째 시도인가 */
  att: number;

  /** 축 상한. 게이트 제안이 여기에 달려 있어 재구성에 필요하다 */
  cap: number;
  pre: string;
  /** 지나온 게이트 선택열 */
  lanes: string;
  /** 종료 시점 slope/speed/bias. 재구성 결과와 대조하는 감시 장치다 */
  bld: [number, number, number];
  /** 경과 초 */
  t: number;

  // 사망 지점 (k === "death")
  /** 조각 인덱스. "0번부터 여기까지 진입했다"가 곧 사망률의 분모다 */
  pi?: number;
  pid?: string;
  x?: number;
  lx?: number;
  y?: number;
  hold?: 0 | 1;
  /** 그 순간 그 x 의 자유 구간 총 폭. 0 이면 완전 폐쇄 */
  gw?: number;
  /** 가장 가까운 자유 구간까지의 거리. 작으면 아깝게 빗나간 것, 크면 틀린 자리에 있던 것. 폐쇄면 −1 */
  gd?: number;

  // 결말 (k !== "death")
  dist?: number;
  sec?: number;

  // 품질 플래그 — 이것들이 없으면 그럴듯하지만 틀린 표가 나온다
  fps: number;
  prac: 0 | 1;
  dev: 0 | 1;
  hud: 0 | 1;
  mob: 0 | 1;
}

// ── 코스 지문 ─────────────────────────────────────────────────

function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

let fpCache = "";

/**
 * 난이도를 결정하는 모든 입력의 내용 해시.
 *
 * 마지막 항(축 눈금별 실제 계수)이 핵심이다. `axes.ts` 의 눈금-계수 사상은 코드라서
 * JSON 해시로는 잡히지 않는데, 눈금마다 풀어낸 값을 넣으면 그 표가 바뀌는 순간
 * 지문이 바뀐다. **손으로 올리는 버전 상수가 없으므로 올리는 것을 잊을 수 없다.**
 */
function fingerprint(): string {
  if (fpCache) return fpCache;
  // 해금 상태와 무관한 지문이어야 하므로 상한을 ±3 으로 열고 푼다.
  const full: Tuning = { ...(tuningJson as Tuning), axisMin: -3, axisMax: 3 };
  const rates: number[] = [];
  const axes: AxisKey[] = ["slope", "speed", "bias"];
  for (const axis of axes) {
    for (let tick = -3; tick <= 3; tick += 1) {
      const r = resolve({ ...NEUTRAL_BUILD, [axis]: tick }, full);
      rates.push(r.slope, r.speed, r.riseRate, r.fallRate);
    }
  }
  fpCache = fnv1a(JSON.stringify({ sectors: SECTORS, seeds: SEEDS, tuning: tuningJson, rates }));
  return fpCache;
}

// ── 신원 (익명) ───────────────────────────────────────────────

function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let iidCache = "";

function installId(): string {
  if (iidCache) return iidCache;
  try {
    const saved = localStorage.getItem(IID_KEY);
    if (saved) {
      iidCache = saved;
      return iidCache;
    }
    iidCache = uuid();
    localStorage.setItem(IID_KEY, iidCache);
  } catch {
    // 저장 불가(프라이빗 모드 등)면 세션마다 새 id 가 된다. 수집은 계속된다.
    iidCache = uuid();
  }
  return iidCache;
}

/** 탭 하나의 수명. 저장하지 않는다 — 세션당 시도 횟수를 세기 위한 것뿐이다 */
const sid = uuid();

/**
 * 자동 플레이테스트 차단. **기본 차단이 아니라 명시 차단이어야 한다** —
 * 기본을 끔으로 두면 사람 데이터까지 막힌다. 오토파일럿의 사망이 사람의 사망으로
 * 집계되면 표 전체가 무의미해진다.
 */
const available = (() => {
  try {
    return new URLSearchParams(window.location.search).get("telemetry") !== "off";
  } catch {
    return true;
  }
})();

const coarsePointer = (() => {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
})();

// ── 큐 ────────────────────────────────────────────────────────

let enabled = true;
let started = false;
let queue: RunEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let backoff = 0;
let lastFps = 60;

/** 직전 표본의 프레임률. 30fps 면 입력 격자가 33ms 이고 티어 4 의 여유는 118ms 다 — 무시할 수 없다 */
export function setTelemetryFps(fps: number): void {
  if (Number.isFinite(fps)) lastFps = fps;
}

function persist(): void {
  try {
    if (queue.length === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-QUEUE_MAX)));
  } catch {
    // 저장 불가여도 이번 세션의 전송은 계속된다.
  }
}

function schedule(): void {
  if (timer !== null || queue.length === 0) return;
  timer = setTimeout(
    () => {
      timer = null;
      flushTelemetry(false);
    },
    FLUSH_MS * 2 ** Math.min(backoff, BACKOFF_MAX)
  );
}

function requeue(events: RunEvent[]): void {
  queue = [...events, ...queue].slice(-QUEUE_MAX);
  backoff += 1;
  persist();
  schedule();
}

function push(event: RunEvent): void {
  if (!available || !enabled) return;
  queue.push(event);
  if (queue.length > QUEUE_MAX) queue.splice(0, queue.length - QUEUE_MAX);
  // 한 배치가 찼으면 바로 보낸다. **다만 실패가 이어지는 중에는 그러지 않는다** —
  // 엔드포인트가 죽어 있으면 큐가 계속 50 이상이라 사망마다 재전송을 때리게 된다.
  if (queue.length >= BATCH_MAX && backoff === 0) flushTelemetry(false);
  else schedule();
}

/**
 * 큐를 비운다. `final` 은 탭이 사라지는 중이라는 뜻이다.
 *
 * 평소에는 `fetch` 를 쓴다 — 응답 코드를 봐야 4xx(다시 보내도 같은 답)와 5xx·네트워크
 * 오류(남겨 둬야 함)를 가를 수 있다. 탭이 사라질 때만 `sendBeacon` 으로 바꾼다.
 * 이때는 응답을 볼 수 없으므로 실패하면 그 배치를 잃는다 — 되돌려 두면 다음 실행에
 * 중복으로 도착하고, 중복이 유실보다 나쁘다.
 */
export function flushTelemetry(final = false): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (!available || !enabled || queue.length === 0) return;

  const events = queue.slice(0, BATCH_MAX);
  queue = queue.slice(BATCH_MAX);
  const body = JSON.stringify({ v: 1, fp: fingerprint(), iid: installId(), sid, events });

  if (final && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const ok = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    if (!ok) queue = [...events, ...queue].slice(-QUEUE_MAX);
    persist();
    return;
  }

  void fetch(ENDPOINT, {
    method: "POST",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body
  })
    .then((res) => {
      if (res.status >= 400 && res.status < 500) {
        // 스키마가 틀렸거나 프로젝트가 허용 목록에 없다. 남겨 두면 큐가 영원히 막힌다.
        persist();
        return;
      }
      if (!res.ok) requeue(events);
      else {
        backoff = 0;
        persist();
        schedule();
      }
    })
    .catch(() => requeue(events));
}

/** 수집을 켜고 끈다. 끄면 즉시 멈추고 쌓인 것도 버린다 — 끄기가 소급되지 않으면 끄기가 아니다 */
export function setTelemetryEnabled(on: boolean): void {
  enabled = on;
  if (on) {
    backoff = 0;
    schedule();
    return;
  }
  queue = [];
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  persist();
}

/** 앱이 뜰 때 한 번. 지난 실행이 못 보낸 것을 먼저 집어 든다 */
export function initTelemetry(on: boolean): void {
  enabled = on;
  if (!available || started) return;
  started = true;

  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as unknown;
      if (Array.isArray(saved)) queue = [...(saved as RunEvent[]), ...queue].slice(-QUEUE_MAX);
    }
  } catch {
    // 읽을 수 없으면 그냥 이번 것부터 모은다.
  }

  // 탭이 숨거나 사라질 때 마지막으로 비운다. 주행 중이었다면 GameCanvas 가 먼저
  // abort 를 넣고 스스로 비우므로, 여기 남는 것은 그 이전 배치들뿐이다.
  const onHide = () => {
    if (document.visibilityState === "hidden") flushTelemetry(true);
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", () => flushTelemetry(true));

  schedule();
}

// ── 이벤트 만들기 ─────────────────────────────────────────────

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** y 에서 가장 가까운 자유 구간까지의 거리. 안에 있으면 0, 자유 구간이 없으면 −1 */
function gapDistance(spans: Span[], y: number): number {
  if (spans.length === 0) return -1;
  let best = Number.POSITIVE_INFINITY;
  for (const s of spans) {
    if (y >= s.lo && y <= s.hi) return 0;
    best = Math.min(best, y < s.lo ? s.lo - y : y - s.hi);
  }
  return best;
}

function baseEvent(state: GameState, k: RunEvent["k"]): RunEvent {
  const cfg = state.config;
  const stage = state.mode === "stage";
  return {
    k,
    ts: Date.now(),
    mode: state.mode,
    ...(stage ? { tier: cfg.tier, no: cfg.stageNo } : { seed: cfg.seed }),
    att: state.attempts,
    cap: cfg.axisCap,
    pre: cfg.presetId ?? "neutral",
    lanes: state.lanes,
    bld: [state.build.slope, state.build.speed, state.build.bias],
    t: r2(state.elapsed),
    fps: Math.round(lastFps),
    prac: cfg.practice ? 1 : 0,
    // 튜닝 패널이 물리를 바꾼 런은 다른 게임이다. 연습 모드와 같은 이유로 갈라 둔다.
    dev: cfg.overrides && Object.keys(cfg.overrides).length > 0 ? 1 : 0,
    hud: state.hud ? 1 : 0,
    mob: coarsePointer ? 1 : 0
  };
}

/** 사망 이벤트를 만든다. 큐와 무관한 순수 함수라 검증기가 그대로 부른다 */
export function buildDeathEvent(state: GameState): RunEvent {
  const gaps = state.deathGap ?? [];
  const piece = state.deathPiece;
  const event = baseEvent(state, "death");
  event.x = r1(state.x);
  event.y = r1(state.y);
  event.hold = state.holding ? 1 : 0;
  event.gw = r1(measure(gaps));
  event.gd = r1(gapDistance(gaps, state.y));
  if (piece) {
    event.pi = piece.index;
    event.pid = piece.id;
    event.lx = r1(piece.localX);
  }
  return event;
}

/**
 * 클리어와 이탈. 둘 다 사망률의 **분모**다 —
 * 클리어가 없으면 전 구간을 지나간 주행이 집계에서 빠져 사망률이 부풀고,
 * 이탈이 없으면 그만두고 떠난 사람이 통째로 보이지 않는다.
 */
export function buildEndEvent(state: GameState, k: "clear" | "abort"): RunEvent {
  const event = baseEvent(state, k);
  event.dist = r1(state.x);
  event.sec = r2(state.elapsed);
  return event;
}

export function recordDeath(state: GameState): void {
  push(buildDeathEvent(state));
}

export function recordEnd(state: GameState, k: "clear" | "abort"): void {
  push(buildEndEvent(state, k));
}
