#!/usr/bin/env node
// 사람처럼 한 판 — humanplay 로그를 보고서 11절이 읽는 data-human.js로 줄인다.
//   node tests/e2e/humanplay.mjs  (한 판 플레이 → notes/data/humanplay-v114.jsonl)
//   node notes/play-review/build-human.mjs
// 로그의 hidden(월드 내부 값)은 플레이 중에는 리뷰어에게 보이지 않았다. 여기서 사실 확인과 그래프에만 쓴다.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HERE = import.meta.dirname;
const DATA = path.join(HERE, "../data");
const LOG = path.join(DATA, "humanplay-v114.jsonl");
const START = 21 * 60; // 입사는 D1 21:00 (bots.ts dayNum과 같은 달력)
const dayNum = t => (t + START) / 1440 + 1;
const r2 = x => Math.round(x * 100) / 100;

const rows = readFileSync(LOG, "utf8").trim().split("\n").map(l => JSON.parse(l));
const withWorld = rows.filter(r => r.hidden);

// 체크인 = 출근(away) 한 번. 첫 세션은 입사부터 첫 퇴근까지. 10분 안 다시 열기(리포트 칩을 다시 보려고 한 것)는 같은 체크인으로 친다
const aways = rows.filter(r => r.cmd === "away" && r.min >= 10);
const checkins = [];
let prev = { inputs: 0, realSec: 0, hidden: rows[0].hidden };
for (const a of aways) {
  checkins.push({
    d: r2(dayNum(prev.hidden.worldMin)), ch: prev.hidden.ch, happy: prev.hidden.happy,
    inputs: a.inputs - prev.inputs, awayMin: a.min,
  });
  prev = a;
}
const last = rows[rows.length - 1];
checkins.push({ d: r2(dayNum(prev.hidden.worldMin)), ch: prev.hidden.ch, happy: prev.hidden.happy, inputs: last.inputs - prev.inputs, awayMin: 0 });

// 출근 순간의 😊 (리포트 첫 숫자와 같다)
const arrivals = aways.map(a => ({ d: r2(dayNum(a.hidden.worldMin)), ch: a.hidden.ch, happy: a.hidden.happy }));

// 결재 도장: 장이 바뀐 첫 기록. 엔딩은 ended가 처음 켜진 기록
const stamps = [];
for (let i = 1; i < withWorld.length; i++) {
  const a = withWorld[i - 1].hidden, b = withWorld[i].hidden;
  if (b.ch > a.ch) stamps.push({ ch: a.ch, d: r2(dayNum(b.worldMin)) });
  if (b.ended && !a.ended) stamps.push({ ch: 5, d: r2(dayNum(b.worldMin)), ending: true });
}

// 소감 한 줄 (플레이 중 /note로 남긴 것)
const notes = rows.filter(r => r.cmd === "note").map(r => ({ d: r2(dayNum(r.hidden.worldMin)), ch: r.hidden.ch, t: r.note }));

// 장별 체크인 수와 입력
const byCh = {};
for (const c of checkins) (byCh[c.ch] ||= []).push(c.inputs);
const chapters = Object.entries(byCh).map(([ch, a]) => {
  const s = [...a].sort((x, y) => x - y);
  return { ch: +ch, checkins: a.length, inputsMedian: s[Math.floor(s.length / 2)], inputsMean: r2(a.reduce((p, c) => p + c, 0) / a.length) };
});

// 봇과 나란히: 같은 도구(playreview)의 표준 봇, 1.9.0(v17)과 1.14.0(v114)
const bot = f => {
  const d = JSON.parse(readFileSync(path.join(DATA, f), "utf8"));
  const out = {};
  for (const r of d.runs) out[r.persona] = { end: r.endDay, stamps: r.miles.filter(m => m.kind === "chapter").map(m => r2(m.day)), checkins: r.checkins.length };
  return out;
};

const out = {
  generated: "node notes/play-review/build-human.mjs",
  realSec: last.realSec, inputs: last.inputs, checkins: checkins.length, endDay: stamps.find(s => s.ending)?.d ?? null,
  tutorialDoneSec: rows.find(r => r.hidden && r.hidden.tut === "done")?.realSec ?? null,
  firstOffSec: rows.find(r => r.cmd === "click" && r.what === "#bOff")?.realSec ?? null,
  checkinsTimeline: checkins, arrivals, stamps, notes, chapters,
  bots: { v17: bot("playreview-v17.json"), v114: bot("playreview-v114.json") },
};
writeFileSync(path.join(HERE, "data-human.js"), `// ${out.generated} — 원자료 notes/data/humanplay-v114.jsonl\nwindow.PRH = ${JSON.stringify(out)};\n`);
console.log(`체크인 ${out.checkins} · 입력 ${out.inputs} · 실제 ${Math.round(out.realSec / 60)}분 · 엔딩 D${out.endDay} · 도장 ${stamps.map(s => s.ch + "장 D" + s.d).join(" / ")} · 소감 ${notes.length}줄`);
console.log(chapters.map(c => `${c.ch}장 체크인 ${c.checkins} · 입력 중앙 ${c.inputsMedian}`).join("\n"));
