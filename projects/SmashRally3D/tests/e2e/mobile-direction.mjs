export const meta = {
  viewport: {
    width: 844,
    height: 390,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  },
};
export async function run({ page, sleep, shot, log }) {
  await page.waitForFunction(
    () => typeof window.smashDiagnostics === "function",
  );
  const read = () => page.evaluate(() => window.smashDiagnostics());
  await page.click('[data-action="settings"]');
  await page.select("#quality", process.env.SMASH_DIRECTION_QUALITY || "LOW");
  await page.click('[data-action="close"]');
  await page.select("#difficulty", "EASY");
  await page.click('[data-action="start"]');
  await page.click('[data-shot="clear"]');
  await page.waitForFunction(
    () => window.smashDiagnostics().phase === "SERVE_READY",
  );
  let d = await read();
  const serve = d.projectedTargets.find(
    (p) => p.world.x === 0 && p.world.z === 5.8,
  ).screen;
  await page.touchscreen.tap(serve.x, serve.y);
  const client = await page.createCDPSession(),
    results = [];
  for (const c of [
    { name: "tap-left", x: -1.8, dx: 0, dy: 0, intent: "clear" },
    { name: "tap-right", x: 1.8, dx: 0, dy: 0, intent: "clear" },
    { name: "horizontal", x: 0, dx: 42, dy: 0, intent: "clear" },
    { name: "diagonal", x: 0, dx: 42, dy: 26, intent: "drop" },
  ]) {
    await page.waitForFunction(
      () => document.querySelector("#timing")?.textContent.includes("HIT NOW"),
      { timeout: 30000 },
    );
    d = await read();
    const before = d.shots.filter((h) => h.actor === 0).length,
      p = d.projectedTargets.find(
        (p) => p.world.x === c.x && p.world.z === 5.8,
      ).screen;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: p.x, y: p.y }],
    });
    await sleep(20);
    if (c.dx || c.dy)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: p.x + c.dx, y: p.y + c.dy }],
      });
    await sleep(15);
    const classified = await read();
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForFunction(
      (n) =>
        window.smashDiagnostics().shots.filter((h) => h.actor === 0).length > n,
      { timeout: 15000 },
      before,
    );
    const after = await read(),
      h = after.shots.filter((h) => h.actor === 0).at(-1);
    log(
      "DIRECTION CASE",
      JSON.stringify({
        case: c,
        input: classified.lastInput,
        classifiedTime: classified.time,
        contactAt: classified.contactAt,
        actual: {
          shot: h.shot,
          technique: h.technique,
          time: h.time,
          target: h.target,
        },
      }),
    );
    if (!classified.lastInput.accepted)
      throw Error(
        "Gesture classification arrived outside the accepted preparation window",
      );
    if (classified.lastInput.shotIntent !== c.intent)
      throw Error("unexpected classification " + c.name);
    if (Math.abs(classified.lastInput.target.x - c.x) > 0.05)
      throw Error("start aim moved");
    if (
      (c.intent === "clear" && h.shot !== "clear") ||
      (c.intent === "drop" && h.shot !== "drop")
    )
      throw Error("actual hit differs from classified gesture");
    results.push({
      case: c,
      input: classified.lastInput,
      hit: {
        p: h.p,
        target: h.target,
        velocity: h.velocity,
        shot: h.shot,
        technique: h.technique,
        quality: h.quality,
      },
    });
    if (c.name === "diagonal") await shot("drop-defence-mobile-diagonal");
    await page.waitForFunction(
      () => !document.querySelector("#timing")?.textContent.includes("HIT NOW"),
    );
  }
  log(
    "MOBILE DIRECTION PASS",
    JSON.stringify({
      method:
        "Actual native CDP touch gestures at visible cue and actual emitted player hits; existing controls unchanged. Horizontal drag is currently ignored; diagonal dy26 crosses existing22px vertical classification threshold.",
      results,
    }),
  );
}
