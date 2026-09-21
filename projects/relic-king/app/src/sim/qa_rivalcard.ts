/**
 * 기록패·고스트 라이벌 단위 검증(v0.5, notes/decisions.md G76).
 *
 *   pnpm --filter relic-king qa:rivalcard
 *
 * 보는 것은 셋이다 —
 * 1) **왕복**: 내 3축 점수가 기록패를 거쳐 고스트로 돌아왔을 때 그대로인가.
 * 2) **적대적 입력**: 남이 준 문자열이 무엇이든 `null`로 떨어지고 예외가 새지 않는가.
 * 3) **격리**: 고스트를 받아도 내 원장·도감·자산이 하나도 변하지 않는가(G76.1).
 */
import { ARTIFACTS, ARTIFACT_BY_ID } from "../game/artifacts";
import { BASE_DIG, GEAR_MULT, GHOST_DIG_POWER_CAP, GHOST_MAX, GHOST_WORKERS_CAP, MAX_GEAR_LEVEL, WORKER_DIG } from "../game/balance";
import {
  advance, assetScore, codexScore, createPersistentRecord, createWorld, fameScore, fullRanking,
  isGhostId, rankRace, rivalDig, runAutoRoutine, sampleRanks
} from "../game/engine";
import { addGhost, cardKeyOf, encodeCard, isGhost, makeCard, parseCard, removeGhost, signCard } from "../game/rivalcard";
import { deserialize, serialize } from "../game/save";
import type { World } from "../game/types";

