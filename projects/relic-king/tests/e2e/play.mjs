#!/usr/bin/env node
// 플레이 완결성 검사 — 실제 React 앱을 사람처럼 조작하고, 그 결과를 월드 상태로 확인한다.
//
//   node tests/e2e/play.mjs                 전체
//   node tests/e2e/play.mjs loop return      시나리오 골라 실행
//   node tests/e2e/play.mjs --speed 12 --list
//
// `smoke.mjs`는 화면이 깨지지 않았는지 본다. 이쪽은 **게임이 의도대로 도는지**를 본다.
// 각 시나리오는 조작 → 상태 확인 → 판정의 순서로 쓰고, 판정은 전부 `world`(엔진이
// 실제로 저장한 상태)에서 읽는다 — 화면 문구를 근거로 통과시키지 않는다.
import { launch, ROOT } from "./harness.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { writeFile, mkdir } from "node:fs/promises";

const argv = process.argv.slice(2);
const flag = (k, d) => {
  const i = argv.indexOf(k);
  return i > -1 ? argv[i + 1] : d;
};
const SPEED = Number(flag("--speed", 12));
const OUT = path.resolve(ROOT, flag("--out", "assets/screenshots/play"));
const wanted = argv.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a));

const results = [];
let port = 4400;
let cdpPort = 9400;

function fmt(n, digits = 0) {
  return Number(n).toLocaleString("ko-KR", { maximumFractionDigits: digits });
}

/** 한 시나리오의 판정 수집기 */
function makeChecks(scenario) {
  const checks = [];
  const api = {
    ok(name, pass, detail = "") {
      checks.push({ name, pass: !!pass, detail: String(detail) });
      return !!pass;
    },
    eq(name, actual, expected, detail = "") {
      return api.ok(name, actual === expected, `${detail}${detail ? " · " : ""}실측 ${actual} / 기대 ${expected}`);
    },
    note(name, detail) {
      checks.push({ name, pass: null, detail: String(detail) });
    },
    checks
  };
  results.push({ scenario, checks });
  return api;
}

async function withApp(opts, fn) {
  const h = await launch({
    speed: SPEED, port: port++, cdpPort: cdpPort++,
    profile: `/tmp/relic-king-play-${port}`, outDir: OUT, ...opts
  });
  try {
    return await fn(h);
  } finally {
    await h.close();
  }
}

/** 온보딩 오버레이가 떠 있으면 "지금 거점 유지"로 닫는다 */
async function dismissOnboarding(h) {
  if (await h.exists(".onboarding-keep")) {
    await h.click(".onboarding-keep");
    return true;
  }
  return false;
}

// ════════════════════════════════════════════════════════════════════════
// S1. 코어 루프 1회전 — 발굴→드랍→감정→소장→매각→재투자가 UI에서 완주되는가
// ════════════════════════════════════════════════════════════════════════
async function scenarioLoop() {
  const c = makeChecks("loop — 코어 루프 1회전");
  await withApp({}, async (h) => {
    await h.goto("/");
    await h.ready();

    // ① 발굴: 방치만으로 진척이 도는가 (클릭 0회, 척추 4번)
    const t0 = await h.waitGame(11);
    await h.waitGame(40);
    const afterDig = await h.state();
    c.ok("① 발굴 — 클릭 0회로 진척이 돈다",
      afterDig.sites.korea.layerProgress > 0 || afterDig.sites.korea.layer > 1,
      `layer ${afterDig.sites.korea.layer} · progress ${fmt(afterDig.sites.korea.layerProgress)}`);
    c.ok("② 드랍 — 유물이 실제로 나온다", afterDig.stats.drops > 0, `${afterDig.stats.drops}점`);

    // ③ 감정: pending → vault 로 넘어가는가
    await h.waitGame(120);
    const afterAppraise = await h.state();
    c.ok("③ 감정 — 미감정이 소장고로 넘어간다",
      afterAppraise.vault.length > 0 || afterAppraise.stats.sold > 0,
      `소장 ${afterAppraise.vault.length}점 · 매각 ${afterAppraise.stats.sold}건`);

    await dismissOnboarding(h);
    await h.tab("소장고");
    await h.shot("loop-vault");
    const stacks = await h.count(".vault-grid .stack");
    c.ok("④ 소장 — 소장고 화면에 실제로 보인다", stacks > 0, `${stacks}종`);

    // ⑤ 매각: 소장고에서 한 점을 골라 판다 (되돌릴 수 없는 조작)
    await h.click(".vault-grid .stack");
    const detail = await h.text(".detail");
    c.ok("⑤-a 상세 — 유물을 누르면 상세가 열린다", !!detail, (detail ?? "").slice(0, 40).replace(/\n/g, " "));
    // 방치 중이라 다른 유물이 계속 들어온다 — 소장고 총량이 아니라 **판 그 종의
    // 사본 수**로 판정해야 한다(총량으로 재면 동시에 들어온 신규 드랍에 가려진다).
    const before = await h.state();
    const soldName = (detail ?? "").split("\n")[0].trim().split(" ")[0];
    const beforeIds = before.vault.map((v) => v.uid);
    const sellClicked = await h.clickText(".detail button", "매각");
    c.ok("⑤-b 매각 — 상세에서 매각 버튼이 동작한다", sellClicked, soldName);
    const after = await h.state();
    if (sellClicked) {
      const goneUids = beforeIds.filter((uid) => !after.vault.some((v) => v.uid === uid));
      c.ok("⑤-c 매각 결과 — 자금이 늘고 그 유물이 소장고에서 빠진다",
        after.funds > before.funds && goneUids.length > 0,
        `자금 ${fmt(before.funds)} → ${fmt(after.funds)} · 빠진 사본 ${goneUids.length}점`);
    }

    // ⑥ 재투자: 자동 루틴이 인부·장비·감정소를 실제로 올리는가
    await h.tab("발굴");
    await h.waitGame(after.t + 130);
    const reinvested = await h.state();
    c.ok("⑥ 재투자 — 방치 중 발굴력이 자란다",
      reinvested.workers > t0.workers || reinvested.gear > t0.gear || reinvested.lab > t0.lab,
      `인부 ${t0.workers}→${reinvested.workers} · 장비 ${t0.gear}→${reinvested.gear} · 감정소 ${t0.lab}→${reinvested.lab}`);
    await h.shot("loop-dig");

    // ⑦ 한 바퀴가 끊기지 않았는가 — 드랍이 계속 늘고 있는가
    c.ok("⑦ 루프 — 한 바퀴 뒤에도 드랍이 계속 는다",
      reinvested.stats.drops > afterDig.stats.drops,
      `${afterDig.stats.drops} → ${reinvested.stats.drops}점`);

    const errs = h.consoleErrors();
    c.ok("콘솔 오류 없음", errs.length === 0, errs.slice(0, 2).join(" | "));

    const drift = await h.clockDrift();
    c.note("가상 시계", `배속 ${drift.speed}x · 가상 ${fmt(drift.virtualSeconds)}초 중 게임 ${fmt(drift.gameSeconds)}초 반영(손실 ${(100 * (1 - drift.gameSeconds / drift.virtualSeconds)).toFixed(2)}%)`);
  });
}

