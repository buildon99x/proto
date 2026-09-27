/**
 * 세계관 문구 — 화면에 올라가는 「지구 출토」 문장은 전부 여기서 읽는다(spec.md §15.2).
 *
 * 규칙은 셋이다.
 * 1. **외울 단어를 만들지 않는다**(G111). 여기 있는 말은 전부 화면의 말 그대로 읽힌다.
 *    "다음 확인"은 용어가 아니라 서류의 빈칸이다(G121).
 * 2. **숫자를 만들지 않는다**(척추 5번). 이 파일은 규칙 상수를 하나도 읽거나 바꾸지 않고,
 *    승산·가격·시간 같은 수치는 원래 화면이 적던 그대로 둔다. 날짜 둘(2094년 3월, 2351년)만
 *    세계의 상수다.
 * 3. **카드 위쪽은 실재 기록이다**(ip/bible.md §12). 유물명·소장처는 데이터 그대로 쓰고,
 *    픽션은 점선 아래(확인자·다음 확인)와 산 사람 한 줄에만 쓴다.
 *
 * 톤을 통째로 바꾸거나 세계관을 끄는 일이 이 파일 하나의 문제로 남아야 한다.
 */
import { ARTIFACT_BY_ID, ARTIFACTS } from "./artifacts";
import { DEFAULT_OWNER_NAME, SITE_BY_ID } from "./balance";
import { hashFrac } from "./hash";
import type { Artifact, SiteId, World } from "./types";
import type { CrewId } from "../render/crew.generated";

// ── 세계의 상수 ─────────────────────────────────────────────────────────────

/** 유물마다 같은 날짜다. 월 단위 아래로 내려가지 않는다(G107) */
export const LAST_CHECKED = "2094년 3월";
/** 게임이 시작하는 달 — 2094년 봄에서 257년 뒤(ip/bible.md §2) */
const NOW_YEAR = 2351;
const NOW_MONTH = 5;
const MONTH_SECONDS = 30 * 86400;

/** 지금이 세계 달력으로 몇 년 몇 월인가. 게임 시각(world.t) 30일마다 한 달씩 넘어간다 */
export function worldMonth(t: number): string {
  const idx = NOW_MONTH - 1 + Math.max(0, Math.floor(t / MONTH_SECONDS));
  return `${NOW_YEAR + Math.floor(idx / 12)}년 ${(idx % 12) + 1}월`;
}

// ── 세계 — 네 문장과 한 문장 ────────────────────────────────────────────────

/**
 * `notes/world-lore.md` §0의 네 문장, 그리고 바이블이 뒤에 붙인 한 문장(ip/bible.md §1).
 * 다섯째 문장이 있어야 카드(다음 확인 칸)가 왜 있는지 화면이 따로 설명하지 않아도 된다.
 */
export const WORLD_LINES = [
  "257년 전, AI가 지구를 자원으로 갈아 먹었다.",
  "사람들은 달과 화성으로 떠났고, 지구는 반쯤 뜯긴 채 남았다.",
  "우주에서 태어난 사람들은 지구를 본 적이 없다. 그래서 지구에서 나온 진짜라면 무엇이든 비싸다.",
  "우리는 그 진짜를 파러 내려가는 도굴 팀이다.",
  "떠나지 않은 사람들이 상자에 카드를 넣어 묻었다. 카드의 마지막 칸은 비어 있다 — 다음 확인."
] as const;

// ── 크루 다섯 ───────────────────────────────────────────────────────────────

export type CrewMember = { id: CrewId; name: string; role: string };

/** 이름과 맡은 일. 설정 문구가 아니라 명찰이다(notes/characters.md) */
export const CREW: Record<CrewId, CrewMember> = {
  "seo-gaon": { id: "seo-gaon", name: "서가온", role: "강하 책임" },
  "mira-anyango": { id: "mira-anyango", name: "미라 아냥고", role: "감정·전시" },
  "jeong-dokyeong": { id: "jeong-dokyeong", name: "정도경", role: "시장" },
  "haedal-hd8": { id: "haedal-hd8", name: "해달(HD-8)", role: "하역·보존" },
  yeoe7: { id: "yeoe7", name: "예외7", role: "신호·운영" }
};
export const CREW_ORDER: CrewId[] = ["seo-gaon", "mira-anyango", "jeong-dokyeong", "haedal-hd8", "yeoe7"];

// ── 화면별 한 줄 (spec.md §15.3) ─────────────────────────────────────────────

/**
 * 화면마다 한 줄씩. 누가 말하는지(`who`)가 붙은 줄은 크루 명찰과 함께 뜬다.
 * 문장은 "설명"이 아니라 "사실"로 쓴다 — 읽지 않아도 그 화면의 규칙은 그대로다(척추 4번).
 */
