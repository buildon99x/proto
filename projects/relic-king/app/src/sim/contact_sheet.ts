/**
 * 컨택트 시트 굽기 (v0.4 — 작업 지시 §5 "눈으로 검사되는 것").
 *
 *   pnpm --filter relic-king sheets [--out ../assets/generated] [--tag after]
 *
 * 아이콘 검수는 이 PNG로 한다. 브라우저 없이 `renderSpriteRGBA`를 그대로 불러
 * 굽기 때문에 게임 화면에 실제로 뜨는 비트맵과 같다(결정론).
 *
 * 산출물
 *   contact-<tag>-overview.png   거점 12줄 × T2 이상 전부, 2배(64px). 거점 구분 검수용
 *   contact-<tag>-<site>.png     거점 하나의 T2 이상, 4배(128px). 종별 구분 검수용
 *   contact-<tag>-t4.png         유일 12종, 8배(256px). 전용 도트 검수용
 *   contact-<tag>-shapes.png     shape 10종 × 변형 6종 어휘표, 4배
 *   contact-<tag>-index.md       격자 좌표 → 유물 id·이름 (PNG에 한글을 못 찍으므로)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ARTIFACTS } from "../game/artifacts";
import { SITES } from "../game/sites";
import { encodePng } from "../render/png";
import { SPRITE_BG } from "../render/metric";
import { renderSpriteRGBA, SHAPE_VARIANTS, shapeVariantName, SPRITE_SIZE } from "../render/sprite";
import { TIER_COLOR } from "../render/palette";
import type { Artifact, Shape, SiteId } from "../game/types";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(k);
  return i > -1 ? args[i + 1] : d;
};
const OUT = path.resolve(import.meta.dirname, "../../", arg("--out", "../assets/generated"));
const TAG = arg("--tag", "after");

const PAD = 6;
const LABEL_H = 9;

/** 3×5 비트맵 폰트. PNG에 한글을 찍을 수 없어 거점 이름을 로마자로 적는 데만 쓴다 */
const FONT: Record<string, string[]> = {
  A: ["111", "101", "111", "101", "101"], B: ["111", "101", "110", "101", "111"],
  C: ["111", "100", "100", "100", "111"], D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "111", "100", "111"], F: ["111", "100", "111", "100", "100"],
  G: ["111", "100", "101", "101", "111"], H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"], J: ["111", "001", "001", "101", "111"],
  K: ["101", "101", "110", "101", "101"], L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"], N: ["110", "101", "101", "101", "101"],
  O: ["111", "101", "101", "101", "111"], P: ["111", "101", "111", "100", "100"],
  Q: ["111", "101", "101", "111", "001"], R: ["111", "101", "111", "110", "101"],
  S: ["111", "100", "111", "001", "111"], T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"], V: ["101", "101", "101", "101", "010"],
  W: ["101", "101", "111", "111", "101"], X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"], Z: ["111", "001", "010", "100", "111"],
  "0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"], "7": ["111", "001", "001", "001", "001"],
  "8": ["111", "101", "111", "101", "111"], "9": ["111", "101", "111", "001", "111"],
  "-": ["000", "000", "111", "000", "000"], " ": ["000", "000", "000", "000", "000"],
  ".": ["000", "000", "000", "000", "010"], "/": ["001", "001", "010", "100", "100"],
  ":": ["000", "010", "000", "010", "000"], "+": ["000", "010", "111", "010", "000"]
};

