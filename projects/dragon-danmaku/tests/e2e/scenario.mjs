// 용린난무 플레이테스트 시나리오 — playtest 하니스가 호출한다.
//   pnpm playtest --project dragon-danmaku
//
// `meta`로 뷰포트를, `run(helpers)`로 화면 플로우를 정의한다.
// helpers: { page, sleep, shot, clickText, log, baseUrl }

export const meta = {
  // 종스크롤 STG → 세로 뷰포트.
  viewport: { width: 520, height: 820, deviceScaleFactor: 2 }
};

export async function run({ page, sleep, shot, clickText, log }) {
  await sleep(600);
  await shot("01-title");

  await clickText("게임 시작");
  await sleep(400);
  await shot("02-dragon-select");

  await clickText("난이도 선택");
  await sleep(400);
  await shot("03-difficulty-select");

  // 출격 → 인게임.
  await clickText("출격");
  await sleep(2500);
  await shot("04-ingame-early");

  // 잠깐 플레이: 이동 + 레이저(빔) 홀드 + 연환 쌓기.
  await page.keyboard.down("ArrowLeft");
  await sleep(450);
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.down("ShiftLeft");
  await sleep(700);
  await page.keyboard.up("ShiftLeft");
  await sleep(3500);
  await shot("05-ingame-chain");

  // 봄(포효) 발동.
  await page.keyboard.press("KeyX");
  await sleep(250);
  await shot("06-bomb");

  // 보스 구간까지 진행.
  await sleep(9000);
  await shot("07-ingame-later");

  // 각성(광룡화): 게이지가 차면 발동.
  for (let i = 0; i < 80; i++) {
    const ready = await page.evaluate(
      () => document.querySelector(".awaken-meter span")?.textContent?.includes("READY") ?? false
    );
    if (ready) break;
    await page.keyboard.press(i % 2 ? "KeyD" : "KeyA");
    await sleep(220);
  }
  await page.keyboard.press("Space");
  await sleep(250);
  const awakening = await page.evaluate(() => document.querySelector(".awaken-meter")?.classList.contains("on"));
  log("각성 활성:", awakening);
  await shot("08-awaken");

  // 일시정지 → 포기 → 리절트.
  await page.keyboard.press("Escape");
  await sleep(400);
  await shot("09-pause");
  await clickText("포기하고 리절트로");
  await sleep(800);
  await shot("10-result");

  // 용소 허브(해금).
  await clickText("용소로");
  await sleep(500);
  await shot("11-hub");
}
