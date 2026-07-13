import type { FactoryBlueprint, FactoryTheme } from "./blueprint";

const palettes: Record<FactoryTheme, { bg: string; panel: string; accent: string; accent2: string; ink: string }> = {
  warm: { bg: "#261a16", panel: "#fff4dc", accent: "#e86f32", accent2: "#f4b942", ink: "#2b1d16" },
  mystic: { bg: "#17142f", panel: "#f3efff", accent: "#7557d9", accent2: "#d88df0", ink: "#211a3a" },
  ocean: { bg: "#082b3a", panel: "#e8fbff", accent: "#0788a8", accent2: "#58d2cc", ink: "#102f38" },
  forest: { bg: "#173025", panel: "#f0f8df", accent: "#3a8b55", accent2: "#a4c957", ink: "#183225" },
  neon: { bg: "#11121b", panel: "#f3f4ff", accent: "#6a5cff", accent2: "#ff4fb3", ink: "#171827" }
};

export function renderApp(blueprint: FactoryBlueprint) {
  const encoded = JSON.stringify(blueprint, null, 2);
  return `import { useState } from "react";

const blueprint = ${encoded} as const;
const progressTarget = 5;

export default function App() {
  const [resource, setResource] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [power, setPower] = useState(1);
  const [upgraded, setUpgraded] = useState(false);

  const success = completed >= blueprint.goalCount && upgraded;

  function act() {
    if (success) return;
    setResource((value) => value + blueprint.rewardPerAction);
    setProgress((value) => {
      const next = value + power;
      if (next >= progressTarget) {
        setCompleted((count) => Math.min(blueprint.goalCount, count + 1));
        return 0;
      }
      return next;
    });
  }

  function upgrade() {
    if (upgraded || resource < blueprint.upgradeCost) return;
    setResource((value) => value - blueprint.upgradeCost);
    setPower(2);
    setUpgraded(true);
  }

  function reset() {
    setResource(0);
    setProgress(0);
    setCompleted(0);
    setPower(1);
    setUpgraded(false);
  }

  return (
    <main className="factory-app theme-${blueprint.theme}">
      <header>
        <p className="eyebrow">AI Prototype Factory · playable proof</p>
        <h1>{blueprint.name}</h1>
        <p className="pitch">{blueprint.pitch}</p>
      </header>

      <section className="goal-card" aria-label="현재 목표">
        <span>현재 목표</span>
        <strong>{blueprint.playerGoal}</strong>
      </section>

      <section className="dashboard">
        <article>
          <span>{blueprint.resourceName}</span>
          <strong data-factory="resource">{resource}</strong>
        </article>
        <article>
          <span>완성한 {blueprint.itemName}</span>
          <strong data-factory="completed">{completed} / {blueprint.goalCount}</strong>
        </article>
        <article>
          <span>작업 효율</span>
          <strong data-factory="power">x{power}</strong>
        </article>
      </section>

      <section className="workbench">
        <div className="progress-copy">
          <span>다음 {blueprint.itemName}</span>
          <strong>{Math.round((progress / progressTarget) * 100)}%</strong>
        </div>
        <div className="progress-track"><span style={{ width: \`${"${(progress / progressTarget) * 100}"}%\` }} /></div>
        <button data-factory="action" className="primary-action" type="button" onClick={act} disabled={success}>
          {success ? "목표 완료" : blueprint.actionLabel}
          <small>클릭당 {blueprint.resourceName} +{blueprint.rewardPerAction} · 진행 +{power}</small>
        </button>
      </section>

      <section className="upgrade-card">
        <div>
          <span>효율 강화</span>
          <strong>{upgraded ? "강화 완료 · 작업 속도 x2" : \`${"${blueprint.resourceName} ${blueprint.upgradeCost}"} 필요\`}</strong>
        </div>
        <button data-factory="upgrade" type="button" onClick={upgrade} disabled={upgraded || resource < blueprint.upgradeCost}>
          {upgraded ? "완료" : "강화하기"}
        </button>
      </section>

      <section className={success ? "result success" : "result"} data-factory="status">
        <strong>{success ? blueprint.successMessage : "행동 → 보상 → 강화 → 목표 완료의 짧은 루프를 체험하세요."}</strong>
        {success ? <button data-factory="reset" type="button" onClick={reset}>다시 시작</button> : null}
      </section>
    </main>
  );
}
`;
}

