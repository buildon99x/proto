// 첫 실행 전체 흐름을 한 장으로 굽는다.
//
//   pnpm playtest --project wave-runner --scenario projects/wave-runner/tests/e2e/first-run.mjs
//
// 산출물은 `assets/screenshots/first-run-flow.png` 한 장이다. 프레임을 따로 남기지
// 않는 이유는 **한 순간은 한 번만 찍을 수 있기 때문**이다 — 하네스의 `shot()` 으로
// 파일을 쓰고 그 바이트를 다시 읽는 대신 base64 로 한 번만 받아 그대로 붙인다.
// 주행 중에는 두 번 찍으면 두 개의 다른 순간이 된다.
//
// 조작은 `autopilot.mjs` 다 — 판단도, 홀드를 실제 키 이벤트로 보내는 것도 시나리오와
// 공유한다. 완전한 상태 접근을 가지므로 **이 그림은 통과 가능성의 그림이지 난이도의
// 증거가 아니다.**

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drive, snapshot, until } from "./autopilot.mjs";

export const meta = {
  viewport: { width: 390, height: 720, deviceScaleFactor: 2 }
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "..", "assets", "screenshots", "first-run-flow.png");
const COLS = 4;
const PANEL_W = 268;

export async function run({ page, sleep, log }) {
  const frames = [];
  const shot = async (caption) => {
    const b64 = await page.screenshot({ encoding: "base64" });
    frames.push({ n: frames.length + 1, caption, b64 });
    log(`${frames.length}. ${JSON.stringify(await snapshot(page))} ${caption}`);
  };
  const tap = async () => {
    await page.mouse.down();
    await sleep(110);
    await page.mouse.up();
  };

  // 저장본이 아예 없는 사람. 하네스는 매번 새 프로필로 열지만 명시해 둔다 —
  // 이 시나리오의 전제 전체가 "처음 여는 사람" 이다.
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  await page.mouse.move(195, 360);
  await sleep(300);

  const isIntro = await page.$(".intro");
  if (!isIntro) throw new Error("첫 실행인데 안내가 뜨지 않았다");
  await shot("부팅. 홈이 아니라 안내가 먼저 뜬다");

  await page.mouse.down();
  await sleep(600);
  await shot("누르고 있으면 오른다 — 첫 칩에 ✓");

  await page.mouse.up();
  await sleep(800);
  const cue = await page.$eval(".intro-cue", (e) => e.textContent.trim());
  if (cue !== "누르면 첫 판이 시작된다") throw new Error(`두 동작을 익혔는데 출발 신호가 아니다: ${cue}`);
  await shot("놓으면 내려간다. 문구가 그대로 출발 신호가 된다");

  // 이 한 번의 누름이 안내를 끄고 첫 판을 연다 — 사이에 버튼이 없다는 것이 설계다.
  await tap();
  await sleep(500);
  if ((await snapshot(page)).phase !== "ready") throw new Error("안내를 끝냈는데 런이 열리지 않았다");
  await shot("같은 누름이 티어 1-1 을 연다. 사이에 버튼이 없다");

  // 출발한 뒤부터는 오토파일럿이 조종한다.
  await page.mouse.down();
  await sleep(80);
  await page.mouse.up();
  await drive(page, true);
  await sleep(1800);
  await shot("주행. 화면에 남는 것은 맨 위 레일과 좌상단 경과뿐");

  if (!(await until(page, (s) => s.leadIn || s.gates > 0))) throw new Error("첫 갈림길에 닿지 못했다");
  await shot("첫 갈림길. 리드인 동안 표식이 화면 우측 끝에 핀으로 선다");

  if (!(await until(page, (s) => s.gates >= 1))) throw new Error("게이트를 지나지 못했다");
  await sleep(140);
  await shot("관을 지난 순간 교환 확정 — 오른 축의 색으로 고리가 퍼진다");

  // 손을 떼면 죽는다. 첫 사망은 대부분 이렇게 온다.
  await drive(page, false);
  if (!(await until(page, (s) => s.phase === "dead", 5000))) throw new Error("손을 뗐는데 죽지 않았다");
  await shot("사망. 맞은 자리에 흰 X, 지나갈 수 있던 자리에 연두 띠");

  /*
    재시작을 **기다린 뒤에** 태우면 늦는다. `restart` 는 죽기 직전의 홀드 상태를 그대로
    물려주므로 손을 뗀 채 죽었으면 새 런도 떨어지면서 시작하고, 조종이 붙기까지의
    150ms 가 그대로 낙하가 된다. 루프는 `running` 이 아닌 동안 아무것도 하지 않으므로
    미리 태워 두는 쪽이 옳다.
  */
  await drive(page, true);
  if (!(await until(page, (s) => s.phase === "running", 3000))) throw new Error("스스로 재시작하지 않았다");
  await sleep(400);
  await shot("0.5초 뒤 확인 입력 없이 스스로 재시작");

  /*
    종료선 직전으로 밀어 클리어를 만든다. **경과 시간만 이 방식의 산물이고** 신기록
    판정·티어 기록표·코어 지급은 전부 실제 코드 경로다. 67초를 기다리는 값이 이 그림에
    없어서 이렇게 한다 — 완주 자체는 scenario.mjs 가 매번 검증한다.
  */
  // 또 죽었을 수 있다. 살아 있는 런에만 밀어 넣는다 — 죽은 런에 밀면 클리어가 아니다.
  if (!(await until(page, (s) => s.phase === "running", 5000))) throw new Error("살아 있는 런이 없다");
  await page.evaluate(() => {
    const s = window.__wave.state;
    s.x = s.course.finishX - 0.5;
  });
  if (!(await until(page, (s) => s.phase === "cleared", 3000))) throw new Error("종료선을 넘겼는데 클리어가 아니다");
  await drive(page, false);
  await sleep(300);
  await shot("첫 클리어. 이번·최고·시도와 이 티어 세 칸의 기록");

  // 클리어에서 누르는 것은 그만두기가 아니다 — 홈이 아니라 목록으로 간다.
  await sleep(700);
  await tap();
  await sleep(400);
  const back = await page.$eval(".panel h1", (e) => e.textContent.trim()).catch(() => null);
  if (back !== "Stage") throw new Error(`클리어 뒤 목록이 아니다: ${back}`);
  await shot("홈이 아니라 목록으로. 1번이 채워졌고 2번이 바로 옆이다");

  const backBtn = await page.evaluateHandle(
    () => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("돌아가기")) || null
  );
  await backBtn.asElement().click();
  await sleep(400);
  await shot("홈은 여기서 처음 본다. 코어가 생겼고 Endless 가 열렸다");

  await composite(page, frames);
  log(`${frames.length}장 → ${path.relative(process.cwd(), OUT)}`);
}

