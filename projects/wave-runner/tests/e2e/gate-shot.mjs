// 게이트의 교환 표시만 본다. "무엇과 무엇을 바꿨는지 글자 없이 아는가"가 질문이다.
export const meta = { viewport: { width: 390, height: 720, deviceScaleFactor: 2 } };

async function driveTo(page, untilX) {
  return page.evaluate(async (untilX) => {
    const w = window.__wave;
    let holding = false;
    const setHold = (v) => {
      if (v === holding) return;
      holding = v;
      window.dispatchEvent(new KeyboardEvent(v ? "keydown" : "keyup", { code: "Space", bubbles: true }));
    };
    setHold(true);
    await new Promise((r) => setTimeout(r, 50));
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      const s = w.state;
      if (!s) break;
      if (s.phase === "running" && s.x >= untilX) {
        return { ok: true, x: s.x, build: { ...s.build }, gates: s.gatesPassed, lane: s.lane };
      }
      if (s.phase === "running") setHold(s.y > w.targetY("top"));
      await new Promise((r) => requestAnimationFrame(r));
    }
    return { ok: false };
  }, untilX);
}

export async function run({ page, sleep, shot, log }) {
  await sleep(400);
  const modes = await page.$$(".mode");
  await modes[0].click();
  await sleep(250);
  const cells = await page.$$(".stage-cell");
  await cells[0].click();
  await sleep(300);

  for (const [name, x] of [["20-gate-leadin", 470], ["21-gate-marks", 512], ["22-gate-split", 545], ["23-gate-after", 610]]) {
    const r = await driveTo(page, x);
    log(`${name}:`, JSON.stringify(r));
    await shot(name);
  }

  // 사망 프레임 — 무엇에 맞았고 어디로 갈 수 있었는지가 한 화면에 있는가
  await page.evaluate(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const s = window.__wave.state;
      if (s && s.phase === "dead") return;
      await new Promise((r) => requestAnimationFrame(r));
    }
  });
  await shot("24-death");
}
