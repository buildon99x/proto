import { CREW_COLORS, CREW_ROWS, CREW_SPRITE_H, CREW_SPRITE_W, type CrewId } from "./crew.generated";

/**
 * 크루 도트(16×24)를 data URL로 찍는다. 원본은 `ip/src/crew-sprites.mjs` 하나이고
 * 이 파일은 그 생성 산출물(`crew.generated.ts`)을 캔버스에 옮길 뿐이다 — 유물 도트의
 * `spriteUrl`과 같은 방식(런타임 외부 요청 0, 한 번 찍으면 캐시).
 */
const cache = new Map<CrewId, string>();

export function crewSpriteUrl(id: CrewId): string {
  const hit = cache.get(id);
  if (hit) return hit;
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = CREW_SPRITE_W;
  canvas.height = CREW_SPRITE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  CREW_ROWS[id].forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = CREW_COLORS[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  const url = canvas.toDataURL();
  cache.set(id, url);
  return url;
}

export { CREW_SPRITE_H, CREW_SPRITE_W, type CrewId };
