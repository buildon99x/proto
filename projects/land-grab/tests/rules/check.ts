/**
 * 결정적 규칙 검사. 브라우저 없이 시뮬레이션만 돌려 규칙을 확인한다.
 *
 *   pnpm --filter land-grab test
 *
 * 플레이테스트 시나리오(tests/e2e)는 실제 화면과 입력 경로를 확인하지만,
 * 플레이어가 스폰 직후부터 자동으로 움직이기 때문에 상황을 정확히 재현하기 어렵다.
 * 규칙 자체는 여기서 확정적으로 검사한다.
 */

import { Match } from "../../app/src/game/engine";
import {
  BOARD_SIZE,
  HOME_RADIUS,
  WORLD_BOARD_SIZE,
  WORLD_BOTS,
  WORLD_VIEW_TILES,
  MAX_PLAYERS,
  PLAYER_KEYS,
  PLAYER_LIVES,
  PLAYER_TICK_MS,
  WALL_THICKNESS,
  captureMultiplier,
  findDifficulty
} from "../../app/src/game/config";
import type { Direction, PlayerId, Runner } from "../../app/src/game/types";

const PLAY_LOW = WALL_THICKNESS;
const PLAY_HIGH = BOARD_SIZE - WALL_THICKNESS - 1;

let failures = 0;

