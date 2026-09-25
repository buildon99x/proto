#!/usr/bin/env node
// 시연 장면을 PNG로 굽는다: node tests/e2e/shots.mjs [장면...] → assets/screenshots/<장면>.png
import path from "node:path";
import { launch, sleep, ROOT } from "./cdp.mjs";

const ALL = ["intro", "gap", "hire", "dungeon", "evolve", "report", "approval", "promote", "grow", "ch2", "late", "ch5", "ending", "offduty", "codex", "fullclear", "elite", "boss", "bossinv", "rush10", "rush25", "rush40"];
const list = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const b = await launch();
const out = path.join(ROOT, "assets/screenshots");
let bad = 0;
for (const s of list) {
  b.errors.length = 0;
  await b.goto("?demo=" + s);
  await sleep(s === "ending" ? 2200 : 1400);
  await b.shot(path.join(out, s + ".png"));
  const errs = [...b.errors];
  if (errs.length) { bad++; console.log("✕", s, errs.slice(0, 3).join(" | ")); } else console.log("✓", s);
}
await b.close();
process.exit(bad ? 1 : 0);
