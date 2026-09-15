// 땅따먹기 플레이테스트 시나리오 — playtest 하니스가 호출한다.
//   pnpm playtest --project land-grab
//
// eval.md 의 규칙 검사 R1~R6 을 그대로 따라간다. 실패하면 예외를 던져
// 하니스가 실패로 처리하게 한다.
//
// 주의: 플레이어는 스폰 직후부터 자동으로 달린다. 그래서 입력을 주기 전에
// 이미 집에서 멀어져 있고, 고정된 키 순서로는 매번 다른 상황에 놓인다.
// 모든 조작은 window.__landGrab 이 알려 주는 현재 위치·방향에서 다시 계산한다.

export const meta = {
  // 보드 + 사이드바가 한 화면에 들어가는 데스크톱 뷰포트.
  viewport: { width: 1180, height: 820, deviceScaleFactor: 2 }
};

/** 한 칸 이동 시간(ms). app/src/game/config.ts 의 PLAYER_TICK_MS 와 맞춘다. */
const TICK_MS = 167;

/** app/src/game/config.ts 의 PARTY_BOARD_SIZE. 규칙 검사는 파티 모드에서 한다. */
const BOARD_SIZE = 60;

/** app/src/game/config.ts 의 WORLD_BOARD_SIZE. */
const WORLD_BOARD_SIZE = 600;

const KEY = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
const IS_HORIZONTAL = { left: true, right: true, up: false, down: false };

function assert(condition, message) {
  if (!condition) {
    throw new Error(`규칙 검사 실패: ${message}`);
  }
}

const readState = (page) => page.evaluate(() => window.__landGrab ?? null);

/** 방향을 바꾸고 `cells` 칸만큼 진행할 시간을 준다. */
async function advance(page, sleep, dir, cells) {
  await page.keyboard.press(KEY[dir]);
  await sleep(TICK_MS * cells + 60);
}

async function waitFor(page, sleep, predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let state = await readState(page);
  while (Date.now() < deadline) {
    if (!state || predicate(state)) {
      return state;
    }
    await sleep(150);
    state = await readState(page);
  }
  return state;
}

/** 보드 중앙을 향하는 방향. 벽에 박히지 않도록 경로를 잡을 때 쓴다. */
function towardCenter(state, axis) {
  const middle = BOARD_SIZE / 2;
  if (axis === "horizontal") {
    return state.x < middle ? "right" : "left";
  }
  return state.y < middle ? "down" : "up";
}

/**
 * 현재 방향에서 180° 전환은 무시되므로, 중앙 쪽이면서 반대 방향이 아닌 축을 고른다.
 * 같은 축이 막히면 수직축은 언제나 합법이다.
 */
function safeTowardCenter(state) {
  const sameAxis = IS_HORIZONTAL[state.dir] ? "horizontal" : "vertical";
  const candidate = towardCenter(state, sameAxis);
  if (candidate !== OPPOSITE[state.dir]) {
    return candidate;
  }
  return towardCenter(state, sameAxis === "horizontal" ? "vertical" : "horizontal");
}

/**
 * 나간 길 옆으로 한 칸 비켜서 되돌아온다. 지금 그리고 있는 꼬리는 내 영토에서
 * 출발했으므로, 그 옆줄을 따라 되돌아가면 반드시 내 영토로 복귀해 점령이 일어난다.
 * 고정된 직사각형보다 확실하다 — 플레이어는 입력 전에도 계속 움직이기 때문에
 * 시나리오가 보드 위 어디에서 시작할지 알 수 없다.
 */
async function retraceHome({ page, sleep }) {
  // 영토 안이면 꼬리가 자랄 때까지 그대로 달린다. 이 대기가 없으면 영토 안에서
  // 방향만 계속 바꾸게 되고, 경로가 헝클어져 오히려 자기 꼬리에 걸린다.
  const start = await waitFor(
    page,
    sleep,
    (state) => !state.alive || state.trailLength >= 6,
    8_000
  );
  if (!start.alive) {
    return start;
  }
  const side = towardCenter(start, IS_HORIZONTAL[start.dir] ? "vertical" : "horizontal");

  await advance(page, sleep, side, 1);
  await advance(page, sleep, OPPOSITE[start.dir], 0);

  const home = await waitFor(
    page,
    sleep,
    (state) => state.trailLength === 0 || !state.alive,
    12_000
  );

  // 복귀 직후에는 나온 방향의 반대, 즉 보드 바깥쪽을 향하고 있다.
  // 그대로 두면 벽에 박혀 목숨을 헛되이 잃는다.
  if (home.alive) {
    await advance(page, sleep, safeTowardCenter(home), 0);
  }
  return home;
}

/** 살아 있고 내 땅 위에 설 때까지 기다린다. 리스폰 대기 중이면 null. */
async function settle({ page, sleep }) {
  const state = await waitFor(page, sleep, (item) => item.alive, 5_000);
  if (!state.alive) {
    return null;
  }
  await sleep(250);
  return readState(page);
}