/**
 * 프레임을 한 장으로 붙인다.
 *
 * 이미지 도구를 새로 들이는 대신 브라우저가 이미 있으니 그걸 쓴다. PNG 는 data URI 로
 * 인라인한다 — file:// 접근 규칙에 기대지 않아야 어느 환경에서 돌려도 같은 그림이 나온다.
 */
async function composite(page, frames) {
  const panels = frames
    .map(
      (f) => `<figure><figcaption><b>${f.n}</b>${f.caption}</figcaption>
<img src="data:image/png;base64,${f.b64}" width="${PANEL_W}"></figure>`
    )
    .join("\n");

  const html = `<!doctype html><meta charset="utf-8">
<style>
  :root { --bg:#070b14; --panel:#0d1423; --line:#1c2740; --text:#e8f1ff; --dim:#7f90ad; --accent:#ffe66d; }
  body { margin:0; padding:28px; background:var(--bg); color:var(--text);
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  h1 { margin:0 0 4px; font-size:22px; letter-spacing:-.02em; }
  p.sub { margin:0 0 22px; font-size:13px; color:var(--dim); }
  .grid { display:grid; grid-template-columns: repeat(${COLS}, ${PANEL_W}px); gap:20px 18px; }
  figure { margin:0; display:flex; flex-direction:column; gap:8px; }
  figcaption { font-size:11.5px; line-height:1.5; color:var(--dim); min-height:34px;
               display:flex; gap:7px; align-items:flex-start; }
  figcaption b { color:var(--accent); font-variant-numeric:tabular-nums; flex:0 0 auto; }
  img { display:block; border:1px solid var(--line); border-radius:8px; background:var(--panel); }
</style>
<h1>Wave Runner — 첫 실행 전체 흐름</h1>
<p class="sub">저장본이 없는 사람이 열었을 때. 390×720 실제 크로뮴, 조작은 <code>tests/e2e/autopilot.mjs</code> 가 맡았다.</p>
<div class="grid">${panels}</div>`;

  const sheet = await page.browser().newPage();
  await sheet.setViewport({
    width: COLS * PANEL_W + 18 * (COLS - 1) + 56,
    height: 1200,
    deviceScaleFactor: 1.5
  });
  await sheet.setContent(html, { waitUntil: "networkidle0" });
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, await sheet.screenshot({ fullPage: true }));
  await sheet.close();
}
