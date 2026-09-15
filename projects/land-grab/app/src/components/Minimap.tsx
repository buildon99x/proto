import { useEffect, useRef } from "react";
import { MINIMAP_PARTS, MINIMAP_PART_MS, MINIMAP_PIXELS, playerStyle } from "../game/config";
import { WALL } from "../game/board";
import type { Match } from "../game/engine";

type Props = {
  match: Match;
};

const EMPTY = "#161d2c";
const EMPTY_RGB: [number, number, number] = [22, 29, 44];

/** 소유자 번호 → RGB. 미니맵은 픽셀을 직접 써서 그리므로 숫자가 필요하다. */
const rgbCache = new Map<number, [number, number, number]>();
function colorOf(owner: number): [number, number, number] {
  let rgb = rgbCache.get(owner);
  if (!rgb) {
    const hex = playerStyle(owner).territory.replace("#", "");
    rgb = [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16)
    ];
    rgbCache.set(owner, rgb);
  }
  return rgb;
}
const VIEW_BOX = "rgba(226, 232, 240, 0.85)";

/**
 * 큰 맵에서 내가 어디 있는지 알려 주는 축소판.
 *
 * splix 처럼 **한 번에 한 조각씩** 다시 그린다. 36만 칸을 매번 훑을 이유가 없고,
 * 미니맵은 조금 늦어도 아무도 눈치채지 못한다.
 * 내 위치와 보이는 범위만 매 프레임 덧그린다.
 */
export function Minimap({ match }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = MINIMAP_PIXELS * dpr;
    canvas.height = MINIMAP_PIXELS * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const buffer = document.createElement("canvas");
    buffer.width = MINIMAP_PIXELS;
    buffer.height = MINIMAP_PIXELS;
    const bufferCtx = buffer.getContext("2d");
    if (!bufferCtx) {
      return;
    }
    bufferCtx.fillStyle = EMPTY;
    bufferCtx.fillRect(0, 0, MINIMAP_PIXELS, MINIMAP_PIXELS);

    const rows = Math.ceil(MINIMAP_PIXELS / MINIMAP_PARTS);
    let part = 0;
    let lastPartAt = 0;
    let handle = 0;
    let running = true;

    const redrawPart = () => {
      const board = match.board;
      const scale = board.size / MINIMAP_PIXELS;
      const startY = part * rows;
      const endY = Math.min(MINIMAP_PIXELS, startY + rows);

      // 픽셀마다 fillRect 를 부르면 조각당 수천 번의 상태 변경이 된다. 픽셀을 직접 쓴다.
      const image = bufferCtx.createImageData(MINIMAP_PIXELS, endY - startY);
      const data = image.data;

      for (let my = startY; my < endY; my += 1) {
        const boardY = Math.floor(my * scale);
        const row = boardY * board.size;
        const outRow = (my - startY) * MINIMAP_PIXELS;
        for (let mx = 0; mx < MINIMAP_PIXELS; mx += 1) {
          const owner = board.owner[row + Math.floor(mx * scale)];
          const rgb = owner === 0 || owner === WALL ? EMPTY_RGB : colorOf(owner);
          const at = (outRow + mx) * 4;
          data[at] = rgb[0];
          data[at + 1] = rgb[1];
          data[at + 2] = rgb[2];
          data[at + 3] = 255;
        }
      }
      bufferCtx.putImageData(image, 0, startY);

      part = (part + 1) % MINIMAP_PARTS;
    };

    const frame = (now: number) => {
      if (!running) {
        return;
      }
      if (now - lastPartAt >= MINIMAP_PART_MS) {
        lastPartAt = now;
        redrawPart();
      }

      ctx.clearRect(0, 0, MINIMAP_PIXELS, MINIMAP_PIXELS);
      ctx.drawImage(buffer, 0, 0);

      const board = match.board;
      const toPixel = MINIMAP_PIXELS / board.size;

      const viewTiles = Math.min(board.size, match.viewTiles);
      const half = viewTiles / 2;
      const me = match.human;
      const cameraX = Math.min(board.size - half, Math.max(half, me.x + 0.5));
      const cameraY = Math.min(board.size - half, Math.max(half, me.y + 0.5));

      ctx.strokeStyle = VIEW_BOX;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        (cameraX - half) * toPixel,
        (cameraY - half) * toPixel,
        viewTiles * toPixel,
        viewTiles * toPixel
      );

      if (me.alive) {
        ctx.fillStyle = playerStyle(me.id).unit;
        ctx.beginPath();
        ctx.arc((me.x + 0.5) * toPixel, (me.y + 0.5) * toPixel, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      handle = window.requestAnimationFrame(frame);
    };

    handle = window.requestAnimationFrame(frame);
    return () => {
      running = false;
      window.cancelAnimationFrame(handle);
    };
  }, [match]);

  return (
    <canvas
      ref={canvasRef}
      className="minimap"
      style={{ width: MINIMAP_PIXELS, height: MINIMAP_PIXELS }}
      aria-label="미니맵"
    />
  );
}
