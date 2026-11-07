export const meta = {
  viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
};
export async function run({ page, sleep, shot, log }) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  const read = () => page.evaluate(() => window.smashDiagnostics());
  const results = [],
    kinds = new Set(),
    lastFeet = new Map();
  let maxSlip = 0,
    stanceSamples = 0;
  for (let match = 0; match < 10; match++) {
    if (match > 0) await page.click('[data-action="menu"]');
    await page.select("#difficulty", match < 5 ? "EASY" : "NORMAL");
    await page.click('[data-action="start"]');
    lastFeet.clear();
    let d = await read(),
      cueBefore = false,
      issued = 0;
    const deadline = Date.now() + 300000;
    while (Date.now() < deadline) {
      const cue = await page.$eval("#timing", (e) => e.textContent || "");
      d = await read();
      if (d.phase === "RESULTS") break;
      if (d.phase === "SERVE_READY" && d.server === 0) {
        const p = d.projectedTargets.find(
          (p) => p.world.x === 0 && p.world.z === 5.8,
        ).screen;
        await page.mouse.click(p.x, p.y);
      }
      // Control uses visible HIT NOW text only; contactAt/time never drives input.
      if (cue.includes("HIT NOW") && !cueBefore) {
        const label = await page.$eval(
          "#basic-label",
          (e) => e.textContent || "",
        );
        const intent = label.includes("SUPER")
          ? "default"
          : ["clear", "drop", "default", "default", "clear", "default"][
              issued % 6
            ];
        const x = intent === "drop" ? 0 : issued % 2 ? -1.8 : 1.8,
          z = intent === "drop" ? 1.2 : 5.8;
        const p = d.projectedTargets.find(
          (p) => p.world.x === x && p.world.z === z,
        ).screen;
        if (intent === "clear") await page.keyboard.down("Shift");
        await page.mouse.click(p.x, p.y, {
          button: intent === "drop" ? "right" : "left",
        });
        await page.keyboard.up("Shift");
        issued++;
      }
      cueBefore = cue.includes("HIT NOW");
      for (let i = 0; i < d.motions.length; i++)
        for (const key of ["left", "right"]) {
          const foot = d.motions[i].feet[key],
            recordKey = i + key,
            prev = lastFeet.get(recordKey);
          if (
            prev &&
            prev.phase === "RALLY" &&
            d.phase === "RALLY" &&
            d.time > prev.time &&
            d.time - prev.time < 0.12 &&
            !prev.swing &&
            !foot.swing &&
            prev.cycle === foot.cycle &&
            prev.hop < 0.001 &&
            d.motions[i].skinPose?.hop < 0.001
          ) {
            const moved = Math.hypot(
              foot.rendered.x - prev.rendered.x,
              foot.rendered.y - prev.rendered.y,
              foot.rendered.z - prev.rendered.z,
            );
            maxSlip = Math.max(maxSlip, moved);
            stanceSamples++;
          }
          lastFeet.set(recordKey, {
            ...foot,
            hop: d.motions[i].skinPose?.hop ?? 0,
            phase: d.phase,
            time: d.time,
          });
        }
      await sleep(25);
    }
    if (d.phase !== "RESULTS")
      throw new Error(
        "Visual-cue active match " +
          match +
          " incomplete " +
          JSON.stringify({ scores: d.scores, phase: d.phase }),
      );
    if (Math.max(...d.scores) !== 5)
      throw new Error("Five-point result failed");
    d.shots.forEach((h) => kinds.add(h.shot));
    if (
      d.shots.some(
        (h) =>
          h.contact.source !== "engine:hit_frame" ||
          h.contact.planeDistance > 0.045001 ||
          h.contact.radialDistance > 0.225001,
      )
    )
      throw new Error("Contact contract violated");
    results.push({
      match: match + 1,
      difficulty: match < 5 ? "EASY" : "NORMAL",
      scores: d.scores,
      issuedByVisibleCue: issued,
      longest: Math.max(...d.points.map((p) => p.returns)),
      shots: d.shots.map((h) => h.shot),
      fps: d.fps,
      heap: d.heapBytes,
    });
    log("ACTIVE VISUAL MATCH", JSON.stringify(results.at(-1)));
    if (match === 0 || match === 9)
      await shot("visual-play-" + (match + 1) + "-results");
  }
  log(
    "Active visual-cue UI verification",
    JSON.stringify({
      results,
      kinds: [...kinds],
      maxStanceFootDisplacement: maxSlip,
      stanceSamples,
    }),
  );
  if (maxSlip > 0.003) throw new Error("Rendered stance-foot slip " + maxSlip);
  log(
    "All ten matches receive continuing tactical inputs; automation reacts to visible HIT NOW. Read-only telemetry is used for results/geometry, not internal timing. This remains software automation, not human usability/device performance.",
  );
}
