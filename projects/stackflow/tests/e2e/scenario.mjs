// Stackflow playtest scenario (Korean UI) — exercises the stage-1 hook (a
// 3-link chain from the first drop), the rising tide, bank/press, tooltips,
// and the quick-buy flow.
//   pnpm playtest --project stackflow

export const meta = {
  viewport: { width: 1024, height: 800, deviceScaleFactor: 2 }
};

export async function run({ page, sleep, shot, clickText, log }) {
  await sleep(600);
  await shot("01-title");

  // Blockipedia + settings from the title screen (Korean labels).
  await clickText("블록도감");
  await sleep(300);
  await shot("02-blockipedia");
  await clickText("뒤로");
  await sleep(200);
  await clickText("설정");
  await sleep(300);
  await shot("03-settings");
  await clickText("뒤로");
  await sleep(200);

  // Start a run → stage 1 with the seeded hook board.
  await clickText("게임 시작");
  await sleep(500);
  await shot("04-stage1");

  // Real hover over a HUD item so the CSS :hover tooltip renders (localization
  // check — each item explains itself).
  await page.hover(".meter-label");
  await sleep(300);
  await shot("04b-tooltip");

  // The scripted first piece is a color-A I piece. Rotate vertical,
  // slide to the drop lane (col 1), drop → 3-link chain.
  await page.keyboard.press("ArrowUp");
  await sleep(120);
  await page.keyboard.press("ArrowLeft");
  await sleep(120);
  await page.keyboard.press("ArrowLeft");
  await sleep(120);
  await page.keyboard.press("Space");
  await sleep(700);
  await shot("05-chain-cascade");
  await sleep(2600);
  await shot("06-bank-press");

  const banked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes("뱅크")
    );
    if (btn) btn.click();
    return !!btn;
  });
  log("bank clicked:", banked);
  await sleep(400);
  await shot("07-quickbuy");

  const skipped = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes("건너뛰기")
    );
    if (btn) btn.click();
    return !!btn;
  });
  log("skip clicked:", skipped);
  await sleep(400);
  await shot("08-stage2");

  // A few free-play drops on stage 2 to exercise the rising tide + HUD.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press(i % 2 ? "ArrowLeft" : "ArrowRight");
    await sleep(80);
    await page.keyboard.press("Space");
    await sleep(500);
  }
  await shot("09-stage2-tide");

  const state = await page.evaluate(() => document.body.innerText.slice(0, 400));
  log("final HUD text:", state.replace(/\n+/g, " | ").slice(0, 200));
}
