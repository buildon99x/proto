export const meta = { viewport: { width: 1280, height: 720 } };
export async function run({ page, sleep, shot, log }) {
  const base = new URL(page.url()).origin;
  for (const kind of ["lift", "block"]) {
    await page.goto(base + "/?review-contact=" + kind);
    await page.waitForFunction(
      () => typeof window.smashDiagnostics === "function",
    );
    await page.select("#difficulty", "NORMAL");
    await page.click('[data-action="start"]');
    let previous = false,
      d;
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      d = await page.evaluate(() => window.smashDiagnostics());
      if (d.reviewContact) break;
      const cue = await page.$eval("#timing", (e) => e.textContent || "");
      if (d.phase === "RESULTS") await page.click('[data-action="start"]');
      if (d.phase === "SERVE_READY" && d.server === 0) {
        const p = d.projectedTargets.find(
          (t) => t.world.x === 0 && t.world.z === 5.8,
        ).screen;
        await page.mouse.click(p.x, p.y);
      }
      if (cue.includes("HIT NOW") && !previous) {
        const p = d.projectedTargets.find(
          (t) =>
            t.world.x === 0 && t.world.z === (kind === "block" ? 1.2 : 5.8),
        ).screen;
        if (kind === "lift") await page.keyboard.down("Shift");
        await page.mouse.click(p.x, p.y, {
          button: kind === "block" ? "right" : "left",
        });
        await page.keyboard.up("Shift");
      }
      previous = cue.includes("HIT NOW");
      await sleep(25);
    }
    if (!d?.reviewContact) throw new Error("No actual UI " + kind + " reached");
    await sleep(80);
    d = await page.evaluate(() => window.smashDiagnostics());
    const h = d.reviewContact;
    await shot("tactics-contact-" + kind);
    log(
      "TECHNIQUE CONTACT",
      JSON.stringify({
        kind,
        hit: h,
        rendered: d.renderedContact,
        audio: d.audioLedger.at(-1),
      }),
    );
  }
  log(
    "Inspection snapshots only after actual normal UI collisions; no game state injection. Not uninterrupted match or audible output evidence.",
  );
}
