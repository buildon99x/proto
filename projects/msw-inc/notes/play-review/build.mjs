#!/usr/bin/env node
// 플레이 리뷰 보고서 데이터 — 계측 원자료 셋을 보고서가 읽는 data.js 하나로 줄인다.
//   pnpm --filter msw-inc playreview        → notes/data/playreview.json   (규칙 시뮬레이션, 성향 4개)
//   pnpm --filter msw-inc playreview:ui     → notes/data/playreview-ui.json (실제 화면 클릭, 그림)
//   node notes/play-review/build.mjs        → notes/play-review/data.js
// 감정은 추정이다. 사람을 관찰한 값이 아니라 체크인에서 일어난 일(결재·새 도감·빈틈 해소·남은 빈틈·유지 보수만 한 체크인)로 분류한다.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HERE = import.meta.dirname;
const DATA = path.join(HERE, "../data");
const argv = process.argv.slice(2);
const opt = k => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
// --sim <file>: 다른 계측 결과로 요약만 본다. --dry: data.js를 쓰지 않는다
const sim = JSON.parse(readFileSync(opt("--sim") || path.join(DATA, "playreview.json"), "utf8"));
const ui = JSON.parse(readFileSync(path.join(DATA, "playreview-ui.json"), "utf8"));
const audit = JSON.parse(readFileSync(path.join(DATA, "audit.json"), "utf8"));

const r1 = x => Math.round(x * 10) / 10;
const r2 = x => Math.round(x * 100) / 100;

// ── 추정 감정 모델 ───────────────────────────────────────────
// 순서가 우선순위다. 한 체크인에는 가장 강한 하나만 붙인다.
const MAINT = /^(event|event-free|seat|seat\+)$/;
const VALENCE = { achieve: 3, relief: 1.5, discover: 2, tense: -1, routine: 0.5, bored: -1 };
function emotion(c) {
  const newDex = c.after.dex > c.before.dex || c.away.newDex.length > 0;
  const fixed = c.before.gapN > 0 && c.after.gapN === 0;
  let e;
  // v1.3: 결재 막대 눈금을 지난 체크인도 "성취"다 (보상이 저절로 들어온다)
  if (c.acts.includes("approve") || (c.away.marks || []).length) e = "achieve";
  else if (newDex) e = "discover";
  else if (fixed) e = "relief";
  else if (c.before.gapN > 0) e = "tense";
  else if (c.acts.length && c.acts.every(a => MAINT.test(a))) e = "bored";
  else e = "routine";
  const badges = c.before.badges.gap + c.before.badges.busy + c.before.badges.evolve;
  const load = badges > 12;
  return { e, v: VALENCE[e] - (load ? 0.5 : 0), load, badges, newDex, fixed };
}

// 행동 한 개를 화면에서 하려면 몇 번 눌러야 하나 (playreview:ui 실측 흐름 기준)
const COST = { "event-free": 3, approve: 3, hire: 3, move: 1, evolve: 3, promote: 3, seat: 3, "seat+": 3, slot: 3, expand: 3, event: 3, clear: 1, release: 2, rebuild: 3, grow: 3, balrog: 1, place: 1, "night-evolve": 3 };
const inputsOf = acts => 2 + acts.reduce((s, a) => s + (COST[a.split(":")[0]] ?? 2), 0); // +출근 리포트 닫기 +퇴근

