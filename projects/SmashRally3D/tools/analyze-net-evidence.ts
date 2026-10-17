import { readFileSync, writeFileSync } from "node:fs";
import { flight, distance } from "../app/src/physics";
const dir = "projects/SmashRally3D/verification/net-followup-20261015/";
const input = process.argv[2] || "player-net-finish-ui.json";
const raw = JSON.parse(readFileSync(dir + input, "utf8"));
const matches = raw.logs
  .filter((s: string) => s.startsWith("NET MATCH "))
  .map((s: string) => JSON.parse(s.slice(10)));
const evidence = matches.map((m: any) => {
  const shots = m.observations.map((o: any, index: number) => {
    const h = o.hit,
      f = flight(h.p, h.velocity);
    const samples = (m.trajectory || []).filter(
      (s: any) =>
        s.flight === index + 1 && ["RALLY", "POINT_RESOLVED"].includes(s.phase),
    );
    return {
      index: index + 1,
      actor: h.actor,
      technique: h.technique,
      quality: h.quality,
      time: h.time,
      contact: h.p,
      velocity: h.velocity,
      target: h.target,
      opponentAtImpact: o.actors[1 - h.actor].p,
      reconstructedUninterruptedFlight: {
        apex: f.apex,
        seconds: f.time,
        netHeight: f.netHeight,
        end: f.end,
        reason: f.reason,
        targetError: distance(f.end, h.target),
      },
      actualSamples: samples.length,
      actualSampledApex: samples.length
        ? Math.max(...samples.map((s: any) => s.position.y))
        : null,
      lastActualSample: samples.at(-1) || null,
      actualLanding:
        samples.find((s: any) => s.phase === "POINT_RESOLVED")?.position ||
        null,
      actualLandingError: samples.some((s: any) => s.phase === "POINT_RESOLVED")
        ? distance(
            samples.find((s: any) => s.phase === "POINT_RESOLVED").position,
            f.end,
          )
        : null,
    };
  });
  const finishes = shots
    .filter((h: any) => h.actor === 0 && h.technique === "netKill")
    .map((h: any) => {
      const setup = shots[h.index - 3],
        reply = shots[h.index - 2],
        next = shots[h.index];
      return {
        setup,
        reply,
        finish: h,
        opponentBodyDisplacementDuringSetup: distance(
          setup.opponentAtImpact,
          m.observations[reply.index - 1].actors[1].p,
        ),
        opponentBodyAtReply: m.observations[reply.index - 1].actors[1].p,
        nextHit: next && {
          actor: next.actor,
          technique: next.technique,
          time: next.time,
        },
        // A subsequent player serve means the player won the point (winner serves).
        winnerServedNext:
          next?.actor === 0 &&
          next.technique === "clear" &&
          next.contact.y === 1.1,
      };
    });
  return {
    seed: m.seed,
    scores: m.scores,
    contacts: shots.length,
    commands: m.issued,
    finishes,
    shots,
  };
});
writeFileSync(
  dir + "flight-comparison.json",
  JSON.stringify(
    {
      source: input,
      buildEvidence: raw.buildEvidence,
      method:
        "Launches and actor positions are real ordinary UI observations. reconstructedUninterruptedFlight replays recorded launch data with production flight(), with no interception; it is numerical reconstruction, not sampled browser flight. actualSamples are read-only snapshots during the live match when present. Point-end samples preserve actual landing.",
      matches: evidence,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    evidence.map((m: any) => ({ seed: m.seed, finishes: m.finishes })),
    null,
    2,
  ),
);
