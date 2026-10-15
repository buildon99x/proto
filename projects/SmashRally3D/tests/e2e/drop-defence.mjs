export const meta = { viewport: { width: 960, height: 600 } };
export async function run({
  page,
  sleep,
  shot,
  log,
  difficulties = ["EASY", "NORMAL", "HARD"],
  patterns = ["centre-soft", "wide-soft", "clear-soft"],
  reactionMs = 0,
  settledLimit,
}) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  const read = () => page.evaluate(() => window.smashDiagnostics());
  await page.click('[data-action="settings"]');
  await page.select("#quality", "LOW");
  await page.click('[data-action="close"]');
  const matches = [];
  const limit = settledLimit ?? Number(process.env.SMASH_DROP_LIMIT || 15);
  for (const difficulty of difficulties)
    for (const pattern of patterns) {
      if ((await read()).phase !== "MENU") {
        if ((await read()).phase !== "RESULTS")
          await page.keyboard.press("Escape");
        await page.click('[data-action="menu"]');
      }
      await page.select("#difficulty", difficulty);
      await page.click('[data-action="start"]');
      let previous = false,
        issued = 0,
        lastCount = 0,
        lastPoint = 0,
        active = null;
      const attempts = [],
        commands = [],
        trace = [];
      const deadline = Date.now() + Number(process.env.SMASH_DROP_DEADLINE_MS || 240000);
      while (Date.now() < deadline) {
        const d = await read(),
          cue = await page.$eval("#timing", (e) => e.textContent || "");
        trace.push({
          time: d.time,
          phase: d.phase,
          scores: d.scores,
          flight: d.shots.length,
          p: d.position,
          actors: d.actors.map((a) => a.p),
          aiSamples: d.perception.samples,
          aiObservedAt: d.perception.observedAt,
          aiContact: d.receiver === 1 ? d.contact : null,
        });
        if (d.shots.length > lastCount) {
          for (let i = lastCount; i < d.shots.length; i++) {
            const h = d.shots[i];
            if (active && h.actor === 1) {
              active.returned = true;
              active.reply = { technique: h.technique, p: h.p, time: h.time };
              active = null;
            }
            if (h.actor === 0 && h.shot === "drop") {
              active = {
                flight: i + 1,
                hit: {
                  actor: h.actor,
                  p: h.p,
                  velocity: h.velocity,
                  technique: h.technique,
                  quality: h.quality,
                  target: h.target,
                  time: h.time,
                },
                aiAtLaunch: d.actors[1].p,
                firstObservation: null,
                plannedReachableEver: false,
                plannedSamples: 0,
                noPlanSamples: 0,
                returned: false,
                directWinner: false,
                point: null,
              };
              attempts.push(active);
            }
          }
          lastCount = d.shots.length;
        }
        if (
          active &&
          d.receiver === 1 &&
          d.perception.observedAt >= active.hit.time
        ) {
          active.firstObservation ??= {
            time: d.perception.observedAt,
            p: d.perception.position,
            ai: d.actors[1].p,
          };
          if (d.contact) {
            active.plannedReachableEver = true;
            active.plannedSamples++;
          } else active.noPlanSamples++;
        }
        if (d.points.length > lastPoint) {
          if (active) {
            active.point = d.points.at(-1);
            active.landing = d.position;
            active.directWinner = d.points.at(-1).winner === 0;
            active = null;
          }
          lastPoint = d.points.length;
        }
        if (
          d.phase === "RESULTS" ||
          (limit > 0 &&
            attempts.filter((a) => a.returned || a.point).length >= limit)
        )
          break;
        if (d.phase === "SERVE_READY" && d.server === 0) {
          const p = d.projectedTargets.find(
            (p) => p.world.x === 0 && p.world.z === 5.8,
          ).screen;
          await page.mouse.click(p.x, p.y);
        }
        if (cue.includes("HIT NOW") && !previous) {
          const intent =
              pattern === "clear-soft" && issued % 2 === 0 ? "clear" : "drop",
            x = pattern === "centre-soft" ? 0 : issued % 2 ? -1.8 : 1.8;
          const p = d.projectedTargets.find(
            (p) =>
              p.world.x === x && p.world.z === (intent === "clear" ? 5.8 : 1.2),
          ).screen;
          if (reactionMs) await sleep(reactionMs);
          if (intent === "clear") await page.keyboard.down("Shift");
          await page.mouse.click(p.x, p.y, {
            button: intent === "drop" ? "right" : "left",
          });
          await page.keyboard.up("Shift");
          commands.push({ intent, x, cue });
          issued++;
        }
        previous = cue.includes("HIT NOW");
        await sleep(30);
      }
      const d = await read();
      const metrics = {
        attempts: attempts.length,
        reachable: attempts.filter((a) => a.plannedReachableEver).length,
        unreachable: attempts.filter(
          (a) => !a.plannedReachableEver && a.firstObservation,
        ).length,
        unobserved: attempts.filter((a) => !a.firstObservation && !a.returned)
          .length,
        returned: attempts.filter((a) => a.returned).length,
        directWinners: attempts.filter((a) => a.directWinner).length,
        techniques: Object.fromEntries(
          ["drop", "net", "block"].map((t) => [
            t,
            attempts.filter((a) => a.hit.technique === t).length,
          ]),
        ),
      };
      const result = {
        difficulty,
        pattern,
        reactionMs,
        scores: d.scores,
        phase: d.phase,
        commands,
        metrics,
        attempts,
        trace,
        shots: d.shots.map(({ renderPose, ...h }) => h),
        contactAttempts: d.contactAttempts,
        points: d.points,
      };
      matches.push(result);
      log("DROP MATCH", JSON.stringify(result));
      if (pattern === "wide-soft")
        await shot("drop-defence-" + difficulty.toLowerCase() + "-wide");
      if (
        d.phase !== "RESULTS" &&
        !(
          limit > 0 &&
          attempts.filter((a) => a.returned || a.point).length >= limit
        )
      )
        throw Error("incomplete " + difficulty + " " + pattern);
    }
  log(
    "DROP DEFENCE PASS",
    JSON.stringify({
      method:
        "Only normal UI serve/mouse/right-click/Shift actions at visible HIT NOW; LOW visual setting; read-only snapshot tracing, no contactAt scheduling or state injection. Reachability means the AI planner produced at least one feasible contact after observation, not an omniscient physical oracle.",
      matches: matches.map(
        ({ trace, shots, attempts, contactAttempts, ...m }) => m,
      ),
    }),
  );
}
