/**
 * 기록패 — 플레이어 간 비동기 경쟁의 유일한 통로(v0.5, notes/decisions.md G76).
 *
 * 내 상태를 짧은 문자열 하나로 굽고(`makeCard` → `encodeCard`), 남이 그걸 붙여 넣으면
 * 내 세계에서 계속 자라는 **고스트 라이벌**이 된다(`parseCard` → `addGhost`).
 * 서버도, 런타임 네트워크도 쓰지 않는다 — 이 게임의 비협상 규칙이다(AGENTS.md).
 *
 * **여기 있는 것은 전부 단방향이다.** 이 모듈은 `engine.ts`를 import 하지만 그 반대는
 * 없다. 고스트는 `World.rivals`에 들어가는 평범한 `RivalState`라서 `step()`·
 * `digRival()`·`spawnTip()`·`fullRanking()`이 이미 알아서 다룬다 — 엔진에 분기를
 * 하나도 만들지 않았다.
 *
 * **위조에 대해**: 막을 수 없다. 세이브가 localStorage에 있고 가져오기가 공개 기능인
 * 클라이언트 권위 구조라, 서명을 붙여도 키가 번들에 같이 실린다. 그래서 `k`는
 * 보안 장치가 아니라 **오타·잘린 코드 검출기**다. 진짜 방어선은 아래 두 가지다 —
 * (1) 모든 수치에 상한을 건다, (2) 고스트는 내 세계의 원장을 깎지 못한다(§addGhost).
 */
import { ARTIFACT_BY_ID } from "./artifacts";
import {
  ASSET_SCORE_REF, BASE_DIG, CARD_MAX_CHARS, CARD_NAME_MAX_CHARS, CARD_VERSION, DEFAULT_OWNER_NAME,
  FAME_FIRST_T4_WEIGHT, GEAR_MULT, GHOST_DIG_POWER_CAP, GHOST_MAX, GHOST_WORKERS_CAP,
  MAX_GEAR_LEVEL, TIER4_SPECIES_TOTAL, WORKER_DIG
} from "./balance";
import { SITE_BY_ID } from "./sites";
import { assetScore, codexProgress, codexScore, fameScore } from "./engine";
import { fnv1a32 } from "./hash";
import type { PersistentRecord, RivalState, SiteId, World } from "./types";

/**
 * 기록패의 내용물. 필드 하나하나가 위조 표면이자 마이그레이션 부채라서, 순위표가
 * 상대를 그리는 데 **실제로 필요한 최소치만** 담는다.
 */
export type RelicCard = {
  /** 스키마 버전 */
  v: number;
  /** 표시 이름(`CARD_NAME_MAX_CHARS`자) */
  n: string;
  /** 기록패를 구운 시점의 `world.t`(초) = 상대의 플레이 시간 */
  t: number;
  /**
   * 그 시점의 인부 수와 장비 등급. **발굴력이라는 결과값이 아니라 상태를 나른다** —
   * 결과값을 나르면 받는 쪽이 되돌리다 틀린다(`GHOST_DIG_POWER_CAP` 주석의 실측 참조).
   * 발굴단(`teams`) 몫은 담지 않는다. 라이벌은 발굴단을 갖지 않으므로 옮겨 봐야
   * 태울 자리가 없다 — 그래서 고스트는 상대의 "단독 발굴" 만큼만 세다(알려진 단순화).
   */
  w: number;
  g: number;
  /** 자산 축(0~1) */
  a: number;
  /** 도감 축(0~1) */
  c: number;
  /** 명성 축(0~1) */
  f: number;
  /** 소장 중인 유일(T4) 종 id. 최대 `TIER4_SPECIES_TOTAL`개 */
  u: string[];
  /** 본거지 거점 */
  h: SiteId;
  /** 체크섬(오타 검출용) */
  k: string;
};

/** 체크섬을 뺀 본문을 항상 같은 순서로 직렬화한다 — 키 순서가 흔들리면 체크섬이 흔들린다 */
function body(card: Omit<RelicCard, "k">): string {
  return JSON.stringify([card.v, card.n, card.t, card.w, card.g, card.a, card.c, card.f, card.u, card.h]);
}

function checksum(card: Omit<RelicCard, "k">): string {
  return fnv1a32(body(card)).toString(36);
}

