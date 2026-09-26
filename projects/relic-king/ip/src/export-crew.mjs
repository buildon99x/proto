// 크루 도트를 게임 번들로 내보낸다 — ip/src/crew-sprites.mjs → app/src/render/crew.generated.ts.
//
//   node ip/src/export-crew.mjs           다시 굽는다
//   node ip/src/export-crew.mjs --check   커밋된 산출물이 최신인지만 검사(다르면 exit 1)
//
// 원본은 하나다. 도트를 고칠 때는 crew-sprites.mjs를 고치고 이 스크립트를 다시 돌린다
// (큰 그림 crew-vector.mjs와도 좌표 × 10으로 묶여 있다 — ip/visual-guide.md §3).
// 게임은 이 산출물을 캔버스로 찍을 뿐 색을 새로 정하지 않는다.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLORS, CREW } from "./crew-sprites.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../app/src/render/crew.generated.ts");

function build() {
  for (const c of CREW) {
    if (c.rows.length !== 24) throw new Error(`${c.id}: 행 ${c.rows.length}개(24여야 한다)`);
    c.rows.forEach((r, i) => {
      if (r.length !== 16) throw new Error(`${c.id} ${i}행: 폭 ${r.length}(16이어야 한다)`);
      for (const ch of r) if (ch !== "." && !COLORS[ch]) throw new Error(`${c.id} ${i}행: 팔레트에 없는 '${ch}'`);
    });
  }
  const used = new Set(CREW.flatMap((c) => c.rows.join("").split("")).filter((ch) => ch !== "."));
  const palette = Object.fromEntries([...used].sort().map((k) => [k, COLORS[k]]));
  const lines = [
    "// 생성 파일 — 손으로 고치지 않는다. 원본 ip/src/crew-sprites.mjs, 굽기 node ip/src/export-crew.mjs",
    "",
    "export const CREW_SPRITE_W = 16;",
    "export const CREW_SPRITE_H = 24;",
    "",
    `export const CREW_COLORS: Record<string, string> = ${JSON.stringify(palette, null, 2)};`,
    "",
    "export const CREW_ROWS = {"
  ];
  for (const c of CREW) {
    lines.push(`  ${JSON.stringify(c.id)}: [`);
    for (const r of c.rows) lines.push(`    ${JSON.stringify(r)},`);
    lines.push("  ],");
  }
  lines.push("} as const;", "");
  lines.push("export type CrewId = keyof typeof CREW_ROWS;", "");
  return lines.join("\n");
}

const text = build();
if (process.argv.includes("--check")) {
  const current = await readFile(OUT, "utf8").catch(() => "");
  if (current !== text) {
    console.error("crew.generated.ts가 ip/src/crew-sprites.mjs와 다르다 — node ip/src/export-crew.mjs 로 다시 굽는다.");
    process.exit(1);
  }
  console.log("crew.generated.ts 최신");
} else {
  await writeFile(OUT, text);
  console.log(`썼다: ${path.relative(process.cwd(), OUT)}`);
}
