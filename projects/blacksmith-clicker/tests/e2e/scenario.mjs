import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const meta = {
  viewport: { width: 1440, height: 1000, deviceScaleFactor: 1 }
};

const projectRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");
const outDir = path.join(projectRoot, "assets", "screenshots", "shots");

function parseGold(text) {
  return Number(text.replace(/[^0-9]/g, ""));
}

async function craftWeapon(page, sleep) {
  let clicks = 0;
  while (!(await page.$("[role=dialog]")) && clicks < 30) {
    await page.click(".forge-button");
    clicks += 1;
    await sleep(35);
  }
  if (!(await page.$("[role=dialog]"))) {
    throw new Error("30회 클릭 안에 무기가 완성되지 않았습니다.");
  }
  return clicks;
}

export async function run({ page, sleep, shot, log }) {
  await sleep(400);
  await shot("director-01-first-screen");

  const initial = await page.evaluate(() => {
    function isVisible(selector, expectedText = "") {
      const element = document.querySelector(selector);
      if (!element || !element.textContent?.includes(expectedText)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }

    return {
      onboardingVisible: isVisible("[data-director=onboarding]", "모루를 클릭"),
      remainingClicksVisible: isVisible("[data-director=remaining-clicks]", "회 남음"),
      affordableUpgrades: document.querySelectorAll(".upgrade-button:not(:disabled)").length,
      upgradeGoalVisible: isVisible("[data-director=upgrade-goal]"),
      upgradeGoalText: document.querySelector("[data-director=upgrade-goal]")?.textContent?.trim() ?? "",
      goldText: document.querySelector(".gold-card strong")?.textContent ?? ""
    };
  });

  const clicksToFirstCraft = await craftWeapon(page, sleep);

  await sleep(250);
  await shot("director-02-first-result");
  const result = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll(".modal-actions button")];
    const recommendation = document.querySelector("[data-director=recommendation]");
    return {
      actionCount: buttons.length,
      explainedActions: buttons.filter((button) => {
        const explanation = button.querySelector("small");
        return visible(explanation) && Boolean(explanation?.textContent?.trim());
      }).length,
      recommendationVisible: visible(recommendation) && Boolean(recommendation?.textContent?.trim()),
      recommendedAction: recommendation?.textContent?.includes("분해") ? "분해" : "unknown",
      actionLabels: buttons.map((button) => button.textContent?.trim() ?? "")
    };

    function visible(element) {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    }
  });

  const ironBeforeSalvage = Number(
    await page.$eval(".material-row:first-of-type strong", (element) => element.textContent ?? "0")
  );
  await page.click(".modal-actions button:nth-child(2)");
  await sleep(200);
  const ironAfterSalvage = Number(
    await page.$eval(".material-row:first-of-type strong", (element) => element.textContent ?? "0")
  );
  const recommendationExecuted = result.recommendedAction === "분해" && ironAfterSalvage > ironBeforeSalvage;

  const clicksToSecondCraft = await craftWeapon(page, sleep);
  const goldBeforeSale = parseGold(initial.goldText);
  await page.click(".modal-actions button:first-child");
  await sleep(250);
  const goldAfterSale = parseGold(
    await page.$eval(".gold-card strong", (element) => element.textContent ?? "")
  );
  await shot("director-03-after-sale");

  const upgradeBefore = await page.$eval(".upgrade-button:first-child b", (element) => element.textContent ?? "");
  await page.click(".upgrade-button:first-child");
  await sleep(150);
  const upgradeAfter = await page.$eval(".upgrade-button:first-child b", (element) => element.textContent ?? "");
  const upgradePurchased = upgradeBefore !== upgradeAfter;

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.reload({ waitUntil: "networkidle0" });
  await sleep(250);
  await craftWeapon(page, sleep);
  await sleep(150);
  const mobileHasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth
  );
  const mobileModalActionsReachable = await page.evaluate(() => {
    const modal = document.querySelector(".result-modal");
    const lastAction = document.querySelector(".modal-actions button:last-child");
    if (!modal || !lastAction) return false;
    modal.scrollTop = modal.scrollHeight;
    const modalRect = modal.getBoundingClientRect();
    const actionRect = lastAction.getBoundingClientRect();
    return actionRect.bottom <= modalRect.bottom + 1 && actionRect.top >= modalRect.top - 1;
  });
  await shot("director-04-mobile");

  const metrics = {
    project: "blacksmith-clicker",
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    onboardingVisible: initial.onboardingVisible,
    remainingClicksVisible: initial.remainingClicksVisible,
    clicksToFirstCraft,
    clicksToSecondCraft,
    craftCompleted: true,
    actionCount: result.actionCount,
    explainedActions: result.explainedActions,
    recommendationVisible: result.recommendationVisible,
    recommendedAction: result.recommendedAction,
    recommendationExecuted,
    actionLabels: result.actionLabels,
    goldBeforeSale,
    goldAfterSale,
    saleIncreasedGold: goldAfterSale > goldBeforeSale,
    affordableUpgrades: initial.affordableUpgrades,
    upgradeGoalVisible: initial.upgradeGoalVisible,
    upgradeGoalText: initial.upgradeGoalText,
    upgradePurchased,
    mobileHasHorizontalOverflow,
    mobileModalActionsReachable
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "gameplay-metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);
  log("게임 디렉터 계측:", metrics);
}
