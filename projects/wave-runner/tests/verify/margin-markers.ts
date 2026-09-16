/**
 * 기록 이정표가 사양을 지키는가.
 *
 * 묻는 것은 넷이다 — 각인이 설 자리가 **언제나 있는가**, 섬광이 순간 예산 안에
 * 있는가, 모드마다 **정확히 한 종류만** 뜨는가, 스플릿이 기록과 같은 런의 것인가.
 *
 * 이 기능이 시선을 뺏는지는 여기서 알 수 없다. 앞 구간에 서는 표시이므로 A/B 가
 * 필요하고, 실패하면 "넘은 뒤에만 보이는" 사후 표시로 후퇴한다(margin-milestone.md §8).
 *
 * 실행: pnpm exec tsx projects/wave-runner/tests/verify/margin-markers.ts
 */
import { buildStageCourse } from "../../app/src/game/course";
import { BASE_TUNING, boundsAt, createState, launch, update } from "../../app/src/game/engine";
import type { RunConfig } from "../../app/src/game/engine";
import { KEEPOUT } from "../../app/src/game/margin/bands";
import {
  FLASH_CONTRAST,
  FLASH_CONTRAST_CAP,
  FLASH_SEC,
  MARK_CONTRAST,
  MARK_HUE,
  MARK_SAT,
  TAIL_LEN,
  TICK_H,
  milestoneMarks
} from "../../app/src/game/margin/markers";
import { WALL, contrastRatio, hueAllowed, solveTint } from "../../app/src/game/margin/palette";
import { exportMeta, importMeta } from "../../app/src/game/storage";
import { EMPTY_META } from "../../app/src/game/meta";
import { targetY } from "../../app/src/game/pilot";
import { SECTORS, SECTOR_LEN, sample } from "../../app/src/game/sectors";

/** 원거리대(가장자리)의 상시 대비 상한 */
const STANDING_CAP = 2.0;
const DT = 1 / 120;
/** endless-ramp.ts 와 같은 값. 더 멀리 보면 오버슈트한다 */
const LOOKAHEAD = 0.14;

let failures = 0;
const fail = (msg: string) => {
  failures += 1;
  console.log(`  ✗ ${msg}`);
};

function stageConfig(tier: number, no: number, milestone: RunConfig["milestone"], practice = false): RunConfig {
  return {
    mode: "stage",
    tier,
    stageNo: no,
    seed: 0,
    startBuild: { slope: 0, speed: 0, bias: 0 },
    axisCap: 2,
    maxSectorDifficulty: 2,
    practice,
    milestone
  };
}

console.log("① 각인이 설 자리 — 두꺼운 쪽 벽이 근접대 8 + 높이 6 을 항상 담는가");
{
  let worst = { id: "", x: 0, room: Infinity };
  for (const s of SECTORS) {
    for (let x = 0; x <= SECTOR_LEN; x += 1) {
      const b = sample(s.nodes, x);
      const room = Math.max(b.top, 100 - b.bot);
      if (room < worst.room) worst = { id: s.id, x, room };
    }
  }
  console.log(`  수제 12섹터 최악: ${worst.id} x=${worst.x} 두꺼운 쪽 ${worst.room.toFixed(1)}월드`);
  if (worst.room - KEEPOUT < TICK_H) {
    fail(`두꺼운 쪽 여유 ${worst.room.toFixed(1)} 로는 근접대 ${KEEPOUT} + 높이 ${TICK_H} 가 안 들어간다`);
  }

  // 게이트 구간까지 포함해 실제 코스 전체를 훑는다
  let gateWorst = Infinity;
  for (const [tier, no] of [[1, 1], [2, 2], [4, 3]] as const) {
    const state = createState(stageConfig(tier, no, { bestProgress: 0.5 }));
    for (let x = 0; x < state.course.finishX; x += 2) {
      const b = boundsAt(state, x);
      gateWorst = Math.min(gateWorst, Math.max(b.top, 100 - b.bot));
    }
  }
  console.log(`  게이트 포함 실제 코스 최악: ${gateWorst.toFixed(1)}월드 (필요 ${KEEPOUT + TICK_H})`);
  if (gateWorst - KEEPOUT < TICK_H) fail("게이트 구간에서 자리가 없다");
}

