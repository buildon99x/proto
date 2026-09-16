/**
 * 런 결말 보고서.
 *
 * 솔버는 난이도를 수치로 안다. 이 보고서가 답하는 것은 **그 수치가 사람 체감과 어디서
 * 어긋나는가**이고, 그것만이 솔버 혼자서는 못 재는 값이다.
 *
 * 네 가지를 센다.
 *
 *   A. 섹터별 조건부 사망률 — 분모는 진입 횟수다(사망 건수만 세면 언제나 앞 섹터가
 *      가장 어렵게 나온다. Stage 는 스스로 재시작하므로 1번에서 막힌 사람은 뒤 섹터의
 *      사망을 한 건도 만들지 않는다)
 *   B. 여유 구간별 사망률 — **티어 목표치를 데이터로 다시 정하는 근거다.** 지금
 *      200/180/150/130ms 는 프로브 추정이지 사람으로 검증된 값이 아니다
 *   C. 경로별 사망률 — 큐레이션이 "모든 경로 통과 가능"을 이미 보장하므로, 여기서
 *      찾는 것은 *이론상 가능하지만 사람이 못 하는* 경로다
 *   D. 시도 분포 — brief 의 미수행 중단 판정("지시 없이 5회 이상 재시도")이 여기서 읽힌다
 *
 * 설계 단계에서는 집계 위치를 사망 x 가 아니라 이탈 지점의 상계 `k*` 로 잡으려 했다.
 * 구현해서 재 보니 **그 상계가 물리지 않는다** — 사망 x 에서 중앙 1.1, 최대 5.2 월드
 * 단위 앞에 붙는다(섹터 하나가 460 단위다). 이유는 지오메트리에 있다: 생존 회랑을
 * 죄는 쪽 경계가 곧 플레이어가 부딪히는 벽이라, 회랑을 벗어나는 자리와 벽에 닿는
 * 자리가 사실상 같다. 그래서 `k*` 는 "실수는 여기보다 늦지 않다"고 말하지만 그 자리가
 * 사망 지점이라 아무것도 배제하지 못한다.
 *
 * **결론: 이 게임에서는 사망 x 로 집계해도 섹터 단위에서는 틀리지 않는다.** 실제
 * 이탈 지점을 알려면 궤적이 필요하고, 그것이 설계 문서의 `tail` 표본이다 — 선택이
 * 아니라 필수 항목으로 승격됐다. `k*` 는 계산이 싸고 조각 경계를 넘는 경우를 잡아
 * 주므로 그대로 두고, 아래 k* 절이 그 수를 따로 센다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tools/death-report/report.ts <입력.ndjson> [--json <출력>]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PEAK_RUN_NOTE, TARGET_SLACK_MS } from "../../tests/verify/tiers";
import { divergence, reachOf, reconstruct } from "./reconstruct";
import type { Reconstruction, StoredEvent } from "./reconstruct";

// ── 판정 상수 ─────────────────────────────────────────────────
// 표본이 얇으면 숫자는 나오지만 판정은 서지 않는다. 그 경계를 숨기지 않고 표에 적는다.
/**
 * 판정이 서는 최소 **진입** 수.
 *
 * 분모를 사망이 아니라 진입으로 잡는 것이 중요하다 — 진입 174 에 사망 0 이면
 * "여기서는 안 죽는다"가 충분히 서지만, 사망 수로 바닥을 재면 그 행이 영원히
 * 보류로 남는다. 60% 와 50% 를 가르려면 200 언저리가 필요하고, 30 은 "거의 안
 * 죽는다"와 "자주 죽는다"를 가르는 최소선이다.
 */
const FLOOR_SECTOR_ENTRIES = 30;
/** 티어 사망이 이보다 적으면 편중 판정을 하지 않는다 */
const FLOOR_TIER_DEATHS = 30;
const FLOOR_STAGE_RUNS = 20;
/** 한 섹터가 그 티어 사망의 이 비율을 넘으면 재큐레이션 대상 */
const HOTSPOT = 0.4;
/** 프레임이 이보다 낮은 주행은 입력 격자가 넓어져 난이도가 달라진다 */
const MIN_FPS = 50;
const BAND_MS = 20;

