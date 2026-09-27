// IP 그림 공용: PNG 인코더, 크로미움 렌더, 폰트 서브셋.
import { execFileSync } from "node:child_process";
import { deflateSync } from "node:zlib";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export const IP = path.resolve(import.meta.dirname, "..");
export const CACHE_FONTS = path.join(IP, ".cache/fonts");
export const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

// ── PNG (RGBA, 필터 0) ────────────────────────────────────────────────────
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePng(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))
  ]);
}
export function hexRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** ASCII 비트맵 → RGBA. `colors`는 문자 → "#rrggbb", '.'는 투명. */
export function asciiToRgba(rows, colors) {
  const h = rows.length, w = rows[0].length;
  const out = new Uint8ClampedArray(w * h * 4);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`row ${y} width ${row.length} != ${w}: "${row}"`);
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      const c = colors[ch];
      if (!c) throw new Error(`unknown pixel char "${ch}"`);
      const [r, g, b] = hexRgb(c);
      out.set([r, g, b, 255], (y * w + x) * 4);
    });
  });
  return { rgba: out, w, h };
}
export function scaleRgba({ rgba, w, h }, s) {
  const out = new Uint8ClampedArray(w * s * h * s * 4);
  for (let y = 0; y < h * s; y++)
    for (let x = 0; x < w * s; x++) {
      const i = (Math.floor(y / s) * w + Math.floor(x / s)) * 4;
      out.set(rgba.subarray(i, i + 4), (y * w * s + x) * 4);
    }
  return { rgba: out, w: w * s, h: h * s };
}
export function pngDataUrl(img) {
  return "data:image/png;base64," + encodePng(img.rgba, img.w, img.h).toString("base64");
}

// ── 크로미움 렌더 ─────────────────────────────────────────────────────────
export function renderHtml(htmlPath, pngPath, w, h) {
  mkdirSync(path.dirname(pngPath), { recursive: true });
  execFileSync(CHROME, [
    "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    "--force-device-scale-factor=1", "--default-background-color=00000000",
    "--run-all-compositor-stages-before-draw", "--virtual-time-budget=4000",
    `--window-size=${w},${h}`, `--screenshot=${pngPath}`, "file://" + htmlPath
  ], { stdio: "pipe" });
  if (!existsSync(pngPath)) throw new Error("render failed: " + htmlPath);
}

// ── 폰트 ─────────────────────────────────────────────────────────────────
export const FONTS = [
  { family: "RK Serif", weight: 400, src: "NotoSerifKR-Regular.otf", out: "rk-serif-400.woff2" },
  { family: "RK Serif", weight: 700, src: "NotoSerifKR-Bold.otf", out: "rk-serif-700.woff2" },
  { family: "RK Serif", weight: 900, src: "NotoSerifKR-Black.otf", out: "rk-serif-900.woff2" },
  { family: "RK Sans", weight: 400, src: "NotoSansKR-Regular.otf", out: "rk-sans-400.woff2" },
  { family: "RK Sans", weight: 700, src: "NotoSansKR-Bold.otf", out: "rk-sans-700.woff2" },
  { family: "RK Dot", weight: 400, src: "Galmuri11.ttf", out: "rk-dot-400.woff2" },
  { family: "RK Dot", weight: 700, src: "Galmuri11-Bold.ttf", out: "rk-dot-700.woff2" },
  { family: "RK Dot9", weight: 400, src: "Galmuri9.ttf", out: "rk-dot9-400.woff2" }
];
export function fontFaceCss(relDir) {
  return FONTS.map((f) =>
    `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-display:block;src:url("${relDir}/${f.out}") format("woff2")}`
  ).join("\n");
}
/** 모든 페이지 텍스트에 쓰인 글자만 남겨 ip/fonts 에 굽는다. */
export function subsetFonts(text, outDir) {
  mkdirSync(outDir, { recursive: true });
  const chars = new Set([...text]);
  for (let c = 0x20; c < 0x7f; c++) chars.add(String.fromCharCode(c));
  for (const c of "·—–…“”‘’→←↑↓×±°№▲▼■□●○◆◇※①②③④⑤⑥") chars.add(c);
  const unicodes = [...chars].map((c) => c.codePointAt(0).toString(16)).join(",");
  const tmp = path.join(IP, ".cache/unicodes.txt");
  writeFileSync(tmp, unicodes);
  for (const f of FONTS) {
    execFileSync("pyftsubset", [
      path.join(CACHE_FONTS, f.src), `--unicodes-file=${tmp}`, "--flavor=woff2",
      "--layout-features=*", `--output-file=${path.join(outDir, f.out)}`
    ], { stdio: "pipe" });
  }
}
export const readText = (p) => readFileSync(p, "utf8");