console.log("\n② 색과 섬광 예산");
{
  const base = solveTint(MARK_HUE, MARK_SAT, MARK_CONTRAST);
  const lit = solveTint(MARK_HUE, MARK_SAT, FLASH_CONTRAST);
  const cb = contrastRatio(WALL, base);
  const cl = contrastRatio(WALL, lit);
  console.log(`  상시 ${base} ${cb.toFixed(2)}:1 (상한 ${STANDING_CAP}) · 섬광 ${lit} ${cl.toFixed(2)}:1 (상한 ${FLASH_CONTRAST_CAP})`);
  console.log(`  색상 ${MARK_HUE}° · 지속 ${FLASH_SEC}초 · 눈금 ${TICK_H} · 꼬리 ${TAIL_LEN}`);
  if (!hueAllowed(MARK_HUE, MARK_SAT)) fail(`색상 ${MARK_HUE}° 가 허용 대역 밖이다`);
  if (cb > STANDING_CAP) fail("상시 대비가 원거리대 상한을 넘는다");
  if (cl > FLASH_CONTRAST_CAP) fail("섬광 대비가 순간 상한을 넘는다");
  if (FLASH_SEC > 0.5) fail("섬광 지속이 0.5초를 넘는다");
  // 꼬리가 없으면 눈금 1.2월드는 속도 42 에서 0.03초 만에 지나간다
  const seen = (TAIL_LEN + 1.2) / 42;
  console.log(`  속도 42 에서 눈에 머무는 시간 ${seen.toFixed(2)}초 (꼬리 없으면 ${(1.2 / 42).toFixed(2)}초)`);
  if (seen < 0.2) fail("꼬리를 붙여도 지각 가능한 시간이 나오지 않는다");
}

console.log("\n③ 모드마다 정확히 한 종류만 — 이정표는 화면에 최대 하나다");
{
  const cases: Array<{ name: string; config: RunConfig; want: string | null }> = [
    { name: "Stage 미클리어", config: stageConfig(1, 1, { bestProgress: 0.4 }), want: "reach" },
    { name: "Stage 클리어", config: stageConfig(1, 1, { splits: [10, 22, 34, 46, 58] }), want: "split" },
    { name: "Stage 첫 플레이", config: stageConfig(1, 1, { bestProgress: 0 }), want: null },
    { name: "Stage 연습(도달)", config: stageConfig(1, 1, { bestProgress: 0.4 }, true), want: "reach" },
    { name: "Stage 연습(스플릿)", config: stageConfig(1, 1, { splits: [10, 22, 34, 46, 58] }, true), want: null },
    { name: "이정표 없음", config: stageConfig(1, 1, undefined), want: null },
    {
      name: "Endless",
      config: { ...stageConfig(1, 1, { bestDistance: 1800 }), mode: "endless", seed: 5 },
      want: "distance"
    }
  ];
  for (const c of cases) {
    const state = createState(c.config);
    const marks = milestoneMarks(state);
    const kinds = [...new Set(marks.map((m) => m.kind))];
    const ok = c.want === null ? marks.length === 0 : kinds.length === 1 && kinds[0] === c.want;
    console.log(`  ${c.name.padEnd(18)} → ${marks.length}개 ${kinds.join(",") || "없음"}`);
    if (!ok) fail(`${c.name}: ${c.want ?? "없음"} 을 기대했다`);
    if (kinds.length > 1) fail(`${c.name}: 두 종류가 동시에 떴다`);
  }
}