/** 조건이 참이 될 때까지 왕복을 반복하며 실제로 플레이한다. */
async function playUntil({ page, sleep }, done) {
  const deadline = Date.now() + 130_000;
  while (Date.now() < deadline) {
    const state = await readState(page);
    if (!state || state.phase !== "playing" || done(state)) {
      return state;
    }
    if (!state.alive) {
      await waitFor(page, sleep, (item) => item.alive || item.phase !== "playing", 3_000);
      continue;
    }
    await retraceHome({ page, sleep });
  }
  return readState(page);
}

export async function run({ page, sleep, shot, clickText, log }) {
  await sleep(700);
  await shot("01-title");

  // 규칙 검사(R1~R6)는 파티 모드에서 한다 — 보드가 한 화면에 들어오고 90초로 끝난다.
  await clickText("파티");
  await sleep(200);
  await clickText("게임 시작");
  await sleep(700);
  await shot("02-ingame-start");

  const opening = await readState(page);
  assert(opening, "테스트 훅(window.__landGrab)이 없다");
  assert(
    opening.mode === "party" && opening.boardSize === BOARD_SIZE,
    `파티 모드가 아니다: mode=${opening.mode} board=${opening.boardSize}`
  );

  // R1 — 시작 영토가 있다.
  const started = await readState(page);
  assert(started, "테스트 훅(window.__landGrab)이 없다");
  assert(started.phase === "playing", `시작 직후 phase 가 playing 이 아니다: ${started.phase}`);
  assert(started.shares[0] > 0, "시작 직후 플레이어 점유율이 0이다");
  log("R1 시작 점유율:", (started.shares[0] * 100).toFixed(2), "%");

  // R2 — 밖으로 나갔다 돌아오면 점유율이 는다.
  await shot("03-trail");
  let before = started.shares[0];
  let captured = started;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const ready = await settle({ page, sleep });
    if (!ready) {
      continue;
    }
    before = ready.shares[0];
    captured = await retraceHome({ page, sleep });
    log(
      `R2 시도 ${attempt}: ${(before * 100).toFixed(2)}% → ${(captured.shares[0] * 100).toFixed(2)}%`
    );
    if (captured.shares[0] > before) {
      break;
    }
  }
  await shot("04-capture");
  assert(
    captured.shares[0] > before,
    `왕복 3회 안에 점유율이 늘지 않았다 (${before} → ${captured.shares[0]})`
  );

  // R3 — 자기 꼬리로 고리를 만들어 밟으면 목숨이 준다.
  // 영토는 이미 한 덩어리로 커져 있어서, 옆으로 트는 방향이 영토 안쪽일 수 있다.
  // 그러면 점령이 일어나 꼬리가 사라지므로, 매 구간마다 꼬리가 유지되는지 확인하고
  // 실패하면 반대쪽으로 튼다.
  let deathConfirmed = false;
  let flip = false;
  for (let attempt = 1; attempt <= 4 && !deathConfirmed; attempt += 1) {
    // 먼저 복귀해 꼬리를 0으로 만든다. 그래야 이어서 그리는 꼬리가 통째로
    // "밖으로 나간 한 줄"이 되고, 되돌아와 가로지를 위치를 계산할 수 있다.
    await retraceHome({ page, sleep });
    const anchor = await settle({ page, sleep });
    if (!anchor) {
      continue;
    }
    const deathsBefore = anchor.deaths;
    const livesBefore = anchor.lives;
    const out = safeTowardCenter(anchor);
    const straight = towardCenter(anchor, IS_HORIZONTAL[out] ? "vertical" : "horizontal");
    const side = flip ? OPPOSITE[straight] : straight;

    // 영토 크기를 모르니 고정 칸 수 대신, 이 구간에서 꼬리가 8칸 자랄 때까지 나간다.
    await advance(page, sleep, out, 2);
    const legStart = await readState(page);
    const target = legStart.trailLength + 8;
    const stretched = await waitFor(
      page,
      sleep,
      (state) => !state.alive || state.trailLength >= target,
      8_000
    );
    if (!stretched.alive || stretched.trailLength < target) {
      log(
        `R3 시도 ${attempt}: 꼬리 확보 실패 (${stretched.trailLength}/${target}칸,` +
          ` alive=${stretched.alive})`
      );
      continue;
    }

    // 옆으로 2칸 → 되돌아 2칸 → 나온 길을 가로지르면 자기 꼬리를 밟는다.
    log(
      `R3 시도 ${attempt}: 출발 (${legStart.x}, ${legStart.y}) → 뻗은 뒤 (${stretched.x}, ${stretched.y})` +
        ` 꼬리 ${stretched.trailLength}칸, out=${out} side=${side}`
    );

    await advance(page, sleep, side, 2);
    const turned = await readState(page);
    if (!turned.alive || turned.trailLength < stretched.trailLength) {
      log(`R3 시도 ${attempt}: 옆으로 트는 쪽이 내 영토였다 (꼬리 ${turned.trailLength}칸)`);
      flip = !flip;
      continue;
    }

    await advance(page, sleep, OPPOSITE[out], 2);
    const returned = await readState(page);
    if (!returned.alive || returned.trailLength < turned.trailLength) {
      log(`R3 시도 ${attempt}: 되돌아오는 길에 영토로 재진입했다 (꼬리 ${returned.trailLength}칸)`);
      continue;
    }

    log(`R3 시도 ${attempt}: 옆 (${turned.x}, ${turned.y}) → 복귀 (${returned.x}, ${returned.y})`);

    await advance(page, sleep, OPPOSITE[side], 1);

    const after = await waitFor(page, sleep, (state) => state.deaths > deathsBefore, 3_000);
    deathConfirmed = after.deaths > deathsBefore;
    if (deathConfirmed) {
      // 파편과 충격파가 떠 있는 동안 잡는다.
      await sleep(120);
      await shot("07-death");
    }
    log(
      `R3 시도 ${attempt}: 사망 ${deathsBefore} → ${after.deaths},` +
        ` 목숨 ${livesBefore} → ${after.lives}`
    );
  }
  assert(deathConfirmed, "자기 꼬리로 고리를 만들었는데 사망 횟수가 늘지 않았다");

  // R6 — 일시정지하면 시간이 멈춘다.
  await page.keyboard.press("Escape");
  await sleep(150);
  const pausedA = await readState(page);
  await sleep(700);
  const pausedB = await readState(page);
  await shot("05-paused");
  assert(pausedA.phase === "paused", `Esc 후 phase 가 paused 가 아니다: ${pausedA.phase}`);
  assert(
    pausedA.elapsedMs === pausedB.elapsedMs,
    `일시정지 중에도 시간이 흘렀다 (${pausedA.elapsedMs} → ${pausedB.elapsedMs})`
  );
  log("R6 일시정지 확인:", pausedA.elapsedMs, "ms 고정");

  await page.keyboard.press("Escape");
  await sleep(200);

  // R4 — 20초 시점에 AI가 전멸하지 않았다. 그때까지 계속 왕복하며 실제로 플레이한다.
  await playUntil({ page, sleep }, (state) => state.elapsedMs >= 20_000);
  const midgame = await readState(page);
  await shot("06-midgame");
  const aiShares = midgame.shares.slice(1);
  log(
    `R4 (${Math.round(midgame.elapsedMs / 1000)}초, 내 점유율 ${(midgame.shares[0] * 100).toFixed(2)}%,` +
      ` 목숨 ${midgame.lives}) AI 점유율: ` +
      aiShares.map((share) => `${(share * 100).toFixed(2)}%`).join(" / ")
  );
  assert(
    midgame.phase === "playing",
    `20초 전에 경기가 끝났다 (phase=${midgame.phase}) — 검사가 무의미해진다`
  );
  assert(
    aiShares.every((share) => share > 0),
    `20초 시점에 영토가 없는 AI가 있다: ${JSON.stringify(aiShares)}`
  );

  // R5 — 경기가 끝나면 결과 화면으로 간다. 끝까지 계속 플레이한다.
  await playUntil({ page, sleep }, (state) => state.phase !== "playing" || state.remainingMs <= 0);
  await sleep(900);

  const resultVisible = await page.evaluate(() =>
    Boolean(document.querySelector(".screen--result"))
  );
  await shot("08-result");
  assert(resultVisible, "경기가 끝났는데 결과 화면이 뜨지 않았다");
  log("R5 결과 화면 확인");

  // --- W1~W3 — 월드 모드: 큰 맵, 카메라, 미니맵, 리더보드 ---
  await clickText("타이틀로");
  await sleep(400);
  await clickText("월드");
  await sleep(200);
  await clickText("게임 시작");
  await sleep(800);

  const world = await readState(page);
  assert(world, "월드 모드에서 테스트 훅이 없다");
  assert(
    world.mode === "world" && world.boardSize === WORLD_BOARD_SIZE,
    `월드 보드가 ${WORLD_BOARD_SIZE} 이 아니다: ${world.boardSize}`
  );
  assert(world.players > 10, `참가자가 너무 적다: ${world.players}`);
  log(`W1 월드 ${world.boardSize}×${world.boardSize}, 참가자 ${world.players}명`);

  const chrome = await page.evaluate(() => ({
    minimap: Boolean(document.querySelector(".minimap")),
    leaderboard: document.querySelectorAll(".board__row").length
  }));
  assert(chrome.minimap, "미니맵이 없다");
  assert(chrome.leaderboard >= 10, `리더보드 줄이 모자라다: ${chrome.leaderboard}`);
  log(`W2 미니맵과 리더보드 ${chrome.leaderboard}줄 확인`);

  // 카메라가 따라오는지: 잠깐 달린 뒤 좌표가 바뀌어야 한다.
  const spawned = await readState(page);
  await sleep(2_000);
  const moved = await readState(page);
  assert(
    moved.phase !== "playing" || spawned.x !== moved.x || spawned.y !== moved.y,
    "월드 모드에서 말이 움직이지 않는다"
  );
  await shot("09-world");
  log(
    `W3 이동 확인 (${spawned.x},${spawned.y}) → (${moved.x},${moved.y}),` +
      ` 순위 ${moved.rank}/${moved.players}`
  );
}
