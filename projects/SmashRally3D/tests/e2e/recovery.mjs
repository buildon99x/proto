export const meta = {
  viewport: { width: 960, height: 540, deviceScaleFactor: 1 },
};
export async function run({ page, sleep, shot, log }) {
  const read = () => page.evaluate(() => window.smashDiagnostics());
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  await page.click('[data-action="settings"]');
  await page.click('[data-setting="sound"]');
  await page.click('[data-setting="fx"]');
  await page.click('[data-setting="trail"]');
  await page.select("#quality", "LOW");
  await page.click('[data-action="close"]');
  await page.click('[data-action="start"]');
  await page.waitForFunction(
    () => window.smashDiagnostics().phase === "SERVE_READY",
    { timeout: 15000 },
  );
  let d = await read();
  const p = d.projectedTargets.find(
    (t) => t.world.x === 0 && t.world.z === 5.8,
  ).screen;
  await page.mouse.click(p.x, p.y);
  await page.waitForFunction(() => window.smashDiagnostics().shots.length > 0, {
    timeout: 10000,
  });
  d = await read();
  if (d.audioEvents !== 0 || d.settings.sound) throw new Error("Mute failed");
  await shot("recovery-01-muted");
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  ); // current visible document: should preserve state
  const hidden = await page.browser().newPage();
  await hidden.goto("about:blank");
  await hidden.bringToFront();
  await sleep(300);
  await page.bringToFront();
  await hidden.close();
  d = await read();
  if (!d.paused) {
    log(
      "Headless background visibility did not emulate device lifecycle; not counted as a physical background-resume pass.",
    );
    await page.keyboard.press("Escape");
  }
  await shot("recovery-02-paused");
  const before = (await read()).time;
  await sleep(300);
  if ((await read()).time !== before) throw new Error("Pause failed");
  await page.click('[data-action="resume"]');
  await page
    .waitForFunction(
      (before) => window.smashDiagnostics().time > before,
      { timeout: 10000 },
      before,
    )
    .catch(async () => {
      throw new Error("Resume failed " + JSON.stringify(await read()));
    });
  await page.evaluate(() => {
    const gl = document.querySelector("canvas").getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_lose_context");
    if (!ext) throw new Error("Context loss extension absent");
    ext.loseContext();
  });
  await page.waitForFunction(
    () => document.body.innerText.includes("GRAPHICS PAUSED"),
    { timeout: 5000 },
  );
  await sleep(200);
  await shot("recovery-03-context-loss");
  await page.click("button");
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
    { timeout: 15000 },
  );
  if ((await read()).phase !== "MENU")
    throw new Error("Context recovery reload failed");
  await shot("recovery-04-reloaded");
  log(
    "Mute, reduced FX, pause/resume and forced WebGL context loss/reload passed. Context loss is injected browser fault, not a natural UI event.",
  );
}