// ════════════════════════════════════════════════════════════════════════
// S2. 배경 탭 — 탭을 닫지 않고 배경으로 두면 그 시간은 어떻게 되는가
// ════════════════════════════════════════════════════════════════════════
async function scenarioBackground() {
  const c = makeChecks("background — 배경 탭 경과 시간");
  await withApp({}, async (h) => {
    await h.goto("/");
    await h.ready();
    await h.waitGame(60);
    const before = await h.state();

    const realFreezeMs = 20000;
    const expectedGameSeconds = (realFreezeMs / 1000) * SPEED;
    await h.cdp.send("Page.setWebLifecycleState", { state: "frozen" });
    await h.sleepReal(realFreezeMs);
    await h.cdp.send("Page.setWebLifecycleState", { state: "active" });
    await h.sleepReal(3000);

    const after = await h.state();
    const advanced = after.t - before.t;
    // 배경 구간은 오프라인으로 취급돼야 한다 — 최소한 OFFLINE_EFFICIENCY(0.6) 만큼은 흘러야
    // "닫는 편이 이득"이라는 역전이 생기지 않는다.
    c.ok("배경 탭에서 흐른 시간이 게임에 반영된다",
      advanced >= expectedGameSeconds * 0.5,
      `배경 ${fmt(expectedGameSeconds)} 게임초 중 ${fmt(advanced, 1)}초만 반영 (${fmt(100 * advanced / expectedGameSeconds, 1)}%)`);
    c.ok("배경 복귀 시 드랍이 누락되지 않는다",
      after.stats.drops > before.stats.drops,
      `드랍 ${before.stats.drops} → ${after.stats.drops}`);
    const summaryShown = await h.evaluate(`!!document.querySelector('.offline-modal, .offline-toast')`);
    c.ok("복귀 시 무슨 일이 있었는지 알려 준다", summaryShown, summaryShown ? "요약 노출" : "아무 안내 없음");
    await h.shot("background-return");
  });
}

// ════════════════════════════════════════════════════════════════════════
// S3. 복귀 세션 — 8시간/24시간 자리 비움
// ════════════════════════════════════════════════════════════════════════
async function scenarioReturn() {
  const c = makeChecks("return — 복귀 세션(8h·24h)");
  await withApp({}, async (h) => {
    await h.goto("/");
    await h.ready();
    await h.waitGame(150);
    await dismissOnboarding(h);
    const before = await h.state();

    for (const hours of [8, 24]) {
      await h.patchSave(`(w) => { w.lastTickAt = Date.now() - ${hours} * 3600 * 1000; }`);
      await h.goto("/");
      await h.ready();
      await h.sleepReal(2500);

      const modal = await h.exists(".offline-modal");
      const toast = await h.exists(".offline-toast");
      c.ok(`${hours}h — 복귀 요약이 뜬다`, modal || toast, modal ? "모달(조치 필요 있음)" : toast ? "토스트(조치 0건)" : "아무것도 안 뜸");

      const text = (await h.text(".offline-modal")) ?? (await h.text(".offline-toast")) ?? "";
      c.ok(`${hours}h — 요약이 경과 시간을 말한다`, /시간|분/.test(text), text.split("\n")[0] ?? "");
      if (modal) {
        const fixed = await h.count(".offline-fixed li");
        c.eq(`${hours}h — 상단 고정 4줄(ux-v02 §8)`, fixed, 4);
        const hasRank = /순위/.test(text);
        c.ok(`${hours}h — 요약이 순위 변화를 숨기지 않는다`, hasRank, hasRank ? "순위 줄 있음" : "순위 줄 없음");
      }
      await h.shot(`return-${hours}h`);

      const after = await h.state();
      const capped = Math.min(hours * 3600, 12 * 3600);
      c.ok(`${hours}h — 오프라인 적분이 실제로 돈다`,
        after.t > before.t,
        `t ${fmt(before.t)} → ${fmt(after.t)} (상한 ${fmt(capped)}초)`);

      // 닫기
      await h.clickText(".offline-modal button, .offline-toast button", "확인");
      c.ok(`${hours}h — 요약을 닫으면 게임으로 돌아온다`, !(await h.exists(".offline-modal")));
    }

    // 2층 구조의 **모달 경로**(조치 필요 ≥ 1건) — 위 두 번은 둘 다 조치 0건이라
    // 토스트로 끝났다. ux-v02.md §8이 정한 "상단 고정 4줄 + 조치 카드"는 이쪽에서만
    // 검증된다. 도난 1건을 심어 그 경로를 연다.
    await h.patchSave(`(w) => {
      const id = Object.keys(w.ledger)[0];
      const online = w.onlineElapsedSeconds || 0;
      w.theftEvents = [{
        id: 'theft-return', artifactId: id, tier: 1, value: 1000, site: 'korea',
        stolenAtOnlineSeconds: online, recoveryDeadlineOnlineSeconds: online + 20 * 3600,
        nextRecoveryAttemptOnlineSeconds: online + 1e9
      }];
      w.lastTickAt = Date.now() - 6 * 3600 * 1000;
    }`);
    await h.goto("/");
    await h.ready();
    await h.sleepReal(2500);
    c.ok("조치 필요 1건 이상이면 토스트가 아니라 모달이다(ux-v02 §8)", await h.exists(".offline-modal"));
    c.eq("모달 상단 고정 4줄", await h.count(".offline-fixed li"), 4);
    const fixedText = (await h.text(".offline-fixed")) ?? "";
    c.ok("고정 4줄이 자금·유물·도감·순위를 전부 말한다 — 손실을 숨기지 않는다",
      /자금/.test(fixedText) && /유물/.test(fixedText) && /도감/.test(fixedText) && /순위/.test(fixedText),
      fixedText.replace(/\n/g, " | "));
    c.ok("조치 카드가 나온다", (await h.count(".offline-action-cards li")) >= 1,
      (await h.text(".offline-action-cards")) ?? "");
    await h.shot("return-action-modal");
  });
}

