#!/usr/bin/env node
// IP 그림 굽기. 페이지 생성 → 쓰인 글자만 폰트 서브셋 → 크로미움으로 PNG.
//
//   node ip/src/fetch-fonts.mjs   (처음 한 번, 원본 폰트 받기)
//   node ip/src/build.mjs [이름 필터...]
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { IP, fontFaceCss, subsetFonts, renderHtml } from "./lib.mjs";
import { directionPages } from "./directions.mjs";

const filters = process.argv.slice(2);
const PAGES_DIR = path.join(IP, ".cache/pages");
mkdirSync(PAGES_DIR, { recursive: true });
const css = fontFaceCss("../../fonts");

const mods = [directionPages];
for (const extra of ["crew.mjs", "scenes.mjs", "keyvisual.mjs"]) {
  if (existsSync(path.join(IP, "src", extra))) mods.push((await import("./" + extra)).pages);
}
const all = mods.flatMap((m) => m(css));

// 폰트 서브셋은 모든 IP 텍스트(그림 + 쇼케이스)를 한꺼번에 본다
let text = all.map((p) => p.html).join("");
for (const extra of ["showcase/index.html"]) {
  const p = path.join(IP, extra);
  if (existsSync(p)) text += readFileSync(p, "utf8");
}
subsetFonts(text, path.join(IP, "fonts"));

for (const p of all) {
  if (filters.length && !filters.some((f) => p.name.includes(f))) continue;
  const html = path.join(PAGES_DIR, p.name + ".html");
  writeFileSync(html, p.html);
  mkdirSync(path.dirname(path.join(IP, p.out)), { recursive: true });
  if (p.png) writeFileSync(path.join(IP, p.out), p.png); // 브라우저 없이 구운 도트
  else renderHtml(html, path.join(IP, p.out), p.w, p.h);
  console.log("✓", p.out);
}

// 쇼케이스 — 필터 없이 돌렸을 때만 복사하고 미리보기를 굽는다
if (!filters.length || filters.includes("showcase")) {
  const { publishShowcase } = await import("./showcase.mjs");
  const out = publishShowcase();
  renderHtml(path.join(out, "index.html"), path.join(IP, "art/showcase-preview.png"), 1280, 6600);
  renderHtml(path.join(out, "index.html"), path.join(IP, "art/showcase-preview-mobile.png"), 400, 9000);
  console.log("✓ showcase →", path.relative(IP, out));
}
