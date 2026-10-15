export const meta = { viewport: { width: 1280, height: 720 } };
export async function run({
  page,
  sleep,
  shot,
  log,
  difficulties = ["EASY", "NORMAL"],
  maxRallyReturns = Infinity,
}) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  const read = () => page.evaluate(() => window.smashDiagnostics());
  const matches = [],
    allTech = new Set();
  for (const difficulty of difficulties) {
    if ((await read()).phase === "RESULTS")
      await page.click('[data-action="menu"]');
    await page.select("#difficulty", difficulty);
    const previousAudio = 0;
    await page.click('[data-action="start"]');
    const feet = new Map();
    let stanceMax = 0,
      stanceSamples = 0;
    let previousCue = false,
      issued = 0,
      maxReturns = 0,
      captured = false,
      novice = false;
    const deadline = Date.now() + 300000;
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
      if (
        cue.includes("HIT NOW") &&
        !previousCue &&
        d.returns < maxRallyReturns
      ) {
        const beginner = difficulty === "EASY" && maxReturns < 8,
          intent = beginner
            ? "clear"
            : ["clear", "drop", "default", "default", "clear", "default"][
                issued % 6
              ],
          x = beginner ? 0 : issued % 2 ? -1.8 : 1.8,
          z =
            intent === "drop" || (intent === "default" && issued % 3 === 0)
              ? 1.2
              : 5.8,
          p = d.projectedTargets.find(
            (p) => p.world.x === x && p.world.z === z,
          ).screen;
        if (intent === "clear") await page.keyboard.down("Shift");
        await page.mouse.click(p.x, p.y, {
          button: intent === "drop" ? "right" : "left",
        });
        await page.keyboard.up("Shift");
        issued++;
      }
      previousCue = cue.includes("HIT NOW");
      for (let actor = 0; actor < d.motions.length; actor++)
        for (const key of ["left", "right"]) {
          const f = d.motions[actor].feet[key],
            prev = feet.get(actor + key),
            hop = d.motions[actor].skinPose?.hop ?? 0;
          if (
            prev &&
            d.phase === "RALLY" &&
            prev.phase === "RALLY" &&
            d.time > prev.time &&
            d.time - prev.time < 0.12 &&
            !f.swing &&
            !prev.swing &&
            f.cycle === prev.cycle &&
            hop < 0.001 &&
            prev.hop < 0.001
          ) {
            stanceSamples++;
            stanceMax = Math.max(
              stanceMax,
              Math.hypot(
                f.rendered.x - prev.rendered.x,
                f.rendered.y - prev.rendered.y,
                f.rendered.z - prev.rendered.z,
              ),
            );
          }
          feet.set(actor + key, { ...f, hop, phase: d.phase, time: d.time });
        }

      maxReturns = Math.max(maxReturns, d.returns);
      if (d.renderedContact) {
        const c = d.renderedContact;
        if (
          Math.hypot(
            c.racket.x - c.contact.x,
            c.racket.y - c.contact.y,
            c.racket.z - c.contact.z,
          ) > 0.002
        )
          throw new Error("Production contact render mismatch");
      }
      if (maxReturns >= 6 && difficulty === "EASY") novice = true;
      if (d.returns >= 5 && !captured) {
        await shot("tactics-" + difficulty.toLowerCase() + "-natural-rally");
        captured = true;
      }
      await sleep(25);
    }
    const d = await read();
    if (d.phase !== "RESULTS")
      throw new Error(
        "Match incomplete " +
          difficulty +
          " " +
          JSON.stringify({ phase: d.phase, scores: d.scores }),
      );
    if (difficulty === "EASY" && !novice)
      throw new Error("Basic clear input failed to sustain six returns");
    for (const h of d.shots) {
      allTech.add(h.technique);
      if (
        h.contact.source !== "engine:hit_frame" ||
        h.contact.planeDistance > 0.045001 ||
        h.contact.radialDistance > 0.225001
      )
        throw new Error("Physical contact contract failed");
      if (
        ["smash", "superSmash", "netKill"].includes(h.technique) &&
        h.p.y < 1.77
      )
        throw new Error("Illegal low attack");
    }
    if (stanceMax > 0.003)
      throw new Error("Rendered stance displacement " + stanceMax);
    const events = d.audioLedger.slice(previousAudio);
    if (events.length !== d.shots.length)
      throw new Error("Successful hit/FX/audio event count mismatch");
    if (
      new Set(events.map((e) => e.physicsTime + ":" + e.source)).size !==
      events.length
    )
      throw new Error("Duplicate impact callback");
    await shot("tactics-" + difficulty.toLowerCase() + "-results");
    matches.push({
      difficulty,
      stanceMax,
      stanceSamples,
      scores: d.scores,
      issuedByVisibleCue: issued,
      intentionalYieldAfterReturns: Number.isFinite(maxRallyReturns)
        ? maxRallyReturns
        : null,
      maxReturns,
      noviceClearRally: novice,
      points: d.points,
      shots: d.shots.map(
        ({
          actor,
          p,
          shot,
          technique,
          quality,
          balance,
          preparation,
          target,
          recoveryBase,
          crossCourt,
          strokeReason,
          velocity,
          time,
        }) => ({
          actor,
          p,
          shot,
          technique,
          quality,
          balance,
          preparation,
          target,
          recoveryBase,
          crossCourt,
          strokeReason,
          velocity,
          time,
        }),
      ),
      splitEvents: d.splitEvents,
      perception: d.perception,
      audioEvents: events,
      softwareFPS: d.fps,
    });
    log("TACTICAL MATCH", JSON.stringify(matches.at(-1)));
  }
  if (allTech.size < 4)
    throw new Error("Insufficient natural technique coverage " + [...allTech]);
  log(
    "TACTICAL MECHANICS PASS",
    JSON.stringify({
      matches,
      techniques: [...allTech],
      method:
        "Only start/serve/visible HIT NOW mouse/Shift/right-click actions. No internal contactAt scheduling, no state injection. EASY begins with simple centre clears until eight returns. Software automation; not human onboarding, hardware audio or device performance." +
        (Number.isFinite(maxRallyReturns)
          ? ` Controller deliberately stops returning after ${maxRallyReturns} exchanges so lifecycle coverage does not rely on AI errors.`
          : ""),
    }),
  );
}
