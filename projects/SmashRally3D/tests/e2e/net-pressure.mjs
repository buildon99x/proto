export const meta = { viewport: { width: 1280, height: 720 } };
export async function run({ page, sleep, shot, log }) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  const read = () => page.evaluate(() => window.smashDiagnostics());
  for (const strategy of ["soft", "pressure", "alternate"]) {
    if ((await read()).phase === "RESULTS")
      await page.click('[data-action="menu"]');
    await page.select("#difficulty", "NORMAL");
    await page.click('[data-action="start"]');
    let previous = false,
      issued = 0,
      lastCount = 0;
    const observations = [];
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      const d = await read(),
        cue = await page.$eval("#timing", (e) => e.textContent || "");
      if (d.phase === "RESULTS") break;
      if (d.phase === "SERVE_READY" && d.server === 0) {
        const p = d.projectedTargets.find(
          (p) => p.world.x === 0 && p.world.z === 5.8,
        ).screen;
        await page.mouse.click(p.x, p.y);
      }
      if (cue.includes("HIT NOW") && !previous) {
        const intent =
          strategy === "soft"
            ? "drop"
            : strategy === "pressure"
              ? cue.includes("NET FINISH")
                ? "default"
                : "drop"
              : issued % 3 === 0
                ? "clear"
                : "drop";
        const p = d.projectedTargets.find(
          (p) =>
            p.world.x === (issued % 2 ? -1.8 : 1.8) &&
            p.world.z === (intent === "clear" ? 5.8 : 1.2),
        ).screen;
        if (intent === "clear") await page.keyboard.down("Shift");
        await page.mouse.click(p.x, p.y, {
          button: intent === "drop" ? "right" : "left",
        });
        await page.keyboard.up("Shift");
        issued++;
      }
      previous = cue.includes("HIT NOW");
      if (d.shots.length > lastCount) {
        for (const h of d.shots.slice(lastCount)) {
          observations.push({
            hit: h,
            actors: d.actors,
            points: d.points.at(-1),
          });
          if (h.actor === 0 && ["net", "netKill"].includes(h.technique))
            await shot(
              "net-" + strategy + "-" + h.technique + "-" + d.shots.length,
            );
        }
        lastCount = d.shots.length;
      }
      await sleep(20);
    }
    const d = await read();
    log(
      "NET STRATEGY",
      JSON.stringify({
        strategy,
        issued,
        phase: d.phase,
        scores: d.scores,
        observations,
        points: d.points,
      }),
    );
    await shot("net-" + strategy + "-results");
    if (d.phase !== "RESULTS") throw Error("incomplete");
  }
}