export const SCREEN: Record<string, { who: CrewId; text: string }> = {
  /** 발굴 탭 — 발굴단 카드 */
  dig: { who: "seo-gaon", text: "표층은 기계가 갈아 놓은 가루다. 그 아래가 원래 땅이다. 줄에 안 걸린 사람은 안 내려간다." },
  /** 파견 시트 — 원정 미스헵(§10 결속표 "원정·미스헵") */
  dispatch: { who: "seo-gaon", text: "기계는 아직 돈다. 멀리 내려갈수록 사고가 난다. 사람 없는 현장엔 안 내려간다." },
  /** 첫 거점 카드 */
  base: { who: "seo-gaon", text: "내려갈 자리를 하나 더 정한다. 멀수록 가는 길이 길다." },
  /** 소장고 — 미감정 */
  appraisal: { who: "mira-anyango", text: "가짜가 넘친다. 진짜인지 카드와 대조하는 데 시간이 든다." },
  /** 소장고 — 정원 */
  vault: { who: "haedal-hd8", text: "정원은 창고 부피가 아니라 손이 갈 수 있는 개수다. 자리를 먹는 건 중복뿐이다." },
  /** 시설 — 보관소 */
  storage: { who: "haedal-hd8", text: "2091년 울산에서 만든 하역기. 지구에서 만든 기계는 이제 아무도 못 만든다." },
  /** 시설 — 박물관 */
  museum: {
    who: "mira-anyango",
    text: "못 사는 사람들이 중계로 본다. 그 도시를 그리워하는 사람이 많을수록 많이 본다. 전시하면 카드의 다음 칸에 박물관 이름이 들어간다."
  },
  /** 시설 — 경매장 */
  auction: { who: "jeong-dokyeong", text: "경매장은 카드가 붙은 물건만 받는다. 출처를 묻는 곳이라 비싸다." },
  /** 시장 탭 — 암시장 */
  market: { who: "jeong-dokyeong", text: "여기는 카드를 묻지 않는다. 그래서 싸다. 카드 없는 물건은 진짜여도 증명할 수 없다." },
  /** 도감 탭 */
  codex: { who: "mira-anyango", text: "무엇이 있었는지는 기록이 안다. 지금 어디 있는지는 아무도 모른다." },
  /** 순위표·기록패 */
  rank: { who: "yeoe7", text: "같은 신호를 듣는 동업자 여섯 팀. 싸우지 않는다. 늦을 뿐이다." }
};

/** 도감의 세계 재고 줄 옆 — 현존 수량 = 공급(척추 1번)을 세계의 말로 */
export const STOCK_NOTE = "지구에 있던 만큼만 있다. 더는 안 만들어진다.";

/** 제보 배너의 반응 유예 줄(G112). 30초는 신호가 콜로니까지 닿는 시간이다 */
export const TIP_GRACE = "기계가 밀어 올린 상자를 여섯 팀이 같이 들었다";

// ── ① 마지막 확인 · §17 다음 확인 — 카드 ────────────────────────────────────

/** 기록패 이름(`PersistentRecord.ownerName`)을 카드에 쓸 이름으로. 기본값이면 "우리 팀" */
export function teamName(ownerName: string | undefined): string {
  const name = (ownerName ?? "").trim();
  return !name || name === DEFAULT_OWNER_NAME ? "우리 팀" : name;
}

/** 확인자 칸 — 상자를 연 팀의 감정 담당이 쓴다(ip/bible.md §4.3) */
export const CHECKER = CREW["mira-anyango"].name;

/**
 * 다음 확인 칸에 들어가는 이름. 게임의 세 갈래가 이 칸 하나로 모인다(G121).
 * 쥐면 우리 팀, 전시하면 박물관, 팔면 산 사람.
 */
export function nextCheckName(
  item: { displayed?: boolean; museumSite?: SiteId } | null,
  ownerName: string | undefined,
  museumLabel?: (site: SiteId) => string
): string {
  if (item?.displayed && item.museumSite) {
    const label = museumLabel ? museumLabel(item.museumSite) : `${SITE_BY_ID[item.museumSite].city} 전시`;
    return `${label} — 누구나 본다`;
  }
  return `${teamName(ownerName)} — 우리만 본다`;
}

// ── ② 산 사람 한 줄 (G108) ──────────────────────────────────────────────────

const BUYER_PLACES = ["화성 3구역", "화성 3구역", "화성 1구역", "화성 7구역", "달 정착지", "달 정착지", "궤도 거주구"] as const;
const BUYER_GENERATION = ["3세대", "4세대", "4세대", "4세대", "5세대"] as const;
/** {city}·{country}만 채운다. 따뜻함은 이 줄에서만 나온다(ip/bible.md §11) */
const BUYER_REASONS = [
  "할머니가 {city} 사람이었다고 한다.",
  "증조부의 서류에 {country}라고 적혀 있다. 확인할 길은 없다.",
  "{city}에 가 본 적은 없다. 사진으로만 봤다.",
  "선반 하나를 비워 두고 기다렸다.",
  "석 달치 배급을 냈다.",
  "연고는 없다. 만져 보고 싶었다고 한다.",
  "물려받을 사람의 이름을 카드에 미리 적어 두겠다고 한다."
] as const;

function pick<T>(list: readonly T[], seed: string): T {
  return list[Math.floor(hashFrac(seed) * list.length) % list.length];
}

