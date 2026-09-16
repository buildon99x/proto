// 런 안에서 기체가 구분되는가. 도형에 게인을 걸지 않고 **실제 궤적 길이**만으로
// 홈 화면 미리보기와 같은 판별력이 나오는지 본다. 네 기체를 같은 x 에서 멈춰 찍는다.
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
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const s = w.state;
      if (!s) break;
      if (s.phase === "running" && s.x >= untilX) {
        setHold(false);
        return { ok: true, x: s.x, build: { ...s.build } };
      }
      if (s.phase === "running") setHold(s.y > w.targetY(0.14, "top"));
      await new Promise((r) => requestAnimationFrame(r));
    }
    return { ok: false };
  }, untilX);
}

export async function run({ page, sleep, shot, log }) {
  await sleep(400);
  for (let i = 0; i < 4; i += 1) {
    const chips = await page.$$(".chip.runner");
    const name = await page.evaluate((el) => el.querySelector("strong").textContent, chips[i]);
    await chips[i].click();
    await sleep(200);
    const modes = await page.$$(".mode");
    await modes[0].click();
    await sleep(250);
    const cells = await page.$$(".stage-cell");
    await cells[0].click();
    await sleep(300);
    const r = await driveTo(page, 300);
    log(`mid ${name}:`, JSON.stringify(r));
    await shot(`40-mid-${i}-${name}`);
    const exit = await page.$(".exit-btn");
    await exit.click();
    await sleep(250);
    const back = await page.$(".link.back");
    if (back) await back.click();
    await sleep(250);
  }
}
