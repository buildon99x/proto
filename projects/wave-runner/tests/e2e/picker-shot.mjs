// 피커와 스테이지 목록의 가독성만 본다.
// 타깃 해상도 그대로 본다. 860 으로 찍으면 접힘 아래로 밀린 것이 안 보인다.
export const meta = { viewport: { width: 390, height: 720, deviceScaleFactor: 2 } };

export async function run({ page, sleep, shot }) {
  await sleep(400);
  await shot("30-picker");

  // 기체별 클리어를 심어 목록 표시를 본다 — 여기서 보려는 것은 표시이지 클리어가 아니다.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("wave-runner/meta/v3") || "null") || {
      version: 3, cores: 0, runner: "dart", axisCap: 2, fullPool: false,
      clearedStages: [], bestStageSec: {}, bestDistance: {}, attempts: {}
    };
    raw.clearedStages = ["dart:1:1", "blunt:1:1", "spike:1:1", "ring:1:1", "dart:1:2", "ring:1:2", "spike:2:1"];
    raw.bestStageSec = { "dart:1:1": 73.0, "dart:1:2": 74.1 };
    raw.attempts = { "dart:1:1": 3 };
    localStorage.setItem("wave-runner/meta/v3", JSON.stringify(raw));
  });
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(400);
  const modes = await page.$$(".mode");
  await modes[0].click();
  await sleep(300);
  await shot("31-stage-slots");

  // 기체를 바꾸면 현재 기체 표시와 슬롯의 링이 함께 옮겨가는가
  const back = await page.$(".link.back");
  await back.click();
  await sleep(250);
  const chips = await page.$$(".chip.runner");
  if (chips.length > 2) {
    await chips[2].click();
    await sleep(250);
    await shot("32-picker-spike");
    const modes2 = await page.$$(".mode");
    await modes2[0].click();
    await sleep(300);
    await shot("33-stage-slots-spike");
  }
}