function check(name: string, condition: boolean, detail = ""): void {
  if (condition) {
    console.log(`  ✓ ${name}`);
    return;
  }
  failures += 1;
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

/** AI를 전부 치워 플레이어만 움직이는 판을 만든다. */
function soloMatch(): Match {
  const match = new Match(findDifficulty("easy"), { seed: 1 });
  for (const runner of match.runners.slice(1)) {
    park(runner);
  }
  match.board.clearPlayer(match.human.id);
  return match;
}

/** 살아 있지만 절대 움직이지 않는 상태로 둔다. */
function freeze(runner: Runner): void {
  runner.tickMs = Number.POSITIVE_INFINITY;
  runner.tickAccMs = 0;
}

/** 리스폰하지 않도록 치운다. */
function park(runner: Runner): void {
  runner.alive = false;
  runner.respawnAt = Number.POSITIVE_INFINITY;
}

function place(match: Match, runner: Runner, x: number, y: number, dir: Direction): void {
  match.board.clearTrail(runner.trail);
  runner.trail = [];
  runner.x = x;
  runner.y = y;
  runner.prevX = x;
  runner.prevY = y;
  runner.dir = dir;
  runner.queuedDir = null;
  runner.turnedAtX = -1;
  runner.turnedAtY = -1;
  runner.tickAccMs = 0;
  runner.alive = true;
}

/** `ticks` 번의 이동이 일어날 만큼 시간을 흘린다. 프레임 상한을 넘지 않게 쪼갠다. */
function step(match: Match, ticks: number): void {
  let remaining = ticks * PLAYER_TICK_MS;
  while (remaining > 0) {
    const slice = Math.min(100, remaining);
    match.update(slice);
    remaining -= slice;
  }
}

/** 방향을 바꾸고 그 방향으로 `cells` 칸 이동한다. */
function go(match: Match, runner: Runner, dir: Direction, cells: number): void {
  match.queueDirection(runner, dir);
  step(match, cells);
}

function ownerAt(match: Match, x: number, y: number): number {
  return match.board.ownerAt(x, y);
}

console.log("땅따먹기 규칙 검사");

// --- 1. 벽에 닿으면 죽는다 ---------------------------------------------------
{
  const match = soloMatch();
  const me = match.human;
  place(match, me, PLAY_LOW + 4, 30, "left");
  step(match, 5);

  check("벽에 닿으면 죽는다", !me.alive && me.deaths === 1, `alive=${me.alive} deaths=${me.deaths}`);
  check("죽으면 영토가 중립이 된다", match.tilesOf(me.id) === 0, `tiles=${match.tilesOf(me.id)}`);
}

// --- 2. 자기 꼬리를 밟으면 죽는다 --------------------------------------------
{
  const match = soloMatch();
  const me = match.human;
  match.board.claimHome(me.id, 30, 30, HOME_RADIUS);
  place(match, me, 30, 30, "right");

  go(match, me, "right", 8);
  go(match, me, "down", 2);
  go(match, me, "left", 2);
  go(match, me, "up", 3);

  check("자기 꼬리를 밟으면 죽는다", !me.alive && me.deaths === 1, `alive=${me.alive} deaths=${me.deaths}`);
}

// --- 3. 남의 꼬리를 밟으면 그 상대가 죽는다 -----------------------------------
{
  const match = soloMatch();
  const me = match.human;
  const rival = match.runners[1];

  match.board.clearPlayer(rival.id);
  place(match, rival, 40, 30, "right");
  freeze(rival);
  // 상대의 꼬리를 (35,30)~(39,30) 에 깔아 둔다.
  for (let x = 35; x <= 39; x += 1) {
    rival.trail.push({ x, y: 30 });
    match.board.markTrail(rival.id, x, 30);
  }

  place(match, me, 33, 30, "right");
  step(match, 3);

  check("남의 꼬리를 밟으면 그 상대가 죽는다", !rival.alive, `rival.alive=${rival.alive}`);
  check("밟은 쪽은 살아남는다", me.alive, `me.alive=${me.alive}`);
  check("킬이 기록된다", me.kills === 1, `kills=${me.kills}`);
  check("죽은 상대의 꼬리는 사라진다", match.board.trailAt(37, 30) === 0);
}

// --- 4. 고리를 닫으면 안쪽을 점령한다 -----------------------------------------
{
  const match = soloMatch();
  const me = match.human;
  match.board.claimHome(me.id, 30, 30, HOME_RADIUS);
  place(match, me, 30, 30, "right");
  const before = match.tilesOf(me.id);

  go(match, me, "right", 6);
  go(match, me, "down", 4);
  go(match, me, "left", 6);
  go(match, me, "up", 4);

  check("고리를 닫으면 점유 칸이 는다", match.tilesOf(me.id) > before, `${before} → ${match.tilesOf(me.id)}`);
  check("고리 안쪽이 내 땅이 된다", ownerAt(match, 33, 32) === me.id, `owner=${ownerAt(match, 33, 32)}`);
  check("점령 후 꼬리는 비워진다", me.trail.length === 0, `trail=${me.trail.length}`);
}

// --- 5. 상대를 가둔 영역은 점령되지 않는다 (splix 의 구멍 막기 규칙) ------------
{
  const match = soloMatch();
  const me = match.human;
  const rival = match.runners[1];

  match.board.clearPlayer(rival.id);
  place(match, rival, 33, 32, "right");
  freeze(rival);

  match.board.claimHome(me.id, 30, 30, HOME_RADIUS);
  place(match, me, 30, 30, "right");

  go(match, me, "right", 6);
  go(match, me, "down", 4);
  go(match, me, "left", 6);
  go(match, me, "up", 4);

  check(
    "상대가 안에 있으면 그 영역은 안 넘어온다",
    ownerAt(match, 34, 32) !== me.id,
    `owner=${ownerAt(match, 34, 32)}`
  );
  check("상대가 서 있던 칸도 그대로다", ownerAt(match, 33, 32) !== me.id);
  check("그래도 꼬리가 지나간 자리는 내 땅이다", ownerAt(match, 36, 30) === me.id);
}

// --- 6. 방향 전환 규칙 --------------------------------------------------------
{
  const match = soloMatch();
  const me = match.human;
  match.board.claimHome(me.id, 30, 30, HOME_RADIUS);

  place(match, me, 30, 30, "right");
  match.queueDirection(me, "left");
  step(match, 1);
  check("180° 전환은 무시된다", me.dir === "right" && me.x === 31, `dir=${me.dir} x=${me.x}`);

  place(match, me, 30, 30, "right");
  match.queueDirection(me, "down");
  match.queueDirection(me, "up");
  step(match, 1);
  check(
    "한 칸에서 두 번째 전환은 무시된다",
    me.dir === "down" && me.y === 31,
    `dir=${me.dir} y=${me.y}`
  );
}

// --- 7. 스폰 방향은 가장 가까운 벽의 반대쪽 -----------------------------------
{
  const match = new Match(findDifficulty("normal"), { seed: 7 });
  const expected = (x: number, y: number): Direction => {
    const gaps: Array<{ dir: Direction; gap: number }> = [
      { dir: "down", gap: y - PLAY_LOW },
      { dir: "up", gap: PLAY_HIGH - y },
      { dir: "right", gap: x - PLAY_LOW },
      { dir: "left", gap: PLAY_HIGH - x }
    ];
    return gaps.reduce((best, item) => (item.gap < best.gap ? item : best)).dir;
  };

  const wrong = match.runners.filter((runner) => runner.dir !== expected(runner.x, runner.y));
  check("모든 유닛이 가장 가까운 벽의 반대쪽을 향한다", wrong.length === 0, `어긋난 유닛 ${wrong.length}`);

  const ids = new Set<PlayerId>(match.runners.map((runner) => runner.id));
  check("시작 영토가 서로 겹치지 않는다", ids.size === match.runners.length);
  check(
    "각자 5×5 = 25칸으로 시작한다",
    match.runners.every((runner) => match.tilesOf(runner.id) === (HOME_RADIUS * 2 + 1) ** 2),
    match.runners.map((runner) => match.tilesOf(runner.id)).join("/")
  );
}

// --- 8. 물막이 배율 (기본은 꺼져 있다. 실험 결과는 docs/design/differentiation.md) ---
{
  check("배율 구간: 24칸 ×1", captureMultiplier(24) === 1);
  check("배율 구간: 25칸 ×1.5", captureMultiplier(25) === 1.5);
  check("배율 구간: 60칸 ×2", captureMultiplier(60) === 2);

  const off = new Match(findDifficulty("easy"), { seed: 3, rules: { captureBonus: false } });
  const on = new Match(findDifficulty("easy"), { seed: 3, rules: { captureBonus: true } });
  for (const match of [off, on]) {
    for (const runner of match.runners.slice(1)) {
      park(runner);
    }
    match.board.clearPlayer(match.human.id);
    match.board.claimHome(match.human.id, 30, 30, HOME_RADIUS);
    place(match, match.human, 30, 30, "right");
    go(match, match.human, "right", 9);
    go(match, match.human, "down", 9);
    go(match, match.human, "left", 9);
    go(match, match.human, "up", 9);
  }

  check("배율을 끄면 보너스가 쌓이지 않는다", off.human.bonusPoints === 0, `${off.human.bonusPoints}`);
  check(
    "배율을 켜면 넓게 막은 만큼 보너스가 쌓인다",
    on.human.bonusPoints > 0 && on.human.bestCapture >= 60,
    `보너스=${on.human.bonusPoints} 최대점령=${on.human.bestCapture}`
  );
  check(
    "최대 점령 기록은 배율과 무관하게 남는다",
    off.human.bestCapture === on.human.bestCapture,
    `${off.human.bestCapture} vs ${on.human.bestCapture}`
  );
}

// --- 9. 폐허 잠금 (기본은 꺼짐. 실험 규칙) -----------------------------------
{
  const LOCK_MS = 6_000;
  const match = new Match(findDifficulty("easy"), { seed: 5, rules: { rubbleLockMs: LOCK_MS } });
  for (const runner of match.runners.slice(2)) {
    park(runner);
  }
  const me = match.human;
  const rival = match.runners[1];

  match.board.clearPlayer(rival.id);
  match.board.claimHome(rival.id, 40, 40, HOME_RADIUS);
  const rivalTiles = match.tilesOf(rival.id);
  place(match, rival, 40, 40, "right");
  freeze(rival);

  // 상대를 벽으로 몰아 죽인다 — 꼬리를 깔고 플레이어가 밟게 한다.
  rival.trail.push({ x: 41, y: 40 });
  match.board.markTrail(rival.id, 41, 40);
  place(match, me, 43, 40, "left");
  step(match, 2);

  check("폐허 실험: 상대가 죽었다", !rival.alive, `alive=${rival.alive}`);
  check(
    "죽은 영토는 폐허로 잠긴다",
    match.board.isLocked(40, 40, match.elapsedMs),
    `rubbleUntil=${match.board.rubbleUntilAt(40, 40)} now=${match.elapsedMs}`
  );
  check("폐허는 아무도 소유하지 않는다", match.board.ownerAt(40, 40) === 0);
  check("잠긴 칸 수가 상대의 영토만큼이다", rivalTiles === (HOME_RADIUS * 2 + 1) ** 2);

  // 폐허를 고리 안에 넣어도 가져오지 못한다.
  match.board.clearPlayer(me.id);
  match.board.claimHome(me.id, 37, 40, HOME_RADIUS);
  place(match, me, 37, 40, "right");
  go(match, me, "right", 7);
  go(match, me, "down", 4);
  go(match, me, "left", 7);
  go(match, me, "up", 4);

  check(
    "폐허는 고리 안에 넣어도 넘어오지 않는다",
    match.board.ownerAt(40, 40) !== me.id,
    `owner=${match.board.ownerAt(40, 40)}`
  );

  // 시간이 지나면 풀린다.
  const stillLocked = match.board.isLocked(40, 40, match.elapsedMs);
  const laterUnlocked = !match.board.isLocked(40, 40, match.elapsedMs + LOCK_MS);
  check("잠금은 아직 유효하다", stillLocked, `elapsed=${Math.round(match.elapsedMs)}`);
  check("시간이 지나면 잠금이 풀린다", laterUnlocked);

  const noLock = new Match(findDifficulty("easy"), { seed: 5, rules: { rubbleLockMs: 0 } });
  noLock.board.claimHome(noLock.human.id, 30, 30, HOME_RADIUS);
  noLock.board.clearPlayer(noLock.human.id, 0);
  check("잠금을 끄면 폐허가 생기지 않는다", !noLock.board.isLocked(30, 30, 0));
}

// --- 10. 킬 연출용 이벤트 ------------------------------------------------------
{
  const match = soloMatch();
  const me = match.human;
  const rival = match.runners[1];

  match.board.clearPlayer(rival.id);
  place(match, rival, 40, 30, "right");
  freeze(rival);
  for (let x = 35; x <= 39; x += 1) {
    rival.trail.push({ x, y: 30 });
    match.board.markTrail(rival.id, x, 30);
  }

  match.drainEvents();
  place(match, me, 33, 30, "right");
  step(match, 3);

  const events = match.drainEvents();
  const death = events.find((event) => event.type === "death");
  check("킬이 나면 사망 이벤트가 발행된다", Boolean(death));
  if (death && death.type === "death") {
    check("사망 이벤트가 죽인 쪽을 알려 준다", death.killerId === me.id, `killerId=${death.killerId}`);
    check(
      "사망 이벤트가 킬 보상 금액을 싣는다",
      death.awardedScore === match.rules.killScore,
      `awardedScore=${death.awardedScore}`
    );
  }

  // 자살은 보상이 없다.
  const solo = soloMatch();
  solo.board.claimHome(solo.human.id, 30, 30, HOME_RADIUS);
  place(solo, solo.human, 30, 30, "right");
  go(solo, solo.human, "right", 8);
  go(solo, solo.human, "down", 2);
  go(solo, solo.human, "left", 2);
  solo.drainEvents();
  go(solo, solo.human, "up", 3);
  const selfDeath = solo.drainEvents().find((event) => event.type === "death");
  check(
    "자살에는 킬 보상이 붙지 않는다",
    Boolean(selfDeath) && selfDeath?.type === "death" && selfDeath.awardedScore === 0
  );
}

// --- 11. 한 화면 멀티 ----------------------------------------------------------
{
  const solo = new Match(findDifficulty("normal"), { seed: 9 });
  check("혼자면 난이도가 AI 수를 정한다", solo.runners.length === findDifficulty("normal").aiCount + 1);
  check("혼자면 목숨이 3개다", solo.human.lives === PLAYER_LIVES, `${solo.human.lives}`);
  check("혼자면 이름이 '나'다", solo.labelOf(solo.human) === "나", solo.labelOf(solo.human));

  for (const humans of [2, 3, 4]) {
    const match = new Match(findDifficulty("normal"), { seed: 9, humans });
    const people = match.runners.filter((runner) => runner.kind === "human");
    const bots = match.runners.filter((runner) => runner.kind === "ai");

    check(`${humans}인: 항상 4명이 참가한다`, match.runners.length === MAX_PLAYERS, `${match.runners.length}`);
    check(`${humans}인: 사람 ${humans}명 + AI ${MAX_PLAYERS - humans}명`,
      people.length === humans && bots.length === MAX_PLAYERS - humans,
      `사람 ${people.length} / AI ${bots.length}`);
    check(`${humans}인: 아무도 목숨 제한이 없다`,
      people.every((runner) => runner.lives === Number.POSITIVE_INFINITY));
    check(`${humans}인: 사람은 모두 같은 속도다`,
      people.every((runner) => runner.tickMs === PLAYER_TICK_MS));
    check(`${humans}인: 자리 이름이 P1..P${humans} 이다`,
      people.every((runner, index) => match.labelOf(runner) === `P${index + 1}`),
      people.map((runner) => match.labelOf(runner)).join("/"));
    check(`${humans}인: 시작 영토가 겹치지 않는다`,
      match.runners.every((runner) => match.tilesOf(runner.id) === (HOME_RADIUS * 2 + 1) ** 2),
      match.runners.map((runner) => match.tilesOf(runner.id)).join("/"));
  }

  // 자리마다 키가 겹치지 않아야 한 키보드에서 네 명이 칠 수 있다.
  const seen = new Map<string, string>();
  let clash = "";
  for (const player of PLAYER_KEYS) {
    for (const code of Object.keys(player.map)) {
      const owner = seen.get(code);
      if (owner) {
        clash = `${code}: ${owner} vs ${player.label}`;
      }
      seen.set(code, player.label);
    }
  }
  check("네 자리의 키가 서로 겹치지 않는다", clash === "", clash);

  // 목숨이 무한이라 중간에 끝나지 않는다.
  const party = new Match(findDifficulty("normal"), { seed: 9, humans: 4 });
  const first = party.runners[0];
  for (let i = 0; i < 5; i += 1) {
    party.board.clearTrail(first.trail);
    first.trail = [];
    place(party, first, WALL_THICKNESS + 2, 30, "left");
    step(party, 3);
    if (!first.alive) {
      first.alive = true;
      first.respawnAt = 0;
    }
  }
  check("여럿이 하면 사람이 죽어도 판이 안 끝난다", party.phase === "playing", party.phase);
  check("사망은 그대로 집계된다", first.deaths >= 1, `${first.deaths}`);
}

// --- 12. 월드 모드 (io 문법) ---------------------------------------------------
{
  const world = new Match(findDifficulty("normal"), { mode: "world", seed: 4 });

  check("월드 보드는 600×600 이다", world.board.size === WORLD_BOARD_SIZE, `${world.board.size}`);
  check("봇으로 가득 찬다", world.runners.length === WORLD_BOTS + 1, `${world.runners.length}`);
  check("사람은 한 명뿐이다", world.humans === 1);
  check("끝이 없다", world.durationMs === Number.POSITIVE_INFINITY);
  check("목숨 개념이 없다", world.human.lives === Number.POSITIVE_INFINITY);
  check(
    "카메라가 보드보다 좁다",
    world.viewTiles === WORLD_VIEW_TILES && world.viewTiles < world.board.size,
    `${world.viewTiles}`
  );
  check(
    "시작 영토가 서로 떨어져 있다",
    world.runners.every((runner) => world.tilesOf(runner.id) === (HOME_RADIUS * 2 + 1) ** 2),
    world.runners.map((runner) => world.tilesOf(runner.id)).join("/")
  );
  check("상위 10명만 추려진다", world.leaderboard().length === 10, `${world.leaderboard().length}`);

  // io 문법: 죽으면 그 판이 끝난다.
  const me = world.human;
  place(world, me, WALL_THICKNESS + 2, 300, "left");
  step(world, 3);
  check("죽으면 그 판이 끝난다", world.phase === "result" && !me.alive, `${world.phase}`);
  check("사망이 집계된다", me.deaths === 1, `${me.deaths}`);
  const outcome = world.result();
  check("결과가 생존 시간을 담는다", outcome.elapsedMs > 0 && outcome.mode === "world");
  check("결과가 전체 인원을 담는다", outcome.players === WORLD_BOTS + 1, `${outcome.players}`);

  // 큰 맵에서도 전면 스캔 없이 칸 수를 안다.
  const counted = world.board.countTiles(world.runners.length);
  const byBounds = world.runners.reduce((sum, runner) => sum + world.tilesOf(runner.id), 0);
  check(
    "증분 집계가 전체 합과 맞는다",
    counted.slice(1).reduce((a, b) => a + b, 0) === byBounds,
    `${counted.slice(1).reduce((a, b) => a + b, 0)} vs ${byBounds}`
  );
}

console.log(failures === 0 ? "\n모든 규칙 검사 통과" : `\n실패 ${failures}건`);
if (failures > 0) {
  process.exitCode = 1;
}
