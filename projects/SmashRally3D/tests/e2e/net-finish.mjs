export const meta = { viewport: { width: 1280, height: 720 } };
export async function run({ page, sleep, shot, log }) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  const read = () => page.evaluate(() => window.smashDiagnostics());
  const matches = [];
  for (let seed = 20; seed < 30; seed++) {
    if ((await read()).phase === "RESULTS")
      await page.click('[data-action="menu"]');
    await page.select("#difficulty", seed % 2 ? "HARD" : "NORMAL");
    await page.click('[data-action="start"]');
    let rng = seed + 1,
      previous = false,
      issued = 0,
      lastCount = 0,
      kill = false;
    const observations = [],
      commands = [],
      trajectory = [];
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      const d = await read(),
        cue = await page.$eval("#timing", (e) => e.textContent || "");
      trajectory.push({
        time: d.time,
        phase: d.phase,
        scores: d.scores,
        position: d.position,
        velocity: d.velocity,
        flight: d.shots.length,
        actors: d.actors.map((a) => ({ p: a.p, base: a.base })),
      });
      if (d.phase === "RESULTS") break;
      if (d.phase === "SERVE_READY" && d.server === 0) {
        const p = d.projectedTargets.find(
          (p) => p.world.x === 0 && p.world.z === 5.8,
        ).screen;
        await page.mouse.click(p.x, p.y);
      }
      if (cue.includes("HIT NOW") && !previous) {
        rng = (rng * 1664525 + 1013904223) >>> 0;
        const intent = cue.includes("NET FINISH")
            ? "default"
            : ["clear", "drop", "default"][rng % 3],
          x = [-1.8, 0, 1.8][(rng >>> 4) % 3],
          z = intent === "drop" || (rng >>> 8) % 2 ? 1.2 : 5.8;
        const p = d.projectedTargets.find(
          (p) => p.world.x === x && p.world.z === z,
        ).screen;
        await sleep(120);
        if (intent === "clear") await page.keyboard.down("Shift");
        await page.mouse.click(p.x, p.y, {
          button: intent === "drop" ? "right" : "left",
        });
        await page.keyboard.up("Shift");
        commands.push({ cue, intent, x, z });
        issued++;
      }
      previous = cue.includes("HIT NOW");
      if (d.shots.length > lastCount) {
        for (const h of d.shots.slice(lastCount)) {
          observations.push({ hit: h, actors: d.actors });
          if (h.actor === 0 && ["net", "netKill"].includes(h.technique)) {
            await shot(
              "followup-" + seed + "-" + h.technique + "-" + d.shots.length,
            );
            if (h.technique === "netKill") kill = true;
          }
        }
        lastCount = d.shots.length;
      }
      await sleep(20);
    }
    const d = await read();
    const report = {
      seed,
      issued,
      phase: d.phase,
      scores: d.scores,
      commands,
      observations,
      points: d.points,
      trajectory,
      audioEvents: d.audioLedger.length,
      physicalContacts: d.shots.every(
        (h) =>
          h.contact.source === "engine:hit_frame" &&
          h.contact.planeDistance <= 0.045001 &&
          h.contact.radialDistance <= 0.225001,
      ),
    };
    matches.push(report);
    log("NET MATCH", JSON.stringify(report));
    await shot("followup-" + seed + "-results");
    if (d.phase !== "RESULTS") throw Error("Incomplete match");
    if (
      !report.physicalContacts ||
      d.audioLedger.length !== d.shots.length ||
      new Set(d.audioLedger.map((e) => e.physicsTime + ":" + e.source)).size !==
        d.audioLedger.length
    )
      throw Error("Physical contact/audio callback contract failed");
    if (kill) {
      log(
        "PLAYER NET FINISH PASS",
        JSON.stringify({
          seed,
          matches: matches.length,
          method:
            "ordinary UI only; visible HIT NOW cue plus fixed 120ms reaction; read-only telemetry, no contactAt scheduling or injected state",
        }),
      );
      return;
    }
  }
  throw Error("Player net finish unobserved");
}
