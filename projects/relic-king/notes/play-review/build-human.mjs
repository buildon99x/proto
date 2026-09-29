#!/usr/bin/env node
// 사람처럼 한 판 — humanplay 로그를 보고서(index.html)가 읽는 data-human.js로 줄인다.
//   pnpm --filter relic-king build && pnpm --filter relic-king humanplay   (한 판 플레이 → notes/data/humanplay-v071.jsonl)
//   node notes/play-review/build-human.mjs
// 로그의 hidden(세이브에서 읽은 월드 값)은 플레이 중에는 리뷰어에게 보이지 않았다. 여기서 사실 확인과 그래프에만 쓴다.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HERE = import.meta.dirname;
const LOG = path.join(HERE, "../data/humanplay-v071.jsonl");
const r2 = (x) => Math.round(x * 100) / 100;

const rows = readFileSync(LOG, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const last = rows[rows.length - 1];

// 체크인 = 페이지를 연 한 번(첫 세션 포함). 입력·실제 초·도착 순간의 월드 값을 센다
const aways = rows.filter((r) => r.cmd === "away");
const checkins = [];
let prev = rows[0];
for (const a of [...aways, null]) {
  const end = a ?? last;
  // 체크인 안에서 마지막으로 기록된 월드 값(떠나기 직전)
  const inside = rows.filter((r) => r.realSec >= prev.realSec && r.realSec <= end.realSec && r.cmd !== "away" && r.hidden);
  const before = a ? rows[rows.indexOf(a) - 1] : last;
  checkins.push({
    n: checkins.length + 1,
    arriveH: r2(prev.hidden.hours),
    awayBeforeMin: prev.cmd === "away" ? prev.min : 0,
    onlineSec: (a ? before.realSec : last.realSec) - prev.realSec,
    inputs: (a ? a.inputs : last.inputs) - prev.inputs,
    fundsArrive: prev.hidden.funds,
    ownedArrive: prev.hidden.owned,
    ownedLeave: (inside.at(-1) ?? prev).hidden.owned,
    ended: !!(inside.at(-1) ?? prev).hidden.ended,
  });
  if (a) prev = a;
}

// 도감(소장 종) 곡선 — 월드 시각 기준
const codex = rows.filter((r) => r.hidden).map((r) => ({ h: r.hidden.hours, owned: r.hidden.owned, funds: r.hidden.funds }));
const notes = rows.filter((r) => r.cmd === "note").map((r) => ({ realSec: r.realSec, h: r.hidden?.hours ?? null, t: r.note }));
const endRow = rows.find((r) => r.hidden?.ended);

const out = {
  generated: "node notes/play-review/build-human.mjs",
  onlineSec: last.realSec, inputs: last.inputs, checkins: checkins.length,
  awayMin: last.awayMin, endWorldH: endRow ? r2(endRow.hidden.hours) : null,
  checkinsTimeline: checkins, codex, notes,
};
writeFileSync(path.join(HERE, "data-human.js"), `// ${out.generated} — 원자료 notes/data/humanplay-v071.jsonl\nwindow.PRH = ${JSON.stringify(out)};\n`);
console.log(`체크인 ${out.checkins} · 입력 ${out.inputs} · 온라인 ${Math.round(out.onlineSec / 60)}분 · 자리 비움 ${out.awayMin}분 · 엔딩 월드 ${out.endWorldH}시간 · 소감 ${notes.length}줄`);
for (const c of checkins) console.log(`#${c.n} 도착 ${c.arriveH}h (앞선 비움 ${c.awayBeforeMin}분) · 온라인 ${c.onlineSec}초 · 입력 ${c.inputs} · 도감 ${c.ownedArrive}→${c.ownedLeave}${c.ended ? " · 엔딩" : ""}`);
