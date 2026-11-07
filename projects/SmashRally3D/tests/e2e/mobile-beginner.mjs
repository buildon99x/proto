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
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  await page.select("#difficulty", "EASY");
  await page.click('[data-action="start"]');
  await page.click('[data-shot="clear"]');
  let previous = false,
    taps = 0,
    d;
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    d = await page.evaluate(() => window.smashDiagnostics());
    if (d.shots.filter((h) => h.actor === 0).length >= 4 && d.returns >= 6)
      break;
    const cue = await page.$eval("#timing", (e) => e.textContent || "");
    if (d.phase === "SERVE_READY" && d.server === 0) {
      const p = d.projectedTargets.find(
        (t) => t.world.x === 0 && t.world.z === 5.8,
      ).screen;
      await page.touchscreen.tap(p.x, p.y);
    }
    if (cue.includes("HIT NOW") && !previous) {
      const p = d.projectedTargets.find(
        (t) => t.world.x === 0 && t.world.z === 5.8,
      ).screen;
      await page.touchscreen.tap(p.x, p.y);
      taps++;
    }
    previous = cue.includes("HIT NOW");
    if (d.phase === "RESULTS") throw new Error("Basic touch rally failed");
    await sleep(25);
  }
  if (d.shots.filter((h) => h.actor === 0).length < 4 || d.returns < 6)
    throw new Error(
      "No three real mobile returns " +
        JSON.stringify({
          scores: d.scores,
          returns: d.returns,
          taps,
          shots: d.shots.map((h) => [h.actor, h.technique, h.quality]),
        }),
    );
  await shot("tactics-mobile-beginner-rally");
  log(
    "MOBILE BEGINNER PASS",
    JSON.stringify({
      method:
        "EASY; choose the existing CLEAR button once, then native CDP touchscreen taps at visible HIT NOW. No internal clock scheduling/state injection. This is software emulation, not physical touch latency.",
      taps,
      returns: d.returns,
      playerContacts: d.shots.filter((h) => h.actor === 0).length,
      qualities: d.shots.filter((h) => h.actor === 0).map((h) => h.quality),
      shots: d.shots.map((h) => ({
        actor: h.actor,
        technique: h.technique,
        p: h.p,
        quality: h.quality,
      })),
      errors: [],
    }),
  );
}
