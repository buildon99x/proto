// 키 비주얼·장소 컨셉에 들어가는 유물 도트를 **게임 렌더러 그대로** 굽는다.
// 그림 속 유물과 게임 화면의 유물이 같은 비트맵이어야 도트↔큰 그림 변환 규칙이 선다.
//   (app 디렉터리에서) npx tsx ../ip/src/bake-finds.ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ARTIFACTS } from "../../app/src/game/artifacts";
import { renderSpriteRGBA, SPRITE_SIZE } from "../../app/src/render/sprite";
import { encodePng } from "../../app/src/render/png";

const IDS = [
  "gilt-bronze-maitreya-83", "silla-gold-crown", "cheonmado-saddle-flap",
  "tutankhamun-mask", "alexander-mosaic", "china-he-zun", "mexico-piedra-del-sol",
  "india-kohinoor-diamond", "irq-warka-vase", "gr-antikythera-mechanism"
];
const OUT = path.resolve(import.meta.dirname, "../art/finds");
mkdirSync(OUT, { recursive: true });
const rows: string[] = [];
for (const id of IDS) {
  const a = ARTIFACTS.find((x) => x.id === id);
  if (!a) throw new Error("missing " + id);
  const rgba = renderSpriteRGBA(a);
  writeFileSync(path.join(OUT, `${id}.png`), encodePng(rgba, SPRITE_SIZE, SPRITE_SIZE));
  rows.push(`${id}\t${a.name}\t${a.holder}\tT${a.tier}`);
}
writeFileSync(path.join(OUT, "index.tsv"), rows.join("\n") + "\n");
console.log(rows.join("\n"));
