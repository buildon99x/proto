export const meta = {
  viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
};
export async function run({ page, sleep, shot, log }) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
    { timeout: 30000 },
  );
  const read = () => page.evaluate(() => window.smashDiagnostics());
  await shot("01-menu");
  await page.select("#difficulty", "EASY");
  await page.click('[data-action="start"]');
  await sleep(1500);
  let d = await read();
  await shot("02-serve-ready");
  const pt = d.projectedTargets.find(
    (p) => p.world.x === 0 && p.world.z === 5.8,
  ).screen;
  await page.mouse.click(pt.x, pt.y);
  let lastContact = -1,
    longest = 0,
    captured = false;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    d = await read();
    if (d.phase === "RESULTS") break;
    if (d.phase === "SERVE_READY" && d.server === 0)
      await page.mouse.click(pt.x, pt.y);
    if (
      d.phase === "RALLY" &&
      d.receiver === 0 &&
      d.contactAt - d.time <= 0.23 &&
      d.contactAt - d.time > 0.08 &&
      d.contactAt !== lastContact
    ) {
      lastContact = d.contactAt;
      const to = d.projectedTargets.find(
        (p) =>
          p.world.x === (d.returns < 4 ? 0 : d.shots.length % 2 ? -1.8 : 1.8) &&
          p.world.z === 5.8,
      ).screen;
      if (d.returns < 4) await page.keyboard.down("Shift");
      await page.mouse.click(to.x, to.y);
      await page.keyboard.up("Shift");
    }
    longest = Math.max(longest, d.returns);
    if (d.returns >= 3 && !captured) {
      captured = true;
      await shot("03-three-return-rally");
    }
    await sleep(25);
  }
  if (d.phase !== "RESULTS") throw new Error("Match did not reach results");
  if (longest < 3) throw new Error("No normal UI rally reached 3 returns");
  await shot("04-results");
  log(
    "UI match",
    JSON.stringify({
      score: d.scores,
      longest,
      points: d.points,
      shots: d.shots.map((h) => h.shot),
      audioEvents: d.audioEvents,
    }),
  );
  await page.click('[data-action="start"]');
  await page.waitForFunction(
    () => window.smashDiagnostics().phase === "SERVE_READY",
    { timeout: 15000 },
  );
  d = await read();
  if (d.phase !== "SERVE_READY") throw new Error("Rematch failed");
  await shot("05-rematch");
  await page.keyboard.press("Escape");
  d = await read();
  const pausedAt = d.time;
  await sleep(250);
  if ((await read()).time !== pausedAt)
    throw new Error("Pause advanced game clock");
  await shot("06-paused");
  await page.click('[data-action="resume"]');
  await page.setViewport({
    width: 844,
    height: 390,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await sleep(300);
  await shot("07-mobile-landscape");
  d = await read();
  const mobile = d.projectedTargets.find(
    (p) => p.world.x === 0 && p.world.z === 5.8,
  ).screen;
  await page.touchscreen.tap(mobile.x, mobile.y);
  await sleep(700);
  await shot("08-mobile-rally");
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await sleep(200);
  await shot("09-mobile-portrait");
  log(
    "Read-only diagnostics; all match actions used real mouse/touch UI. No injected game state. Physical audio/touch latency unverified.",
  );
}