/**
 * 같은 사람인지 판별하는 키. **이름이 아니라 본문에서 뽑는다** — 이름은 언제든 바꿀 수
 * 있어서 "같은 사람의 새 기록패"를 이름으로 판별하면 개명 한 번에 고스트가 둘이 된다.
 * 대신 사람마다 고정인 값을 쓴다: 본거지 + 그 사람이 처음 가진 유일 종(있으면).
 * 둘 다 없으면(신규 플레이어) 이름으로 떨어진다 — 그 단계에서는 어차피 구분할 것이 없다.
 */
export function cardKeyOf(card: RelicCard): string {
  const anchor = card.u.length > 0 ? [...card.u].sort()[0] : card.n;
  return fnv1a32(`${card.h}|${anchor}`).toString(36);
}

/**
 * 본문에 체크섬을 붙여 완성한다. `makeCard`가 쓰고, **월드 없이 기록패를 지어야 하는
 * 곳**(밸런스 시뮬의 `--ghosts`)도 쓴다 — 체크섬 계산을 두 벌 두지 않기 위해 공개한다.
 */
export function signCard(draft: Omit<RelicCard, "k">): RelicCard {
  const normalized = { ...draft, v: CARD_VERSION, n: sanitizeName(draft.n) };
  return { ...normalized, k: checksum(normalized) };
}

/** 지금 내 상태로 기록패를 굽는다 */
export function makeCard(w: World, record: PersistentRecord): RelicCard {
  const ownedT4 = Object.keys(w.codex)
    .filter((id) => {
      const state = w.codex[id];
      if (state !== "owned" && state !== "owned_unidentified") return false;
      return ARTIFACT_BY_ID[id]?.tier === 4;
    })
    .slice(0, TIER4_SPECIES_TOTAL);

  const draft: Omit<RelicCard, "k"> = {
    v: CARD_VERSION,
    n: sanitizeName(record.ownerName),
    t: Math.round(w.t),
    w: Math.min(w.workers, GHOST_WORKERS_CAP),
    g: Math.min(w.gear, MAX_GEAR_LEVEL),
    // 소수점 넷째 자리까지면 순위표가 쓰는 정밀도를 넘는다. 자릿수가 곧 코드 길이다.
    a: round4(assetScore(w)),
    c: round4(codexScore(w)),
    f: round4(fameScore(w, record)),
    u: ownedT4,
    h: baseSiteOf(w)
  };
  return signCard(draft);
}

/** 가장 먼저 본거지가 된 곳. `teamHomeSite()`와 같은 규칙이지만 여기선 거점만 필요하다 */
function baseSiteOf(w: World): SiteId {
  let home: SiteId = w.activeSite;
  let earliest = Infinity;
  for (const id of Object.keys(w.sites) as SiteId[]) {
    const since = w.sites[id].baseSince;
    if (!w.sites[id].unlocked || since === null) continue;
    if (since < earliest) {
      earliest = since;
      home = id;
    }
  }
  return home;
}

const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

function sanitizeName(raw: string): string {
  // 제어문자를 털고 길이를 자른다. 이 이름은 로그와 순위표에 그대로 찍힌다.
  const cleaned = [...String(raw ?? "")].filter((ch) => ch >= " " && ch !== "\u007f").join("").trim();
  return (cleaned || DEFAULT_OWNER_NAME).slice(0, CARD_NAME_MAX_CHARS);
}

// ── 인코딩 ────────────────────────────────────────────────────────────────
// base64url을 쓴다. 메신저·주소창을 거쳐도 `+`/`/`/`=`가 깨지지 않는다.
// 압축 라이브러리는 넣지 않았다 — 런타임 의존성이 늘고, 실측 길이가 이미 충분하다
// (`eval.md` §21).

