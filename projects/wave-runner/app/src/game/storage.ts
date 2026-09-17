import { EMPTY_META } from "./meta";
import type { Meta } from "./meta";
import { DEFAULT_RUNNER, RUNNER_BY_ID } from "./runners";
import type { RunnerId } from "./types";

const KEY = "wave-runner/meta/v3";
/** v2 는 지우지 않는다 — 마이그레이션이 잘못됐을 때 되돌릴 자리가 없으면 영구 해금을 날린다. */
const KEY_V2 = "wave-runner/meta/v2";

/** 프리셋은 기체에 흡수됐다. 구매액을 코어로 되돌린다(표준은 무료였다). */
const PRESET_REFUND = 120;

function asRunner(id: unknown): RunnerId {
  return typeof id === "string" && RUNNER_BY_ID.has(id as RunnerId)
    ? (id as RunnerId)
    : DEFAULT_RUNNER.id;
}

function fresh(): Meta {
  return { ...EMPTY_META, clearedStages: [], bestStageSec: {}, bestDistance: {}, attempts: {} };
}

/**
 * v2 → v3.
 *
 * v2 의 기록에는 기체 개념이 없었으므로 **전부 표준 기체의 것으로 이관한다.** 실제로
 * 그때 쓰던 곡선이 표준 기체의 곡선과 소수점까지 같으므로(`tests/verify/angles.ts`)
 * 이건 편의가 아니라 사실이다.
 */
function migrateV2(raw: string): Meta {
  const p = JSON.parse(raw) as Record<string, unknown>;
  const out = fresh();
  const id = DEFAULT_RUNNER.id;

  out.cores = typeof p.cores === "number" ? p.cores : 0;
  out.axisCap = p.axisCap === 3 ? 3 : 2;
  out.fullPool = Boolean(p.fullPool);

  const presets = Array.isArray(p.presets) ? p.presets : [];
  out.cores += Math.max(0, presets.length - 1) * PRESET_REFUND;

  if (Array.isArray(p.clearedStages)) {
    out.clearedStages = p.clearedStages.filter((k): k is string => typeof k === "string").map((k) => `${id}:${k}`);
  }
  for (const [k, v] of Object.entries((p.bestStageSec ?? {}) as Record<string, number>)) {
    out.bestStageSec[`${id}:${k}`] = v;
  }
  for (const [k, v] of Object.entries((p.attempts ?? {}) as Record<string, number>)) {
    out.attempts[k === "endless" ? k : `${id}:${k}`] = v;
  }
  if (typeof p.bestDistance === "number" && p.bestDistance > 0) out.bestDistance[id] = p.bestDistance;

  // 표시·수집 설정은 해금이 아니라 취향이다. 넘기지 않으면 조용히 기본값으로 되돌아간다.
  if (typeof p.hud === "boolean") out.hud = p.hud;
  if (typeof p.telemetry === "boolean") out.telemetry = p.telemetry;
  // v2 를 가진 사람은 정의상 이미 해 본 사람이다.
  out.taught = true;

  return out;
}

/**
 * 이 저장본의 주인이 이미 게임을 해 봤는가.
 *
 * `taught` 를 모르던 판본의 저장본에 안내를 띄우면, **아는 사람에게 안내를 띄우는
 * 것**이라 그 자체로 실패다. 한 번이라도 시도했거나 깼으면 배운 것으로 친다.
 */
function playedBefore(p: Partial<Meta>): boolean {
  if (Array.isArray(p.clearedStages) && p.clearedStages.length > 0) return true;
  if (p.attempts && Object.keys(p.attempts).length > 0) return true;
  return Boolean(p.bestDistance && Object.keys(p.bestDistance).length > 0);
}

function coerce(p: Partial<Meta>): Meta {
  const out = fresh();
  return {
    ...out,
    cores: typeof p.cores === "number" ? p.cores : 0,
    runner: asRunner(p.runner),
    axisCap: p.axisCap === 3 ? 3 : 2,
    fullPool: Boolean(p.fullPool),
    clearedStages: Array.isArray(p.clearedStages) ? p.clearedStages : [],
    bestStageSec: p.bestStageSec ?? {},
    bestDistance: p.bestDistance ?? {},
    attempts: p.attempts ?? {},
    // 저장본이 이 키들을 모르던 시절에 만들어졌으면 켠 상태로 읽는다.
    hud: p.hud ?? true,
    telemetry: p.telemetry ?? true,
    // 연습만 반대다 — 모르는 저장본을 연습으로 열면 그 사람의 기록이 조용히 사라진다.
    practice: p.practice ?? false,
    taught: p.taught ?? playedBefore(p)
  };
}

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return coerce(JSON.parse(raw) as Partial<Meta>);
    const legacy = localStorage.getItem(KEY_V2);
    if (legacy) {
      const migrated = migrateV2(legacy);
      saveMeta(migrated);
      return migrated;
    }
    return fresh();
  } catch {
    return fresh();
  }
}

export function saveMeta(meta: Meta): Meta {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // 저장 불가(프라이빗 모드 등)여도 플레이는 계속된다.
    // 계정 동기화가 제대로 된 답이고, 이건 알려진 부채다.
  }
  return meta;
}

/** 진행도를 사람이 옮길 수 있게 텍스트로 뽑는다. localStorage 단독 의존을 줄이는 최소 장치. */
export function exportMeta(meta: Meta): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(meta))));
}

/** v2 로 내보낸 문자열도 받는다 — 버전이 올랐다고 남이 가진 진행도를 버릴 수는 없다. */
export function importMeta(text: string): Meta | null {
  try {
    const json = decodeURIComponent(escape(atob(text.trim())));
    const parsed = JSON.parse(json) as Partial<Meta> & { presets?: unknown };
    if (typeof parsed !== "object" || parsed === null) return null;
    if (parsed.version === 3) return coerce(parsed);
    return migrateV2(json);
  } catch {
    return null;
  }
}
