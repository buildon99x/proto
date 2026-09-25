/**
 * 플레이 계측 수집·분석 — "어떤 이벤트가 어느 정도 시간과 노력으로 일어나는가".
 *
 *   pnpm --filter relic-king playlog                     기본(168시간 × 두 정책)
 *   pnpm --filter relic-king playlog -- --hours 24
 *   pnpm --filter relic-king playlog -- --json out.json  원본 이벤트까지 저장
 *
 * 두 정책을 나란히 돌린다. **같은 게임인데 플레이어가 무엇을 하느냐에 따라
 * 경험이 어떻게 달라지는가**가 이 계측의 질문이기 때문이다.
 *
 * - `idle` — 탭만 열어 두고 아무것도 누르지 않는다. `useGame.ts`의 프레임 루프가
 *   하는 일(`advance` + 60초마다 `runAutoRoutine`)과 **정확히 같은 것**만 한다.
 * - `active` — `sim/policy.ts`의 방치 정책(거점 확장·발굴단·시설·경매). 역시
 *   클릭 0회 기준선이지만, 사람이 화면에서 눌렀어야 할 조작을 전부 대신 한다.
 *
 * 그래서 `active`의 player 이벤트 수 = **그 세션이 사람에게 요구한 조작 횟수**다.
 */
import { writeFileSync } from "node:fs";
import { AUTO_ROUTINE_INTERVAL_SECONDS } from "../game/balance";
import {
  advance, codexProgress, createPersistentRecord, createWorld, digPower, grantStartingTeam,
  playerAssets, runAutoRoutine
} from "../game/engine";
import { duration, usd } from "../game/format";
import { actExpansion, liquidateSurplus, STEP_EARLY, STEP_LATE } from "./policy";
import { AMBIENT, MEANINGFUL, PlayRecorder, STEPS_PER_EVENT } from "./telemetry";
import type { EventKind, PlayEvent } from "./telemetry";
import type { World } from "../game/types";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(k);
  return i > -1 ? args[i + 1] : d;
};
const HOURS = Number(arg("--hours", "168"));
const JSON_OUT = arg("--json", "");
/** 0이면 끄고, N이면 N분 간격으로 타임라인을 찍는다 (`--bucket 10` = 10분 단위) */
const BUCKET_MIN = Number(arg("--bucket", "0"));

/**
 * 구간 끝의 **세계 상태**. 이벤트만 세면 "무슨 일이 일어났나"는 알지만 "그때
 * 플레이어가 어떤 화면을 보고 있었나"는 모른다 — 도감 숫자, 지갑, 발굴력,
 * 파 내려간 층은 전부 화면에 상시 떠 있는 값이라 경험의 배경이 된다.
 */
type Sample = {
  t: number; funds: number; assets: number; dig: number;
  codex: number; layers: number; teams: number; sites: number;
  vault: number; pending: number; displayed: number;
};

function sample(w: World, t: number): Sample {
  let layers = 0;
  for (const id of Object.keys(w.sites)) layers += w.sites[id as keyof typeof w.sites].layer;
  return {
    t,
    funds: w.funds,
    assets: playerAssets(w),
    dig: digPower(w),
    codex: codexProgress(w).owned,
    layers,
    teams: w.teams.length,
    sites: Object.values(w.sites).filter((s) => s.unlocked).length,
    vault: w.vault.filter((v) => !v.displayed).length,
    pending: w.pending.length,
    displayed: w.vault.filter((v) => v.displayed).length
  };
}

/** 틱마다 불러 두면 구간 경계를 넘는 순간의 상태를 모아 준다 */
function sampler(bucketSeconds: number) {
  const samples: Sample[] = [];
  let next = bucketSeconds;
  return {
    samples,
    tick(w: World) {
      if (bucketSeconds <= 0) return;
      while (w.t >= next) {
        samples.push(sample(w, next));
        next += bucketSeconds;
      }
    }
  };
}

type RunResult = { label: string; world: World; events: PlayEvent[]; seconds: number; samples: Sample[] };

