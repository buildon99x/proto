// Stackflow playtest scenario — exercises the stage-1 hook (a 3-link
// chain from the first drop), bank/press, and the quick-buy flow.
//   pnpm playtest --project stackflow

export const meta = {
  viewport: { width: 1024, height: 800, deviceScaleFactor: 2 }
};

export async function run({ page, sleep, shot, clickText, log }) {
  await sleep(600);
  await shot("01-title");

  // Blockipedia + settings from the title screen.
  await clickText("Blockipedia");
  await sleep(300);
  await shot("02-blockipedia");
  await clickText("Back");
  await sleep(200);
  await clickText("Settings");
  await sleep(300);
  await shot("03-settings");
  await clickText("Back");
  await sleep(200);

  // Start a run → stage 1 with the seeded hook board.
  await clickText("Start Run");
  await sleep(500);
  await shot("04-stage1");

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
      b.textContent.includes("Bank")
    );
    if (btn) btn.click();
    return !!btn;
  });
  log("bank clicked:", banked);
  await sleep(400);
  await shot("07-quickbuy");

  const skipped = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Skip")
    );
    if (btn) btn.click();
    return !!btn;
  });
  log("skip clicked:", skipped);
  await sleep(400);
  await shot("08-stage2");

  // A few free-play drops on stage 2 to exercise gravity + HUD.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press(i % 2 ? "ArrowLeft" : "ArrowRight");
    await sleep(80);
    await page.keyboard.press("Space");
    await sleep(500);
  }
  await shot("09-stage2-play");

  const state = await page.evaluate(() => document.body.innerText.slice(0, 400));
  log("final HUD text:", state.replace(/\n+/g, " | ").slice(0, 200));
}