// ── 표 조판 (한글 폭 보정) ────────────────────────────────────
const wide = (c: string) => {
  const n = c.codePointAt(0) ?? 0;
  return (n >= 0x1100 && n <= 0x115f) || (n >= 0x2e80 && n <= 0xa4cf) ||
    (n >= 0xac00 && n <= 0xd7a3) || (n >= 0xf900 && n <= 0xfaff) ||
    (n >= 0xfe30 && n <= 0xfe6f) || (n >= 0xff00 && n <= 0xff60) ||
    (n >= 0xffe0 && n <= 0xffe6);
};
const width = (s: string) => [...s].reduce((n, c) => n + (wide(c) ? 2 : 1), 0);
const padR = (s: string, n: number) => s + " ".repeat(Math.max(0, n - width(s)));
const padL = (s: string, n: number) => " ".repeat(Math.max(0, n - width(s))) + s;

function table(head: string[], rows: string[][], align: Array<"l" | "r">): string {
  const all = [head, ...rows];
  const w = head.map((_, i) => Math.max(...all.map((r) => width(r[i] ?? ""))));
  const line = (r: string[]) =>
    r.map((c, i) => (align[i] === "r" ? padL(c ?? "", w[i]) : padR(c ?? "", w[i]))).join("  ");
  return [line(head), w.map((n) => "─".repeat(n)).join("  "), ...rows.map(line)].join("\n");
}