/** 탭만 열어 둔 플레이 — UI 프레임 루프와 같은 일만 한다 */
function runIdle(hours: number): RunResult {
  // 0초의 단장 합류·첫 파견을 계측이 보도록 스냅샷 뒤에 배정한다(engine의 `grantTeam`)
  const w = createWorld(undefined, false);
  const record = createPersistentRecord();
  const rec = new PlayRecorder(w);
  grantStartingTeam(w);
  const smp = sampler(BUCKET_MIN * 60);
  const total = hours * 3600;
  let routineAcc = 0;
  while (w.t < total && !w.ended) {
    const stepNow = w.t < 1200 ? STEP_EARLY : STEP_LATE;
    const report = advance(w, stepNow, false, stepNow, record);
    rec.mark(w, "auto", report);
    routineAcc += stepNow;
    if (routineAcc >= AUTO_ROUTINE_INTERVAL_SECONDS) {
      routineAcc = 0;
      runAutoRoutine(w);
      // 자동 루틴은 **사람이 아니라 게임이** 한다 — auto 로 센다.
      rec.mark(w, "auto");
    }
    smp.tick(w);
  }
  return { label: "idle", world: w, events: rec.events, seconds: w.t, samples: smp.samples };
}

/** 거점·발굴단·시설을 실제로 운영하는 플레이 — act()가 곧 "사람이 눌렀어야 할 것" */
function runActive(hours: number): RunResult {
  const w = createWorld(undefined, false);
  const record = createPersistentRecord();
  const rec = new PlayRecorder(w);
  grantStartingTeam(w);
  const smp = sampler(BUCKET_MIN * 60);
  const total = hours * 3600;
  while (w.t < total && !w.ended) {
    const stepNow = w.t < 1200 ? STEP_EARLY : STEP_LATE;
    // `act()`를 세 조각으로 나눠 부른다 — 동작은 같고(`policy.ts` 참조), 어느
    // 이벤트가 **사람 손**이었는지만 갈라진다.
    liquidateSurplus(w);
    rec.mark(w, "player");
    runAutoRoutine(w);
    rec.mark(w, "auto");
    actExpansion(w);
    rec.mark(w, "player");
    const report = advance(w, stepNow, false, stepNow, record);
    rec.mark(w, "auto", report);
    smp.tick(w);
  }
  return { label: "active", world: w, events: rec.events, seconds: w.t, samples: smp.samples };
}

// ── 분석 ────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  drop: "유물 드랍", appraised: "감정 완료", newSpecies: "도감 신규 종",
  sold: "감정 후 매각", blindSold: "미감정 매각", auctionSettled: "경매 낙찰",
  auctionListed: "경매 출품", layerUp: "층 돌파",
  tipOpened: "제보 발생", tipClosed: "제보 종료", raceWon: "레이스 승", raceLost: "레이스 패",
  lostToRival: "영구 상실", firstT4: "유일 최초 획득",
  siteUnlocked: "거점 해금", teamSlotUnlocked: "발굴단 슬롯 해금", foremanHired: "단장 고용",
  teamDispatched: "원정 파견", teamReturned: "원정 귀환", teamUpgraded: "발굴단 증강",
  digUpgraded: "인부·장비·감정소 구매", facilityUpgraded: "보관소·습도·복원·보안",
  museumBuilt: "박물관 건립", museumUpgraded: "박물관 확장", curatorHired: "관장 고용",
  displayed: "전시", auctionBuilt: "경매장 건립", auctionUpgraded: "경매장 확장",
  auctioneerHired: "경매관장 고용",
  theft: "도난 발생", theftResolved: "도난 정리", vaultOverflow: "소장고 정원 초과",
  sealedBacklog: "봉인 적체", seasonRollover: "시즌 롤오버", ending: "엔딩"
};

const label = (k: string) => KIND_LABEL[k] ?? k;

function totalsByKind(events: PlayEvent[]) {
  const map = new Map<EventKind, { n: number; player: number; auto: number; first: number; last: number }>();
  for (const e of events) {
    const cur = map.get(e.kind) ?? { n: 0, player: 0, auto: 0, first: e.t, last: e.t };
    cur.n += e.n;
    if (e.phase === "player") cur.player += e.n;
    else cur.auto += e.n;
    cur.first = Math.min(cur.first, e.t);
    cur.last = Math.max(cur.last, e.t);
    map.set(e.kind, cur);
  }
  return map;
}

