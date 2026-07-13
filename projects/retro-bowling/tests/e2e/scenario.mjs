// Retro Bowling 자동 플레이테스트 시나리오.
// 키보드로 타이틀 → 게임 진행(여러 프레임) → 게임오버까지 구동하며 캡처.

export const meta = {
  viewport: { width: 480, height: 720, deviceScaleFactor: 2 }
};

const getState = (page) =>
  page.evaluate(() => {
    const g = window.__bowling;
    if (!g) return null;
    return { phase: g.phase, frameIndex: g.frameIndex, total: g.score.total, banner: g.banner?.text ?? null };
  });

async function waitPhase(page, sleep, pred, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const s = await getState(page);
    if (s && pred(s)) return s;
    await sleep(60);
  }
  return await getState(page);
}

async function tap(page, sleep, ms = 160) {
  await page.keyboard.press(" ");
  await sleep(ms);
}

// 한 번의 투구: aim → power → spin → 굴림 완료까지.
async function throwBall(page, sleep, aimNudge = 0) {
  await waitPhase(page, sleep, (s) => s.phase === "aim" || s.phase === "gameover");
  let s = await getState(page);
  if (!s || s.phase === "gameover") return s;
  // 조준 살짝 조정.
  for (let i = 0; i < Math.abs(aimNudge); i++) {
    await page.keyboard.press(aimNudge < 0 ? "ArrowLeft" : "ArrowRight");
    await sleep(30);
  }
  await tap(page, sleep, 220); // aim -> power (파워 미터가 어느 정도 차오른 시점)
  await tap(page, sleep, 120); // power lock -> spin
  await tap(page, sleep, 40); // spin lock -> throw
  // 굴림 종료 대기(다시 aim 이거나 gameover).
  s = await waitPhase(page, sleep, (st) => st.phase === "aim" || st.phase === "gameover", 9000);
  return s;
}

export async function run({ page, sleep, shot, log }) {
  await sleep(600);
  await shot("01-title");

  // 시작.
  await page.keyboard.press(" ");
  await waitPhase(page, sleep, (s) => s.phase === "aim");
  await sleep(300);
  await shot("02-aim");

  // 파워 미터 캡처를 위해 한 프레임은 수동 단계 캡처.
  await page.keyboard.press(" "); // -> power
  await sleep(250);
  await shot("03-power-meter");
  await page.keyboard.press(" "); // -> spin
  await sleep(150);
  await shot("04-spin-meter");
  await page.keyboard.press(" "); // -> throw
  await sleep(700);
  await shot("05-rolling");
  await waitPhase(page, sleep, (s) => s.phase === "aim" || s.phase === "gameover", 9000);
  await sleep(200);
  await shot("06-after-first");

  // 나머지 프레임 자동 진행.
  let guard = 0;
  const nudges = [0, -3, 3, -1, 2, 0, -2, 1, 3, -3, 0, 1];
  while (guard < 40) {
    const s = await getState(page);
    if (!s) break;
    if (s.phase === "gameover") break;
    await throwBall(page, sleep, nudges[guard % nudges.length]);
    guard++;
    if (guard === 6) await shot("07-midgame");
  }

  const finalState = await waitPhase(page, sleep, (s) => s.phase === "gameover", 6000);
  await sleep(400);
  await shot("08-gameover");
  log("final:", JSON.stringify(finalState));

  if (!finalState || finalState.phase !== "gameover") {
    throw new Error("게임이 게임오버까지 진행되지 않았습니다: " + JSON.stringify(finalState));
  }
}