const runs = {};
for (const r of sim.runs) {
  const cks = r.checkins.map(c => {
    const em = emotion(c);
    return {
      d: r2(c.day), ch: c.ch, hh: c.hh, acts: c.acts, e: em.e, v: em.v, load: em.load, badges: em.badges,
      bEvo: c.before.badges.evolve, gap: c.before.gapN, gapAfter: c.after.gapN, ent: c.before.entrance,
      happy: c.before.happy, dHappy: c.away.happyDelta, lv: c.away.levelups, smile: c.before.smile,
      joy: c.before.joy, goal: c.before.joyGoal, eta: c.etaDays, dex: c.after.dex, entMin: c.away.entranceMin, walkMin: c.away.walkMin,
      inputs: inputsOf(c.acts.filter(a => a !== "night-evolve" || r.persona === "night")),
    };
  });
  const hours = r.hours.map(h => [r2(h.day), h.happy, h.walkers, h.busy, r2(h.joyPct), h.ch, h.entrance ? 1 : 0, h.smile]);
  // 장별 요약
  const chapters = [1, 2, 3, 4, 5].map(k => {
    const cs = cks.filter(c => c.ch === k);
    const hs = r.hours.filter(h => h.ch === k);
    const ready = r.miles.find(m => m.kind === "ready" && m.label.startsWith(k + "장"));
    const stable = hs.find((h, i) => hs.slice(i).every(x => x.gapN === 0));
    const emo = {};
    for (const c of cs) emo[c.e] = (emo[c.e] || 0) + 1;
    const wow = cs.filter(c => ["achieve", "discover", "relief"].includes(c.e) || c.acts.some(a => /evolve|promote/.test(a))).length;
    const acts = {};
    for (const c of cs) for (const a of c.acts) { const t = a.split(":")[0]; acts[t] = (acts[t] || 0) + 1; }
    return {
      ch: k, from: r2(hs[0].day), to: r2(hs[hs.length - 1].day), days: r1(hs[hs.length - 1].day - hs[0].day), checkins: cs.length,
      dexFrom: cs[0].dex - 0, dexTo: cs[cs.length - 1].dex,
      wow, wowPct: Math.round((wow / cs.length) * 100), emo, acts,
      badges: r1(cs.reduce((s, c) => s + c.badges, 0) / cs.length), bEvo: r1(cs.reduce((s, c) => s + c.bEvo, 0) / cs.length),
      inputs: r1(cs.reduce((s, c) => s + c.inputs, 0) / cs.length),
      eta0: cs[0].eta, stable: stable ? r2(stable.day) : null, ready: ready ? r2(ready.day) : null,
      waitDays: stable && ready ? r1(ready.day - stable.day) : null,
      entH: Math.round(hs.filter(h => h.entrance).length), walkH: Math.round(cs.reduce((s, c) => s + c.walkMin, 0) / 60),
      happyMax: Math.max(...hs.map(h => h.happy)), walkersMax: Math.max(...hs.map(h => h.walkers)),
    };
  });
  runs[r.persona] = {
    id: r.persona, label: r.label, times: r.times, endDay: r.endDay, dex: r.dex,
    first: r.first, checkins: cks, hours, chapters,
    miles: r.miles.filter(m => m.kind !== "ready" || true).map(m => ({ d: r2(m.day), k: m.kind, l: m.label })),
    smilePeak: Math.max(...r.hours.map(h => h.smile)),
    species: [...new Set(r.miles.filter(m => m.kind === "dex").map(m => m.l))],
  };
}