let failed = 0;
function check(label: string, cond: boolean, detail = "") {
  console.log(`${cond ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
}

console.log("──────── qa_rivalcard ────────");

// ── 준비: 실제로 뭔가를 가진 월드를 만든다 ───────────────────────────────
const record = createPersistentRecord();
record.ownerName = "김발굴";
const w = createWorld();
for (let i = 0; i < 40; i++) {
  runAutoRoutine(w);
  advance(w, 60, false, 60, record);
}
// 명성 축을 0이 아니게 만든다 — 관람객 항이 있어야 fameExtra 경로가 실제로 검사된다.
w.museumCumulativeVisitors = 240_000;
record.firstT4Finds = 2;
// 유일 2종을 소장 상태로 만들어 `u`가 비지 않게 한다.
const t4s = ARTIFACTS.filter((a) => a.tier === 4).slice(0, 2);
for (const a of t4s) w.codex[a.id] = "owned";

const card = makeCard(w, record);
const text = encodeCard(card);

// ── 1. 코드 길이와 왕복 ──────────────────────────────────────────────────
console.log(`\n기록패 길이 ${text.length}자 (상한 512 기준)`);
check("기록패가 512자 이하다", text.length <= 512, `${text.length}자`);

const parsed = parseCard(text);
check("내가 구운 기록패를 내가 읽는다", parsed !== null);
check("이름이 살아 있다", parsed?.n === "김발굴", String(parsed?.n));

// 왕복은 **받는 쪽 세계**에서 확인해야 의미가 있다 — 새 월드에 고스트로 들인다.
const host = createWorld();
const hostRecord = createPersistentRecord();
const ghost = addGhost(host, parsed!);
const ghostRow = fullRanking(host, hostRecord).find((r) => r.id === ghost.id)!;

const mine = { a: assetScore(w), c: codexScore(w), f: fameScore(w, record) };
const near = (x: number, y: number) => Math.abs(x - y) < 0.005;
console.log(
  `원본  자산 ${mine.a.toFixed(4)} 도감 ${mine.c.toFixed(4)} 명성 ${mine.f.toFixed(4)}\n` +
  `고스트 자산 ${ghostRow.asset.toFixed(4)} 도감 ${ghostRow.codex.toFixed(4)} 명성 ${ghostRow.fame.toFixed(4)}`
);
check("자산 축이 소수점 둘째 자리까지 같다", near(mine.a, ghostRow.asset));
check("도감 축이 소수점 둘째 자리까지 같다", near(mine.c, ghostRow.codex));
check("명성 축이 소수점 둘째 자리까지 같다", near(mine.f, ghostRow.fame));

// ── 2. 적대적 입력 ───────────────────────────────────────────────────────
const b64 = (o: unknown) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const tamper = (patch: Record<string, unknown>) => b64({ ...card, ...patch });

const hostile: [string, string][] = [
  ["빈 문자열", ""],
  ["공백만", "   "],
  ["잘린 코드", text.slice(0, Math.floor(text.length / 2))],
  ["base64가 아닌 문자열", "이건 기록패가 아니다"],
  ["1MB 문자열", "A".repeat(1_048_576)],
  ["JSON 배열", b64([1, 2, 3])],
  ["버전 없음", b64({ n: "x", t: 1, w: 1, g: 0, a: 0, c: 0, f: 0, u: [], h: "korea", k: "0" })],
  ["다음 버전", tamper({ v: 99 })],
  ["자산 축 999", tamper({ a: 999 })],
  ["도감 축 음수", tamper({ c: -1 })],
  ["명성 축 NaN(문자열로)", tamper({ f: "NaN" })],
  ["인부 수 Infinity(문자열로)", tamper({ w: "Infinity" })],
  ["인부 수 상한 초과", tamper({ w: GHOST_WORKERS_CAP * 100 })],
  ["인부 수가 소수", tamper({ w: 12.5 })],
  ["장비 등급 상한 초과", tamper({ g: MAX_GEAR_LEVEL + 1 })],
  ["존재하지 않는 거점", tamper({ h: "atlantis" })],
  ["존재하지 않는 유일 id", tamper({ u: ["no-such-artifact"] })],
  ["유일이 아닌 종을 유일이라 주장", tamper({ u: [ARTIFACTS.find((a) => a.tier === 0)!.id] })],
  ["유일 13종", tamper({ u: ARTIFACTS.filter((a) => a.tier === 4).map((a) => a.id).concat("x") })],
  ["체크섬 조작", tamper({ k: "deadbeef" })],
  ["본문만 바꾸고 체크섬 유지", tamper({ a: 0.99 })]
];

console.log("");
let hostileOk = true;
for (const [label, input] of hostile) {
  let result: unknown = "예외";
  try {
    result = parseCard(input);
  } catch (e) {
    result = `예외: ${String(e)}`;
  }
  const ok = result === null;
  if (!ok) hostileOk = false;
  console.log(`${ok ? "✅" : "❌"} ${label} → ${ok ? "null" : String(result).slice(0, 60)}`);
}
check(`적대적 입력 ${hostile.length}종이 전부 null이고 예외가 새지 않는다`, hostileOk);

/**
 * `__proto__`는 **거부가 아니라 무시가 옳다** — 모르는 키를 버리는 게 이 파서의 규칙이고,
 * 그 규칙대로면 본문이 멀쩡한 기록패는 통과해야 한다. 확인할 것은 "거부했는가"가 아니라
 * "오염됐는가"와 "스키마 밖의 키가 따라 들어왔는가" 둘이다.
 */
const polluted = parseCard(
  b64(JSON.parse(`{"v":${card.v},"n":"x","t":1,"w":1,"g":0,"a":0,"c":0,"f":0,"u":[],"h":"korea","__proto__":{"polluted":true}}`))
);
check("프로토타입이 오염되지 않았다", ({} as Record<string, unknown>).polluted === undefined);
check("체크섬이 틀린 __proto__ 주입은 걸러진다", polluted === null);

const clean = parseCard(text)!;
check("파싱 결과에 스키마 밖의 키가 없다",
  JSON.stringify(Object.keys(clean).sort()) === JSON.stringify(["a", "c", "f", "g", "h", "k", "n", "t", "u", "v", "w"]),
  Object.keys(clean).join(","));

// ── 3. 격리 — 고스트는 내 원장을 깎지 않는다 ─────────────────────────────
const before = createWorld();
const snapshotLedger = (world: World) =>
  ARTIFACTS.map((a) => `${a.id}:${world.ledger[a.id].remaining}`).join("|");
const ledgerBefore = snapshotLedger(before);
const codexBefore = JSON.stringify(before.codex);
const t4Card = makeCard(w, record);
addGhost(before, parseCard(encodeCard(t4Card))!);
check("고스트를 받아도 내 세계 원장이 그대로다", snapshotLedger(before) === ledgerBefore);
check("고스트를 받아도 내 도감이 그대로다", JSON.stringify(before.codex) === codexBefore);
check(
  "상대가 가진 유일이 내 세계에서는 여전히 남아 있다",
  t4Card.u.length > 0 && t4Card.u.every((id) => before.ledger[id].remaining === 1),
  `${t4Card.u.length}종 확인`
);

// ── 3-2. 발굴력 상한 — 받아들이는 순간 잘린다 ────────────────────────────
// 이 검사가 있는 이유: 첫 구현은 발굴력을 인부 수로 역산했고, NPC 재투자 루프가 그
// 인부 더미 위에 장비를 얹어 9,423/s를 4,243,517/s로 부풀렸다(168시간 실측).
const forged = signCardMax();
const forgedHost = createWorld();
const forgedGhost = addGhost(forgedHost, forged);
const forgedDig = rivalDig(forgedGhost);
check("상한까지 채운 기록패도 받는 순간 발굴력이 잘린다", forgedDig <= GHOST_DIG_POWER_CAP,
  `${Math.round(forgedDig)}/s ≤ ${GHOST_DIG_POWER_CAP}/s`);
check("잘린 뒤에도 장비 등급은 보존된다(깎는 곳은 인부 한 곳뿐이다)",
  forgedGhost.gear === MAX_GEAR_LEVEL, `Lv.${forgedGhost.gear}`);

function signCardMax() {
  return signCard({
    v: 1, n: "위조", t: 3_600_000, w: GHOST_WORKERS_CAP, g: MAX_GEAR_LEVEL,
    a: 1, c: 1, f: 1, u: [], h: "korea"
  });
}

// ── 3-3. 고스트의 배경 발굴은 내 원장을 비우지 않는다(G76.1) ─────────────
// 받으면 손해인 기능은 아무도 안 쓴다. 제보 레이스 밖에서는 내 재고가 한 칸도
// 줄어선 안 된다 — 실측으로 한 번 틀렸던 자리다(엔딩 미달성, eval.md §21).
const drainHost = createWorld();
const drainRecord = createPersistentRecord();
addGhost(drainHost, signCardMax());
const remainBefore = ARTIFACTS.reduce((n, a) => n + (a.tier === 0 ? 0 : drainHost.ledger[a.id].remaining), 0);
for (let i = 0; i < 200; i++) advance(drainHost, 600, false, 600, drainRecord);
const ghostAfter = drainHost.rivals.find(isGhost)!;
const remainAfter = ARTIFACTS.reduce((n, a) => n + (a.tier === 0 ? 0 : drainHost.ledger[a.id].remaining), 0);
const npcTook = drainHost.rivals.filter((r) => !isGhost(r)).some((r) => r.owned.length > 0);
check("고스트가 33시간 동안 실제로 성장했다", ghostAfter.owned.length > 0 && ghostAfter.vaultValue > 0,
  `${ghostAfter.owned.length}종 / ${Math.round(ghostAfter.vaultValue).toLocaleString()}₩`);
check("NPC는 같은 기간에 내 원장에서 가져갔다(비교군)", npcTook && remainAfter < remainBefore);
check("고스트가 가져간 종은 내 원장에 그대로 남아 있다",
  ghostAfter.owned.every((id) => drainHost.ledger[id].owners.every((o) => o !== ghostAfter.id)));

// ── 3-4. 고스트는 기록된 페이스로만 자라고, 내 엔딩을 막지 않는다 ────────
// 둘 다 "받으면 손해"를 막는 장치다(G76.8·G76.9).
const paceHost = createWorld();
const paceRecord = createPersistentRecord();
const paced = addGhost(paceHost, signCard({
  v: 1, n: "완주자", t: 140 * 3600, w: 77, g: 10, a: 0.5691, c: 0.7503, f: 0.2227, u: [], h: "egypt"
}));
const paceBefore = rivalDig(paced);
for (let i = 0; i < 200; i++) advance(paceHost, 600, false, 600, paceRecord);
check("고스트의 발굴력은 기록 시점 그대로다(재투자하지 않는다)", rivalDig(paced) === paceBefore,
  `${Math.round(paceBefore)}/s`);
check("같은 기간에 NPC는 자랐다(비교군)",
  paceHost.rivals.filter((r) => !isGhost(r)).some((r) => r.workers > 0 || r.gear > 0));

// 엔딩 판정은 고스트를 빼고 본다 — 완주한 친구의 기록패가 내 완주를 막지 않는다.
const endHost = createWorld();
const endRecord = createPersistentRecord();
addGhost(endHost, signCardMax());
const withGhost = fullRanking(endHost, endRecord).sort((a, b) => b.rank - a.rank);
check("순위표에서는 고스트가 1위로 보인다", isGhost(endHost.rivals.find((r) => r.id === withGhost[0].id)!));
check("엔딩 판정에서는 고스트가 빠진다",
  fullRanking(endHost, endRecord).filter((r) => !isGhostId(endHost, r.id)).length === withGhost.length - 1);

// ── 4. 상한·교체 ─────────────────────────────────────────────────────────
const many = createWorld();
const npcCount = many.rivals.length;
for (let i = 0; i < GHOST_MAX + 2; i++) {
  const r = createPersistentRecord();
  r.ownerName = `상대${i}`;
  const other = createWorld();
  other.sites.egypt.unlocked = true;
  other.sites.egypt.baseSince = 0;
  // 사람마다 다른 키가 나오도록 본거지를 갈라 놓는다
  if (i % 2 === 1) other.sites.korea.baseSince = 10;
  other.funds = 1000 * i;
  const c = makeCard(other, r);
  addGhost(many, c);
}
check(`고스트가 ${GHOST_MAX}명을 넘지 않는다`, many.rivals.filter(isGhost).length <= GHOST_MAX,
  `${many.rivals.filter(isGhost).length}명`);
check("NPC 라이벌 6명은 밀려나지 않았다", many.rivals.filter((r) => !isGhost(r)).length === npcCount);

const again = createWorld();
addGhost(again, card);
addGhost(again, card);
check("같은 사람의 기록패를 두 번 받으면 한 명이다", again.rivals.filter(isGhost).length === 1);
check("카드 키는 이름이 아니라 본문에서 나온다",
  cardKeyOf(card) === cardKeyOf({ ...card, n: "개명했다" }));

removeGhost(again, `ghost:${cardKeyOf(card)}`);
check("내보내기가 동작한다", again.rivals.filter(isGhost).length === 0);

// ── 5. NPC 채점이 v0.4와 같은가 ──────────────────────────────────────────
const plain = createWorld();
const plainRecord = createPersistentRecord();
for (let i = 0; i < 10; i++) advance(plain, 600, false, 600, plainRecord);
const npcRows = fullRanking(plain, plainRecord).filter((r) => r.id !== "player");
check("NPC에는 ownedExtra·fameExtra가 없다",
  plain.rivals.every((r) => r.ownedExtra === undefined && r.fameExtra === undefined));
check("NPC 명성은 유일 최초발굴만으로 설명된다",
  npcRows.every((r) => Number.isFinite(r.fame) && r.fame >= 0 && r.fame <= 1));

// ── 6. 세이브 왕복 ───────────────────────────────────────────────────────
const saved = createWorld();
addGhost(saved, card);
const revived = deserialize(serialize(saved));
const revivedGhost = revived.rivals.find(isGhost);
check("고스트가 세이브를 타고 살아 돌아온다", revivedGhost !== undefined);
check("고스트의 출처 정보가 보존된다", revivedGhost?.ghost?.key === cardKeyOf(card));
check("세이브 버전이 최신(11)이다", revived.version === 11);

// v8 세이브(고스트 없음)가 그대로 열리는가
const legacy = JSON.parse(serialize(createWorld()));
legacy.version = 8;
delete legacy.rankSample;
const upgraded = deserialize(JSON.stringify(legacy));
check("v8 세이브가 체인 끝(v11)까지 올라온다", upgraded.version === 11);
check("v8 세이브의 라이벌 6명이 그대로다", upgraded.rivals.length === 6 && upgraded.rivals.every((r) => !isGhost(r)));

// ── 7. 추격전 표시 ───────────────────────────────────────────────────────
const raceWorld = createWorld();
const raceRecord = createPersistentRecord();
// 갓 만든 월드는 전원 0점이라 플레이어가 1위로 잡힌다. **v0.6의 페이싱 압축
// 뒤로는 20분을 굴려도 여전히 플레이어가 3축 종합 1위**라 라이벌만으로는 쫓을
// 상대가 안 생긴다(v0.5.1에서는 생겼다). 기준을 낮추는 대신 **쫓을 상대가
// 있는 상태를 실제로 만든다** — 40분짜리 기록패 고스트를 들인다
// (`notes/decisions.md` G80.2와 같은 원칙). "쫓을 상대가 없다(0)"와
// "모른다(undefined)"는 여전히 다른 답이다.
for (let i = 0; i < 20; i++) advance(raceWorld, 60, false, 60, raceRecord);
addGhost(raceWorld, parsed!);
const noSample = rankRace(raceWorld, raceRecord);
check("쫓을 상대가 생겼다", noSample.target !== null, String(noSample.target?.name));
check("표본이 없으면 추월 예상은 undefined다(모른다 ≠ 못 넘는다)", noSample.overtakeSeconds === undefined);
sampleRanks(raceWorld, raceRecord);
for (let i = 0; i < 20; i++) {
  runAutoRoutine(raceWorld);
  advance(raceWorld, 60, false, 60, raceRecord);
}
sampleRanks(raceWorld, raceRecord);
for (let i = 0; i < 20; i++) {
  runAutoRoutine(raceWorld);
  advance(raceWorld, 60, false, 60, raceRecord);
}
const withSample = rankRace(raceWorld, raceRecord);
check("표본이 생기면 추월 예상이 수치나 null로 나온다",
  withSample.overtakeSeconds === null || typeof withSample.overtakeSeconds === "number",
  withSample.overtakeSeconds === null ? "못 넘는다" : `${Math.round((withSample.overtakeSeconds ?? 0) / 3600)}시간`);
check("가장 손해가 큰 축을 하나 지목한다",
  ["asset", "codex", "fame"].includes(withSample.weakestAxis), withSample.weakestAxis);

console.log(`\n${failed === 0 ? "✅ 전부 통과" : `❌ ${failed}건 실패`}`);
process.exit(failed === 0 ? 0 : 1);
