// 브라우저 안에서 도는 오토파일럿. 시나리오 둘이 같은 판단을 쓰게 하는 것이 전부다.
//
// 판단은 앱이 노출한 `window.__wave.targetY` 그대로이고, 검증 스크립트와 같은 구현이라
// 브라우저와 노드가 같은 답을 낸다. **완전한 상태 접근을 가지므로 사람보다 훨씬 잘한다** —
// 따라서 이걸로 통과한다는 것은 통과 가능성의 증명이지 난이도의 검증이 아니다.
//
// ## 두 가지 구동 방식이 필요하다
//
// `autoplay` 는 주행 전체를 `page.evaluate` 하나 안에서 끝내고 결과를 돌려준다 —
// 코스가 통과 가능한지를 묻는 데 맞다. `drive` 는 페이지 안에 루프만 심어 두고 노드가
// 그 사이에 스크린샷을 찍거나 상태를 들여다볼 수 있게 한다 — 장면을 잡는 데 맞다.
// **판단 함수는 하나여야 하므로** 아래 `PILOT_SRC` 를 둘 다 먼저 주입한다.

/*
 * 선행 시간 상수는 여기 없다 — `app/src/game/pilot.ts` 의 `aimLookahead` 가 정한다.
 *
 * 0.7.3 이전에는 이 파일을 포함해 **11개 파일이 `0.14`(초)를 각자 들고** 있었고,
 * 그보다 나쁘게 그 값이 기체마다 다른 뜻이었다 — 조종기가 조준점을 지나치는 양은
 * `수직 속도 × 조준 시간` 이므로, 시간을 고정하면 수직으로 빠른 기체일수록 나쁘게
 * 튜닝된 채로 측정되고 그 핸디캡이 그 기체의 "성격" 으로 보고된다. 실제로 예봉은
 * 솔버가 93~121ms 여유로 통과 가능하다고 한 스테이지 3개를 8경로 전부 실패했다.
 *
 * 지금은 `targetY(lane)` 이 선행을 스스로 정하므로 호출부는 관만 고르면 된다.
 */
/**
 * 페이지 안에 `window.__pilot` 을 세운다.
 *
 * 관 선택이 여기 있는 이유는 `targetY` 가 "어느 관으로 갈지" 를 인자로 받기 때문이다.
 * 무작정 번갈아 고르면 축이 극단으로 밀려 후반 섹터가 막히므로, 빌드를 중립 가까이
 * 유지하는 쪽을 고른다.
 */
const PILOT_SRC = `(() => {
  const w = window;
  /*
    **두 번째 주입은 아무것도 하지 않는다.** 예전 판본은 매번 세우면서 홀드 미러
    (__pilotHold)를 false 로 되돌렸고, 그 순간 엔진의 실제 holding 과 어긋났다.
    그러면 다음 setHold(false) 가 "이미 false" 로 보고 키업을 보내지 않아, 손을
    뗐다고 생각한 채 계속 눌린 런이 남는다 — 오토파일럿을 껐는데 아바타가 천장으로
    올라가 죽는 증상이 정확히 이것이었다.
  */
  if (w.__pilot) return;
  w.__pilot = {
    laneFor(s) {
      const piece = s.course.pieces.find((p) => p.kind === "gate" && p.endX > s.x);
      const gate = piece && piece.gate;
      if (!gate) return "top";
      const cost = (tr) => {
        const b = { ...s.build };
        b[tr.plus] = Math.min(s.base.axisMax, b[tr.plus] + 1);
        b[tr.minus] = Math.max(s.base.axisMin, b[tr.minus] - 1);
        return Math.abs(b.slope) + Math.abs(b.speed) + Math.abs(b.bias);
      };
      return cost(gate.bot) < cost(gate.top) ? "bot" : "top";
    },
    shouldHold(s) {
      return s.y > w.__wave.targetY(w.__pilot.laneFor(s));
    },
    /**
     * 홀드는 **실제 입력 경로로만** 바꾼다. state.holding 을 직접 건드리면 엔진이
     * 사람 손으로는 낼 수 없는 입력을 받게 되고, 그렇게 찍은 장면은 증거가 아니다.
     */
    setHold(v) {
      if (v === w.__pilotHold) return;
      w.__pilot.forceHold(v);
    },
    /** 미러를 믿지 않고 반드시 보낸다. 조종을 놓을 때는 이쪽을 쓴다. */
    forceHold(v) {
      w.__pilotHold = v;
      window.dispatchEvent(
        new KeyboardEvent(v ? "keydown" : "keyup", { code: "Space", bubbles: true, cancelable: true })
      );
    }
  };
  w.__pilotHold = false;
})()`;

