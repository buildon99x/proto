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
  const match = new Match(findDifficulty("easy"), 1);
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
  const match = new Match(findDifficulty("normal"), 7);
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

  const off = new Match(findDifficulty("easy"), 3, { captureBonus: false });
  const on = new Match(findDifficulty("easy"), 3, { captureBonus: true });
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
  const match = new Match(findDifficulty("easy"), 5, { rubbleLockMs: LOCK_MS });
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
    `rubbleUntil=${match.board.rubbleUntil[match.board.index(40, 40)]} now=${match.elapsedMs}`
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

  const noLock = new Match(findDifficulty("easy"), 5, { rubbleLockMs: 0 });
  noLock.board.claimHome(noLock.human.id, 30, 30, HOME_RADIUS);
  noLock.board.clearPlayer(noLock.human.id, 0);
  check("잠금을 끄면 폐허가 생기지 않는다", !noLock.board.isLocked(30, 30, 0));
}

console.log(failures === 0 ? "\n모든 규칙 검사 통과" : `\n실패 ${failures}건`);
if (failures > 0) {
  process.exitCode = 1;
}
