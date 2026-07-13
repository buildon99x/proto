// Retro Bowling 자동 플레이테스트 시나리오.
// 키보드로 타이틀 → 게임 진행(여러 프레임) → 게임오버까지 구동하며 캡처.

export const meta = {
  viewport: { width: 480, height: 720, deviceScaleFactor: 2 }
};

const getState = (page) =>
  page.evaluate(() => {
    const g = window.__bowling;
    if (!g) return null;
    return {
      phase: g.phase,
      frameIndex: g.frameIndex,
      total: g.score.total,
      banner: g.banner?.text ?? null,
      aimX: g.aimX
    };
  });

// 조준을 targetX 근처로 이동(키 홀드).
async function aimTo(page, sleep, targetX) {
  for (let i = 0; i < 30; i++) {
    const s = await getState(page);
    if (!s || s.phase !== "aim") return;
    const d = targetX - s.aimX;
    if (Math.abs(d) < 0.4) return;
    const key = d > 0 ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(key);
    await sleep(50);
    await page.keyboard.up(key);
    await sleep(20);
  }
}

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

// 한 번의 투구: 포켓 조준 → 스윗스팟 타이밍(파워≈0.73, 스핀≈-0.1) → 굴림 완료.
async function throwBall(page, sleep, targetAim = 30) {
  await waitPhase(page, sleep, (s) => s.phase === "aim" || s.phase === "gameover");
  let s = await getState(page);
  if (!s || s.phase === "gameover") return s;
  await aimTo(page, sleep, targetAim);
  await page.keyboard.press(" "); // aim -> power (meterT=0)
  await sleep(300); // 파워 스윗스팟(≈0.73) 근처에서 락
  await page.keyboard.press(" "); // power -> spin (meterT=0)
  await sleep(150); // 스핀 스윗스팟(≈-0.1) 근처에서 락 + 투구
  await page.keyboard.press(" ");
  s = await waitPhase(page, sleep, (st) => st.phase === "aim" || st.phase === "gameover", 9000);
  return s;
}

export async function run({ page, sleep, shot, log }) {
  await sleep(600);
  await shot("01-title");

  // 시작.
  await page.keyboard.press(" ");
  await waitPhase(page, sleep, (s) => s.phase === "aim");
  // 추천 포켓(약 x=30)으로 조준 → 궤도 프리뷰 + 마커 캡처.
  await aimTo(page, sleep, 30);
  await sleep(200);
  await shot("02-aim");

  // 파워 미터(스윗스팟 존) 캡처.
  await page.keyboard.press(" "); // -> power
  await sleep(250);
  await shot("03-power-meter");
  // 스핀 단계: 오실레이터가 도는 동안 훅 아크 프리뷰 캡처.
  await page.keyboard.press(" "); // -> spin
  await sleep(260);
  await shot("04-spin-arc");
  await page.keyboard.press(" "); // -> throw
  await sleep(400);
  await shot("05-rolling");
  await waitPhase(page, sleep, (s) => s.phase === "aim" || s.phase === "gameover", 9000);
  await sleep(200);
  await shot("06-after-first");

  // 나머지 프레임 자동 진행(포켓 조준 + 스윗스팟 타이밍).
  let guard = 0;
  const aims = [30, 30, 29.5, 30.5, 30, 29.5, 30, 30.5, 30, 29.5];
  while (guard < 40) {
    const s = await getState(page);
    if (!s) break;
    if (s.phase === "gameover") break;
    await throwBall(page, sleep, aims[guard % aims.length]);
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
