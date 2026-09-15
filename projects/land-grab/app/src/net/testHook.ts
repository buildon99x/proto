/**
 * 온라인 화면의 상태를 읽는 창구. 로컬 판의 `testHook.ts` 와 같은 자리에 있는 짝이다.
 *
 * 브라우저 확인이 방향만 눈감고 넣으면 자기 꼬리를 밟고 죽는다. 지금 어디를 보고
 * 있는지, 내 땅 위인지 알아야 고리를 닫는 조작을 짤 수 있다.
 */

import type { Direction } from "../game/types";
import type { Connection } from "./connection";

export type LandGrabNetHook = {
  phase: string;
  /** 접속이 무엇을 기다리는지 알려 주는 문구. 실패 원인도 여기 들어온다. */
  message: string;
  /** 내 유닛 번호. 자리를 못 받았으면 `null`. */
  myId: number | null;
  mapSize: number;
  x: number;
  y: number;
  dir: Direction;
  alive: boolean;
  /** 지금 밟고 있는 칸이 내 땅인가. 고리가 닫혔는지 보는 기준이다. */
  onOwnLand: boolean;
  trailLength: number;
  tiles: number;
  score: number;
  kills: number;
  rank: number;
  total: number;
  /** 시야 안에 보이는 유닛 수(나 포함). */
  visible: number;
  leaderboard: number;
  /** 탈락했으면 결과, 아니면 `null`. */
  gameOver: { score: number; rank: number; total: number; survivalMs: number } | null;
};

declare global {
  interface Window {
    __landGrabNet?: LandGrabNetHook;
  }
}

export function publishNetHook(connection: Connection): void {
  const world = connection.world;
  const me = world.me;
  const over = world.gameOver;

  window.__landGrabNet = {
    phase: connection.phase,
    message: connection.message,
    myId: world.myId,
    mapSize: world.mapSize,
    x: me?.x ?? -1,
    y: me?.y ?? -1,
    dir: me?.dir ?? "right",
    alive: me?.alive ?? false,
    onOwnLand: me !== null && world.myId !== null && world.ownerAt(me.x, me.y) === world.myId,
    trailLength: me?.trail.length ?? 0,
    tiles: world.score.tiles,
    score: world.score.score,
    kills: world.score.kills,
    rank: world.score.rank,
    total: world.score.total,
    visible: world.players.size,
    leaderboard: world.leaderboard.length,
    gameOver: over
      ? { score: over.score, rank: over.rank, total: over.total, survivalMs: over.survivalMs }
      : null
  };
}