export const installPilot = (page) => page.evaluate(PILOT_SRC);

/**
 * 한 주행을 끝까지 자동으로 돌린다. Stage 는 클리어까지, Endless 는 사망까지.
 *
 * 주행 전체가 `page.evaluate` 하나 안에서 도므로 `limitSec` 은 puppeteer 의
 * `protocolTimeout` 보다 작아야 한다 — 같아지면 시나리오가 아니라 **프로토콜이**
 * 먼저 끊긴다. 하네스가 그 값을 600초로 열어 둔다.
 */
export async function autoplay(page, limitSec) {
  await installPilot(page);
  return page.evaluate(
    async ({ limit }) => {
      const w = window.__wave;
      const pilot = window.__pilot;
      if (!w) return { ok: false, why: "debug hook 없음" };

      pilot.forceHold(true);
      await new Promise((r) => setTimeout(r, 50));

      const deadline = Date.now() + limit * 1000;
      let deaths = 0;
      let lastPhase = "ready";

      while (Date.now() < deadline) {
        const s = w.state;
        if (!s) break;
        if (s.phase === "cleared") {
          pilot.forceHold(false);
          return { ok: true, deaths, sec: s.elapsed, gates: s.gatesPassed, build: { ...s.build } };
        }
        if (s.phase === "dead") {
          if (lastPhase !== "dead") deaths += 1;
          if (s.mode === "endless") {
            pilot.forceHold(false);
            return { ok: true, endlessOver: true, deaths, distance: s.x, gates: s.gatesPassed };
          }
        }
        lastPhase = s.phase;
        if (s.phase === "running") pilot.setHold(pilot.shouldHold(s));
        await new Promise((r) => requestAnimationFrame(r));
      }

      pilot.forceHold(false);
      return { ok: false, why: "timeout", deaths, x: w.state ? w.state.x : 0 };
    },
    { limit: limitSec }
  );
}

/**
 * 페이지 안에 조종 루프만 심는다(또는 끈다). 노드는 그 사이에 자유롭게 찍는다.
 *
 * `autoplay` 와 달리 제어가 곧바로 노드로 돌아오므로, "지금 이 순간" 을 잡아야 하는
 * 장면 캡처에 쓴다.
 */
export async function drive(page, on) {
  // 주입은 멱등이고 싸다. 런이 새로 만들어져도 같은 판단이 다시 선다.
  await installPilot(page);
  await page.evaluate(
    ({ on }) => {
      const w = window;
      if (w.__driveRaf) {
        cancelAnimationFrame(w.__driveRaf);
        w.__driveRaf = 0;
      }
      if (!on) {
        // 조종을 놓을 때는 미러를 믿지 않는다 — 눌린 채로 남으면 그 런은 반드시 죽는다.
        w.__pilot.forceHold(false);
        return;
      }
      const tick = () => {
        w.__driveRaf = requestAnimationFrame(tick);
        const s = w.__wave && w.__wave.state;
        if (!s || s.phase !== "running") return;
        w.__pilot.setHold(w.__pilot.shouldHold(s));
      };
      w.__driveRaf = requestAnimationFrame(tick);
    },
    { on }
  );
}

/** 엔진이 보는 상태의 얇은 요약. 시나리오가 "언제 찍을지" 를 정하는 데 쓴다. */
export const snapshot = (page) =>
  page.evaluate(() => {
    const s = window.__wave && window.__wave.state;
    if (!s) return { screen: (document.querySelector(".panel h1") || {}).textContent || "?" };
    const g = s.course.pieces.find((p) => p.kind === "gate" && p.gate && s.x < p.gate.endX);
    return {
      phase: s.phase,
      x: Math.round(s.x),
      gates: s.gatesPassed,
      leadIn: Boolean(g && s.x >= g.gate.leadInX && s.x < g.gate.startX)
    };
  });

/** 조건이 참이 될 때까지 기다린다. 시간으로 찍으면 프레임이 통째로 어긋난다. */
export async function until(page, pred, ms = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (pred(await snapshot(page))) return true;
    await new Promise((r) => setTimeout(r, 60));
  }
  return false;
}