// ════════════════════════════════════════════════════════════════════════
// S4. 첫 세션 — brief.md가 약속한 "20분 안에 거점→원정→감정→전시"
// ════════════════════════════════════════════════════════════════════════
async function scenarioFirstSession() {
  const c = makeChecks("first — 첫 세션 20분(brief.md §첫 세션)");
  const BUDGET = 20 * 60;
  await withApp({}, async (h) => {
    await h.goto("/");
    await h.ready();
    const m = {};

    // ① 거점 — 온보딩("본거지를 정하자")이 첫 감정 시점에 뜬다
    await h.until(`!!document.querySelector('.onboarding-modal')`, { timeoutMs: 180000, label: "온보딩 오버레이" });
    m.onboarding = (await h.state()).t;
    await h.shot("first-onboarding");
    c.ok("① 거점 — 온보딩이 20분 안에 뜬다", m.onboarding <= BUDGET, `t=${fmt(m.onboarding)}초`);
    c.ok("① 거점 — 추천 카드 3장 + 유지 버튼(1단계로 닫힌다)",
      (await h.count(".onboarding-card")) === 3 && (await h.exists(".onboarding-keep")));
    await h.click(".onboarding-keep");
    m.base = (await h.state()).t;

    // ② 감정 — 소장고에 실제로 들어온 시점
    let held = await h.state();
    for (let i = 0; i < 400 && held.vault.length === 0 && held.t < BUDGET; i++) {
      await h.sleepReal(250);
      held = await h.state();
    }
    m.appraise = held.vault.length > 0 ? held.t : null;
    c.ok("② 감정 — 20분 안에 감정이 끝난 유물을 손에 쥔다", m.appraise !== null,
      m.appraise !== null ? `t=${fmt(m.appraise)}초 · 소장 ${held.vault.length}점` : "20분 안에 소장 0점");

    // ③ 전시 — 등급0 임시 전시대(무료 1슬롯)에 올린다
    await h.tab("시설");
    await h.sleepReal(500);
    let displayed = false;
    if (await h.exists(".museum-slot.empty")) {
      await h.click(".museum-slot.empty");
      await h.sleepReal(400);
      displayed = await h.click(".swap-list button");
      await h.sleepReal(500);
    }
    const wd = await h.state();
    m.display = wd.vault.some((v) => v.displayed) ? wd.t : null;
    c.ok("③ 전시 — 20분 안에 임시 전시대에 올린다", m.display !== null && m.display <= BUDGET,
      m.display !== null ? `t=${fmt(m.display)}초` : `전시 실패(클릭 ${displayed})`);
    await h.shot("first-displayed");

    // ④ 제보 — 첫 세션의 긴장 장치가 실제로 작동하는가(brief.md §첫 세션 10)
    await h.tab("발굴");
    let tipSeen = null;
    for (let i = 0; i < 400; i++) {
      const w = await h.world();
      if (w?.tip) { tipSeen = w; break; }
      if (w && w.t > BUDGET) break;
      await h.sleepReal(250);
    }
    c.ok("④ 제보 — 20분 안에 제보 배너가 뜬다", !!tipSeen, tipSeen ? `t=${fmt(tipSeen.t)}초` : "안 뜸");
    if (tipSeen) {
      const actionable = await h.evaluate(`!!document.querySelector('.tip button, .tip .tip-racing')`);
      c.ok("④ 제보 — 배너가 '내가 레이스에 참가 중'임을 말한다",
        actionable, actionable ? "" : "배너가 정보 표시로만 떴다 — 첫 세션에 긴장 장치가 죽는다");
      await h.shot("first-tip");
    }

    // ⑤ 원정 — 발굴단 축(단장 고용비 200,000₩).
    //
    // **한 시점의 자금으로 판정하지 않는다.** 자금은 자동 재투자와 감정 수수료
    // 때문에 60초 주기로 크게 요동쳐서(실측: 같은 t=1200초를 두 번 재니 97,585₩와
    // 340,415₩), "20분 시점에 얼마인가"는 언제 보느냐에 달린 값이다. 그래서
    // **고용 버튼이 한 번이라도 열렸는가와 그 시각**을 본다 — 그게 플레이어가
    // 실제로 겪는 것이다(brief.md §첫 세션, notes/decisions.md G69.5).
    let firstAffordable = null;
    let peakFunds = 0;
    let affordTicks = 0;
    let ticks = 0;
    for (let i = 0; i < 600; i++) {
      const cur = await h.world();
      if (!cur) { await h.sleepReal(250); continue; }
      peakFunds = Math.max(peakFunds, cur.funds);
      const open = await h.evaluate(`!!document.querySelector('.candidate-row:not([disabled])')`);
      ticks++;
      if (open) {
        affordTicks++;
        if (firstAffordable === null) firstAffordable = cur.t;
      }
      if (cur.t > 40 * 60) break;
      await h.sleepReal(250);
    }
    m.firstAffordable = firstAffordable === null ? null : Math.round(firstAffordable);
    m.peakFunds = Math.round(peakFunds);
    m.affordRatio = ticks > 0 ? +(affordTicks / ticks).toFixed(3) : 0;
    c.ok("⑤ 원정 — 40분 안에 발굴단을 꾸릴 수 있게 된다", firstAffordable !== null,
      firstAffordable !== null
        ? `처음 고용 가능 t=${fmt(firstAffordable)}초 · 최고 자금 ${fmt(m.peakFunds)}₩`
        : `40분 동안 한 번도 200,000₩에 닿지 못했다(최고 ${fmt(m.peakFunds)}₩)`);
    c.note("⑤ 원정 — 고용 가능 상태가 유지되는 비율",
      `${(m.affordRatio * 100).toFixed(1)}% — 자금이 자동 재투자·감정 수수료로 요동쳐 버튼이 켜졌다 꺼졌다 한다`);

    c.note("첫 세션 마일스톤(게임초)", JSON.stringify(m));
    // brief.md §첫 세션이 20분 예산 안에 약속하는 것 — 거점·감정·전시·제보.
    // 원정(발굴단)은 자금 곡선에 달려 있어 별도 판정한다(G69.5).
    const reached = ["base", "appraise", "display"].filter((k) => m[k] != null && m[k] <= BUDGET).length;
    c.ok("brief.md §첫 세션 — 거점·감정·전시·제보가 전부 20분 안에 성립한다",
      reached === 3 && !!tipSeen,
      `거점·감정·전시 ${reached}/3 · 제보 ${tipSeen ? "달성" : "미달"}`);
  });
}