/** 의미 있는 이벤트가 하나도 없는 구간 — 지루함의 직접 지표 */
function deadTime(events: PlayEvent[], seconds: number) {
  const times = events.filter((e) => MEANINGFUL.includes(e.kind)).map((e) => e.t).sort((a, b) => a - b);
  const gaps: number[] = [];
  let prev = 0;
  for (const t of times) {
    if (t > prev) gaps.push(t - prev);
    prev = Math.max(prev, t);
  }
  if (seconds > prev) gaps.push(seconds - prev);
  const sorted = [...gaps].sort((a, b) => a - b);
  const pick = (q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : 0);
  const over = (s: number) => gaps.filter((g) => g >= s).reduce((a, b) => a + b, 0);
  return {
    count: times.length,
    medianGap: pick(0.5), p90: pick(0.9), max: sorted.length ? sorted[sorted.length - 1] : 0,
    over300Pct: (100 * over(300)) / seconds,
    over900Pct: (100 * over(900)) / seconds,
    over3600Pct: (100 * over(3600)) / seconds
  };
}

/** 반복:의미 비율 — 화면에서 일어나는 일 몇 건당 기억할 만한 일이 하나인가 */
function signalRatio(events: PlayEvent[]) {
  const sum = (list: EventKind[]) =>
    events.filter((e) => list.includes(e.kind)).reduce((a, e) => a + e.n, 0);
  const ambient = sum(AMBIENT);
  const meaningful = sum(MEANINGFUL);
  return { ambient, meaningful, perMeaningful: meaningful > 0 ? ambient / meaningful : Infinity };
}

/**
 * 제보의 **응답 창** — 배너가 떠 있는 실제 시간. 제보는 "놓치면 영영"인 유일한
 * 이벤트라(재미 정의 ②) 이 창이 곧 그 장치의 난이도다. 설계는 배너가
 * `TIP_DURATION_ONSITE_MIN~MAX`(60~150초) 동안 떠 있다고 적어 뒀지만, 레이스가
 * 먼저 끝나면 배너도 같이 닫힌다 — 그래서 **실제** 창은 그보다 짧을 수 있다.
 * 왜 닫혔는지(승·패·만료)까지 같이 센다.
 */
function tipWindows(events: PlayEvent[], from = 0, to = Infinity) {
  const dur: number[] = [];
  let won = 0;
  let lost = 0;
  let expired = 0;
  for (const e of events) {
    if (e.kind !== "tipClosed" || e.t < from || e.t >= to) continue;
    const m = e.detail ? /^([\d.]+)초 지속$/.exec(e.detail) : null;
    if (m) dur.push(Number(m[1]));
    // 결판은 배너 수명 **안에서** 난다(v0.6.1) — 닫힌 틱의 승·패로 이유를 추정하면
    // 전부 만료로 읽힌다(완성도 진단 2판 §7 결함 4). 기록기가 배너에서 본
    // `tip.resolved`를 `outcome`으로 넘겨준다.
    if (e.outcome === "won") won++;
    else if (e.outcome === "lost") lost++;
    else expired++;
  }
  dur.sort((a, b) => a - b);
  const pick = (q: number) => (dur.length ? dur[Math.min(dur.length - 1, Math.floor(dur.length * q))] : 0);
  return {
    n: dur.length, min: dur[0] ?? 0, median: pick(0.5), p90: pick(0.9), max: dur[dur.length - 1] ?? 0,
    won, lost, expired,
    under10: dur.filter((d) => d < 10).length
  };
}

/** 시간대별 이벤트 밀도 — 초반/중반/후반에서 경험의 성격이 어떻게 달라지는가 */
function density(events: PlayEvent[], seconds: number) {
  const buckets = [
    { label: "0~20분", from: 0, to: 1200 },
    { label: "20분~1시간", from: 1200, to: 3600 },
    { label: "1~6시간", from: 3600, to: 6 * 3600 },
    { label: "6~24시간", from: 6 * 3600, to: 24 * 3600 },
    { label: "24~72시간", from: 24 * 3600, to: 72 * 3600 },
    { label: "72시간~", from: 72 * 3600, to: Infinity }
  ];
  return buckets
    .filter((b) => b.from < seconds)
    .map((b) => {
      const to = Math.min(b.to, seconds);
      const span = to - b.from;
      const inBucket = events.filter((e) => e.t >= b.from && e.t < to);
      const sum = (pred: (e: PlayEvent) => boolean) =>
        (inBucket.filter(pred).reduce((a, e) => a + e.n, 0) * 3600) / span;
      return {
        label: b.label,
        hours: span / 3600,
        ambient: sum((e) => AMBIENT.includes(e.kind)),
        meaningful: sum((e) => MEANINGFUL.includes(e.kind)),
        newSpecies: sum((e) => e.kind === "newSpecies"),
        tips: sum((e) => e.kind === "tipOpened"),
        playerOps: sum((e) => e.phase === "player")
      };
    });
}

