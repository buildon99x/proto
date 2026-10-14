export const meta = {
  viewport: { width: 960, height: 540, deviceScaleFactor: 1 },
};
export async function run({ page, sleep, shot, log }) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  const read = () => page.evaluate(() => window.smashDiagnostics());
  await page.click('[data-action="settings"]');
  await page.select("#quality", "LOW");
  await page.click('[data-action="close"]');
  await page.select("#difficulty", "EASY");
  const results = [];
  for (let m = 0; m < 10; m++) {
    await page.click('[data-action="start"]');
    await page.waitForFunction(
      () => window.smashDiagnostics().phase === "SERVE_READY",
      { timeout: 15000 },
    );
    let d = await read();
    const to = d.projectedTargets.find(
      (p) => p.world.x === 0 && p.world.z === 5.8,
    ).screen;
    await page.mouse.click(to.x, to.y);
    const deadline = Date.now() + 90000;
    let last = -1;
    while (Date.now() < deadline) {
      d = await read();
      if (d.phase === "RESULTS") break;
      if (d.phase === "SERVE_READY" && d.server === 0)
        await page.mouse.click(to.x, to.y);
      if (
        m === 0 &&
        d.phase === "RALLY" &&
        d.receiver === 0 &&
        d.returns < 3 &&
        d.contactAt - d.time < 0.23 &&
        d.contactAt - d.time > 0.08 &&
        d.contactAt !== last
      ) {
        last = d.contactAt;
        await page.keyboard.down("Shift");
        await page.mouse.click(to.x, to.y);
        await page.keyboard.up("Shift");
      }
      await sleep(35);
    }
    if (d.phase !== "RESULTS" || Math.max(...d.scores) !== 5)
      throw new Error("Endurance match " + m + " did not finish");
    results.push({
      match: m + 1,
      scores: d.scores,
      shots: d.shots.length,
      longest: Math.max(...d.points.map((p) => p.returns)),
      fps: d.fps,
      heap: d.heapBytes,
    });
    log("ENDURANCE", JSON.stringify(results.at(-1)));
    if (m === 0 || m === 9) await shot("endurance-" + (m + 1) + "-results");
  }
  log(
    "10 consecutive real UI matches, deliberately omitted returns after initial rallies to exercise natural losses, not state injection.",
    JSON.stringify(results),
  );
}
