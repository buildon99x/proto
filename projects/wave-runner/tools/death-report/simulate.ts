/**
 * 분석기를 돌려보기 위한 **합성** 데이터셋.
 *
 * 사람 데이터가 모이기 전에 파이프의 뒷단을 검증할 방법이 필요하다. 오토파일럿에
 * 서로 다른 반응 지연을 주어 "실력이 다른 가상의 플레이어"를 만들고, 실제 엔진으로
 * 주행시켜 **진짜 이벤트 빌더**(`app/src/game/telemetry.ts`)로 이벤트를 뽑는다.
 * 그래서 스키마도 좌표도 실제 수집본과 같은 모양이다.
 *
 * **이것은 사람 데이터가 아니다.** 오토파일럿은 통로 중앙이 아니라 빈 틈을 향하고
 * 시야가 완벽하므로, 사람이 어디서 죽는지를 말해 주지 않는다. 난이도 판정에 쓰면
 * 안 되고, 분석기가 돌아가는지만 본다. 보고서도 합성본임을 표시한다.
 *
 * 실행: pnpm exec tsx projects/wave-runner/tools/death-report/simulate.ts <출력.ndjson> [인원]
 */
import { writeFileSync } from "node:fs";
import { NEUTRAL_BUILD } from "../../app/src/game/axes";
import { createState, launch, startYFor, update } from "../../app/src/game/engine";
import type { GameState } from "../../app/src/game/engine";
import { MAX_TIER, STAGES_PER_TIER } from "../../app/src/game/meta";
import { targetY } from "../../app/src/game/pilot";
import { mulberry32 } from "../../app/src/game/rand";
import { buildDeathEvent, buildEndEvent, setTelemetryFps } from "../../app/src/game/telemetry";

const DT = 1 / 120;
/** 한 스테이지에서 이만큼 죽으면 그만둔다 — 이탈이 생겨야 표 D 가 의미를 가진다 */
const PATIENCE = 14;

const out = process.argv[2];
const players = Number(process.argv[3] ?? 14);
if (!out) throw new Error("사용법: tsx simulate.ts <출력.ndjson> [인원]");

const uuid = (n: number, tag: string) => `${tag}-${n.toString(36).padStart(6, "0")}`;
const rows: string[] = [];
let clock = Date.UTC(2026, 8, 16, 9, 0, 0);

function emit(state: GameState, kind: "death" | "clear" | "abort", iid: string, sid: string, fp: string): void {
  const event = kind === "death" ? buildDeathEvent(state) : buildEndEvent(state, kind);
  clock += Math.round(state.elapsed * 1000) + 700;
  rows.push(JSON.stringify({ ...event, ts: clock, iid, sid, fp }));
}

/** 한 주행. 지연을 준 오토파일럿이 통로를 따라가고, 게이트 선택은 플레이어마다 다르다 */
function play(
  tier: number,
  no: number,
  cap: number,
  latency: number,
  rand: () => number,
  attempts: number
): GameState {
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
  state.attempts = attempts;
  launch(state);

  const history: number[] = [];
  const delay = Math.max(0, Math.round(latency / DT));
  // 플레이어마다 고정된 관 선호. 같은 사람이 같은 스테이지를 다시 풀 때 비슷한 선택을
  // 하도록 해야 표 C(경로별 사망률)가 경로를 실제로 가른다.
  const bias = rand();

  for (let t = 0; t < 200; t += DT) {
    const gate = state.course.pieces.find((p) => p.kind === "gate" && p.endX > state.x)?.gate;
    const lane: "top" | "bot" = gate && ((gate.seed % 1000) / 1000 + bias) % 1 > 0.5 ? "bot" : "top";
    history.push(state.y - targetY(state, lane));
    const seen = history.length > delay ? history[history.length - 1 - delay] : history[0];
    state.holding = seen > 0;
    const r = update(state, DT);
    if (r.event === "died" || r.event === "cleared") return state;
  }
  return state;
}

for (let p = 0; p < players; p += 1) {
  const rand = mulberry32(0xc0ffee + p * 7919);
  // 18ms(능숙) ~ 110ms(서툼). 프로브가 재는 "실패하기 시작하는 반응 지연"과 같은 축이다.
  // 오토파일럿은 시야가 완벽해 사람보다 훨씬 강하므로, 사람의 지연 범위를 그대로
  // 주면 전원이 티어 1 에서 막혀 표본이 한 자리에 뭉친다.
  const latency = 0.018 + (p / Math.max(1, players - 1)) * 0.092;
  const iid = uuid(p, "iid");
  const sid = uuid(p, "sid");
  const fp = "synthetic";
  // 앞 티어를 두 개 클리어해야 다음이 열린다 — 해금 순서를 그대로 흉내 낸다.
  let cap = 2;
  let clearedInTier = 0;

  outer: for (let tier = 1; tier <= MAX_TIER; tier += 1) {
    clearedInTier = 0;
    for (let no = 1; no <= STAGES_PER_TIER; no += 1) {
      let attempts = 0;
      let cleared = false;
      while (attempts < PATIENCE && !cleared) {
        attempts += 1;
        setTelemetryFps(58 + rand() * 4);
        const state = play(tier, no, cap, latency, rand, attempts);
        if (state.phase === "cleared") {
          emit(state, "clear", iid, sid, fp);
          cleared = true;
          clearedInTier += 1;
        } else if (state.phase === "dead") {
          emit(state, "death", iid, sid, fp);
        } else {
          emit(state, "abort", iid, sid, fp);
          break;
        }
      }
      if (!cleared) {
        // 인내심이 다했다. Stage 는 사망 0.5초 뒤 스스로 재시작하므로, 그만두는
        // 사람은 **다시 시작된 주행 도중에** 나간다 — 이탈은 언제나 x 가 작다.
        // "몇 번째 시도에서 떠났는가"가 중단 판정의 지표다.
        const leaving = createState({
          mode: "stage",
          tier,
          stageNo: no,
          seed: 0,
          startBuild: { ...NEUTRAL_BUILD },
          presetId: "neutral",
          axisCap: cap,
          maxSectorDifficulty: 3
        });
        leaving.y = startYFor(leaving.course);
        leaving.attempts = attempts + 1;
        launch(leaving);
        for (let t = 0; t < 0.4 + rand() * 1.5; t += DT) {
          leaving.holding = leaving.y > 50;
          if (update(leaving, DT).event !== "none") break;
        }
        emit(leaving, "abort", iid, sid, fp);
        break outer;
      }
      // 클리어가 쌓이면 축 상한을 해금했다고 본다.
      if (tier >= 2 && cap === 2 && rand() < 0.5) cap = 3;
    }
    if (clearedInTier < STAGES_PER_TIER - 1) break;
  }
}

writeFileSync(out, `${rows.join("\n")}\n`);
console.log(`${out} ← 가상 플레이어 ${players}명 · 이벤트 ${rows.length}건 (합성. 사람 데이터가 아니다)`);