console.log("\n④ 섬광 — 넘을 때만, 뒤처지면 없고, 사망 프레임에는 소거된다");
{
  const state = createState(stageConfig(1, 1, { bestProgress: 0.4 }));
  const markX = state.course.finishX * 0.4;
  const speed = state.tuning.speed;

  state.phase = "running";
  state.x = markX - 10;
  if (milestoneMarks(state)[0].flash !== 0) fail("넘기 전에 섬광이 켜졌다");
  state.x = markX + speed * 0.1;
  const mid = milestoneMarks(state)[0].flash;
  state.x = markX + speed * (FLASH_SEC + 0.05);
  const after = milestoneMarks(state)[0].flash;
  console.log(`  넘기 전 0 · 0.1초 뒤 ${mid.toFixed(2)} · ${FLASH_SEC}초 뒤 ${after.toFixed(2)}`);
  if (!(mid > 0.7 && mid < 1)) fail("넘은 직후 섬광이 기대 구간에 없다");
  if (after !== 0) fail("섬광이 시간 안에 꺼지지 않는다");

  state.x = markX + speed * 0.1;
  state.phase = "dead";
  if (milestoneMarks(state)[0].flash !== 0) fail("사망 프레임에서 섬광이 남았다");

  // 스플릿 — 빠를 때만 켜진다
  const fast = createState(stageConfig(1, 1, { splits: [100, 200, 300, 400, 500] }));
  fast.phase = "running";
  fast.elapsed = 12;
  fast.splits = [11.9];
  const slow = createState(stageConfig(1, 1, { splits: [10, 20, 30, 40, 50] }));
  slow.phase = "running";
  slow.elapsed = 12;
  slow.splits = [11.9];
  const fastFlash = milestoneMarks(fast)[0].flash;
  const slowFlash = milestoneMarks(slow)[0].flash;
  console.log(`  스플릿 — 기록보다 빠름 ${fastFlash.toFixed(2)} · 느림 ${slowFlash.toFixed(2)}`);
  if (!(fastFlash > 0)) fail("기록보다 빨랐는데 섬광이 없다");
  if (slowFlash !== 0) fail("뒤처졌는데 섬광이 켜졌다 — 부정 피드백은 죽음이 이미 준다");
}

console.log("\n⑤ 스플릿이 기록과 같은 런의 것인가 (오토파일럿 주행)");
{
  let cleared = 0;
  for (const [tier, no] of [[1, 1], [1, 2], [2, 2], [3, 1]] as const) {
    const state = createState(stageConfig(tier, no, { bestProgress: 0 }));
    launch(state);
    let guard = 0;
    while (state.phase === "running" && guard < 200000) {
      // endless-ramp.ts 와 같은 조종 규칙 — 선행 0.14초, 축 합이 작아지는 관을 고른다
      const gate = state.course.pieces.find((p) => p.kind === "gate" && p.endX > state.x)?.gate;
      let lane: "top" | "bot" = "top";
      if (gate) {
        const cost = (tr: { plus: "slope" | "speed" | "bias"; minus: "slope" | "speed" | "bias" }) => {
          const b = { ...state.build };
          b[tr.plus] = Math.min(state.base.axisMax, b[tr.plus] + 1);
          b[tr.minus] = Math.max(state.base.axisMin, b[tr.minus] - 1);
          return Math.abs(b.slope) + Math.abs(b.speed) + Math.abs(b.bias);
        };
        lane = cost(gate.bot) < cost(gate.top) ? "bot" : "top";
      }
      state.holding = state.y - targetY(state, LOOKAHEAD, lane) > 0;
      update(state, DT);
      guard += 1;
    }
    // 통과하지 못해도 "지난 섹터 수 = 스플릿 수" 와 단조성은 언제나 성립해야 한다.
    // 오토파일럿이 모든 스테이지를 깨지는 못한다는 것은 알려진 성질이다(eval.md).
    if (state.splits.length !== state.sectorsPassed) {
      fail(`${tier}:${no}: 지난 섹터 ${state.sectorsPassed}개인데 스플릿이 ${state.splits.length}개다`);
    }
    for (let i = 1; i < state.splits.length; i += 1) {
      if (state.splits[i] <= state.splits[i - 1]) fail(`${tier}:${no}: 스플릿이 증가하지 않는다`);
    }
    if (state.phase !== "cleared") {
      console.log(
        `  ${tier}:${no} 오토파일럿 미통과 (x=${Math.round(state.x)}) — 섹터 ${state.sectorsPassed}개 · 스플릿 ${state.splits.length}개 일치`
      );
      continue;
    }
    cleared += 1;
    const last = state.splits[state.splits.length - 1];
    const gap = Math.abs(last - state.elapsed);
    console.log(
      `  ${tier}:${no} 클리어 ${state.elapsed.toFixed(2)}초 · 스플릿 ${state.splits.length}개 [${state.splits.map((v) => v.toFixed(1)).join(" ")}] · 마지막과 기록 차 ${gap.toFixed(4)}초`
    );
    if (state.splits.length !== 5) fail(`${tier}:${no}: 섹터 5개인데 스플릿이 ${state.splits.length}개다`);
    if (gap > 1e-9) fail(`${tier}:${no}: 마지막 스플릿이 기록 시간과 다르다`);
    for (let i = 1; i < state.splits.length; i += 1) {
      if (state.splits[i] <= state.splits[i - 1]) fail(`${tier}:${no}: 스플릿이 증가하지 않는다`);
    }
  }
  if (cleared === 0) fail("오토파일럿이 한 스테이지도 통과하지 못해 스플릿을 검사할 수 없었다");
}

