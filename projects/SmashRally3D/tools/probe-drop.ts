import { Game } from "../app/src/game";
import { writeFileSync } from "node:fs";
const out = [];
for (const difficulty of ["EASY", "NORMAL", "HARD"] as const)
  for (const pattern of ["centre-soft", "wide-soft", "clear-soft"]) {
    const g = new Game();
    g.difficulty = difficulty;
    g.start();
    let last = -1,
      issued = 0,
      count = 0,
      active: any = null;
    const attempts: any[] = [];
    for (let i = 0; i < 24000 && g.phase !== "RESULTS"; i++) {
      if (g.phase === "SERVE_READY" && g.server === 0)
        g.command({
          shotIntent: "clear",
          target: { x: 0, y: 0.025, z: 5.8 },
          issuedAt: g.time,
          pointerType: "domain",
        });
      if (
        g.phase === "RALLY" &&
        g.receiver === 0 &&
        g.contactAt !== last &&
        g.contactAt - g.time < g.inputLead("default") + 0.08 &&
        g.contactAt - g.time > 0.06
      ) {
        last = g.contactAt;
        const intent =
          pattern === "clear-soft" && issued % 2 === 0 ? "clear" : "drop";
        g.command({
          shotIntent: intent,
          target: {
            x: pattern === "centre-soft" ? 0 : issued % 2 ? -1.8 : 1.8,
            y: 0.025,
            z: intent === "clear" ? 5.8 : 1.2,
          },
          issuedAt: g.time,
          pointerType: "domain",
        });
        issued++;
      }
      g.step();
      if (g.shots.length > count) {
        for (const h of g.shots.slice(count)) {
          if (h.actor === 1 && active) {
            active.returned = true;
            active = null;
          }
          if (h.actor === 0 && h.shot === "drop") {
            active = {
              hit: h,
              ai: {
                p: { ...g.actors[1].p },
                v: { ...g.actors[1].v },
                base: { ...g.actors[1].base },
              },
              plan: false,
              observations: [],
              returned: false,
              attempts: [],
            };
            attempts.push(active);
          }
        }
        count = g.shots.length;
      }
      if (
        active &&
        g.phase === "RALLY" &&
        g.receiver === 1 &&
        g.aiPerception.observedAt >= active.hit.time
      ) {
        active.plan ||= !!g.actors[1].contact;
        if (
          active.observations.length === 0 ||
          g.aiPerception.observedAt !== active.observations.at(-1).at
        )
          active.observations.push({
            at: g.aiPerception.observedAt,
            p: { ...g.p },
            ai: {
              p: { ...g.actors[1].p },
              v: { ...g.actors[1].v },
              target: { ...g.actors[1].target },
              recoverUntil: g.actors[1].recoverUntil,
            },
            contact: g.actors[1].contact,
            contactAt: g.contactAt,
          });
      }
      if (active && g.phase === "POINT_RESOLVED") {
        active.point = g.points.at(-1);
        active.attempts = g.contactAttempts.filter(
          (c) => c.actor === 1 && c.time > active.hit.time,
        );
        active = null;
      }
    }
    const metrics = {
      attempts: attempts.length,
      reachable: attempts.filter((a) => a.plan).length,
      returned: attempts.filter((a) => a.returned).length,
      winners: attempts.filter((a) => a.point?.winner === 0).length,
    };
    console.log(difficulty, pattern, JSON.stringify(metrics));
    out.push({ difficulty, pattern, scores: g.scores, metrics, attempts });
  }
writeFileSync(
  "/tmp/smash-drop-domain.json",
  JSON.stringify({
    method:
      "Ordinary domain start/step/command with precise internal contact scheduling, not browser UI evidence",
    out,
  }),
);