class Canvas {
  readonly px: Uint8Array;
  constructor(readonly w: number, readonly h: number, bg: [number, number, number]) {
    this.px = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      this.px[i * 4] = bg[0];
      this.px[i * 4 + 1] = bg[1];
      this.px[i * 4 + 2] = bg[2];
      this.px[i * 4 + 3] = 255;
    }
  }
  set(x: number, y: number, c: [number, number, number]) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const o = (y * this.w + x) * 4;
    this.px[o] = c[0];
    this.px[o + 1] = c[1];
    this.px[o + 2] = c[2];
    this.px[o + 3] = 255;
  }
  rect(x0: number, y0: number, w: number, h: number, c: [number, number, number]) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c);
  }
  /** 스프라이트를 정수배로 확대해 찍는다(픽셀 보간 없음 — 도트가 뭉개지면 검수가 안 된다) */
  blit(a: Artifact, x0: number, y0: number, scale: number) {
    const rgba = renderSpriteRGBA(a);
    for (let y = 0; y < SPRITE_SIZE; y++) {
      for (let x = 0; x < SPRITE_SIZE; x++) {
        const o = (y * SPRITE_SIZE + x) * 4;
        if (rgba[o + 3] === 0) continue;
        const c: [number, number, number] = [rgba[o], rgba[o + 1], rgba[o + 2]];
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) this.set(x0 + x * scale + sx, y0 + y * scale + sy, c);
        }
      }
    }
  }
  text(s: string, x0: number, y0: number, c: [number, number, number]) {
    let x = x0;
    for (const ch of s.toUpperCase()) {
      const g = FONT[ch] ?? FONT[" "];
      g.forEach((row, dy) => {
        for (let dx = 0; dx < 3; dx++) if (row[dx] === "1") this.set(x + dx, y0 + dy, c);
      });
      x += 4;
    }
  }
  png() {
    return encodePng(this.px, this.w, this.h);
  }
}

