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


/**
 * 한 번의 오토파일럿 주행 상한(초).
 *
 * 주행 전체가 `page.evaluate` 하나 안에서 돌기 때문에 이 값은 puppeteer 의
 * `protocolTimeout` 보다 작아야 한다 — 같아지면 시나리오가 아니라 **프로토콜이**
 * 먼저 끊긴다. 하네스가 그 값을 600초로 열어 두므로 여기서 자유롭게 정한다.
 *
 * Stage 는 사망하면 처음부터 다시 시작하므로 상한은 **한 주행이 아니라 몇 번의
 * 재시도**를 담을 수 있어야 한다. 한 바퀴가 약 70초이니 240초면 세 번이다.
 */
const RUN_LIMIT_SEC = 240;

async function autoplay(page, limitSec) {
  return page.evaluate(
    async ({ limit }) => {
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
        if (s.phase === "running") setHold(s.y > w.targetY(laneFor(s)));
        await new Promise((r) => requestAnimationFrame(r));
      }

      setHold(false);
      return { ok: false, why: "timeout", deaths, x: w.state ? w.state.x : 0 };
    },
    { limit: limitSec }
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

  // 주행 중 화면을 한 장 남긴다. 오토파일럿은 페이지 안에서 도는 promise 이므로
  // 기다리지 않고 그 사이에 찍으면 **달리는 중**이 그대로 잡힌다.
  const stageRun = autoplay(page, RUN_LIMIT_SEC);
  await sleep(6000);
  await shot("03b-stage-running");
  const stage = await stageRun;
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
  const endless = await autoplay(page, RUN_LIMIT_SEC);
  log("endless:", JSON.stringify(endless));
  if (!endless.ok) throw new Error(`Endless 런이 끝나지 않았다: ${JSON.stringify(endless)}`);
  await sleep(400);
  await shot("06-endless-result");

  // 두 번째 Endless 런 — 최고 거리가 생긴 뒤라 진행 레일에 기록 눈금이 그어진다.
  // 사망 후 0.6초가 지나야 재시작 입력을 받으므로 먼저 그 문턱을 넘긴다.
  await sleep(900);
  await page.keyboard.press("Space");
  await sleep(200);
  const secondRun = autoplay(page, 30);
  await sleep(7000);
  await shot("06b-endless-running");
  // 이 런은 스크린샷용이다 — 상한에서 끊겨도(ok:false) 실패가 아니다.
  log("endless(2nd, 스크린샷용):", JSON.stringify(await secondRun));

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