/**
 * 구매자 한 줄 — "화성 3구역, 4세대. 할머니가 경주 사람이었다고 한다."
 * 유물 id와 사본 uid로 결정론적으로 고른다(`hashFrac`). **새 이벤트를 만들지 않는다** —
 * 이미 있는 정산 줄 뒤에 붙을 뿐이다(G108).
 */
export function buyerLine(artifactId: string, uid: number): string {
  const a = ARTIFACT_BY_ID[artifactId];
  const site = a ? SITE_BY_ID[a.site] : undefined;
  const seed = `${artifactId}#${uid}`;
  const place = pick(BUYER_PLACES, `${seed}:place`);
  const gen = pick(BUYER_GENERATION, `${seed}:gen`);
  const reason = pick(BUYER_REASONS, `${seed}:why`)
    .replace("{city}", site?.city ?? "지구")
    .replace("{country}", site?.country ?? "지구");
  return `${place}, ${gen}. ${reason}`;
}

// ── ③ 팀 등록증의 빈칸 — 찾는 한 점 (G109) ─────────────────────────────────

/** 고를 수 있는 것: 거점마다 하나씩 있는 유일 12점. 규칙은 하나도 바뀌지 않는다 */
export const WANTED_CANDIDATES: Artifact[] = ARTIFACTS.filter((a) => a.tier === 4);

/** 안 고르면 이것 — 시작 거점(경주 거점)의 유일. 기본값이 즉시 진행을 허용한다(척추 4번) */
export function wantedOf(w: World): Artifact {
  const picked = w.wanted ? ARTIFACT_BY_ID[w.wanted] : undefined;
  if (picked && picked.tier === 4) return picked;
  return WANTED_CANDIDATES.find((a) => a.site === w.activeSite) ?? WANTED_CANDIDATES[0];
}

export type WantedStatus = "open" | "found" | "gone";

/** 찾는 한 점의 지금 — 찾았다 / 아직 / 남이 먼저 가져가 엔딩까지 빈다 */
export function wantedStatus(w: World): WantedStatus {
  const s = w.codex[wantedOf(w).id];
  if (s === "owned" || s === "owned_unidentified") return "found";
  // 한 번 손에 넣었다가 팔았어도 칸은 채워졌다(카드에 우리 이름이 한 번 적혔다)
  if (w.ledger[wantedOf(w).id]?.owners.includes("player")) return "found";
  if (s === "lost") return "gone";
  return "open";
}

export function wantedLine(w: World): string {
  const a = wantedOf(w);
  const st = wantedStatus(w);
  if (st === "found") return `찾는 한 점 — ${a.name}: 찾았다.`;
  if (st === "gone") return `찾는 한 점 — ${a.name}: 다른 팀이 먼저 열었다. 이 칸은 엔딩까지 빈다.`;
  return `찾는 한 점 — ${a.name}: 아직.`;
}

// ── ④ 예외7의 명단 — 복귀 요약 ──────────────────────────────────────────────

/** 자리를 비운 동안 예외7이 한 일과 하지 않은 일(§15.3, G113). 매번 같은 한 줄이다 */
export const OFFLINE_DID = "자리를 비운 동안 팔고, 관리하고, 다시 투자했다. 유일은 다투지 않았다 — 사람 없는 현장엔 안 내려간다.";

const ROSTER_LINES = [
  "기록 맨 끝에 2097년 대피 명단이 그대로 붙어 있다. 지우지 않았다.",
  "순서를 다시 정했다. 무엇을 남기고 무엇을 넘길지. 257년 전에 하던 일과 같은 동작이다.",
  "대피 명단에는 탑승·대기 말고 한 칸이 더 있다. 그 칸을 지우는 법은 안다."
] as const;

/**
 * 명단 한 줄 — **매 복귀마다 반복하지 않는다**(spec.md §15.5 ④). 6시간 이상 비운
 * 복귀에서, 그날(게임 시각 하루) 단위 해시가 셋 중 하나에 걸릴 때만 붙는다.
 */
export function rosterLine(t: number, awaySeconds: number): string | null {
  if (awaySeconds < 6 * 3600) return null;
  const day = Math.floor(t / 86400);
  if (hashFrac(`roster:${day}`) >= 1 / 3) return null;
  return pick(ROSTER_LINES, `roster-line:${day}`);
}

// ── ⑥ 엔딩 — 판정하지 않고 숫자만 (G110) ────────────────────────────────────

/**
 * "모은 것 중 남들이 본 것" — 지금 가진 종 가운데 이번 시즌 한 번이라도 전시한 종 수.
 * 팔아서 손을 떠난 종은 세지 않는다(모은 것의 부분집합이어야 "그중"이 참이다).
 */
export function shownCount(w: World): number {
  const set = new Set(w.shownSpecies ?? []);
  for (const v of w.vault) if (v.displayed) set.add(v.artifactId);
  let n = 0;
  for (const id of set) {
    const s = w.codex[id];
    if (s === "owned" || s === "owned_unidentified") n++;
  }
  return n;
}

/** "유물왕"은 제목이 아니라 시장이 1위 팀을 부르는 말이다(G119, ip/bible.md §6.4) */
export const KING_TITLE = "유물왕";