// 첫 진입 흐름 (실제 화면)
const EMO_FLOW = {
  intro: ["curious", "두 줄 대사와 도장 버튼 하나. 무엇을 하는 게임인지는 아직 모른다"],
  arrive: ["curious", "모험가가 알아서 들어온다. 아무것도 안 눌러도 움직인다"],
  watch: ["curious", "노란 테두리가 누를 곳을 가리킨다"],
  dungeon: ["delight", "빛기둥과 UP. 입사 25초 안에 첫 레벨업을 본다"],
  "world-grow": ["idle", "여기서 약 3분 동안 할 일이 없다. 오렌 대사 세 줄만 돈다"],
  gap: ["alarm", "빨간 ! 와 😐. 처음으로 문제가 생긴다"],
  hire: ["focus", "카드 넷 중 하나에 초록 리본과 무료 표시"],
  tray: ["focus", "대기실 토큰. 끌어서 놓으라고 한다"],
  drag: ["focus", "드래그 중 결과 카드와 유령 발판이 먼저 보인다"],
  placed: ["relief", "뚫렸다!! 멈춰 있던 모험가가 다시 오른다"],
  fixed: ["relief", "해결 직후 바로 다음 손짓(이벤트)을 준다"],
  event: ["delight", "경험치 2배. 누르자마자 빨라진다"],
  "evolve-badge": ["curious", "보라 ▲. 세 번째 배지 종류"],
  "evolve-sheet": ["focus", "사원증 두 장, 던전 Lv 2 → 6, '빈틈이 생기지 않아요'"],
  "evolve-cut": ["delight", "NEW · 도감 +1. 첫 수집 보상"],
  "doc-hint": ["curious", "결재 서류. 장기 목표가 처음 보인다"],
  approval: ["focus", "조건 두 개와 '약 1.8일'. 머쉬맘은 '20명이 즐기면'이라고 말한다(옛 조건)"],
  "tut-done": ["calm", "튜토리얼 끝. 오렌이 '근속을 기다려요'라고 한다"],
  offduty: ["calm", "사무실 소등 컷. 떠나도 된다는 확신을 준다"],
  report: ["delight", "출근 도장, 세 숫자, 명장면 셋, 할 일 칩 셋. 가장 잘 만든 화면"],
  "day2-world": ["confused", "오렌은 '근속을 기다려요', 채용 시트는 '근속 5,649 / 2,000'. 이미 찼다"],
  "day2-evolve": ["focus", "'입구가 막혀요' 경고와 [▲ 승진 발령 1,200]. 정답은 여기 있다"],
  "day2-hire": ["confused", "제목 줄이 '한 번 더 진화하면'과 '근속 5,649/2,000'을 같이 말한다"],
  "day2-approval": ["calm", "'약 11시간 뒤, 줄지 않아요'. 기다림이 예고된다"],
};
const flow = ui.flow.map(f => ({
  id: f.id, label: f.label, t: f.clock, inputs: f.inputs, shot: f.shot, oren: f.oren,
  clickables: f.clickables, chars: f.chars, numbers: f.numbers, layer: f.layer ? { chars: f.layer.chars, buttons: f.layer.buttons } : null,
  emo: EMO_FLOW[f.id]?.[0] ?? "calm", note: EMO_FLOW[f.id]?.[1] ?? "",
}));
const scenes = ui.scenes.map(s => ({ id: s.id, label: s.label, shot: s.shot, clickables: s.clickables, chars: s.chars, numbers: s.numbers, badges: s.badges, plats: s.plats, walkers: s.walkers, ch: s.world.ch, errors: s.errors.length }));

// 성향 8개 × 시드 5 엔딩 (선택 점검 원자료)
const personas = audit.map(a => ({ rules: a.rules, id: a.persona, label: a.label, ends: a.seeds.map(s => (s.ch[4] == null ? null : r1(s.ch[4]))), dead: a.endDead, entH: Math.round(a.entranceH), med: a.ch[4] == null ? null : r1(a.ch[4]) }));

const out = { generated: new Date().toISOString().slice(0, 10), rules: sim.rules, runs, flow, scenes, personas, cost: COST, valence: VALENCE };
if (!argv.includes("--dry")) writeFileSync(path.join(HERE, "data.js"), "// 생성물: node notes/play-review/build.mjs\nwindow.PR = " + JSON.stringify(out) + ";\n");
console.log("→ data.js", (JSON.stringify(out).length / 1024).toFixed(0) + "KB");
for (const id of Object.keys(runs)) console.log(id, runs[id].chapters.map(c => `ch${c.ch} ${c.days}d wow${c.wowPct}% badges${c.badges} evo${c.bEvo} in${c.inputs} wait${c.waitDays} emo${JSON.stringify(c.emo)}`).join("\n  "));
