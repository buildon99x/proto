export const meta = {
  viewport: { width: 960, height: 540, deviceScaleFactor: 1 },
};
export async function run({ page, sleep, shot, log }) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  const read = () => page.evaluate(() => window.smashDiagnostics());
  await page.select("#difficulty", "NORMAL");
  await page.click('[data-action="start"]');
  let d,
    last = -1,
    playerShots = 0;
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    d = await read();
    if (d.phase === "RESULTS") break;
    if (d.phase === "SERVE_READY" && d.server === 0) {
      const p = d.projectedTargets.find(
        (p) => p.world.x === 0 && p.world.z === 5.8,
      ).screen;
      await page.mouse.click(p.x, p.y);
    }
    if (
      d.phase === "RALLY" &&
      d.receiver === 0 &&
      d.contactAt - d.time < 0.23 &&
      d.contactAt - d.time > 0.08 &&
      d.contactAt !== last
    ) {
      last = d.contactAt;
      const intent = ["clear", "drop", "default", "default"][playerShots % 4],
        p = d.projectedTargets.find(
          (p) =>
            p.world.x === (playerShots % 2 ? -1.8 : 1.8) &&
            p.world.z === (intent === "drop" ? 1.2 : 5.8),
        ).screen;
      if (intent === "clear") await page.keyboard.down("Shift");
      await page.mouse.click(p.x, p.y, {
        button: intent === "drop" ? "right" : "left",
      });
      await page.keyboard.up("Shift");
      playerShots++;
    }
    await sleep(25);
  }
  if (d.phase !== "RESULTS") throw new Error("Tactical UI match unfinished");
  await shot("tactics-normal-results");
  log(
    "Normal difficulty UI tactical match",
    JSON.stringify({
      scores: d.scores,
      shots: d.shots.map((h) => ({
        actor: h.actor,
        shot: h.shot,
        target: h.target,
        quality: h.quality,
        velocity: h.velocity,
      })),
      points: d.points,
    }),
  );
  const kinds = new Set(d.shots.map((h) => h.shot));
  if (!kinds.has("drop") || !kinds.has("clear"))
    throw new Error("Tactical inputs did not produce clear/drop");
}
