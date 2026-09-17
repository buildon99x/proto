// 기체 베리에이션의 **경험**을 보는 시나리오. 통과/실패 판정이 아니라
// "네 기체가 실제로 달라 보이고 다르게 느껴지는가"를 눈으로 확인할 자료를 남긴다.
//
// 핵심은 **같은 스테이지의 같은 지점에서** 찍는 것이다. 위치가 다르면 통로 모양이
// 달라져 기체 차이인지 코스 차이인지 구분할 수 없다.

export const meta = {
  viewport: { width: 390, height: 720, deviceScaleFactor: 2 }
};


/** x 가 목표를 넘을 때까지 달린다. 넘으면 그 자리에 선 채로 돌려준다(스크린샷용). */
async function autoplayUntil(page, { untilX = null, limitSec = 150, latencyMs = 0 }) {
  return page.evaluate(
    async ({ limit, untilX, latencyMs }) => {
      const w = window.__wave;
      if (!w) return { ok: false, why: "debug hook 없음" };

      let holding = false;
      const setHold = (v) => {
        if (v === holding) return;
        holding = v;
        window.dispatchEvent(
          new KeyboardEvent(v ? "keydown" : "keyup", { code: "Space", bubbles: true, cancelable: true })
        );
      };

      const laneFor = (s) => {
        const piece = s.course.pieces.find((p) => p.kind === "gate" && p.endX > s.x);
        const gate = piece && piece.gate;
        if (!gate) return "top";
        const cost = (tr) => {
          const b = { ...s.build };
          b[tr.plus] = Math.min(s.base.axisMax, b[tr.plus] + 1);
          b[tr.minus] = Math.max(s.base.axisMin, b[tr.minus] - 1);
          return Math.abs(b.slope) + Math.abs(b.speed) + Math.abs(b.bias);
        };
        return cost(gate.bot) < cost(gate.top) ? "bot" : "top";
      };

      setHold(true);
      await new Promise((r) => setTimeout(r, 50));

      const deadline = Date.now() + limit * 1000;
      const history = [];
      let deaths = 0;
      let lastPhase = "ready";

      while (Date.now() < deadline) {
        const s = w.state;
        if (!s) break;

        if (untilX !== null && s.phase === "running" && s.x >= untilX) {
          setHold(false);
          return { ok: true, paused: true, x: s.x, y: s.y, build: { ...s.build }, gates: s.gatesPassed, deaths };
        }
        if (s.phase === "cleared") {
          setHold(false);
          return { ok: true, deaths, sec: s.elapsed, gates: s.gatesPassed, build: { ...s.build } };
        }
        if (s.phase === "dead") {
          if (lastPhase !== "dead") deaths += 1;
          if (s.mode === "endless") {
            setHold(false);
            return { ok: true, endlessOver: true, deaths, distance: s.x, gates: s.gatesPassed };
          }
        }
        lastPhase = s.phase;

        if (s.phase === "running") {
          // 지연을 주면 사람에 가까워진다 — 완전 정보 오토파일럿은 사람보다 훨씬 잘한다.
          const err = s.y - w.targetY(laneFor(s));
          history.push(err);
          const back = Math.max(0, Math.round(latencyMs / 16.7));
          const seen = history.length > back ? history[history.length - 1 - back] : history[0];
          setHold(seen > 0);
        }
        await new Promise((r) => requestAnimationFrame(r));
      }
      setHold(false);
      return { ok: false, why: "timeout", deaths, x: w.state ? w.state.x : 0 };
    },
    { limit: limitSec, untilX, latencyMs }
  );
}

async function goHome(page, sleep) {
  await page.keyboard.press("Escape");
  await sleep(350);
  const back = await page.$$(".link");
  if (back.length) {
    const label = await page.evaluate((el) => el.textContent, back[back.length - 1]);
    if (label && label.includes("돌아가기")) {
      await back[back.length - 1].click();
      await sleep(250);
    }
  }
}

async function pickRunner(page, index, sleep) {
  const chips = await page.$$(".chip.runner");
  if (chips.length <= index) throw new Error(`기체 칩 ${index} 없음 (${chips.length}개)`);
  const name = await page.evaluate((el) => el.textContent, chips[index]);
  await chips[index].click();
  await sleep(200);
  return name;
}

async function enterStage(page, cellIndex, sleep) {
  const modes = await page.$$(".mode");
  await modes[0].click();
  await sleep(250);
  const cells = await page.$$(".stage-cell");
  await cells[cellIndex].click();
  await sleep(300);
}