function toBase64Url(text: string): string {
  return btoa(unescape(encodeURIComponent(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(padded + "=".repeat((4 - (padded.length % 4)) % 4))));
}

export function encodeCard(card: RelicCard): string {
  return toBase64Url(JSON.stringify(card));
}

/**
 * 남이 준 문자열을 기록패로 읽는다. **실패는 예외가 아니라 `null`이다** — 호출부가
 * try/catch를 잊어도 게임이 멈추지 않아야 한다. 들어오는 값은 전부 적대적 입력으로
 * 본다: 길이 → 디코드 → JSON → 버전 → 필드별 타입·범위 → 체크섬 순으로 거른다.
 */
export function parseCard(text: string): RelicCard | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > CARD_MAX_CHARS) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(trimmed));
  } catch {
    return null;
  }
  // 배열도 typeof "object"다. 프로토타입 오염 경로를 아예 만들지 않으려고
  // 값을 하나씩 꺼내 새 객체를 짓는다 — 스프레드로 통째 받지 않는다.
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;

  if (src.v !== CARD_VERSION) return null;
  if (typeof src.n !== "string") return null;
  if (typeof src.h !== "string" || !SITE_BY_ID[src.h as SiteId]) return null;
  if (typeof src.k !== "string") return null;

  const t = unitless(src.t, 0, 3_600 * 24 * 365 * 10);
  const workers = integer(src.w, 0, GHOST_WORKERS_CAP);
  const gear = integer(src.g, 0, MAX_GEAR_LEVEL);
  const a = unitless(src.a, 0, 1);
  const c = unitless(src.c, 0, 1);
  const f = unitless(src.f, 0, 1);
  if (t === null || workers === null || gear === null || a === null || c === null || f === null) return null;

  if (!Array.isArray(src.u)) return null;
  const u: string[] = [];
  for (const id of src.u) {
    if (typeof id !== "string") return null;
    // 실존하는 유일(T4) 종만 받는다. 아니면 명성 축을 공짜로 부풀릴 수 있다.
    if (ARTIFACT_BY_ID[id]?.tier !== 4) return null;
    if (!u.includes(id)) u.push(id);
  }
  if (u.length > TIER4_SPECIES_TOTAL) return null;

  const draft: Omit<RelicCard, "k"> = {
    v: CARD_VERSION, n: sanitizeName(src.n), t, w: workers, g: gear, a, c, f, u, h: src.h as SiteId
  };
  if (checksum(draft) !== src.k) return null;
  return { ...draft, k: src.k };
}

/** 정수이고 범위 안이면 그 값, 아니면 null */
function integer(v: unknown, min: number, max: number): number | null {
  const n = unitless(v, min, max);
  return n === null || !Number.isInteger(n) ? null : n;
}

/** 유한한 숫자이고 범위 안이면 그 값, 아니면 null. `NaN`·`Infinity`·문자열 전부 걸린다 */
function unitless(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < min || v > max) return null;
  return v;
}

// ── 고스트 ────────────────────────────────────────────────────────────────

/**
 * 기록패를 `RivalState`로 되돌린다.
 *
 * **3축을 그대로 재현하는 것이 이 함수의 계약이다.** `fullRanking()`이 라이벌을 채점하는
 * 식을 거꾸로 푼다 —
 * - 자산: `vaultValue / ASSET_SCORE_REF` → `vaultValue = a × ASSET_SCORE_REF`
 * - 도감: `(owned.length + ownedExtra) / 검증총수` → `ownedExtra = round(c × 검증총수) − u.length`
 * - 명성: `(owned 중 T4 수 / 12) × 0.5 + fameExtra` → `fameExtra = f − (u.length / 12) × 0.5`
 *
 * 마지막 줄이 `fameExtra`가 존재하는 이유다. 라이벌 채점식에는 관람객 항이 없어서
 * (NPC는 박물관을 짓지 않는다) 그 몫을 따로 들지 않으면 사람 상대의 명성만 낮게 찍힌다.
 *
 * 인부·장비는 **그대로 옮긴다**. 고스트에게 `baseDig` 배수를 주지 않는 이유(사람은
 * 설계된 캐릭터가 아니다)와, 발굴력을 역산하지 않는 이유(한 번 틀렸다)는 각각
 * `GHOST_DIG_POWER_CAP` 주석에 적어 뒀다. 상한은 옮긴 뒤 **한 번만** 건다 —
 * 그 뒤의 성장은 NPC와 같은 규칙이다.
 */
