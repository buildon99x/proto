import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const meta = { viewport: { width: 1100, height: 900, deviceScaleFactor: 1 } };
const projectRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");
const outDir = path.join(projectRoot, "assets", "screenshots", "shots");

export async function run({ page, sleep, shot, log }) {
  await sleep(300);
  await shot("factory-01-initial");
  const initialResource = Number(await page.$eval("[data-factory=resource]", (el) => el.textContent ?? "0"));

  let safety = 0;
  while (await page.$eval("[data-factory=upgrade]", (el) => el.disabled) && safety < 30) {
    await page.click("[data-factory=action]");
    await sleep(30);
    safety += 1;
  }
  await page.click("[data-factory=upgrade]");
  await sleep(120);
  const upgraded = (await page.$eval("[data-factory=power]", (el) => el.textContent)) === "x2";
  await shot("factory-02-upgraded");

  safety = 0;
  while (!(await page.$("[data-factory=reset]")) && safety < 80) {
    await page.click("[data-factory=action]");
    await sleep(30);
    safety += 1;
  }
  if (!(await page.$("[data-factory=reset]"))) throw new Error("목표 완료 상태에 도달하지 못했습니다.");
  const finalResource = Number(await page.$eval("[data-factory=resource]", (el) => el.textContent ?? "0"));
  await shot("factory-03-success");

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(200);
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await shot("factory-04-mobile");

  const metrics = {
    project: "dragon-post-office",
    initialResource,
    finalResource,
    resourceIncreased: finalResource > initialResource,
    upgraded,
    goalReached: true,
    mobileOverflow,
    capturedAt: new Date().toISOString()
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "factory-metrics.json"), JSON.stringify(metrics, null, 2) + "\n");
  log("factory metrics", metrics);
}