export async function run({ page, sleep, shot, log }) {
  await sleep(400);
  await shot("01-home-runners");

  // ── 같은 스테이지의 같은 지점을 네 기체로 ────────────────────
  // 통로가 같으므로 다르게 보이는 것은 전부 기체 차이다.
  const MID_X = 760;
  const runs = [];
  for (let i = 0; i < 4; i += 1) {
    const name = await pickRunner(page, i, sleep);
    await enterStage(page, 0, sleep);
    const mid = await autoplayUntil(page, { untilX: MID_X, limitSec: 90 });
    await sleep(120);
    await shot(`10-mid-${i}`);
    log(`mid ${i} (${String(name).slice(0, 6)}):`, JSON.stringify(mid));
    runs.push({ name, mid });
    await goHome(page, sleep);
  }

  // 표준으로 한 판만 끝까지 — 클리어 화면과 보상 표시를 본다.
  await pickRunner(page, 0, sleep);
  await enterStage(page, 0, sleep);
  const first = await autoplayUntil(page, { limitSec: 150 });
  log("clear(표준):", JSON.stringify(first));
  if (!first.ok) throw new Error(`표준 기체가 티어1-1 을 못 깼다: ${JSON.stringify(first)}`);
  await sleep(400);
  await shot("11-clear");
  await goHome(page, sleep);

  // 네 기체로 클리어한 상태를 심는다 — 여기서 보려는 것은 "클리어가 되는가"가 아니라
  // **목록이 기체별 클리어를 어떻게 보여주는가**다. 클리어 자체는 위에서 이미 확인했다.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("wave-runner/meta/v3"));
    raw.clearedStages = ["dart:1:1", "blunt:1:1", "spike:1:1", "ring:1:1", "dart:1:2", "spike:1:2", "spike:2:1"];
    raw.bestStageSec = { "dart:1:1": 73.0, "blunt:1:1": 80.4, "spike:1:1": 66.2, "ring:1:1": 71.8, "dart:1:2": 74.1, "spike:1:2": 69.9, "spike:2:1": 75.3 };
    raw.attempts = { "dart:1:1": 3, "blunt:1:1": 11, "spike:1:1": 2, "ring:1:1": 7 };
    localStorage.setItem("wave-runner/meta/v3", JSON.stringify(raw));
  });
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(400);

  // ── 스테이지 목록 — 네 기체의 클리어 실루엣이 쌓였는가 ────────
  const modes = await page.$$(".mode");
  await modes[0].click();
  await sleep(350);
  await shot("12-stage-list-marks");
  await goHome(page, sleep);

  // ── 게이트 장면 — 교환 표시를 눈으로 ──────────────────────────
  await pickRunner(page, 2, sleep); // 예봉
  await enterStage(page, 0, sleep);
  const gate = await autoplayUntil(page, { untilX: 415, limitSec: 90 });
  await sleep(80);
  await shot("13-gate");
  log("gate:", JSON.stringify(gate));
  await goHome(page, sleep);

  // ── 지연을 준 주행 — 사람에 가까운 체감 ───────────────────────
  const laggy = [];
  for (const i of [1, 2]) {
    const name = await pickRunner(page, i, sleep);
    await enterStage(page, 0, sleep);
    const r = await autoplayUntil(page, { limitSec: 95, latencyMs: 150 });
    log(`laggy ${String(name).slice(0, 8)}:`, JSON.stringify(r));
    laggy.push({ name, r });
    await goHome(page, sleep);
  }
  await shot("14-after-laggy");

  // ── Endless — 기체별 기록이 따로 잡히는가 ────────────────────
  const modes2 = await page.$$(".mode");
  const locked = await page.evaluate((el) => el.disabled, modes2[1]);
  if (locked) throw new Error("Stage 를 클리어했는데 Endless 가 잠겨 있다");
  await pickRunner(page, 1, sleep);
  const modes3 = await page.$$(".mode");
  await modes3[1].click();
  await sleep(300);
  const endless = await autoplayUntil(page, { limitSec: 150 });
  log("endless(둔각):", JSON.stringify(endless));
  await sleep(400);
  await shot("15-endless-result");
  await goHome(page, sleep);
  await shot("16-home-after");

  // ── v2 마이그레이션 — 옛 진행도가 살아남는가 ──────────────────
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "wave-runner/meta/v2",
      JSON.stringify({
        cores: 500,
        presets: ["neutral", "keen", "swift"],
        axisCap: 3,
        fullPool: true,
        clearedStages: ["1:1", "1:2", "2:1"],
        bestStageSec: { "1:1": 71.5 },
        bestDistance: 4200,
        attempts: { "1:1": 9 }
      })
    );
  });
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(500);
  await shot("17-migrated-home");
  const migrated = await page.evaluate(() => {
    const v3 = JSON.parse(localStorage.getItem("wave-runner/meta/v3") || "null");
    return { v3, v2Kept: Boolean(localStorage.getItem("wave-runner/meta/v2")) };
  });
  log("migrated:", JSON.stringify(migrated));
  const m2 = await page.$$(".mode");
  await m2[0].click();
  await sleep(300);
  await shot("18-migrated-stages");

  log("summary:", JSON.stringify({ mids: runs.map((r) => r.mid), laggy: laggy.map((l) => l.r) }));
}