const hex = (h: string): [number, number, number] => {
  const v = parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const BG = hex("#0f0d0a");
const LINE = hex("#3a352e");
const TEXT = hex("#cfc6b4");

const upper = ARTIFACTS.filter((a) => a.tier >= 2);
const bySite = new Map<SiteId, Artifact[]>();
for (const s of SITES) bySite.set(s.id, []);
// 티어 내림차순 → 이름 순. 유일이 항상 맨 앞에 와서 눈으로 찾기 쉽다
for (const a of [...upper].sort((x, y) => y.tier - x.tier || x.id.localeCompare(y.id))) {
  bySite.get(a.site as SiteId)!.push(a);
}

mkdirSync(OUT, { recursive: true });
const index: string[] = [
  `# 컨택트 시트 색인 (${TAG})`,
  "",
  "PNG에 한글 글자를 찍을 수 없어(폰트 없음) 격자 좌표 → 유물 대응을 여기 적는다.",
  "`pnpm --filter relic-king sheets` 가 이 파일까지 같이 만든다.",
  ""
];

function siteLabel(s: SiteId) {
  return s.toUpperCase();
}

// ── 1) overview — 거점 12줄 ──────────────────────────────────────────────
{
  const scale = 2;
  const cell = SPRITE_SIZE * scale + PAD;
  const cols = Math.max(...[...bySite.values()].map((v) => v.length));
  const nameW = 8 * 4 + PAD;
  const c = new Canvas(nameW + cols * cell + PAD, SITES.length * (cell + LABEL_H) + PAD, BG);
  SITES.forEach((site, r) => {
    const y = PAD + r * (cell + LABEL_H);
    c.text(siteLabel(site.id), PAD, y + 6, TEXT);
    const list = bySite.get(site.id)!;
    list.forEach((a, i) => {
      const x = nameW + i * cell;
      c.rect(x - 1, y - 1, SPRITE_SIZE * scale + 2, 1, hex(TIER_COLOR[a.tier]));
      c.blit(a, x, y, scale);
    });
    c.rect(PAD, y + cell + 2, c.w - PAD * 2, 1, LINE);
  });
  writeFileSync(path.join(OUT, `contact-${TAG}-overview.png`), c.png());
}

// ── 2) 거점별 시트 ───────────────────────────────────────────────────────
for (const site of SITES) {
  const list = bySite.get(site.id)!;
  const scale = 4;
  const cell = SPRITE_SIZE * scale + PAD;
  const cols = 6;
  const rows = Math.ceil(list.length / cols);
  const c = new Canvas(PAD + cols * cell, LABEL_H + PAD + rows * (cell + LABEL_H), BG);
  c.text(`${siteLabel(site.id)} T2+ ${list.length}`, PAD, PAD, TEXT);
  index.push(`## ${site.name} (${site.id}) — T2 이상 ${list.length}종`, "");
  index.push("| 칸 | 티어 | id | 이름 | shape/변형 | palette |");
  index.push("| --- | --- | --- | --- | --- | --- |");
  list.forEach((a, i) => {
    const cx = PAD + (i % cols) * cell;
    const cy = LABEL_H + PAD + Math.floor(i / cols) * (cell + LABEL_H);
    c.rect(cx - 1, cy - 1, SPRITE_SIZE * scale + 2, 1, hex(TIER_COLOR[a.tier]));
    c.blit(a, cx, cy, scale);
    c.text(`${Math.floor(i / cols) + 1}-${(i % cols) + 1} T${a.tier}`, cx, cy + SPRITE_SIZE * scale + 2, TEXT);
    index.push(
      `| ${Math.floor(i / cols) + 1}-${(i % cols) + 1} | T${a.tier} | \`${a.id}\` | ${a.name} | ${a.shape}/${shapeVariantName(a.shape, a.spriteVariant)} | ${a.palette} |`
    );
  });
  index.push("");
  writeFileSync(path.join(OUT, `contact-${TAG}-${site.id}.png`), c.png());
}

// ── 3) 유일 12종 ─────────────────────────────────────────────────────────
{
  const t4 = ARTIFACTS.filter((a) => a.tier === 4);
  const scale = 6;
  const cell = SPRITE_SIZE * scale + PAD * 2;
  const cols = 4;
  const rows = Math.ceil(t4.length / cols);
  const c = new Canvas(PAD + cols * cell, LABEL_H + PAD + rows * (cell + LABEL_H), BG);
  c.text("UNIQUE T4 12", PAD, PAD, TEXT);
  t4.forEach((a, i) => {
    const cx = PAD + (i % cols) * cell;
    const cy = LABEL_H + PAD + Math.floor(i / cols) * (cell + LABEL_H);
    c.rect(cx - 1, cy - 1, SPRITE_SIZE * scale + 2, 1, hex(TIER_COLOR[4]));
    c.blit(a, cx, cy, scale);
    c.text(siteLabel(a.site as SiteId), cx, cy + SPRITE_SIZE * scale + 2, TEXT);
  });
  writeFileSync(path.join(OUT, `contact-${TAG}-t4.png`), c.png());
}

// ── 4) shape 어휘표 (10 × 6) ─────────────────────────────────────────────
// 변형이 실제로 실루엣을 가르는지 보는 표. 같은 팔레트·같은 거점으로 고정해
// 형태 차이만 남긴다.
{
  const shapes: Shape[] = ["jar", "sword", "crown", "mask", "scroll", "coin", "tablet", "statue", "ornament", "mechanism"];
  const scale = 3;
  const cell = SPRITE_SIZE * scale + PAD;
  const nameW = 10 * 4 + PAD;
  const c = new Canvas(nameW + 6 * cell + PAD, LABEL_H + PAD + shapes.length * (cell + 2), BG);
  c.text("SHAPE X VARIANT", PAD, PAD, TEXT);
  const variants = Array.from({ length: SHAPE_VARIANTS }, (_, v) => v);
  shapes.forEach((shape, r) => {
    const y = LABEL_H + PAD + r * (cell + 2);
    c.text(shape.slice(0, 9), PAD, y + 8, TEXT);
    variants.forEach((v) => {
      const probe: Artifact = {
        ...ARTIFACTS[0], id: `probe-${shape}-${v}`, shape, palette: "stone",
        site: "greece", tier: 2, seed: 1_000 + v * 977, spriteVariant: v
      };
      c.blit(probe, nameW + v * cell, y, scale);
    });
  });
  writeFileSync(path.join(OUT, `contact-${TAG}-shapes.png`), c.png());
  index.push("## shape × 변형 어휘표", "");
  index.push("| shape | " + variants.map((v) => `변형 ${v}`).join(" | ") + " |");
  index.push("| --- | " + "--- | ".repeat(SHAPE_VARIANTS));
  for (const shape of shapes) {
    index.push(`| \`${shape}\` | ` + variants.map((v) => shapeVariantName(shape, v)).join(" | ") + " |");
  }
  index.push("");
}

writeFileSync(path.join(OUT, `contact-${TAG}-index.md`), index.join("\n") + "\n");
console.log(`컨택트 시트 → ${OUT} (tag=${TAG})`);
console.log(`  overview 1 · 거점 ${SITES.length} · t4 1 · shapes 1 · index.md 1`);
