export const meta = {
  viewport: {
    width: 844,
    height: 390,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
};
export async function run({ page, sleep, shot, log }) {
  const read = () => page.evaluate(() => window.smashDiagnostics());
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  await page.select("#difficulty", "EASY");
  await page.click('[data-action="start"]');
  await page.waitForFunction(
    () => window.smashDiagnostics().phase === "SERVE_READY",
    { timeout: 15000 },
  );
  await shot("mobile-01-ready");
  let d = await read(),
    t = d.projectedTargets.find(
      (p) => p.world.x === 0 && p.world.z === 5.8,
    ).screen;
  await page.touchscreen.tap(t.x, t.y);
  await page.waitForFunction(
    () => window.smashDiagnostics().phase === "RALLY",
    { timeout: 10000 },
  );
  await shot("mobile-02-tap-serve");
  const client = await page.createCDPSession();
  const results = [];
  for (const [intent, dy] of [
    ["clear", -30],
    ["drop", 30],
  ]) {
    await page.waitForFunction(
      () => {
        const d = window.smashDiagnostics();
        return (
          d.phase === "RALLY" &&
          d.receiver === 0 &&
          d.contactAt - d.time < 0.44 &&
          d.contactAt - d.time > 0.28
        );
      },
      { timeout: 30000, polling: "raf" },
    );
    d = await read();
    const p = d.projectedTargets.find(
      (p) => p.world.x === 0 && p.world.z === 5.8,
    ).screen;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: p.x, y: p.y, id: 1 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: p.x, y: p.y + dy, id: 1 }],
    });
    await page
      .waitForFunction(
        (intent) => window.smashDiagnostics().lastInput?.shotIntent === intent,
        { timeout: 5000, polling: "raf" },
        intent,
      )
      .catch(async () => {
        throw new Error("Swipe command absent " + JSON.stringify(await read()));
      });
    const beforeUp = await read();
    const fixedTarget = { ...beforeUp.lastInput.target };
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    const afterUp = await read();
    if (
      afterUp.lastInput &&
      JSON.stringify(afterUp.lastInput.target) !== JSON.stringify(fixedTarget)
    )
      throw new Error("Target moved from gesture start");
    results.push({ intent, issuedBeforePointerUp: true, target: fixedTarget });
    await shot("mobile-03-" + intent + "-threshold");
    await page.waitForFunction(
      (n) => window.smashDiagnostics().shots.length > n,
      { timeout: 15000 },
      d.shots.length,
    );
  }
  await page.keyboard.press("Escape");
  const paused = (await read()).time;
  await sleep(300);
  if ((await read()).time !== paused)
    throw new Error("Mobile pause clock changed");
  await shot("mobile-04-pause");
  await page.click('[data-action="resume"]');
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await sleep(250);
  await shot("mobile-05-portrait");
  log("Real CDP touch UI verification", JSON.stringify(results));
  log(
    "No physical device, Safari, speaker listening or physical touch-latency verification.",
  );
}