export function cardToRival(card: RelicCard, w: World, receivedT: number): RivalState {
  const verifiedTotal = codexProgress(w).total;
  const gear = Math.min(card.g, MAX_GEAR_LEVEL);
  // 받아들이는 순간의 발굴력이 상한을 넘으면 인부 쪽을 깎는다 — 장비는 게임이 이미
  // 자른 값이고, 깎을 곳이 하나여야 "얼마나 깎였는지"를 설명할 수 있다.
  const gearMult = Math.pow(GEAR_MULT, gear);
  const maxWorkers = Math.max(0, Math.floor((GHOST_DIG_POWER_CAP / gearMult - BASE_DIG) / WORKER_DIG));
  const workers = Math.min(card.w, GHOST_WORKERS_CAP, maxWorkers);
  const ownedSpecies = Math.round(card.c * verifiedTotal);
  const key = cardKeyOf(card);

  return {
    id: `ghost:${key}`,
    name: card.n,
    baseDig: 1,
    favSite: card.h,
    homeSite: card.h,
    // 사람이 무엇을 팔지 우리는 모른다. NPC 중간값(진귀 이하 처분)으로 둔다.
    sellBelow: 1,
    workers,
    gear,
    funds: 0,
    layer: 1,
    layerProgress: 0,
    dropProgress: 0,
    vaultValue: card.a * ASSET_SCORE_REF,
    owned: [...card.u],
    ownedExtra: Math.max(0, ownedSpecies - card.u.length),
    fameExtra: Math.max(0, card.f - (card.u.length / TIER4_SPECIES_TOTAL) * FAME_FIRST_T4_WEIGHT),
    catchup: 1,
    tipChase: null,
    ghost: { key, capturedT: card.t, receivedT }
  };
}

export const isGhost = (r: RivalState): boolean => r.ghost !== undefined;

/**
 * 고스트를 내 세계에 들인다.
 *
 * **내 원장(`w.ledger`)은 건드리지 않는다.** 상대가 유일을 가졌다는 정보는 순위표에만
 * 쓰고, 내 세계의 재고를 줄이지 않는다. 줄이면 "남의 코드를 받는 순간 내 유일이
 * 사라지는" 게임이 되고, 그러면 아무도 붙여 넣지 않는다 — 기능 자체가 죽는다.
 * 세계 원장은 내 판 안에서만 유효하다(G76.1).
 *
 * 들어온 고스트는 그다음부터 **내 판의 규칙으로** 산다: 내 원장에서 캐고, 내 제보
 * 레이스에 끼어들고, 그때 잃는 것만 진짜 상실이다(척추 3번은 그대로다 — 오프라인
 * 중에는 상위 티어를 못 가져간다).
 */
export function addGhost(w: World, card: RelicCard): RivalState {
  const ghost = cardToRival(card, w, w.t);
  // 같은 사람의 새 기록패는 교체한다(이름이 아니라 키로 판별한다)
  const existing = w.rivals.findIndex((r) => r.ghost?.key === ghost.ghost?.key);
  if (existing >= 0) {
    // 내 판에서 그동안 쌓은 것(캔 유물·자금)은 유지하고 스냅샷 몫만 새로 덮는다 —
    // 갱신 한 번에 상대가 내 세계에서 캔 유물을 잃으면 원장과 어긋난다.
    const prev = w.rivals[existing];
    w.rivals[existing] = {
      ...ghost,
      owned: [...new Set([...prev.owned, ...ghost.owned])],
      funds: prev.funds,
      layer: Math.max(prev.layer, ghost.layer),
      workers: Math.max(prev.workers, ghost.workers),
      gear: Math.max(prev.gear, ghost.gear),
      vaultValue: Math.max(prev.vaultValue, ghost.vaultValue)
    };
    return w.rivals[existing];
  }

  const ghostCount = w.rivals.filter(isGhost).length;
  if (ghostCount >= GHOST_MAX) {
    // 가장 오래 전에 받은 고스트를 밀어낸다
    let oldest = -1;
    let oldestT = Infinity;
    for (let i = 0; i < w.rivals.length; i++) {
      const meta = w.rivals[i].ghost;
      if (meta && meta.receivedT < oldestT) {
        oldestT = meta.receivedT;
        oldest = i;
      }
    }
    if (oldest >= 0) w.rivals.splice(oldest, 1);
  }
  w.rivals.push(ghost);
  return ghost;
}

export function removeGhost(w: World, id: string): void {
  const i = w.rivals.findIndex((r) => r.id === id && isGhost(r));
  if (i >= 0) w.rivals.splice(i, 1);
}
