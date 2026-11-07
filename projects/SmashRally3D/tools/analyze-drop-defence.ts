import { readFileSync, writeFileSync } from "node:fs";
const dir = "projects/SmashRally3D/verification/drop-defence-20261015/";
function analyze(file: string) {
  const raw = JSON.parse(readFileSync(dir + file, "utf8"));
  const matches = raw.logs
    .filter((l: string) => l.startsWith("DROP MATCH "))
    .map((l: string) => JSON.parse(l.slice(11)));
  const analyzed = matches.map((m: any) => {
    const attempts = m.attempts.map((a: any) => {
      const reply = m.shots[a.flight],
        replyFlight = a.flight + 1,
        contactReturn = reply?.actor === 1;
      const following = m.shots[a.flight + 1];
      const replyEnd = contactReturn
        ? m.trace.find(
            (s: any) =>
              s.flight === replyFlight && s.phase === "POINT_RESOLVED",
          )
        : null;
      const point = replyEnd
        ? m.points[replyEnd.scores[0] + replyEnd.scores[1] - 1]
        : null;
      const legalReturn =
        contactReturn &&
        (point
          ? point.winner === 1 && point.reason === "IN"
          : following?.actor === 0);
      return {
        ...a,
        contactReturn,
        legalReturn: !!legalReturn,
        replyFault: contactReturn && !!point && !legalReturn,
        returnUnresolved: contactReturn && !point && !following,
        replyPoint: point,
      };
    });
    let maxObservedSpeed = 0;
    for (let i = 1; i < m.trace.length; i++) {
      const a = m.trace[i - 1],
        b = m.trace[i],
        dt = b.time - a.time;
      if (a.phase === "RALLY" && b.phase === "RALLY" && dt > 0 && dt < 0.3)
        maxObservedSpeed = Math.max(
          maxObservedSpeed,
          Math.hypot(
            b.actors[1].x - a.actors[1].x,
            b.actors[1].z - a.actors[1].z,
          ) / dt,
        );
    }
    const metric = {
      difficulty: m.difficulty,
      pattern: m.pattern,
      phase: m.phase,
      scores: m.scores,
      softIntentCommands: m.commands.filter((c: any) => c.intent === "drop")
        .length,
      actualSoftFlights: attempts.length,
      actualTechniques: m.metrics.techniques,
      qualities: Object.fromEntries(
        ["perfect", "good", "weak", "miss"].map((q) => [
          q,
          attempts.filter((a: any) => a.hit.quality === q).length,
        ]),
      ),
      byTechnique: Object.fromEntries(
        ["drop", "net", "block"].map((t) => [
          t,
          {
            attempts: attempts.filter((a: any) => a.hit.technique === t).length,
            successfulReturns: attempts.filter(
              (a: any) => a.hit.technique === t && a.legalReturn,
            ).length,
            directWinners: attempts.filter(
              (a: any) => a.hit.technique === t && a.directWinner,
            ).length,
          },
        ]),
      ),
      plannerReachable: attempts.filter((a: any) => a.plannedReachableEver)
        .length,
      plannerUnreachable: attempts.filter(
        (a: any) => !a.plannedReachableEver && a.firstObservation,
      ).length,
      noObservedVerdict: attempts.filter(
        (a: any) => !a.plannedReachableEver && !a.firstObservation,
      ).length,
      contactReturns: attempts.filter((a: any) => a.contactReturn).length,
      successfulReturns: attempts.filter((a: any) => a.legalReturn).length,
      replyFaults: attempts.filter((a: any) => a.replyFault).length,
      unresolvedReturns: attempts.filter((a: any) => a.returnUnresolved).length,
      directSoftWinners: attempts.filter((a: any) => a.directWinner).length,
      plannerReachableButNoContact: attempts.filter(
        (a: any) => a.plannedReachableEver && !a.contactReturn,
      ).length,
      closedPoints: m.points.length,
      playerPoints: m.points.filter((p: any) => p.winner === 0).length,
      repetitionPointWinRate: m.points.length
        ? m.points.filter((p: any) => p.winner === 0).length / m.points.length
        : null,
      directWinnerRate: attempts.length
        ? attempts.filter((a: any) => a.directWinner).length / attempts.length
        : null,
      successfulReturnRate: attempts.length
        ? attempts.filter((a: any) => a.legalReturn).length / attempts.length
        : null,
      maxObservedContinuousAISpeed: maxObservedSpeed,
      minimumObservedDelay: Math.min(
        ...attempts
          .filter((a: any) => a.firstObservation)
          .map((a: any) => a.firstObservation.time - a.hit.time),
      ),
    };
    return { metrics: metric, attempts };
  });
  const aggregate = ["EASY", "NORMAL", "HARD"].map((d) => {
    const rows = analyzed
      .filter((m: any) => m.metrics.difficulty === d)
      .map((m: any) => m.metrics);
    const sum = (k: string) => rows.reduce((n: number, r: any) => n + r[k], 0);
    const a: any = { difficulty: d };
    for (const k of [
      "softIntentCommands",
      "actualSoftFlights",
      "plannerReachable",
      "plannerUnreachable",
      "noObservedVerdict",
      "contactReturns",
      "successfulReturns",
      "replyFaults",
      "unresolvedReturns",
      "directSoftWinners",
      "plannerReachableButNoContact",
      "closedPoints",
      "playerPoints",
    ])
      a[k] = sum(k);
    a.successfulReturnRate = a.successfulReturns / a.actualSoftFlights;
    a.directWinnerRate = a.directSoftWinners / a.actualSoftFlights;
    a.repetitionPointWinRate = a.closedPoints
      ? a.playerPoints / a.closedPoints
      : null;
    return a;
  });
  return {
    source: file,
    pass: raw.pass,
    errors: raw.errors,
    buildEvidence: raw.buildEvidence,
    aggregate,
    matches: analyzed,
  };
}
const before = analyze("before-ui.json"),
  after = process.argv.includes("--before-only")
    ? null
    : analyze("after-ui.json");
const report = {
  method:
    "Ordinary UI only. Soft intention includes contextual drop/net/block; actual techniques are separated. Planner reachable means at least one observed planned contact, not an omniscient physical oracle. Successful return requires an actual next player collision or an AI IN point after its reply; a reply still in flight at a bounded session end is unresolved. Repetition point win rate uses closed points only; direct winner rate uses actual soft flights. Bounded after sessions may stop after15 settled soft flights and leave one return unresolved; null point rate means no completed points, not0% wins.",
  before,
  after,
  wellTimedPressure: (() => {
    try {
      return analyze("good-pressure-ui.json");
    } catch {
      return null;
    }
  })(),
};
writeFileSync(dir + "comparison.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    { before: before.aggregate, after: after?.aggregate },
    null,
    2,
  ),
);