// ════════════════════════════════════════════════════════════════════════
// S5. 제보 레이스 — 이 게임 유일의 긴장 장치가 화면에서 제대로 작동하는가
// ════════════════════════════════════════════════════════════════════════
async function scenarioTip() {
  const c = makeChecks("tip — 제보 배너(L1)와 레이스");
  await withApp({}, async (h) => {
    await h.goto("/");
    await h.ready();
    await h.until(`!!document.querySelector('.tip')`, { timeoutMs: 120000, label: "제보 배너" });
    await dismissOnboarding(h);
    await h.until(`!!document.querySelector('.tip')`, { timeoutMs: 120000, label: "제보 배너(온보딩 후)" });
    await h.shot("tip-banner");

    const w = await h.state();
    const tipSite = w.tip?.site;
    c.ok("제보가 실제로 뜬다", !!w.tip, `대상 ${w.tip?.artifactId} @ ${tipSite} ${w.tip?.layer}층`);
    c.ok("배너는 동시 1장이다(L1)", (await h.count(".tip")) === 1, `${await h.count(".tip")}장`);
    const clockText = await h.text(".tip-clock");
    c.ok("카운트다운이 보인다", /\d/.test(clockText ?? ""), clockText ?? "없음");

    // 카운트다운이 실제로 줄어드는가
    const before = clockText;
    await h.sleepReal(1500);
    const after = await h.text(".tip-clock");
    c.ok("카운트다운이 줄어든다", before !== after, `${before} → ${after}`);

    // 반응 수단 — 배너의 안내와 엔진의 실제 판정이 일치하는가
    const infoOnly = await h.exists(".tip-info-only");
    const canReactByEngine = tipSite === w.activeSite; // playerCanReactAt: 레거시 발굴이 그 자리에 있다
    c.ok("배너의 '반응 가능' 안내가 엔진 판정과 일치한다",
      !(infoOnly && canReactByEngine),
      infoOnly && canReactByEngine
        ? `배너는 "반응할 발굴단이 없다"라고 쓰는데, 엔진은 활성 거점(${tipSite}) 레거시 발굴에 TIP_PLAYER_HIT를 그대로 적용한다`
        : infoOnly ? "정보 표시(엔진도 반응 불가)" : "반응 버튼 있음");

    // 레이스가 실제로 판정되는가 — 제보가 사라질 때까지 지켜본다
    const t0 = w.t;
    let resolved = null;
    for (let i = 0; i < 200; i++) {
      const cur = await h.state();
      if (!cur.tip || cur.tip.artifactId !== w.tip.artifactId) {
        resolved = cur;
        break;
      }
      if (cur.t - t0 > 400) break;
      await h.sleepReal(250);
    }
    c.ok("레이스가 끝난다(승·패·만료 중 하나로)", !!resolved,
      resolved ? `승 ${resolved.stats.racesWon} · 패 ${resolved.stats.racesLost}` : "400게임초 안에 결판나지 않았다");
    if (resolved) {
      const won = resolved.stats.racesWon > w.stats.racesWon;
      const lost = resolved.stats.racesLost > w.stats.racesLost;
      c.note("레이스 결과", won ? "플레이어 선점" : lost ? "라이벌 선점" : "만료");
      if (won) {
        c.ok("이겼을 때 활동 기록에 남는다",
          resolved.log.some((l) => l.kind === "won"),
          resolved.log.find((l) => l.kind === "won")?.text ?? "");
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════════════
// S6. 알림 3계층 (notes/ux-v02.md §7)
// ════════════════════════════════════════════════════════════════════════
async function scenarioNotify() {
  const c = makeChecks("notify — 알림 3계층");
  await withApp({}, async (h) => {
    await h.goto("/");
    await h.ready();
    await h.waitGame(40);
    await dismissOnboarding(h);

    // L1 슬롯은 제보가 없어도 자리를 차지해 레이아웃이 밀리지 않아야 한다
    const slotH = await h.evaluate(`(() => {
      const el = document.querySelector('.tip-slot');
      return el ? Math.round(el.getBoundingClientRect().height) : null;
    })()`);
    c.ok("L1 — 제보 슬롯이 min-height로 고정돼 있다", slotH !== null && slotH > 0, `높이 ${slotH}px`);

    // L2 — 탭 라벨 배지. 도난/봉인/장물을 심어 두고 실제로 뜨는지 본다.
    // 도난 1건(회수 기한 5시간 남음 — 임박 상태)과 암시장 장물 1건(우선권 72시간)을
    // 심는다. 기한 값이 현실적이어야 배지가 보여 주는 남은 시간을 그대로 검증할 수 있다.
    await h.patchSave(`(w) => {
      const id = Object.keys(w.ledger)[0];
      const online = w.onlineElapsedSeconds || 0;
      w.theftEvents = [{
        id: 'theft-probe', artifactId: id, tier: 1, value: 1000,
        site: 'korea', stolenAtOnlineSeconds: online,
        recoveryDeadlineOnlineSeconds: online + 5 * 3600,
        nextRecoveryAttemptOnlineSeconds: online + 1e9
      }];
      w.blackMarket = { listings: [{ id: 99901, kind: 'stolen', artifactId: id, estimate: 1000, theftEventId: 'theft-probe', listedAt: w.t }] };
      w.lastTickAt = Date.now();
    }`);
    await h.goto("/");
    await h.ready();
    await h.sleepReal(1500);
    await h.clickText(".offline-modal button, .offline-toast button", "확인");
    await dismissOnboarding(h);

    const badges = await h.evaluate(`[...document.querySelectorAll('.tabs button')].map(b => ({
      label: b.innerText.trim().replace(/\\s+/g, ' '),
      dot: b.querySelector('.dot')?.innerText ?? null
    }))`);
    const vault = badges.find((b) => b.label.startsWith("소장고"));
    const market = badges.find((b) => b.label.startsWith("시장"));
    c.ok("L2 — 도난이 소장고 탭 배지로 뜬다", !!vault?.dot, JSON.stringify(vault));
    c.ok("L2 — 암시장 장물이 시장 탭 배지로 뜬다", !!market?.dot, JSON.stringify(market));
    // "5h"·"42m"·"30s" 처럼 **남은 시간**이어야 한다. 건수(숫자만)면 §7의 "시한부 뱃지"가 아니다.
    const isCountdown = (t) => /^\d+(h|m|s)$/.test((t ?? "").trim());
    c.ok("L2 — 도난 배지가 회수 기한 카운트다운을 보여준다(ux-v02 §7)",
      isCountdown(vault?.dot), `소장고 배지 "${vault?.dot}" (기대: 5h 전후)`);
    c.ok("L2 — 장물 배지가 우선권 카운트다운을 보여준다(ux-v02 §7)",
      isCountdown(market?.dot), `시장 배지 "${market?.dot}" (기대: 72h 전후)`);
    c.ok("L2 — 임박(6시간 이내)일 때만 붉어진다 — L1의 방해 특권을 침범하지 않는다",
      await h.evaluate(`!!document.querySelector('.tabs button .dot-urgent')`),
      "도난 기한 5시간 → urgent");
    await h.shot("notify-badges");

    // L3 — 조용한 로그: 도감 탭 원장 서브탭
    await h.tab("도감");
    await h.subtab("원장");
    const log = await h.text(".log-list");
    c.ok("L3 — 활동 기록이 도감 탭 원장에 쌓인다", !!log && log.trim().length > 0, (log ?? "").split("\n")[0] ?? "");
    const badJosa = ["이(가)", "을(를)", "은(는)", "와(과)"].filter((j) => (log ?? "").includes(j));
    c.ok("L3 — 조사 병기가 남아 있지 않다", badJosa.length === 0, badJosa.join(" "));
    await h.shot("notify-ledger");
  });
}

// ════════════════════════════════════════════════════════════════════════
// S7. 조작 단계 수 (notes/ux-v02.md §2 — 시작 화면은 발굴 탭, 탭 전환도 1단계)
// ════════════════════════════════════════════════════════════════════════
async function scenarioSteps() {
  const c = makeChecks("steps — 조작 단계 수(ux-v02 §2)");
  await withApp({}, async (h) => {
    // 충분히 진행된 상태를 만들어 둔다 — 측정 대상 액션이 전부 열려 있어야 한다
    await h.goto("/");
    await h.ready();
    await h.waitGame(150);
    await dismissOnboarding(h);
    await h.patchSave(`(w) => {
      w.funds = 5e11;
      w.lab = 6;
      w.vaultLevel = 5;
      for (const id of Object.keys(w.sites)) { w.sites[id].unlocked = true; w.sites[id].baseSince = 0; w.sites[id].layer = 6; }
      w.lastTickAt = Date.now();
    }`);
    await h.goto("/");
    await h.ready();
    await h.sleepReal(2000);
    await h.clickText(".offline-modal button, .offline-toast button", "확인");
    await dismissOnboarding(h);

    const measure = async (name, budget, steps) => {
      await h.tab("발굴"); // 모든 측정은 발굴 탭에서 시작한다(§2 규칙)
      await h.sleepReal(300);
      let count = 0;
      let okAll = true;
      for (const step of steps) {
        const done = await step(h);
        if (done === false) { okAll = false; break; }
        count += 1;
      }
      c.ok(`${name} — ${budget}단계 이하`, okAll && count <= budget, `실측 ${okAll ? count : "미완"}단계 / 예산 ${budget}`);
      return count;
    };

    await measure("#1 인부 고용", 3, [
      (x) => x.clickText(".legacy-dig-upgrades .upgrade", "인부")
    ]);
    await measure("#2 발굴단 파견(신규 거점)", 3, [
      (x) => x.click(".candidate-row:not([disabled])").then((r) => r || x.exists(".team-card-actions")),
      (x) => x.clickText(".team-card-actions button", "새 유적 선택"),
      (x) => x.click(".site-picker-list button, .modal .site-list button, .modal button:not(.ghost)")
    ]);
    await measure("#3 소장고에서 매각", 3, [
      (x) => x.tab("소장고"),
      (x) => x.click(".vault-grid .stack"),
      (x) => x.clickText(".detail button", "매각")
    ]);
    await measure("#4 미감정 즉시 매각", 3, [
      (x) => x.tab("소장고"),
      (x) => x.clickText(".vault-pending button", "즉시 매각").then((r) => r || x.click(".pending-list .ghost"))
    ]);
    await measure("#5 박물관 전시", 3, [
      (x) => x.tab("시설"),
      (x) => x.click(".museum-slot.empty"),
      (x) => x.click(".swap-list button")
    ]);
    // 암시장은 BLACK_MARKET_RESTOCK_INTERVAL_HOURS 마다만 채워진다 — 측정 대상 액션이
    // 열려 있도록 매물 1건을 심는다(조작 단계 수 측정이지 재입고 측정이 아니다).
    await h.patchSave(`(w) => {
      const id = Object.keys(w.ledger).find((k) => w.ledger[k].remaining > 0);
      w.blackMarket = { listings: [{ id: 99801, kind: 'loose', artifactId: id, estimate: 5000, listedAt: w.t }] };
      w.lastTickAt = Date.now();
    }`);
    await h.goto("/");
    await h.ready();
    await h.sleepReal(1800);
    await h.clickText(".offline-modal button, .offline-toast button", "확인");
    await dismissOnboarding(h);
    await measure("#6 암시장 매입", 3, [
      (x) => x.tab("시장"),
      (x) => x.click(".market-row button:not([disabled])")
    ]);
    await measure("#7 규칙 확인", 2, [
      (x) => x.click(".header-icons .icon-btn[aria-label='규칙']")
    ]);
    await measure("#8 순위표 확인", 2, [
      (x) => x.click(".stat-rank")
    ]);
    await measure("#9 설정 열기", 2, [
      (x) => x.click(".header-icons .icon-btn[aria-label='설정·세이브']")
    ]);
    await measure("#10 도감에서 유물 상세", 3, [
      (x) => x.tab("도감"),
      (x) => x.click(".codex-grid button")
    ]);
    await h.shot("steps-end");
  });
}

// ════════════════════════════════════════════════════════════════════════
// S8. 규칙 공개(척추 5) — 화면에 적힌 숫자가 실제 상수와 같은가
// ════════════════════════════════════════════════════════════════════════
async function scenarioRules() {
  const c = makeChecks("rules — 규칙 공개 화면의 숫자 정합");
  // 상수는 코드에서 직접 읽는다 — 화면 문구와 대조하기 위해서다(이 파일을 tsx로
  // 실행하는 이유이기도 하다, package.json의 `play` 스크립트 참조).
  const balance = await import(pathToFileURL(path.join(ROOT, "app/src/game/balance.ts")).href)
    .catch((err) => { console.error("  (balance.ts 를 읽지 못했다:", err.message, ")"); return {}; });
  const { RANK_WEIGHT, TIP_PLAYER_HIT, TIP_RIVAL_HIT, TIP_FOCUS_DIG_HIT_CHANCE, OFFLINE_EFFICIENCY,
    THEFT_RECOVERY_WINDOW_HOURS, OFFLINE_CAP_SECONDS } = balance;

  await withApp({}, async (h) => {
    await h.goto("/");
    await h.ready();
    await h.waitGame(40);
    await dismissOnboarding(h);
    await h.click(".header-icons .icon-btn[aria-label='규칙']");
    await h.sleepReal(500);
    const text = (await h.text(".modal")) ?? "";
    c.ok("📋 아이콘이 규칙 화면을 연다", text.length > 0, `${text.length}자`);
    await h.shot("rules-modal");

    const has = (needle) => text.includes(needle);
    // 이 목록은 "화면에 있어야 한다"가 아니라 "있는 숫자가 맞아야 한다"를 본다.
    const pairs = [
      ["3축 가중식 자산", `${Math.round(RANK_WEIGHT?.asset * 100)}`, /자산/],
      ["3축 가중식 도감", `${Math.round(RANK_WEIGHT?.codex * 100)}`, /도감/],
      ["3축 가중식 명성", `${Math.round(RANK_WEIGHT?.fame * 100)}`, /명성/],
      ["제보 플레이어 적중", `${Math.round(TIP_PLAYER_HIT * 100)}`, /제보|적중/],
      ["제보 라이벌 적중", `${Math.round(TIP_RIVAL_HIT * 100)}`, /제보|라이벌/],
      ["집중 굴착 적중", `${Math.round(TIP_FOCUS_DIG_HIT_CHANCE * 100)}`, /집중/],
      ["오프라인 효율", `${Math.round(OFFLINE_EFFICIENCY * 100)}`, /오프라인|효율/],
      ["도난 회수 창", `${THEFT_RECOVERY_WINDOW_HOURS}`, /도난|회수/]
    ];
    for (const [label, value] of pairs) {
      if (value === "NaN" || value === "undefined") { c.note(label, "상수를 읽지 못했다"); continue; }
      c.ok(`${label} = ${value}이(가) 화면에 있다`, has(value), has(value) ? "" : `화면에서 "${value}"를 찾지 못했다`);
    }
    c.ok("오프라인 상한(12시간)이 화면에 있다",
      has(`${OFFLINE_CAP_SECONDS / 3600}시간`) || has("12시간"),
      `OFFLINE_CAP_SECONDS=${OFFLINE_CAP_SECONDS}`);
    const rivalRows = await h.count(".rival-eta-list li");
    c.ok("라이벌 현황이 공개된다(반칙하지 않는다는 확인)", rivalRows > 0, `${rivalRows}행`);
  });
}

// ════════════════════════════════════════════════════════════════════════
// S9. 드랍 바닥값 — 재투자가 헛도는 구간을 화면이 말해 주는가
// ════════════════════════════════════════════════════════════════════════
async function scenarioFloor() {
  const c = makeChecks("floor — 드랍 주기 바닥값(8초) 구간의 가시성");
  await withApp({}, async (h) => {
    await h.goto("/");
    await h.ready();
    await h.waitGame(60);
    await dismissOnboarding(h);
    // 바닥값에 확실히 붙는 상태: 최대 층 + 아주 높은 발굴력
    await h.patchSave(`(w) => {
      w.funds = 1e9;
      w.workers = 20000;
      w.gear = 12;
      for (const id of Object.keys(w.sites)) { w.sites[id].layer = 12; w.sites[id].layerProgress = 0; }
      w.lastTickAt = Date.now();
    }`);
    await h.goto("/");
    await h.ready();
    await h.sleepReal(2000);
    await h.clickText(".offline-modal button, .offline-toast button", "확인");
    await dismissOnboarding(h);
    await h.tab("발굴");

    const w0 = await h.state();
    const header = await h.text(".header-nextdrop");
    c.note("헤더 다음 드랍 표시", (header ?? "").replace(/\n/g, " "));

    // 발굴력을 더 부어도 드랍 수가 늘지 않는 것을 실측한다
    const t0 = w0.t, d0 = w0.stats.drops;
    await h.waitGame(t0 + 200);
    const w1 = await h.state();
    const rate1 = (w1.stats.drops - d0) / (w1.t - t0);

    await h.patchSave(`(w) => { w.workers = 200000; w.lastTickAt = Date.now(); }`);
    await h.goto("/");
    await h.ready();
    await h.sleepReal(2000);
    await h.clickText(".offline-modal button, .offline-toast button", "확인");
    await dismissOnboarding(h);
    const w2 = await h.state();
    await h.waitGame(w2.t + 200);
    const w3 = await h.state();
    const rate2 = (w3.stats.drops - w2.stats.drops) / (w3.t - w2.t);

    c.note("발굴력 10배 전후 드랍률", `${(rate1 * 60).toFixed(1)}점/분 → ${(rate2 * 60).toFixed(1)}점/분`);
    const flat = Math.abs(rate2 - rate1) / Math.max(rate1, 1e-9) < 0.25;
    c.note("바닥값이 물리는가", flat ? "물린다 — 발굴력 10배가 드랍을 늘리지 못했다" : "아직 안 물린다");

    if (flat) {
      const body = (await h.text("body")) ?? "";
      const told = /바닥|하한|더 이상|한계|8초/.test(body);
      c.ok("바닥값 구간임을 화면이 알려 준다", told,
        told ? "" : "발굴력은 계속 오르는데 드랍이 늘지 않는다는 사실을 어느 화면도 말하지 않는다");
      await h.shot("floor-capped");
    }
  });
}

// ════════════════════════════════════════════════════════════════════════
// S10. 유일(T4) 획득의 순간 — 재미 정의 ① "세상에 하나뿐인 것을 내가 가졌다"
//      spec.md §3.3: T4는 **드랍(소유 확정) 시점**에 화면 전체 연출 + "세계에 단
//      하나" 배지를 재생한다 — "감정소 레벨과 무관하게".
// ════════════════════════════════════════════════════════════════════════
async function scenarioUnique() {
  const c = makeChecks("unique — 유일(T4) 획득 순간의 연출");
  const artifacts = await import(pathToFileURL(path.join(ROOT, "app/src/game/artifacts.ts")).href);
  const t4 = artifacts.ARTIFACTS.find((a) => a.tier === 4 && a.sourceStatus === "verified" && a.site === "korea")
    ?? artifacts.ARTIFACTS.find((a) => a.tier === 4 && a.sourceStatus === "verified");
  c.note("대상 유물", `${t4.id} (${t4.name}) · minLayer ${t4.minLayer}`);

  await withApp({}, async (h) => {
    await h.goto("/");
    await h.ready();
    await h.waitGame(60);
    await dismissOnboarding(h);

    // **실제 드랍 순간**을 만든다 — 상태를 주입해서 "이미 갖고 있는 화면"을 보는 게
    // 아니라, 엔진이 take() 를 실행하는 그 프레임에 무엇이 뜨는지를 본다.
    // 제보(w.tip)를 유일 유물로 걸면 레거시 직접 발굴이 TIP_PLAYER_HIT(28%)로 쫓는다.
    // 감정소는 Lv.1 그대로 둔다 — APPRAISAL_UNLOCK_LAB_LEVEL[4]=4 라 이 유물은
    // 봉인 보관으로 들어가고, spec.md §3.3 이 "감정소 레벨과 무관하게" 재생하라고
    // 한 연출이 실제로 그러한지가 이 시나리오의 질문이다.
    await h.patchSave(`(w) => {
      w.lab = 1;
      // 층은 건드리지 않는다 — 층이 깊어지면 드랍 임계가 커져 레이스 기회 자체가 줄어든다.
      // 대신 인부만 늘려 드랍을 자주 나게 한다(레이스 판정은 드랍마다 1회다).
      w.workers = 40;
      w.funds = 3e7;
      w.tip = { artifactId: ${JSON.stringify(t4.id)}, site: 'korea', layer: 1, remain: 36000, rivals: [], focused: false };
      w.nextTipIn = 1e9;
      w.lastTickAt = Date.now();
    }`);
    await h.goto("/");
    await h.ready();
    await h.sleepReal(2200);
    await h.clickText(".offline-modal button, .offline-toast button", "확인");
    await dismissOnboarding(h);

    let acquiredSeen = false;
    let uniqueBadgeSeen = false;
    let won = false;
    for (let i = 0; i < 300; i++) {
      if (await h.exists(".reveal")) {
        acquiredSeen = acquiredSeen || (await h.exists(".reveal-acquired"));
        uniqueBadgeSeen = uniqueBadgeSeen || (await h.exists(".reveal .unique-badge"));
        if (acquiredSeen) await h.shot("unique-acquired");
        await h.clickText(".reveal button", "확인");
      }
      const w = await h.world();
      if (w && w.stats.racesWon > 0) { won = true; break; }
      await h.sleepReal(220);
    }
    c.ok("제보 레이스로 유일을 실제로 획득했다", won, won ? "" : "레이스를 이기지 못해 이 시나리오는 판정 불가");
    if (won) {
      c.ok("유일을 가진 순간(감정 전) 전체 연출이 뜬다(spec §3.3)", acquiredSeen,
        acquiredSeen ? "reveal-acquired 모달 확인" : "드랍 시점에 아무 연출도 없었다");
      c.ok("그 연출에 '세계에 단 하나' 배지가 있다", uniqueBadgeSeen);
    }

    await h.tab("소장고");
    await h.sleepReal(700);
    await h.shot("unique-vault");
    const held = await h.state();
    const inVault = held.vault.some((v) => v.artifactId === t4.id);
    const inPending = held.pending.some((v) => v.artifactId === t4.id);
    c.ok("획득한 유일이 실제로 내 것이 됐다(소장고 또는 봉인 보관)", inVault || inPending,
      inVault ? "소장고" : inPending ? "봉인 보관 대기" : `codex=${held.codex[t4.id]}`);
    c.ok("세계 재고가 0이 됐다 — 이제 누구도 가질 수 없다",
      held.ledger[t4.id].remaining === 0,
      `remaining=${held.ledger[t4.id].remaining} · owners=${held.ledger[t4.id].owners.join(",")}`);
  });
}

// ════════════════════════════════════════════════════════════════════════
const SCENARIOS = {
  loop: scenarioLoop,
  background: scenarioBackground,
  return: scenarioReturn,
  first: scenarioFirstSession,
  tip: scenarioTip,
  notify: scenarioNotify,
  steps: scenarioSteps,
  rules: scenarioRules,
  floor: scenarioFloor,
  unique: scenarioUnique
};

async function main() {
  if (argv.includes("--list")) {
    console.log(Object.keys(SCENARIOS).join("\n"));
    return;
  }
  const names = wanted.length ? wanted : Object.keys(SCENARIOS);
  for (const name of names) {
    const fn = SCENARIOS[name];
    if (!fn) {
      console.error(`알 수 없는 시나리오: ${name}`);
      process.exitCode = 1;
      continue;
    }
    process.stdout.write(`\n▶ ${name}\n`);
    try {
      await fn();
    } catch (err) {
      results.push({ scenario: name, checks: [{ name: "시나리오 실행", pass: false, detail: err.message }] });
    }
    const last = results[results.length - 1];
    for (const ch of last.checks) {
      const mark = ch.pass === null ? "·" : ch.pass ? "✅" : "❌";
      console.log(`  ${mark} ${ch.name}${ch.detail ? ` — ${ch.detail}` : ""}`);
    }
  }

  const all = results.flatMap((r) => r.checks);
  const failed = all.filter((c) => c.pass === false);
  console.log("\n──────── PLAY ────────");
  console.log(`판정 ${all.filter((c) => c.pass !== null).length}건 · 통과 ${all.filter((c) => c.pass === true).length} · 실패 ${failed.length}`);
  for (const f of failed) console.log(`❌ ${f.name} — ${f.detail}`);

  await mkdir(path.dirname(path.join(OUT, "report.json")), { recursive: true });
  await writeFile(path.join(OUT, "report.json"), JSON.stringify({ speed: SPEED, results }, null, 2));
  console.log(`보고서 → ${path.relative(ROOT, path.join(OUT, "report.json"))}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("[play] 오류:", err.stack ?? err.message);
  process.exit(1);
});
