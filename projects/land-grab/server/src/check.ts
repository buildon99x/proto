/**
 * 서버 규칙 검사. 소켓 없이 세션을 그대로 돌린다.
 *
 * 브라우저를 띄우지 않고도 규약과 시야 동기화가 맞는지 확인하는 것이 목적이다.
 * 실제 소켓까지 포함한 확인은 `smoke.ts` 가 한다.
 *
 * 실행: `npm test`
 */

import { NetWorld, encodeDirection, encodeHello, encodeRespawn } from "../../app/src/net/client-state";
import { ByteWriter, ClientMessage, PROTOCOL_VERSION, RejectReason, sanitizeName } from "../../app/src/net/protocol";
import { HOME_RADIUS } from "../../app/src/game/config";
import type { Direction } from "../../app/src/game/types";
import { Session, type Sink } from "./session";
import { subtractRect, type Rect } from "./viewport";
import { World } from "./world";

const BROADCAST_MS = 100;

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail = ""): void {
  if (ok) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

class MemorySink implements Sink {
  readonly buffered = 0;
  closed = false;
  bytesSent = 0;
  messages = 0;

  constructor(private readonly net: NetWorld) {}

  send(bytes: Uint8Array): void {
    this.bytesSent += bytes.length;
    this.messages += 1;
    this.net.apply(bytes);
  }

  close(): void {
    this.closed = true;
  }
}

/** 세션 하나와 그 세션이 보는 클라이언트 상태를 한 묶음으로 든다. */
class Peer {
  readonly net = new NetWorld();
  readonly sink: MemorySink;
  readonly session: Session;

  constructor(world: World) {
    this.sink = new MemorySink(this.net);
    this.session = new Session(world, this.sink);
  }

  hello(name: string): void {
    this.session.receive(encodeHello(name));
  }

  steer(dir: Direction): void {
    this.session.receive(encodeDirection(dir));
  }

  respawn(): void {
    this.session.receive(encodeRespawn());
  }
}

/** 세계를 한 방송 주기만큼 굴리고 모든 세션에 전달한다. */
function pump(world: World, peers: Peer[], cycles = 1): void {
  for (let i = 0; i < cycles; i += 1) {
    world.advance(BROADCAST_MS);
    const dirty = world.drainDirty();
    const deaths = world.drainDeaths();
    for (const peer of peers) {
      peer.session.tick(BROADCAST_MS, dirty, deaths);
    }
  }
}

function area(rects: Rect[]): number {
  return rects.reduce((total, rect) => total + rect.w * rect.h, 0);
}

function overlaps(a: Rect, b: Rect): boolean {
  return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
}

// --- 사각형 빼기 ---

section("시야 조각 나누기");
{
  const prev: Rect = { x: 10, y: 10, w: 20, h: 20 };

  const shifted = subtractRect({ x: 15, y: 10, w: 20, h: 20 }, prev);
  check("오른쪽으로 밀면 오른쪽 띠만 남는다", area(shifted) === 5 * 20, `${area(shifted)}칸`);

  const diagonal = subtractRect({ x: 15, y: 15, w: 20, h: 20 }, prev);
  check("대각선으로 밀면 두 띠로 쪼개진다", diagonal.length === 2, `${diagonal.length}조각`);
  check("대각선 조각이 겹치지 않는다", !overlaps(diagonal[0], diagonal[1]));
  check("대각선 넓이가 맞는다", area(diagonal) === 20 * 20 - 15 * 15, `${area(diagonal)}칸`);

  const same = subtractRect(prev, prev);
  check("그대로면 보낼 것이 없다", same.length === 0);

  const far = subtractRect({ x: 100, y: 100, w: 20, h: 20 }, prev);
  check("멀리 떨어지면 통째로 보낸다", far.length === 1 && area(far) === 400);

  const fresh = subtractRect(prev, null);
  check("처음에는 통째로 보낸다", fresh.length === 1 && area(fresh) === 400);
}

// --- 이름 정리 ---

section("이름");
{
  check("빈 이름은 기본값이 된다", sanitizeName("   ") === "익명");
  check("제어 문자는 걸러진다", sanitizeName("가나") === "가나");
  const long = sanitizeName("가나다라마바사아자차카타파하");
  check("긴 한글 이름이 글자 단위로 잘린다", long === "가나다라마바사아", long);
  check("잘린 이름이 24바이트 이하다", new TextEncoder().encode(long).length <= 24);
}

// --- 접속과 첫 화면 ---

section("접속");
const world = new World({ seed: 20260915, stepMs: 50 });
const alice = new Peer(world);
alice.hello("앨리스");

check("자리를 받는다", alice.net.myId !== null, `${alice.net.myId}`);
check("보드 크기를 받는다", alice.net.mapSize === world.boardSize, `${alice.net.mapSize}`);
check("화면 폭을 받는다", alice.net.viewTiles === world.viewTiles, `${alice.net.viewTiles}`);
check("서버가 사람 수를 센다", world.humanCount === 1, `${world.humanCount}`);

{
  const id = alice.net.myId!;
  const runner = world.runnerOf(id)!;
  let home = 0;
  for (let y = runner.y - HOME_RADIUS; y <= runner.y + HOME_RADIUS; y += 1) {
    for (let x = runner.x - HOME_RADIUS; x <= runner.x + HOME_RADIUS; x += 1) {
      if (alice.net.ownerAt(x, y) === id) {
        home += 1;
      }
    }
  }
  const side = HOME_RADIUS * 2 + 1;
  check("시작 영토가 그대로 도착한다", home === side * side, `${home}/${side * side}칸`);
  check("받지 않은 칸은 표시되지 않는다", !alice.net.isKnown(0, 0));
}

pump(world, [alice], 5);

{
  const id = alice.net.myId!;
  const me = alice.net.me;
  const runner = world.runnerOf(id)!;
  check("내 유닛이 목록에 있다", me !== null);
  check("위치가 서버와 같다", me!.x === runner.x && me!.y === runner.y, `${me!.x},${me!.y} vs ${runner.x},${runner.y}`);
  check("이름이 도착한다", me!.name === "앨리스", me!.name);
  check("주변 봇이 보인다", alice.net.players.size >= 1, `${alice.net.players.size}명`);
  check("순위표가 도착한다", alice.net.leaderboard.length > 0, `${alice.net.leaderboard.length}줄`);
  check("점수가 도착한다", alice.net.score.total === world.match.runners.length, `${alice.net.score.total}`);
}

// --- 조작과 꼬리 ---

section("조작");
{
  const id = alice.net.myId!;
  const runner = world.runnerOf(id)!;
  const before = runner.dir;
  // 180° 가 아닌 방향을 하나 고른다. 뒤집기는 엔진이 버린다.
  const turn: Direction = before === "up" || before === "down" ? "left" : "up";
  alice.steer(turn);
  pump(world, [alice], 4);
  check("방향이 반영된다", world.runnerOf(id)?.dir === turn, `${world.runnerOf(id)?.dir}`);

  // 영토를 벗어날 때까지 달리면 꼬리가 생긴다.
  let guard = 0;
  while ((world.runnerOf(id)?.trail.length ?? 0) === 0 && guard < 200) {
    pump(world, [alice], 1);
    guard += 1;
  }
  const serverTrail = world.runnerOf(id)?.trail ?? [];
  const clientTrail = alice.net.me?.trail ?? [];
  check("꼬리가 생긴다", serverTrail.length > 0, `${serverTrail.length}칸`);
  check("클라이언트 꼬리 길이가 맞는다", clientTrail.length === serverTrail.length, `${clientTrail.length} vs ${serverTrail.length}`);
  const sameCells =
    clientTrail.length === serverTrail.length &&
    clientTrail.every((cell, i) => cell.x === serverTrail[i].x && cell.y === serverTrail[i].y);
  check("꼬리 칸이 하나도 어긋나지 않는다", sameCells);
}

// --- 시야 따라가기 ---

section("시야");
{
  const id = alice.net.myId!;
  const start = world.runnerOf(id)!;
  const startX = start.x;
  const startY = start.y;
  const beforeBytes = alice.sink.bytesSent;

  // 60칸 넘게 이동시키면 시야 사각형을 다시 잡아야 한다.
  let guard = 0;
  while (guard < 900) {
    const runner = world.runnerOf(id);
    if (!runner) {
      break;
    }
    if (Math.abs(runner.x - startX) + Math.abs(runner.y - startY) > 60) {
      break;
    }
    pump(world, [alice], 1);
    guard += 1;
  }

  const runner = world.runnerOf(id);
  if (runner) {
    check("멀리 이동해도 발밑 타일을 알고 있다", alice.net.isKnown(runner.x, runner.y));
    check(
      "이동한 자리의 소유자가 서버와 같다",
      alice.net.ownerAt(runner.x, runner.y) === world.match.board.ownerAt(runner.x, runner.y)
    );
    const sent = alice.sink.bytesSent - beforeBytes;
    // 조각 전송이 동작하면 보드 전체(36만 칸)와는 자릿수가 다르다.
    check("조각만 보낸다 (전체 재전송이 아니다)", sent < 200_000, `${Math.round(sent / 1024)}KB`);
  } else {
    check("멀리 이동해도 발밑 타일을 알고 있다", false, "이동 중 사망");
  }
}

// --- 두 사람이 서로를 본다 ---

section("동시 접속");
{
  const bob = new Peer(world);
  bob.hello("밥");
  const bobId = bob.net.myId!;
  check("두 번째 접속도 자리를 받는다", bobId !== null && bobId !== alice.net.myId);
  check("사람 수가 둘이 된다", world.humanCount === 2, `${world.humanCount}`);

  pump(world, [alice, bob], 3);
  check("자기 자신은 항상 보인다", bob.net.players.has(bobId));
  // 갓 들어온 사람은 25칸뿐이라 상위 10위에 못 든다. 순위표에서 확인할 것은
  // 이름이 비어 있지 않은지와 내림차순인지다.
  check("순위표에 이름이 다 붙어 있다", bob.net.leaderboard.every((row) => row.name.length > 0));
  check(
    "순위표가 내림차순이다",
    bob.net.leaderboard.every((row, i) => i === 0 || bob.net.leaderboard[i - 1].score >= row.score)
  );
  check(
    "접속자 이름은 서버가 들고 있다",
    world.nameOf(bobId) === "밥" && bob.net.players.get(bobId)?.name === "밥",
    `${world.nameOf(bobId)}`
  );

  // 접속을 끊으면 자리가 비고 영토가 중립으로 돌아간다.
  const runner = world.runnerOf(bobId)!;
  const spotX = runner.x;
  const spotY = runner.y;
  bob.session.dispose();
  check("끊으면 사람 수가 준다", world.humanCount === 1, `${world.humanCount}`);
  check("끊으면 유닛이 사라진다", world.runnerOf(bobId) === undefined);
  check("끊으면 영토가 중립으로 돌아간다", world.match.board.ownerAt(spotX, spotY) !== bobId);

  // 비운 번호는 다시 쓰인다 — 소유자 코드가 1바이트라 번호를 늘려 갈 수 없다.
  const carol = new Peer(world);
  carol.hello("캐럴");
  check("비운 번호를 다시 쓴다", carol.net.myId === bobId, `${carol.net.myId} vs ${bobId}`);
  carol.session.dispose();
}

// --- 사망과 재입장 ---

section("사망");
{
  const peer = new Peer(world);
  peer.hello("다이");
  const firstId = peer.net.myId!;

  // 방향을 바꾸지 않으면 스폰 방향 그대로 반대쪽 벽까지 달린다. 도중에 봇에게
  // 잡혀도 결과는 같다 — 어느 쪽이든 사망이 한 번 일어난다.
  let guard = 0;
  while (peer.net.gameOver === null && guard < 4_000) {
    pump(world, [alice, peer], 1);
    guard += 1;
  }

  check("죽으면 결과가 온다", peer.net.gameOver !== null, `${guard}주기`);
  if (peer.net.gameOver) {
    check("결과에 순위가 들어 있다", peer.net.gameOver.total > 0, `${peer.net.gameOver.rank}/${peer.net.gameOver.total}`);
    check("결과에 생존 시간이 들어 있다", peer.net.gameOver.survivalMs > 0, `${peer.net.gameOver.survivalMs}ms`);
  }
  check("죽으면 자리가 비워진다", world.runnerOf(firstId) === undefined);
  check("클라이언트도 자리를 놓는다", peer.net.myId === null);

  peer.respawn();
  check("다시 들어가면 새 자리를 받는다", peer.net.myId !== null, `${peer.net.myId}`);
  check("다시 들어가면 결과가 지워진다", peer.net.gameOver === null);

  const back = world.runnerOf(peer.net.myId!);
  check("새 자리의 시작 영토가 도착한다", back !== undefined && peer.net.ownerAt(back.x, back.y) === back.id);
  peer.session.dispose();
}

// --- 규약 위반 ---

section("규약");
{
  const stale = new Peer(world);
  const writer = new ByteWriter(16);
  writer.u8(ClientMessage.Hello).u16(PROTOCOL_VERSION + 1).text("옛날");
  stale.session.receive(writer.finish());
  check("버전이 다르면 거절한다", stale.net.rejected === RejectReason.Version, `${stale.net.rejected}`);
  check("거절하면 접속을 닫는다", stale.sink.closed);
  check("거절당하면 자리를 차지하지 않는다", world.humanCount === 1, `${world.humanCount}`);

  const babble = new Peer(world);
  babble.session.receive(new Uint8Array([0xfe, 0x00, 0x00]));
  check("모르는 메시지는 무시한다", babble.net.myId === null && !babble.sink.closed);

  let threw = false;
  try {
    // Hello 라고 해 놓고 본문이 없다. 읽다가 끝을 넘긴다.
    babble.session.receive(new Uint8Array([ClientMessage.Hello, 0x01]));
  } catch {
    threw = true;
  }
  check("잘린 메시지는 예외로 알린다", threw);
}

// --- 부하 ---

section("부하");
{
  const busy = new World({ seed: 7, stepMs: 50 });
  const crowd: Peer[] = [];
  for (let i = 0; i < 16; i += 1) {
    const peer = new Peer(busy);
    peer.hello(`P${i + 1}`);
    crowd.push(peer);
  }
  check("16명이 모두 앉는다", busy.humanCount === 16, `${busy.humanCount}`);

  const startedAt = Date.now();
  const cycles = 100;
  pump(busy, crowd, cycles);
  const elapsed = Date.now() - startedAt;
  const simulated = cycles * BROADCAST_MS;

  const bytes = crowd.reduce((total, peer) => total + peer.sink.bytesSent, 0);
  const perPlayerPerSecond = bytes / crowd.length / (simulated / 1000);

  check(
    `${simulated / 1000}초 ×${crowd.length}명 시뮬레이션이 실시간보다 빠르다`,
    elapsed < simulated,
    `${elapsed}ms / ${simulated}ms`
  );
  check("1인당 대역폭이 20KB/s 아래다", perPlayerPerSecond < 20 * 1024, `${Math.round(perPlayerPerSecond / 1024)}KB/s`);
  console.log(
    `    참고: 실측 ${elapsed}ms (실시간의 ${(simulated / Math.max(1, elapsed)).toFixed(1)}배), ` +
      `1인당 ${(perPlayerPerSecond / 1024).toFixed(1)}KB/s`
  );
}

console.log(`\n${failed === 0 ? "모든 서버 검사 통과" : "실패한 검사가 있습니다"} — ${passed}통과 / ${failed}실패`);
process.exit(failed === 0 ? 0 : 1);
