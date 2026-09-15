// Wave Runner 자동 플레이테스트.
//
// 목적은 "사람처럼 잘 하기"가 아니라 **코스가 실제로 통과 가능한가**의 기계적 확인이다.
// 오토파일럿은 앱이 노출한 window.__wave.targetY 를 그대로 쓴다 — 검증 스크립트와
// 같은 구현이므로 브라우저와 노드에서 같은 판단을 한다.
//
// 완전한 상태 접근을 가지므로 사람보다 훨씬 잘한다. 따라서 이 시나리오가 통과한다는
// 것은 **통과 가능성의 증명이지 난이도의 검증이 아니다.**

export const meta = {
  viewport: { width: 390, height: 720, deviceScaleFactor: 2 }
};

const LOOKAHEAD = 0.14;

async function autoplay(page, limitSec) {
  return page.evaluate(
    async ({ lookahead, limit }) => {
      const w = window.__wave;
      if (!w) return { ok: false, why: "debug hook 없음" };

      let holding = false;
      const setHold = (v) => {
        if (v === holding) return;
        holding = v;
        window.dispatchEvent(
          new KeyboardEvent(v ? "keydown" : "keyup", { code: "Space", bubbles: true, cancelable: true })
        );
      };

      // 빌드를 중립 가까이 유지하는 관을 고른다. 무작정 번갈아 고르면
      // 축이 극단으로 밀려 후반 섹터가 막힌다.
      const laneFor = (s) => {
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
      };

      setHold(true);
      await new Promise((r) => setTimeout(r, 50));

      const deadline = Date.now() + limit * 1000;
      let deaths = 0;
      let lastPhase = "ready";

      while (Date.now() < deadline) {
        const s = w.state;
        if (!s) break;
        if (s.phase === "cleared") {
          setHold(false);
          return { ok: true, deaths, sec: s.elapsed, gates: s.gatesPassed, build: { ...s.build } };
        }
        if (s.phase === "dead") {
          if (lastPhase !== "dead") deaths += 1;
          if (s.mode === "endless") {
            setHold(false);
            return { ok: true, endlessOver: true, deaths, distance: s.x, gates: s.gatesPassed };
          }
        }
        lastPhase = s.phase;
        if (s.phase === "running") setHold(s.y > w.targetY(lookahead, laneFor(s)));
        await new Promise((r) => requestAnimationFrame(r));
      }

      setHold(false);
      return { ok: false, why: "timeout", deaths, x: w.state ? w.state.x : 0 };
    },
    { lookahead: LOOKAHEAD, limit: limitSec }
  );
}

export async function run({ page, sleep, shot, log }) {
  await sleep(400);
  await shot("01-home");

  // Stage — 티어 1 첫 스테이지
  const modes = await page.$$(".mode");
  if (modes.length < 2) throw new Error("모드 버튼을 찾지 못했다");
  await modes[0].click();
  await sleep(250);
  await shot("02-tiers");

  const cells = await page.$$(".stage-cell");
  if (cells.length === 0) throw new Error("스테이지 셀을 찾지 못했다");
  await cells[0].click();
  await sleep(300);
  await shot("03-ready");

  const stage = await autoplay(page, 150);
  log("stage:", JSON.stringify(stage));
  if (!stage.ok) throw new Error(`Stage 통과 실패: ${JSON.stringify(stage)}`);
  if (!stage.gates) throw new Error("게이트를 하나도 통과하지 않았다 — 교환이 적용되지 않는다");
  await sleep(400);
  await shot("04-clear");

  await page.keyboard.press("Escape");
  await sleep(300);
  await shot("05-home-unlocked");

  // Endless — Stage 클리어로 해금되어야 한다
  const modes2 = await page.$$(".mode");
  const locked = await page.evaluate((el) => el.disabled, modes2[1]);
  if (locked) throw new Error("Stage 를 클리어했는데 Endless 가 열리지 않았다");
  await modes2[1].click();
  await sleep(300);
  const endless = await autoplay(page, 180);
  log("endless:", JSON.stringify(endless));
  if (!endless.ok) throw new Error(`Endless 런이 끝나지 않았다: ${JSON.stringify(endless)}`);
  await sleep(400);
  await shot("06-endless-result");

  await page.keyboard.press("Escape");
  await sleep(300);

  // 해금 화면
  const links = await page.$$(".link");
  if (links.length > 0) {
    await links[links.length - 1].click();
    await sleep(250);
    await shot("08-shop");
  }

  log("ok");
}
