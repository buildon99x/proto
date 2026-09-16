/**
 * 수집된 이벤트로 코스를 되살릴 수 있는가.
 *
 * 이 검증기가 지키는 것은 하나다 — **`lanes` 만으로 그 사람이 실제로 탄 코스가
 * 재현되는가.** 재현되지 않으면 모은 데이터는 좌표의 나열일 뿐이고, 사망 지점을
 * 생존 회랑과 대조할 수 없어 난이도 판정에 쓸 수 없다.
 *
 * 네 가지를 본다.
 *
 * 1. **재구성 대조** — `lanes` 로 게이트 제안을 다시 풀어 얻은 빌드가 이벤트의
 *    `bld` 와 같은가. 어긋나면 지문 관리나 선택열 기록에 버그가 있다는 뜻이다.
 * 2. **자리 특정** — `pi`·`lx` 가 가리키는 조각이 실제 사망 x 를 품는가.
 * 3. **간격 수치** — `gw`·`gd` 를 자유 구간에서 다시 계산한 값과 같은가.
 * 4. **스키마 왕복** — 서버의 정규화가 클라이언트의 이벤트를 그대로 통과시키는가.
 *    빈 `lanes`(첫 게이트 전에 죽은 런)를 포함한다 — 신규 플레이어의 가장 흔한
 *    사망이고, 여기가 막히면 가장 필요한 데이터가 통째로 거부된다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/telemetry.ts
 */
import { NEUTRAL_BUILD, applyTrade, gateOffer } from "../../app/src/game/axes";
import { buildStageCourse, pieceAt, pieceIndexAt } from "../../app/src/game/course";
import { BASE_TUNING, createState, launch, startYFor, update } from "../../app/src/game/engine";
import type { GameState } from "../../app/src/game/engine";
import { measure, pieceFreeSpans } from "../../app/src/game/geometry";
import { targetY } from "../../app/src/game/pilot";
import { buildDeathEvent, buildEndEvent } from "../../app/src/game/telemetry";
import type { RunEvent } from "../../app/src/game/telemetry";
import type { Build, Tuning } from "../../app/src/game/types";

const DT = 1 / 120;
const LOOKAHEAD = 0.14;

const fail: string[] = [];
const check = (ok: boolean, msg: string) => {
  if (!ok) fail.push(msg);
};

/**
 * `lanes` 로 빌드를 되살린다. 엔진과 **같은 순서**여야 한다 —
 * 제안은 게이트에 닿기 전 현재 빌드로 확정되고, 통과하면서 적용된다.
 */
function replay(tier: number, no: number, cap: number, start: Build, lanes: string): Build {
  const base: Tuning = { ...BASE_TUNING, axisMin: -cap, axisMax: cap };
  const course = buildStageCourse(tier, no, base);
  let build = { ...start };
  let i = 0;
  for (const piece of course.pieces) {
    if (piece.kind !== "gate" || !piece.gate) continue;
    if (i >= lanes.length) break;
    const offer = gateOffer(piece.gate.seed, build, base);
    build = applyTrade(build, lanes[i] === "b" ? offer.bot : offer.top, base);
    i += 1;
  }
  return build;
}

/** 사람에 가까운 지연을 준 주행. 실제로 죽어야 사망 이벤트가 나온다 */
function drive(tier: number, no: number, cap: number, latencySec: number): GameState {
  const state = createState({
    mode: "stage",
    tier,
    stageNo: no,
    seed: 0,
    startBuild: { ...NEUTRAL_BUILD },
    presetId: "neutral",
    axisCap: cap,
    maxSectorDifficulty: 3
  });
  state.y = startYFor(state.course);
  launch(state);

  const history: number[] = [];
  const delayFrames = Math.max(0, Math.round(latencySec / DT));
  for (let t = 0; t < 200; t += DT) {
    const gate = state.course.pieces.find((p) => p.kind === "gate" && p.endX > state.x)?.gate;
    const lane: "top" | "bot" = gate && gate.seed % 2 === 0 ? "bot" : "top";
    history.push(state.y - targetY(state, LOOKAHEAD, lane));
    const seen = history.length > delayFrames ? history[history.length - 1 - delayFrames] : history[0];
    state.holding = seen > 0;
    const r = update(state, DT);
    // Stage 는 스스로 재시작하므로 사망 프레임에서 멈춰야 그 순간의 상태를 본다.
    if (r.event === "died" || r.event === "cleared") return state;
  }
  return state;
}