const pct = (a: number, b: number) => (b === 0 ? "—" : `${((a / b) * 100).toFixed(1)}%`);
const median = (xs: number[]) => {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

// ── 입력 ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const jsonAt = args.indexOf("--json");
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : null;
if (!input) throw new Error("사용법: tsx report.ts <입력.ndjson> [--json <출력>]");

const raw = readFileSync(input, "utf8")
  .split("\n")
  .filter((l) => l.trim().length > 0)
  .map((l) => JSON.parse(l) as StoredEvent);

// ── 지문 가르기 ───────────────────────────────────────────────
// 코스는 버전마다 다른 코스다. 섞으면 어긋난 티가 나지 않은 채로 오염되므로,
// 지문이 여럿이면 가장 큰 것만 쓰고 나머지는 세어서 보여 준다.
const byFp = new Map<string, StoredEvent[]>();
for (const e of raw) byFp.set(e.fp, [...(byFp.get(e.fp) ?? []), e]);
const fps = [...byFp.entries()].sort((a, b) => b[1].length - a[1].length);
const [fp, events] = fps[0];

// ── 품질 가르기 ───────────────────────────────────────────────
const excluded = { prac: 0, dev: 0, slowFps: 0, endless: 0 };
const usable: StoredEvent[] = [];
for (const e of events) {
  if (e.prac) excluded.prac += 1;
  else if (e.dev) excluded.dev += 1;
  else if (e.fps < MIN_FPS) excluded.slowFps += 1;
  else if (e.mode !== "stage") excluded.endless += 1;
  else usable.push(e);
}

// ── 집계 ──────────────────────────────────────────────────────
interface Slot {
  stage: string;
  tier: number;
  piece: number;
  id: string;
  entries: number;
  deaths: number;
  blamed: number;
  slack: number[];
}
const slots = new Map<string, Slot>();
const slotKey = (t: number, n: number, p: number) => `${t}:${n}:${p}`;

interface PathRow { stage: string; tier: number; lanes: string; runs: number; deaths: number; slackMs: number }
const paths = new Map<string, PathRow>();

const bands = new Map<number, { entries: number; deaths: number }>();
const lags: number[] = [];
const offCorridor: number[] = [];
/** k* 가 사망한 조각보다 앞을 가리킨 사망 — 사망 x 집계가 틀렸을 유일한 경우 */
let movedUpstream = 0;
let blamedGate = 0;
let unresolved = 0;

const recFor = (e: StoredEvent): Reconstruction | null => reconstruct(e);

for (const e of usable) {
  const rec = recFor(e);
  if (!rec) continue;
  const reach = reachOf(e, rec);

  // 분모. "0번부터 도달한 조각까지 진입했다"가 사망 이벤트 하나에서 유도된다.
  for (let p = 0; p <= reach && p < rec.course.pieces.length; p += 1) {
    const piece = rec.course.pieces[p];
    if (piece.kind !== "sector") continue;
    const key = slotKey(e.tier!, e.no!, p);
    const slot = slots.get(key) ?? {
      stage: `${e.tier}-${e.no}`,
      tier: e.tier!,
      piece: p,
      id: piece.sector?.id ?? "?",
      entries: 0,
      deaths: 0,
      blamed: 0,
      slack: []
    };
    slot.entries += 1;
    const ms = rec.slackMs[p];
    if (Number.isFinite(ms)) slot.slack.push(ms);
    slots.set(key, slot);

    const band = Math.floor(ms / BAND_MS) * BAND_MS;
    if (Number.isFinite(band)) {
      const b = bands.get(band) ?? { entries: 0, deaths: 0 };
      b.entries += 1;
      bands.set(band, b);
    }
  }

  const pKey = `${e.tier}-${e.no}|${e.lanes}`;
  const row = paths.get(pKey) ?? {
    stage: `${e.tier}-${e.no}`,
    tier: e.tier!,
    lanes: e.lanes || "(없음)",
    runs: 0,
    deaths: 0,
    slackMs: rec.solved.minSlackSec * 1000
  };
  row.runs += 1;
  if (e.k === "death") row.deaths += 1;
  paths.set(pKey, row);

  if (e.k !== "death" || e.x === undefined || e.y === undefined) continue;

  const died = slots.get(slotKey(e.tier!, e.no!, e.pi ?? reach));
  if (died) died.deaths += 1;
  const dBand = Math.floor(rec.slackMs[e.pi ?? reach] / BAND_MS) * BAND_MS;
  if (Number.isFinite(dBand)) {
    const b = bands.get(dBand);
    if (b) b.deaths += 1;
  }

  // 여기가 이 보고서의 핵심이다 — 죽은 자리가 아니라 **실수가 일어난 자리**에 센다.
  const div = divergence(rec, e.x, e.y);
  if (div.x === null || div.piece === null) {
    unresolved += 1;
    continue;
  }
  lags.push(div.lag ?? 0);
  offCorridor.push(div.offCorridor);
  if (div.piece !== (e.pi ?? reach)) movedUpstream += 1;
  const blamed = slots.get(slotKey(e.tier!, e.no!, div.piece));
  if (blamed) blamed.blamed += 1;
  else blamedGate += 1;
}

// ── 섹터별로 접기 ─────────────────────────────────────────────
interface SectorRow {
  id: string;
  slots: number;
  entries: number;
  deaths: number;
  blamed: number;
  slackMs: number;
  tiers: Set<number>;
}
const sectors = new Map<string, SectorRow>();
for (const s of slots.values()) {
  const r = sectors.get(s.id) ?? {
    id: s.id,
    slots: 0,
    entries: 0,
    deaths: 0,
    blamed: 0,
    slackMs: 0,
    tiers: new Set<number>()
  };
  r.slots += 1;
  r.entries += s.entries;
  r.deaths += s.deaths;
  r.blamed += s.blamed;
  // 진입 횟수로 가중한 평균 — 많이 만난 자리의 여유가 그 섹터의 체감에 가깝다.
  r.slackMs += (median(s.slack) || 0) * s.entries;
  r.tiers.add(s.tier);
  sectors.set(s.id, r);
}

// ── 세션 ──────────────────────────────────────────────────────
interface Session { iid: string; runs: number; maxAtt: number; cleared: number; leftAt: number | null }
const sessions = new Map<string, Session>();
for (const e of usable) {
  const s = sessions.get(e.sid) ?? { iid: e.iid, runs: 0, maxAtt: 0, cleared: 0, leftAt: null };
  s.runs += 1;
  s.maxAtt = Math.max(s.maxAtt, e.att);
  if (e.k === "clear") s.cleared += 1;
  if (e.k === "abort") s.leftAt = e.att;
  sessions.set(e.sid, s);
}
const firstClearAtt = new Map<number, number[]>();
for (const e of usable) {
  if (e.k !== "clear") continue;
  firstClearAtt.set(e.tier!, [...(firstClearAtt.get(e.tier!) ?? []), e.att]);
}

// ── 출력 ──────────────────────────────────────────────────────
const out: string[] = [];
const deaths = usable.filter((e) => e.k === "death").length;
const clears = usable.filter((e) => e.k === "clear").length;
const aborts = usable.filter((e) => e.k === "abort").length;

out.push(`# 런 결말 보고서 — 코스 지문 ${fp}`);
out.push("");
out.push(
  `이벤트 ${raw.length}건 중 이 지문 ${events.length}건 · 사용 ${usable.length}건` +
    ` (사망 ${deaths} · 클리어 ${clears} · 이탈 ${aborts})` +
    ` · 세션 ${sessions.size} · 설치 ${new Set(usable.map((e) => e.iid)).size}`
);
if (fps.length > 1) {
  out.push("");
  out.push(
    `**지문이 ${fps.length} 종류다. 합산하지 않는다** — ` +
      fps.map(([f, xs]) => `${f} ${xs.length}건`).join(" · ") +
      ". 코스는 버전마다 다른 코스이고, 섞으면 어긋난 티가 나지 않는다."
  );
}
const dropped = excluded.prac + excluded.dev + excluded.slowFps + excluded.endless;
if (dropped > 0) {
  out.push("");
  out.push(
    `제외 ${dropped}건 — 연습 ${excluded.prac} · 튜닝 패널 ${excluded.dev} · ` +
      `${MIN_FPS}fps 미만 ${excluded.slowFps} · Endless ${excluded.endless}` +
      " (Endless 는 자리 3번부터 통로 좌표가 재현되지 않아 재구성하지 않는다)"
  );
}

// ── 표 A ──
out.push("");
out.push("## A. 섹터별 조건부 사망률");
out.push("");
out.push("분모는 **진입 횟수**다. 사망 건수만 세면 Stage 가 스스로 재시작하는 탓에 언제나");
out.push("앞 섹터가 가장 어렵게 나온다. `귀책`은 이탈 지점 k* 로 센 것이라, 사망 수와 같으면");
out.push("그 섹터의 사망이 전부 그 섹터에서 비롯됐다는 뜻이다(아래 k* 절 참고).");
out.push("");
const sectorRows = [...sectors.values()].sort((a, b) => b.deaths / b.entries - a.deaths / a.entries);
out.push(
  table(
    ["섹터", "자리", "티어", "진입", "사망", "사망률", "귀책", "여유(ms)", "표본"],
    sectorRows.map((r) => [
      r.id,
      String(r.slots),
      [...r.tiers].sort().join(","),
      String(r.entries),
      String(r.deaths),
      pct(r.deaths, r.entries),
      String(r.blamed),
      (r.slackMs / Math.max(1, r.entries)).toFixed(0),
      r.entries >= FLOOR_SECTOR_ENTRIES ? "" : `진입<${FLOOR_SECTOR_ENTRIES} 보류`
    ]),
    ["l", "r", "l", "r", "r", "r", "r", "r", "l"]
  )
);

// 재큐레이션 대상
out.push("");
const byTier = new Map<number, { total: number; per: Map<string, number> }>();
for (const s of slots.values()) {
  const t = byTier.get(s.tier) ?? { total: 0, per: new Map<string, number>() };
  t.total += s.deaths;
  t.per.set(s.id, (t.per.get(s.id) ?? 0) + s.deaths);
  byTier.set(s.tier, t);
}
const hotspots: string[] = [];
for (const [tier, t] of [...byTier.entries()].sort()) {
  for (const [id, n] of t.per) {
    if (t.total >= FLOOR_TIER_DEATHS && n / t.total >= HOTSPOT) {
      hotspots.push(`티어 ${tier} 사망의 ${pct(n, t.total)} 가 \`${id}\` 하나다 — 재큐레이션 대상`);
    }
  }
}
out.push(hotspots.length > 0 ? hotspots.map((h) => `- ${h}`).join("\n") : "- 한 섹터가 티어 사망의 40% 를 넘는 자리는 없다.");

// ── 표 B ──
out.push("");
out.push("## B. 여유 구간별 사망률");
out.push("");
out.push("**이 표가 티어 목표치를 데이터로 다시 정하는 근거다.** 지금 값은 프로브 추정이다.");
out.push("여유가 큰 밴드의 사망률이 작은 밴드보다 높으면 솔버가 못 보는 요인이 있다는 뜻이고,");
out.push("그때 의심할 것은 통로 폭이 아니라 형상의 가독성이다.");
out.push("");
const bandRows = [...bands.entries()].sort((a, b) => a[0] - b[0]);
out.push(
  table(
    ["여유 밴드", "진입", "사망", "사망률", ""],
    bandRows.map(([lo, b]) => {
      const rate = b.entries === 0 ? 0 : b.deaths / b.entries;
      return [
        `${lo}–${lo + BAND_MS}ms`,
        String(b.entries),
        String(b.deaths),
        pct(b.deaths, b.entries),
        "█".repeat(Math.round(rate * 40))
      ];
    }),
    ["l", "r", "r", "r", "l"]
  )
);
out.push("");
const inversions: string[] = [];
for (let i = 1; i < bandRows.length; i += 1) {
  const [loA, a] = bandRows[i - 1];
  const [loB, b] = bandRows[i];
  if (a.entries < 20 || b.entries < 20) continue;
  if (b.deaths / b.entries > a.deaths / a.entries) {
    inversions.push(`${loB}–${loB + BAND_MS}ms 가 ${loA}–${loA + BAND_MS}ms 보다 사망률이 높다`);
  }
}
out.push(
  inversions.length > 0
    ? `- **역전 ${inversions.length}건** — ${inversions.join(" · ")}. 솔버 밖의 요인을 의심할 자리다.`
    : "- 역전 없음. 여유가 클수록 덜 죽는다 — 솔버의 수치가 체감의 대리변수로 성립한다."
);
out.push("");
out.push("현재 티어 목표치와 대조:");
out.push("");
out.push(
  table(
    ["티어", "목표 여유", "지속 성격", "그 밴드의 실측 사망률"],
    Object.entries(TARGET_SLACK_MS).map(([tier, ms]) => {
      const lo = Math.floor(ms / BAND_MS) * BAND_MS;
      const b = bands.get(lo);
      return [
        `티어 ${tier}`,
        `${ms}ms`,
        PEAK_RUN_NOTE[Number(tier) as 1 | 2 | 3 | 4],
        b ? `${pct(b.deaths, b.entries)} (진입 ${b.entries})` : "표본 없음"
      ];
    }),
    ["l", "r", "l", "l"]
  )
);

// ── 표 C ──
out.push("");
out.push("## C. 경로별 사망률");
out.push("");
out.push("큐레이션이 모든 경로의 통과 가능성을 이미 보장한다. 여기서 찾는 것은");
out.push("**이론상 가능하지만 사람이 못 하는** 경로다 — 0.5.1 에서 없앤 함정 경로의 사람 버전.");
out.push("");
const pathRows = [...paths.values()]
  .filter((r) => r.runs >= 3)
  .sort((a, b) => b.deaths / b.runs - a.deaths / a.runs || b.runs - a.runs)
  .slice(0, 12);
out.push(
  table(
    ["스테이지", "선택열", "주행", "사망", "사망률", "솔버 여유(ms)", "표본"],
    pathRows.map((r) => [
      r.stage,
      r.lanes,
      String(r.runs),
      String(r.deaths),
      pct(r.deaths, r.runs),
      r.slackMs.toFixed(0),
      r.runs >= FLOOR_STAGE_RUNS ? "" : `<${FLOOR_STAGE_RUNS} 보류`
    ]),
    ["l", "l", "r", "r", "r", "r", "l"]
  )
);

// ── 표 D ──
out.push("");
out.push("## D. 시도 분포 — 중단 판정");
out.push("");
out.push("brief 의 미수행 중단 판정은 **\"제작자 외 3명 중 2명 이상이 지시 없이 5회 이상");
out.push("재시도하는가\"** 다. 그 판정이 이 표에서 직접 읽힌다.");
out.push("");
const sess = [...sessions.values()];
const over5 = sess.filter((s) => s.maxAtt >= 5).length;
const leftEarly = sess.filter((s) => s.leftAt !== null && s.leftAt < 5).length;
out.push(
  table(
    ["지표", "값"],
    [
      ["세션", String(sess.length)],
      ["세션당 최대 시도 (중앙)", String(median(sess.map((s) => s.maxAtt)))],
      ["**5회 이상 재시도한 세션**", `${over5} / ${sess.length} (${pct(over5, sess.length)})`],
      ["5회 미만에서 떠난 세션", `${leftEarly} / ${sess.length}`],
      ["클리어를 한 번이라도 한 세션", `${sess.filter((s) => s.cleared > 0).length} / ${sess.length}`],
      ["이탈 시점 시도 횟수 (중앙)", String(median(sess.filter((s) => s.leftAt !== null).map((s) => s.leftAt!)))]
    ],
    ["l", "l"]
  )
);
out.push("");
out.push("티어별 첫 클리어까지의 시도 횟수 — 티어 순서와 어긋나면 곡선이 실제로 뒤집힌 것이다.");
out.push("");
out.push(
  table(
    ["티어", "클리어", "시도 횟수 (중앙)", "최대"],
    [...firstClearAtt.entries()].sort((a, b) => a[0] - b[0]).map(([tier, xs]) => [
      `티어 ${tier}`,
      String(xs.length),
      String(median(xs)),
      String(Math.max(...xs))
    ]),
    ["l", "r", "r", "r"]
  )
);

// ── 이탈 지점 ──
out.push("");
out.push("## 이탈 지점 k* — 상계가 물리는가");
out.push("");
out.push("`k*` 는 \"실수는 여기보다 늦지 않다\"는 상계다. 그 자리가 사망 지점에 붙어 있으면");
out.push("아무것도 배제하지 못하므로, **먼저 물리는지부터 본다.**");
out.push("");
const insideCorridor = offCorridor.filter((v) => v === 0).length;
const lagMed = median(lags);
const lagMax = Math.max(0, ...lags);
out.push(
  table(
    ["지표", "값"],
    [
      ["되짚은 사망", `${lags.length} / ${deaths}`],
      ["되짚지 못함", String(unresolved)],
      ["사망 x → k* 거리 (중앙)", `${lagMed.toFixed(1)} 월드 단위`],
      ["같은 거리 (최대)", `${lagMax.toFixed(1)} (섹터 하나는 460)`],
      ["**k* 가 다른 조각을 가리킨 사망**", `${movedUpstream} / ${lags.length} (${pct(movedUpstream, lags.length)})`],
      ["게이트에서 죽어 섹터 표에 없는 사망", String(blamedGate)],
      ["사망 순간에도 회랑 안이었던 경우", `${insideCorridor} / ${offCorridor.length}`],
      ["회랑을 벗어난 거리 (중앙)", median(offCorridor.filter((v) => v > 0)).toFixed(1)]
    ],
    ["l", "l"]
  )
);
out.push("");
if (movedUpstream / Math.max(1, lags.length) < 0.02) {
  out.push(
    `- **상계가 물리지 않는다.** 생존 회랑을 죄는 쪽 경계가 곧 플레이어가 부딪히는 벽이라,` +
      ` 회랑을 벗어나는 자리와 벽에 닿는 자리가 사실상 같다(중앙 ${lagMed.toFixed(1)} 단위, 섹터는 460).`
  );
  out.push("- 따라서 **이 게임에서는 사망 x 로 집계해도 섹터 단위에서는 틀리지 않는다.** 설계 단계의");
  out.push("  걱정(\"좁은 섹터가 앞 섹터의 죄를 뒤집어쓴다\")은 크기를 재 보니 성립하지 않았다.");
  out.push("- 실제 이탈 지점을 알려면 궤적이 필요하다. 설계 문서의 `tail` 표본을 **선택이 아니라**");
  out.push("  **필수**로 승격해야 한다 — 그것 없이는 상류 원인을 영원히 못 짚는다.");
} else {
  out.push(
    `- 상계가 물린다 — 사망의 ${pct(movedUpstream, lags.length)} 에서 k* 가 다른 조각을 가리켰다.` +
      " 그 몫만큼 사망 x 집계는 틀린 섹터를 지목한다."
  );
}
out.push("");

// ── 그림용 데이터 ─────────────────────────────────────────────
// 여유 곡선은 **가장 많이 플레이된 경로**의 것을 쓴다. 최선 경로를 쓰면 그림이
// 아무도 타지 않은 코스를 말하게 된다.
interface StageFigure {
  stage: string;
  tier: number;
  finishX: number;
  worldHeight: number;
  lanes: string;
  runs: number;
  entries: number;
  deaths: number;
  pieces: Array<{ id: string; kind: string; startX: number; endX: number }>;
  /** 월드 1단위 격자의 여유(ms). 한 칸에 여러 스텝이 겹치면 가장 좁은 것 */
  slack: number[];
  /** 사망 수. 20 월드 단위로 묶는다 — 1단위 격자로는 막대가 한 픽셀도 안 되어 보이지 않는다 */
  hist: number[];
  histBin: number;
  /** 이 경로가 기록에 있던 길이. 게이트 수보다 짧으면 뒤는 가정한 것이다 */
  lanesRecorded: number;
  gates: number;
}

const figures: StageFigure[] = [];
{
  // 가장 많이 플레이된 경로를 쓰되 **완주 길이의 경로를 우선**한다. 선택열은 죽은
  // 자리까지만 쌓이므로 그냥 최빈값을 쓰면 "두 번째 게이트에서 죽은 경로"가 뽑히고,
  // 그림은 아무도 끝까지 가 보지 않은 코스를 말하게 된다.
  const gatesPerStage = new Map<string, number>();
  for (const e of usable) {
    const rec0 = recFor(e);
    if (rec0) gatesPerStage.set(`${e.tier}-${e.no}`, rec0.course.pieces.filter((p) => p.kind === "gate").length);
  }
  const popular = new Map<string, { lanes: string; runs: number }>();
  for (const r of paths.values()) {
    const lanes = r.lanes === "(없음)" ? "" : r.lanes;
    const full = lanes.length >= (gatesPerStage.get(r.stage) ?? 99);
    const cur = popular.get(r.stage);
    const curFull = cur ? cur.lanes.length >= (gatesPerStage.get(r.stage) ?? 99) : false;
    if (!cur || (full && !curFull) || (full === curFull && r.runs > cur.runs)) {
      popular.set(r.stage, { lanes, runs: r.runs });
    }
  }
  const perStage = new Map<string, StoredEvent[]>();
  for (const e of usable) {
    const key = `${e.tier}-${e.no}`;
    perStage.set(key, [...(perStage.get(key) ?? []), e]);
  }

  for (const [stage, xs] of [...perStage.entries()].sort()) {
    const top = popular.get(stage);
    if (!top) continue;
    const sample = xs.find((e) => (e.lanes || "") === top.lanes) ?? xs[0];
    const rec = reconstruct({ ...sample, lanes: top.lanes });
    if (!rec) continue;

    const n = Math.ceil(rec.course.finishX) + 1;
    const slack = new Array<number>(n).fill(Number.POSITIVE_INFINITY);
    for (const f of rec.frames) {
      const x = Math.round(f.x);
      if (x < 0 || x >= n) continue;
      let w = 0;
      for (const sp of f.surv) w += sp.hi - sp.lo;
      const ms = (w / (2 * f.rate)) * 1000;
      if (ms < slack[x]) slack[x] = ms;
    }
    for (let i = 1; i < n; i += 1) if (!Number.isFinite(slack[i])) slack[i] = slack[i - 1];
    for (let i = 0; i < n; i += 1) if (!Number.isFinite(slack[i])) slack[i] = 0;

    const HIST_BIN = 20;
    const hist = new Array<number>(Math.ceil(n / HIST_BIN)).fill(0);
    let deathN = 0;
    for (const e of xs) {
      if (e.k !== "death" || e.x === undefined) continue;
      const b = Math.floor(e.x / HIST_BIN);
      if (b >= 0 && b < hist.length) hist[b] += 1;
      deathN += 1;
    }

    const entries = [...slots.values()]
      .filter((sl) => sl.stage === stage && sl.piece === 0)
      .reduce((a, b) => a + b.entries, 0);

    figures.push({
      stage,
      tier: sample.tier!,
      finishX: rec.course.finishX,
      worldHeight: rec.tuning.worldHeight,
      lanes: top.lanes,
      runs: top.runs,
      entries,
      deaths: deathN,
      pieces: rec.course.pieces.map((pc) => ({
        kind: pc.kind,
        id: pc.kind === "sector" ? (pc.sector?.id ?? "?") : "gate",
        startX: Math.round(pc.startX),
        endX: Math.round(pc.endX)
      })),
      slack: slack.map((v) => Math.round(v)),
      hist,
      histBin: HIST_BIN,
      lanesRecorded: top.lanes.length,
      gates: rec.course.pieces.filter((pc) => pc.kind === "gate").length
    });
  }
}

const text = out.join("\n");
console.log(text);

if (jsonOut) {
  writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        fp,
        counts: { raw: raw.length, usable: usable.length, deaths, clears, aborts, excluded },
        slots: [...slots.values()].map((s) => ({
          stage: s.stage,
          tier: s.tier,
          piece: s.piece,
          id: s.id,
          entries: s.entries,
          deaths: s.deaths,
          blamed: s.blamed,
          slackMs: Math.round(median(s.slack) || 0)
        })),
        bands: bandRows.map(([lo, b]) => ({ lo, ...b })),
        sessions: sess.length,
        over5,
        divergence: {
          traced: lags.length,
          movedUpstream,
          lagMedian: Math.round(median(lags) * 10) / 10,
          lagMax: Math.round(Math.max(0, ...lags) * 10) / 10
        },
        figures
      },
      null,
      2
    )
  );
  console.error(`\n요약 → ${jsonOut}`);
}