console.log("\n⑥ 저장 — v2 문자열이 그대로 읽히고 왕복하는가");
{
  const legacy = {
    cores: 300,
    presets: ["neutral", "keen"],
    axisCap: 3,
    fullPool: true,
    clearedStages: ["1:1"],
    bestStageSec: { "1:1": 61.5 },
    bestDistance: 2400,
    attempts: { "1:1": 12 }
  };
  const loaded = importMeta(btoa(unescape(encodeURIComponent(JSON.stringify(legacy)))));
  if (!loaded) {
    fail("옛 진행도 문자열을 읽지 못했다");
  } else {
    const okDefaults =
      JSON.stringify(loaded.bestStageProgress) === "{}" && JSON.stringify(loaded.bestStageSplits) === "{}";
    console.log(
      `  v2 가져오기 — 코어 ${loaded.cores} · 클리어 ${loaded.clearedStages.length} · 새 항목 기본값 ${okDefaults ? "채워짐" : "없음"}`
    );
    if (!okDefaults) fail("추가 항목이 기본값으로 채워지지 않았다");

    const round = importMeta(exportMeta({ ...loaded, bestStageProgress: { "1:2": 0.62 }, bestStageSplits: { "1:1": [1, 2, 3, 4, 5] } }));
    const kept = round?.bestStageProgress["1:2"] === 0.62 && round?.bestStageSplits["1:1"].length === 5;
    console.log(`  내보내기 → 가져오기 왕복 ${kept ? "보존" : "유실"}`);
    if (!kept) fail("새 항목이 내보내기 왕복에서 유실된다");
  }
  if (Object.keys(EMPTY_META.bestStageProgress).length !== 0) fail("EMPTY_META 가 오염되어 있다");
}

console.log("\n⑦ (관찰) 페이스 선을 버린 근거 — 화면에 남는 시간 = 128 / 속도차");
for (const [label, dv] of [["실행 차이 4.5%", 1.9], ["속도 축 한 칸(42→47)", 5], ["두 칸(42→52)", 10]] as const) {
  console.log(`  ${label.padEnd(22)} ${(128 / dv).toFixed(1)}초`);
}
{
  const course = buildStageCourse(1, 1, BASE_TUNING);
  console.log(`  스테이지 길이 ${course.finishX.toFixed(1)}월드 · 기본 속도 42 기준 ${(course.finishX / 42).toFixed(1)}초`);
}

console.log(failures === 0 ? "\n통과" : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