// ── 서버 정규화의 거울 ────────────────────────────────────────
// launcher/app/api/telemetry/[project]/route.ts 의 규칙을 그대로 옮긴 것.
// **한쪽을 고치면 다른 쪽도 고쳐야 한다.** 키 집합만이 아니라 값 제약까지 본다 —
// 키만 봤을 때 빈 lanes 가 거부되는 것을 놓쳤다.
const NUMERIC_KEYS = new Set([
  "ts", "tier", "no", "seed", "att", "cap", "t",
  "pi", "x", "lx", "y", "gw", "gd", "dist", "sec",
  "hold", "fps", "prac", "dev", "hud", "mob"
]);
const STRING_KEYS = new Set(["k", "mode", "pre", "pid"]);
const MAX_TEXT = 64;
const MAX_LANES = 512;

/** 서버가 버리거나 거부할 키를 돌려준다. 비어 있어야 통과다 */
function rejectedByServer(event: RunEvent): string[] {
  const bad: string[] = [];
  for (const [key, value] of Object.entries(event)) {
    if (value === undefined) continue;
    if (key === "bld") {
      if (!Array.isArray(value) || value.length !== 3) bad.push(key);
      continue;
    }
    if (key === "lanes") {
      // 빈 문자열은 정상이다 — 첫 게이트 전에 죽은 런.
      if (typeof value !== "string" || value.length > MAX_LANES) bad.push(key);
      continue;
    }
    if (typeof value === "number") {
      if (!NUMERIC_KEYS.has(key) || !Number.isFinite(value)) bad.push(key);
      continue;
    }
    if (typeof value === "string") {
      if (!STRING_KEYS.has(key) || value.length === 0 || value.length > MAX_TEXT) bad.push(key);
      continue;
    }
    bad.push(key);
  }
  return bad;
}

// ── 주행 ──────────────────────────────────────────────────────

const rows: string[] = [];
let deaths = 0;
let clears = 0;
let mismatches = 0;