/**
 * 고정 폭 타임라인 — "10분마다 플레이어 앞에서 무슨 일이 일어났는가".
 *
 * `density()`의 구간은 미리 정해 둔 국면(0~20분, 1~6시간…)이라 **국면이 언제
 * 바뀌는지**는 보여 주지 못한다. 같은 폭으로 잘라 나란히 놓으면 밀도가 꺾이는
 * 지점이 표에서 그대로 읽힌다. 각 줄 끝의 "처음"은 그 구간에서 **이 판 통틀어
 * 처음** 일어난 이벤트 종류다 — 경험이 어디서 새로 열리는지의 지표.
 */
function timeline(events: PlayEvent[], samples: Sample[], bucketSeconds: number, seconds: number) {
  const firstSeen = new Map<EventKind, number>();
  for (const e of events) {
    if (!firstSeen.has(e.kind)) firstSeen.set(e.kind, e.t);
  }
  const rows: {
    from: number; to: number; ambient: number; meaningful: number;
    newSpecies: number; layerUp: number; tips: number; won: number; lost: number;
    ops: number; firsts: EventKind[]; state: Sample | null;
  }[] = [];
  for (let from = 0; from < seconds; from += bucketSeconds) {
    const to = Math.min(from + bucketSeconds, seconds);
    const inBucket = events.filter((e) => e.t >= from && e.t < to);
    const sum = (pred: (e: PlayEvent) => boolean) =>
      inBucket.filter(pred).reduce((a, e) => a + e.n, 0);
    rows.push({
      from, to,
      ambient: sum((e) => AMBIENT.includes(e.kind)),
      meaningful: sum((e) => MEANINGFUL.includes(e.kind)),
      newSpecies: sum((e) => e.kind === "newSpecies"),
      layerUp: sum((e) => e.kind === "layerUp"),
      tips: sum((e) => e.kind === "tipOpened"),
      won: sum((e) => e.kind === "raceWon"),
      lost: sum((e) => e.kind === "raceLost"),
      ops: sum((e) => e.phase === "player"),
      firsts: [...firstSeen].filter(([, t]) => t >= from && t < to).map(([k]) => k),
      state: samples.find((s) => s.t > from && s.t <= to + 1e-6) ?? null
    });
  }
  return rows;
}

/** 사람이 눌렀어야 할 조작량 — 건수와, 실측 단계 수를 곱한 총 조작 수 */
function effort(events: PlayEvent[], seconds: number) {
  const rows: { kind: EventKind; n: number; steps: number | null; total: number | null }[] = [];
  const byKind = new Map<EventKind, number>();
  for (const e of events) {
    if (e.phase !== "player") continue;
    byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + e.n);
  }
  for (const [kind, n] of [...byKind].sort((a, b) => b[1] - a[1])) {
    const steps = STEPS_PER_EVENT[kind];
    rows.push({ kind, n, steps: steps ?? null, total: steps == null ? null : steps * n });
  }
  const actions = rows.reduce((a, r) => a + r.n, 0);
  const steps = rows.reduce((a, r) => a + (r.total ?? 0), 0);
  const unmeasured = rows.filter((r) => r.steps === null).reduce((a, r) => a + r.n, 0);
  const days = seconds / 86400;
  return { rows, actions, steps, unmeasured, actionsPerDay: actions / days, stepsPerDay: steps / days };
}

function fmtSec(s: number) {
  return duration(s);
}

