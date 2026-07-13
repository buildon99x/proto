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
      aimX: g.aimX,
      standing: g.pins.filter((p) => !p.removed).length,
      target: g.targetLabel(),
      recAim: g.recommendedAimX(),
      meterMul: g.meterMul()
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

// 한 번의 투구: 조준 → 스윗스팟 타이밍(파워≈0.73, 스핀≈-0.1) → 굴림 완료.
// targetAim 이 null 이면 엔진 추천 조준(스페어 시 잔핀 중심)을 따른다.
async function throwBall(page, sleep, targetAim) {
  await waitPhase(page, sleep, (s) => s.phase === "aim" || s.phase === "gameover");
  let s = await getState(page);
  if (!s || s.phase === "gameover") return s;
  const aim = targetAim == null ? s.recAim : targetAim;
  await aimTo(page, sleep, aim);
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
  let gotSpare = false;
  let gotLate = false;
  const aims = [30, 30, 29.5, 30.5, 30, 29.5, 30, 30.5, 30, 29.5];
  while (guard < 40) {
    const s = await getState(page);
    if (!s) break;
    if (s.phase === "gameover") break;

    // 스페어/스플릿 조준(부분 랙) 캡처 — 적응형 마커 확인.
    if (!gotSpare && s.phase === "aim" && s.standing < 10 && s.standing > 0) {
      await sleep(180);
      await shot("09-spare-aim");
      gotSpare = true;
    }
    // 후반 프레임(난이도 램프 SPD 표시) 캡처.
    if (!gotLate && s.phase === "aim" && s.frameIndex >= 8) {
      await sleep(120);
      await shot("10-late-frame-speed");
      gotLate = true;
    }

    // 스페어(부분 랙)면 엔진 추천 조준을 따르고, 아니면 포켓 조준.
    const target = s.standing < 10 && s.standing > 0 ? null : aims[guard % aims.length];
    await throwBall(page, sleep, target);
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