export function renderStyles(theme: FactoryTheme) {
  const palette = palettes[theme];
  return `:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: ${palette.ink};
  background: ${palette.bg};
  font-synthesis: none;
}

* { box-sizing: border-box; }
body { margin: 0; }
button { font: inherit; }

.factory-app {
  min-height: 100vh;
  display: grid;
  align-content: center;
  gap: 16px;
  width: min(860px, 100%);
  margin: 0 auto;
  padding: 32px 20px;
}

header, .goal-card, .dashboard article, .workbench, .upgrade-card, .result {
  border: 1px solid color-mix(in srgb, ${palette.accent} 24%, transparent);
  border-radius: 18px;
  background: ${palette.panel};
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
}

header { padding: 28px; }
.eyebrow { margin: 0 0 8px; color: ${palette.accent}; font-size: 12px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(34px, 7vw, 62px); line-height: 1; }
.pitch { max-width: 680px; margin: 14px 0 0; color: color-mix(in srgb, ${palette.ink} 68%, transparent); font-size: 17px; line-height: 1.6; }

.goal-card { display: grid; gap: 5px; padding: 16px 20px; background: linear-gradient(135deg, ${palette.accent}, ${palette.accent2}); color: white; }
.goal-card span { font-size: 12px; font-weight: 800; opacity: 0.82; }
.goal-card strong { font-size: 18px; }

.dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.dashboard article { display: grid; gap: 7px; padding: 18px; }
.dashboard span, .upgrade-card span { color: color-mix(in srgb, ${palette.ink} 62%, transparent); font-size: 12px; font-weight: 800; }
.dashboard strong { font-size: 27px; }

.workbench { display: grid; gap: 14px; padding: 22px; }
.progress-copy { display: flex; justify-content: space-between; gap: 16px; }
.progress-track { height: 14px; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, ${palette.ink} 16%, transparent); }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, ${palette.accent}, ${palette.accent2}); transition: width 150ms ease; }

button { min-height: 48px; border: 0; border-radius: 12px; padding: 10px 16px; color: white; background: ${palette.accent}; cursor: pointer; font-weight: 900; }
button:disabled { cursor: default; opacity: 0.48; }
.primary-action { min-height: 94px; display: grid; place-items: center; gap: 4px; font-size: 22px; background: linear-gradient(135deg, ${palette.accent}, ${palette.accent2}); }
.primary-action small { font-size: 12px; font-weight: 700; opacity: 0.86; }

.upgrade-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; }
.upgrade-card div { display: grid; gap: 5px; }
.result { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; }
.result.success { color: white; background: linear-gradient(135deg, ${palette.accent}, ${palette.accent2}); }
.result.success button { color: ${palette.ink}; background: white; }

@media (max-width: 620px) {
  .factory-app { padding: 14px; align-content: start; }
  header { padding: 22px; }
  .dashboard { grid-template-columns: 1fr; }
  .upgrade-card, .result { align-items: stretch; flex-direction: column; }
  .upgrade-card button, .result button { width: 100%; }
}
`;
}

export function renderBrief(blueprint: FactoryBlueprint) {
  return `# ${blueprint.name} Brief\n\n## 아이디어\n\n${blueprint.pitch}\n\n## 플레이어 목표\n\n${blueprint.playerGoal}\n\n## 핵심 루프\n\n1. **${blueprint.actionLabel}** 행동으로 ${blueprint.resourceName}과 진행도를 얻는다.\n2. ${blueprint.resourceName} ${blueprint.upgradeCost}을 사용해 작업 효율을 강화한다.\n3. ${blueprint.itemName} ${blueprint.goalCount}개를 완성해 첫 운영 사이클을 끝낸다.\n\n## 프로토타입 성공 기준\n\n- 첫 화면에서 목표와 주 행동을 즉시 이해할 수 있다.\n- 행동, 보상, 강화, 완료가 한 화면에서 연결된다.\n- 2분 이내에 성공 상태에 도달할 수 있다.\n`;
}

export function renderSpec(blueprint: FactoryBlueprint) {
  return `# ${blueprint.name} Spec\n\n## 런타임\n\n- Vite + React + TypeScript 단일 화면 앱\n- 정적 artifact를 launcher iframe에서 실행\n- AI Prototype Factory blueprint schema v1\n\n## 상태\n\n- \`resource\`: 보유 ${blueprint.resourceName}\n- \`progress\`: 다음 ${blueprint.itemName} 진행도\n- \`completed\`: 완성한 ${blueprint.itemName} 수\n- \`power\`: 클릭당 진행 효율\n- \`upgraded\`: 효율 강화 구매 여부\n\n## 규칙\n\n- 주 행동 1회당 ${blueprint.resourceName} +${blueprint.rewardPerAction}\n- 진행도 5를 채우면 ${blueprint.itemName} 1개 완성\n- 강화 비용은 ${blueprint.resourceName} ${blueprint.upgradeCost}, 효율은 x2\n- ${blueprint.itemName} ${blueprint.goalCount}개와 강화 1회를 모두 달성하면 성공\n`;
}

export function renderEval(blueprint: FactoryBlueprint) {
  return `# ${blueprint.name} Eval\n\n## 자동 E2E\n\n1. 초기 목표, 자원, 주 행동이 표시된다.\n2. 행동 반복으로 ${blueprint.resourceName}이 증가한다.\n3. 강화 버튼이 활성화되고 구매 후 효율이 x2가 된다.\n4. ${blueprint.itemName} ${blueprint.goalCount}개를 완성하면 성공 메시지가 표시된다.\n5. 다시 시작 버튼이 나타난다.\n6. 390px 모바일 화면에서 가로 넘침이 없다.\n7. 페이지와 콘솔 오류가 없다.\n\n## 명령\n\n- \`pnpm --filter ${blueprint.slug} test\`\n- \`node scripts/playtest/run.mjs --project ${blueprint.slug} --no-build --strict\`\n`;
}

export function renderReadme(blueprint: FactoryBlueprint) {
  return `# ${blueprint.name}\n\n${blueprint.pitch}\n\nAI Prototype Factory가 생성한 실행 가능한 마이크로 프로토타입입니다.\n\n## Run\n\n\`\`\`bash\npnpm --filter ${blueprint.slug} dev\n\`\`\`\n`;
}

export function renderScenario(blueprint: FactoryBlueprint) {
  return `import { mkdir, writeFile } from "node:fs/promises";
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
    project: ${JSON.stringify(blueprint.slug)},
    initialResource,
    finalResource,
    resourceIncreased: finalResource > initialResource,
    upgraded,
    goalReached: true,
    mobileOverflow,
    capturedAt: new Date().toISOString()
  };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "factory-metrics.json"), JSON.stringify(metrics, null, 2) + "\\n");
  log("factory metrics", metrics);
}
`;
}