function report(r: RunResult) {
  const { label: name, world: w, events, seconds } = r;
  const totals = totalsByKind(events);

  console.log(`\n════════ ${name === "idle" ? "① 탭만 열어 둔 플레이" : "② 거점·발굴단·시설을 운영하는 플레이"} ` +
    `— ${fmtSec(seconds)}${w.ended ? " (엔딩 도달)" : ""} ════════`);

  console.log("\n── 이벤트 종류별 ──────────────────────────────────────────");
  console.log("이벤트                         건수   최초     평균 간격   사람 손");
  const sorted = [...totals].sort((a, b) => b[1].n - a[1].n);
  for (const [kind, v] of sorted) {
    if (v.n === 0) continue;
    const gap = v.n > 1 ? (v.last - v.first) / (v.n - 1) : NaN;
    console.log(
      `${label(kind).padEnd(26)} ${String(v.n).padStart(6)}   ` +
      `${fmtSec(v.first).padStart(8)}  ${(Number.isNaN(gap) ? "—" : fmtSec(gap)).padStart(9)}   ` +
      `${v.player > 0 ? `${v.player}건` : "—"}`
    );
  }

  const dead = deadTime(events, seconds);
  const sig = signalRatio(events);
  const tips = tipWindows(events);
  console.log("\n── 화면에서 일어나는 일의 성격 ────────────────────────────");
  console.log(`반복 이벤트 ${sig.ambient.toLocaleString("ko-KR")}건(드랍·감정·매각) · ` +
    `의미 있는 이벤트 ${sig.meaningful.toLocaleString("ko-KR")}건`);
  console.log(`→ 기억할 만한 일 1건당 반복 이벤트 ${sig.perMeaningful.toFixed(1)}건`);

  console.log("\n── 의미 있는 이벤트가 없는 구간(지루함) ───────────────────");
  console.log(`중앙 간격 ${fmtSec(dead.medianGap)} · p90 ${fmtSec(dead.p90)} · 최장 ${fmtSec(dead.max)}`);
  console.log(`5분 이상 공백이 전체의 ${dead.over300Pct.toFixed(1)}% · ` +
    `15분 이상 ${dead.over900Pct.toFixed(1)}% · 1시간 이상 ${dead.over3600Pct.toFixed(1)}%`);
  if (tips.n > 0) {
    console.log(`\n── 제보 응답 창(놓치면 영영 — 이 게임 유일의 긴장 장치) ────`);
    console.log(`${tips.n}회 · 중앙 ${fmtSec(tips.median)} · p90 ${fmtSec(tips.p90)} · ` +
      `최소 ${fmtSec(tips.min)} / 최대 ${fmtSec(tips.max)}  (설계 60~150초)`);
    console.log(`10초 안에 닫힌 제보 ${tips.under10}회(${((100 * tips.under10) / tips.n).toFixed(0)}%) · ` +
      `승 ${tips.won} / 패 ${tips.lost} / 만료 ${tips.expired}`);
    const early = tipWindows(events, 0, 3600);
    const late = tipWindows(events, 6 * 3600, Infinity);
    const wl = (x: typeof tips) => `승 ${x.won} / 패 ${x.lost} / 만료 ${x.expired}`;
    if (early.n > 0) console.log(`  첫 1시간: ${early.n}회 · 중앙 ${fmtSec(early.median)} · ${wl(early)}`);
    if (late.n > 0) console.log(`  6시간 이후: ${late.n}회 · 중앙 ${fmtSec(late.median)} · ${wl(late)}`);
  }

  console.log("\n── 시간대별 밀도(시간당) ──────────────────────────────────");
  console.log("구간             길이     반복   의미있음   신규종    제보   사람조작");
  for (const b of density(events, seconds)) {
    console.log(
      `${b.label.padEnd(14)} ${b.hours.toFixed(1).padStart(6)}h ` +
      `${b.ambient.toFixed(0).padStart(7)} ${b.meaningful.toFixed(1).padStart(9)} ` +
      `${b.newSpecies.toFixed(1).padStart(8)} ${b.tips.toFixed(1).padStart(7)} ` +
      `${b.playerOps.toFixed(1).padStart(9)}`
    );
  }

  if (BUCKET_MIN > 0) {
    console.log(`\n── ${BUCKET_MIN}분 단위 타임라인 ──────────────────────────────────`);
    // 자금은 지갑(`w.funds`), 자산은 소장고 평가액 합(`playerAssets` — 순위표가
    // 쓰는 값이다). 둘이 갈라지는 지점이 곧 "돈은 버는데 쓸 데가 없다"의 신호다.
    console.log("구간        반복  의미  신규종  층↑  제보(승/패)  조작 │ 도감  발굴력      자금      자산  소장고 │ 처음");
    for (const b of timeline(events, r.samples, BUCKET_MIN * 60, seconds)) {
      const s = b.state;
      console.log(
        `${fmtSec(b.from).padStart(9)} ${String(b.ambient).padStart(6)} ${String(b.meaningful).padStart(5)} ` +
        `${String(b.newSpecies).padStart(6)} ${String(b.layerUp).padStart(4)} ` +
        `${`${b.tips}(${b.won}/${b.lost})`.padStart(11)} ${String(b.ops).padStart(5)} │ ` +
        `${(s ? String(s.codex) : "—").padStart(5)} ${(s ? s.dig.toFixed(0) : "—").padStart(7)} ` +
        `${(s ? `${usd(s.funds)}` : "—").padStart(9)} ${(s ? `${usd(s.assets)}` : "—").padStart(9)} ` +
        `${(s ? String(s.vault) : "—").padStart(6)} │ ` +
        b.firsts.map(label).join(", ")
      );
    }
  }

  const e = effort(events, seconds);
  console.log("\n── 사람이 눌렀어야 할 조작 ────────────────────────────────");
  if (e.actions === 0) {
    console.log("없음 — 이 플레이는 클릭 0회로 끝까지 굴러간다.");
  } else {
    console.log("조작                           횟수   단계/회   총 단계");
    for (const row of e.rows) {
      console.log(
        `${label(row.kind).padEnd(26)} ${String(row.n).padStart(6)}   ` +
        `${(row.steps === null ? "측정불가" : String(row.steps)).padStart(7)}   ` +
        `${(row.total === null ? "—" : String(row.total)).padStart(7)}`
      );
    }
    console.log(`합계 ${e.actions}회 · ${e.steps}단계 — 하루 ${e.actionsPerDay.toFixed(1)}회 · ${e.stepsPerDay.toFixed(1)}단계`);
    if (e.unmeasured > 0) {
      console.log(`⚠ 단계 수를 셀 수 없는 조작 ${e.unmeasured}회 — 화면에 진입 경로가 없다(아래 참조)`);
    }
  }

  const codex = codexProgress(w);
  console.log("\n── 도달 상태 ──────────────────────────────────────────────");
  console.log(`자산 ${usd(playerAssets(w))} · 도감 ${codex.owned}/${codex.total}종 · ` +
    `발굴력 ${digPower(w).toFixed(0)}/s · 거점 ${totals.get("siteUnlocked")?.n ?? 0}곳 추가 · 발굴단 ${w.teams.length}팀`);

  return { totals, dead, sig, tips, density: density(events, seconds), effort: e };
}

