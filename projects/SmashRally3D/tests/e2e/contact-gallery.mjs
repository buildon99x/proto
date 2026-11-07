export const meta = { viewport: { width: 1280, height: 720 } };
export async function run({ page, sleep, shot, log }) {
  const base = new URL(page.url()).origin,
    reports = [];
  for (const kind of process.env.GALLERY_KIND
    ? [process.env.GALLERY_KIND]
    : ["clear", "drop", "smash", "superSmash", "drive"]) {
    await page.goto(base + "/?review-contact=" + kind);
    await page.waitForFunction(
      () => typeof window.smashDiagnostics === "function",
    );
    await page.select("#difficulty", kind === "drive" ? "NORMAL" : "EASY");
    await page.click('[data-action="start"]');
    let cueBefore = false,
      issued = 0,
      d;
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      d = await page.evaluate(() => window.smashDiagnostics());
      if (d.reviewContact) break;
      const cue = await page.$eval("#timing", (e) => e.textContent || "");
      if (d.phase === "RESULTS") await page.click('[data-action="start"]');
      if (d.phase === "SERVE_READY" && d.server === 0) {
        const p = d.projectedTargets.find(
          (p) => p.world.x === 0 && p.world.z === 5.8,
        ).screen;
        await page.mouse.click(p.x, p.y);
      }
      if (cue.includes("HIT NOW") && !cueBefore) {
        const label = await page.$eval(
          "#basic-label",
          (e) => e.textContent || "",
        );
        let intent =
          kind === "clear"
            ? "clear"
            : kind === "drop"
              ? "drop"
              : kind === "superSmash"
                ? label.includes("SUPER")
                  ? "default"
                  : "clear"
                : kind === "drive"
                  ? ["clear", "drop", "default", "default", "clear", "default"][
                      issued % 6
                    ]
                  : "default";
        const p = d.projectedTargets.find(
          (p) =>
            p.world.x ===
              (kind === "drive" && intent !== "drop"
                ? issued % 2
                  ? -1.8
                  : 1.8
                : 0) && p.world.z === (intent === "drop" ? 1.2 : 5.8),
        ).screen;
        if (intent === "clear") await page.keyboard.down("Shift");
        await page.mouse.click(p.x, p.y, {
          button: intent === "drop" ? "right" : "left",
        });
        await page.keyboard.up("Shift");
        issued++;
      }
      cueBefore = cue.includes("HIT NOW");
      await sleep(20);
    }
    if (!d?.reviewContact)
      throw new Error("No natural " + kind + " contact reached");
    await sleep(100);
    d = await page.evaluate(() => window.smashDiagnostics());
    const h = d.reviewContact,
      r = d.motions[0].racket,
      delta = Math.hypot(
        r.x - h.contact.racket.x,
        r.y - h.contact.racket.y,
        r.z - h.contact.racket.z,
      );
    if (delta > 0.002)
      throw new Error("Rendered racket mismatch " + kind + " " + delta);
    await shot("contact-" + kind);
    reports.push({
      kind,
      issued,
      contact: h.contact,
      renderedRacket: r,
      renderedCenterDelta: delta,
      quality: h.quality,
      velocity: h.velocity,
      audio: d.audioLedger.at(-1),
    });
    log("CONTACT GALLERY", JSON.stringify(reports.at(-1)));
  }
  log(
    "Event-paused closeups after actual UI-triggered collisions. Review mode freezes the real collision snapshot; not counted as normal full-match gameplay.",
    JSON.stringify(reports),
  );
}
