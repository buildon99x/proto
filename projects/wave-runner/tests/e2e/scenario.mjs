// Wave Runner 자동 플레이테스트.
//
// 목적은 "사람처럼 잘 하기"가 아니라 **코스가 실제로 통과 가능한가**의 기계적 확인이다.
// 오토파일럿은 통로 중앙을 추종하며 홀드/릴리스를 토글한다. 완전한 상태 접근을
// 가지므로 사람보다 훨씬 잘한다 — 따라서 이 시나리오가 통과한다는 것은
// **통과 가능성(solvability)의 증명이지 난이도의 검증이 아니다.**

export const meta = {
  // 런처의 모바일 실행 프레임과 같은 세로 비율
  viewport: { width: 390, height: 720, deviceScaleFactor: 2 }
};

const AUTOPILOT_LEAD_SEC = 0.12;
const STAGE_TIMEOUT_MS = 45000;

async function playStage(page) {
  return page.evaluate(
    async (leadSec, timeoutMs) => {
      const w = window.__wave;
      if (!w) return { ok: false, why: "debug hook 없음" };

      let holding = false;
      const setHold = (v) => {
        if (v === holding) return;
        holding = v;
        window.dispatchEvent(
          new KeyboardEvent(v ? "keydown" : "keyup", { code: "Space", bubbles: true, cancelable: true })
        );
      };

      setHold(true);
      await new Promise((r) => setTimeout(r, 40));

      const deadline = Date.now() + timeoutMs;
      let deaths = 0;
      let lastPhase = "ready";

      while (Date.now() < deadline) {
        const s = w.state;
        if (!s) break;
        if (s.phase === "cleared") {
          setHold(false);
          return { ok: true, deaths, sec: s.elapsed, attempts: s.attempts };
        }
        if (s.phase === "dead" && lastPhase !== "dead") deaths += 1;
        lastPhase = s.phase;
        if (s.phase === "running") {
          setHold(s.y > w.centerAt(s.x + s.tuning.speed * leadSec));
        }
        await new Promise((r) => requestAnimationFrame(r));
      }

      setHold(false);
      return { ok: false, why: "timeout", deaths, progress: w.state ? w.state.best : 0 };
    },
    AUTOPILOT_LEAD_SEC,
    STAGE_TIMEOUT_MS
  );
}

export async function run({ page, sleep, shot, log }) {
  await sleep(400);
  await shot("01-stage-select");

  const summary = [];

  for (let i = 0; i < 5; i += 1) {
    const cards = await page.$$(".stage-card");
    if (cards.length <= i) throw new Error(`스테이지 카드가 부족하다: ${cards.length}`);

    const locked = await page.evaluate((el) => el.disabled, cards[i]);
    if (locked) throw new Error(`스테이지 ${i + 1}이 잠겨 있다 — 앞 스테이지가 클리어되지 않았다`);

    await cards[i].click();
    await sleep(250);
    if (i === 0) await shot("02-ready");
    if (i === 3) {
      // 회랑 — 좁고 긴 수평 통로. 이 게임의 핵심 구간이라 비행 중 한 장 남긴다.
      await page.keyboard.down("Space");
      await sleep(900);
      await page.keyboard.up("Space");
      await shot("04-corridor-inflight");
    }

    const result = await playStage(page);
    summary.push({ stage: i + 1, ...result });
    log(`stage ${i + 1}:`, JSON.stringify(result));

    if (!result.ok) {
      throw new Error(`스테이지 ${i + 1} 통과 실패: ${JSON.stringify(result)}`);
    }

    if (i === 0) {
      await sleep(300);
      await shot("03-clear");
    }

    await sleep(700);
    await page.keyboard.press("Escape");
    await sleep(250);
  }

  await page.keyboard.press("KeyT");
  await sleep(250);
  await shot("05-tuning-panel");

  log("all stages solvable:", JSON.stringify(summary));
}