for (const tier of [1, 2, 3, 4]) {
  for (const no of [1, 2, 3]) {
    for (const [cap, latency] of [
      [2, 0.09],
      [3, 0.13]
    ] as const) {
      const state = drive(tier, no, cap, latency);
      const died = state.phase === "dead";
      const event = died ? buildDeathEvent(state) : buildEndEvent(state, "clear");
      if (died) deaths += 1;
      else if (state.phase === "cleared") clears += 1;

      // 1) 재구성 대조
      const replayed = replay(tier, no, cap, NEUTRAL_BUILD, state.lanes);
      const same =
        replayed.slope === event.bld[0] &&
        replayed.speed === event.bld[1] &&
        replayed.bias === event.bld[2];
      if (!same) mismatches += 1;
      check(
        same,
        `재구성 불일치 ${tier}:${no} cap${cap} lanes="${state.lanes}" ` +
          `기록 ${event.bld.join(",")} vs 재현 ${replayed.slope},${replayed.speed},${replayed.bias}`
      );

      check(
        state.lanes.length === state.gatesPassed,
        `선택열 길이 불일치 ${tier}:${no} — lanes ${state.lanes.length} vs 통과 ${state.gatesPassed}`
      );

      if (died) {
        // 2) 자리 특정
        const pi = pieceIndexAt(state.course, state.x);
        check(event.pi === pi, `조각 인덱스 불일치 ${tier}:${no} — ${event.pi} vs ${pi}`);
        const piece = state.course.pieces[pi];
        check(
          piece !== undefined && state.x >= piece.startX - 1e-6 && state.x <= piece.endX + 1e-6,
          `조각이 사망 x 를 품지 않는다 ${tier}:${no}`
        );
        const expectId = piece.kind === "gate" ? "gate" : (piece.sector?.id ?? "unknown");
        check(event.pid === expectId, `조각 id 불일치 ${tier}:${no} — ${event.pid} vs ${expectId}`);

        // 3) 간격 수치
        const spans = pieceFreeSpans(
          piece,
          state.x,
          state.tuning.radius,
          state.elapsed,
          state.tuning,
          state.lane ?? undefined
        );
        const gw = Math.round(measure(spans) * 10) / 10;
        check(event.gw === gw, `자유 구간 폭 불일치 ${tier}:${no} — ${event.gw} vs ${gw}`);
        check(
          (event.gd ?? 0) >= -1,
          `간격 거리 이상 ${tier}:${no} — ${event.gd}`
        );
        check(
          spans.length > 0 ? (event.gd ?? -1) >= 0 : event.gd === -1,
          `폐쇄 표기 불일치 ${tier}:${no} — 구간 ${spans.length}개인데 gd ${event.gd}`
        );
      }

      // 4) 스키마 왕복
      const bad = rejectedByServer(event);
      check(bad.length === 0, `서버가 거부하는 키 ${tier}:${no} — ${bad.join(", ")}`);

      const bytes = JSON.stringify(event).length;
      rows.push(
        `${String(tier)}:${no} cap${cap}  ${event.k.padEnd(5)} ` +
          `게이트 ${String(state.lanes.length).padStart(2)} "${state.lanes.padEnd(4)}" ` +
          `조각 ${String(event.pi ?? "-").padStart(2)} ${(event.pid ?? "-").padEnd(18)} ` +
          `폭 ${String(event.gw ?? "-").padStart(5)} 거리 ${String(event.gd ?? "-").padStart(5)} ` +
          `${bytes}B`
      );
    }
  }
}

// 첫 게이트 전에 죽은 런. 주행으로 늘 나오지는 않으므로 직접 만들어 확인한다 —
// 신규 플레이어의 가장 흔한 사망이고, 한때 서버가 이것을 400 으로 거부했다.
{
  const state = createState({
    mode: "stage",
    tier: 1,
    stageNo: 1,
    seed: 0,
    startBuild: { ...NEUTRAL_BUILD },
    presetId: "neutral",
    axisCap: 2,
    maxSectorDifficulty: 3
  });
  state.y = startYFor(state.course);
  launch(state);
  // 놓은 채 두면 바닥으로 내려가 첫 섹터에서 죽는다.
  state.holding = false;
  let died = false;
  for (let t = 0; t < 20 && !died; t += DT) died = update(state, DT).event === "died";
  check(died, "첫 게이트 전 사망을 만들지 못했다");
  const early = buildDeathEvent(state);
  check(early.lanes === "", `첫 게이트 전인데 선택열이 비어 있지 않다 — "${early.lanes}"`);
  const bad = rejectedByServer(early);
  check(bad.length === 0, `빈 선택열 이벤트를 서버가 거부한다 — ${bad.join(", ")}`);
  console.log(`첫 게이트 전 사망: 조각 ${early.pi} ${early.pid} · 선택열 "" · ${JSON.stringify(early).length}B\n`);
}

console.log("스테이지 12개 × 축 상한 2종 — 주행하며 만든 이벤트\n");
console.log(rows.join("\n"));

const sizes = rows.length;
console.log(
  `\n사망 ${deaths} · 클리어 ${clears} · 그 외 ${sizes - deaths - clears}` +
    `  |  재구성 불일치 ${mismatches}/${sizes}`
);

if (fail.length > 0) {
  console.error(`\n실패 ${fail.length}건`);
  for (const f of fail) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("\n통과 — lanes 만으로 코스가 재현되고, 서버 스키마가 모든 키를 살린다.");
