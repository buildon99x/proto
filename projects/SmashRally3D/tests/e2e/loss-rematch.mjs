export const meta = { viewport: { width: 960, height: 540 } };
export async function run({ page, sleep, shot, log }) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  await page.select("#difficulty", "NORMAL");
  await page.click('[data-action="start"]');
  await page.waitForFunction(
    () => window.smashDiagnostics().phase === "SERVE_READY",
    { timeout: 15000 },
  );
  const p = await page.evaluate(
    () =>
      window
        .smashDiagnostics()
        .projectedTargets.find((t) => t.world.x === 0 && t.world.z === 5.8)
        .screen,
  );
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(
    () => window.smashDiagnostics().phase === "RESULTS",
    { timeout: 180000, polling: 100 },
  );
  const d = await page.evaluate(() => window.smashDiagnostics());
  if (
    d.scores[1] !== 5 ||
    !(await page.$eval("body", (e) => e.innerText.includes("KEEP RALLYING")))
  )
    throw new Error("Loss result absent");
  await shot("loss-normal-results");
  await page.click('[data-action="start"]');
  await page.waitForFunction(
    () => window.smashDiagnostics().phase === "SERVE_READY",
    { timeout: 15000 },
  );
  const next = await page.evaluate(() => window.smashDiagnostics());
  if (next.impactVisible || next.audioEvents !== 0)
    throw new Error("Phantom impact after match reset");
  if (next.scores.some((x) => x !== 0))
    throw new Error("Rematch score reset failed");
  await shot("loss-rematch-ready");
  log(
    "Natural UI loss and PLAY AGAIN",
    JSON.stringify({ scores: d.scores, points: d.points, rematch: next.phase }),
  );
  log(
    "One normal opening serve, then deliberately no return inputs; this checks losing result/rematch only, not tactical play. No state injection.",
  );
  await sleep(50);
}