// ── 실행 ────────────────────────────────────────────────────────────────

console.log(`플레이 계측 — ${HOURS}시간, 클릭 0회 기준(척추 4번). 두 정책을 나란히 돌린다.`);
const idle = runIdle(HOURS);
const active = runActive(HOURS);
const a1 = report(idle);
const a2 = report(active);

console.log("\n════════ 두 플레이의 차이 ════════");
const line = (k: string, x: string, y: string) => console.log(`${k.padEnd(28)} ${x.padStart(16)}  ${y.padStart(16)}`);
line("", "탭만 열어 둠", "운영");
line("의미 있는 이벤트", `${a1.dead.count}건`, `${a2.dead.count}건`);
line("그 중앙 간격", fmtSec(a1.dead.medianGap), fmtSec(a2.dead.medianGap));
line("15분 이상 공백", `${a1.dead.over900Pct.toFixed(1)}%`, `${a2.dead.over900Pct.toFixed(1)}%`);
line("반복:의미 비율", `${a1.sig.perMeaningful.toFixed(1)}:1`, `${a2.sig.perMeaningful.toFixed(1)}:1`);
line("사람 조작", `${a1.effort.actions}회`, `${a2.effort.actions}회`);
line("하루 조작", `${a1.effort.actionsPerDay.toFixed(1)}회`, `${a2.effort.actionsPerDay.toFixed(1)}회`);
line("도감", `${codexProgress(idle.world).owned}종`, `${codexProgress(active.world).owned}종`);
line("자산", `${usd(playerAssets(idle.world))}`, `${usd(playerAssets(active.world))}`);

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({
    hours: HOURS,
    runs: [idle, active].map((r) => ({
      label: r.label, seconds: r.seconds, ended: r.world.ended, events: r.events, samples: r.samples
    }))
  }));
  console.log(`\n원본 이벤트 → ${JSON_OUT}`);
}
