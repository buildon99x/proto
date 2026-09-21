/* 배경 실루엣 — 계곡 · 폐허 · 무너진 도시 · 달 · 마른 나무.
 *
 * 전부 **잉크(벽) 안에서만** 산다. 통로는 여전히 무지다.
 * 그리고 어느 하나도 통로 종이(#18202f)보다 밝지 않다 — 죽는 영역이 밝아지는 순간
 * render.ts 가 고쳐 놓은 반사가 다시 뒤집힌다. 달조차 어둡게 찍고 윤곽선으로만 달이 된다.
 *
 * 먼 것이 밝고 가까운 것이 어둡다(야경 실루엣의 관습). 세 톤 전부 먹과 종이 사이에 있다. */
const TONE = {
  far: "var(--scn-far)",    // 계곡 능선
  mid: "var(--scn-mid)",    // 폐허·도시
  near: "var(--scn-near)",  // 마른 나무 — 가장 가깝고 가장 어둡다
  moon: "var(--scn-moon)",
  moonRing: "var(--mark)",   // 달무리가 가장 큰 배경 심볼이다
  /* 형태는 덩어리 밝기가 아니라 윤곽선이 만든다. 실루엣을 통로만큼 밝히면
   * 죽는 영역이 밝아져 반사가 뒤집히므로, 밝힐 수 있는 것은 1px 선뿐이다. */
  key: "var(--scn-key)",
  keyFaint: "var(--scn-key-faint)"
};

/** 들쭉날쭉한 능선 하나. 계곡의 먼 벽 */
function ridgePair(x0, x1, base, peaks, seed) {
  const d = ridge(x0, x1, base, peaks, seed);
  return `<path d="${d}" style="fill:${TONE.far}"/><path d="${d}" fill="none" style="stroke:${TONE.keyFaint}" stroke-width="1.4"/>`;
}

function ridge(x0, x1, base, peaks, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const step = (x1 - x0) / peaks;
  let d = `M ${x0},${base + 400}  L ${x0},${base}`;
  for (let i = 0; i <= peaks; i++) {
    const x = x0 + i * step;
    const y = base - (18 + rnd() * 120);
    d += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
    d += ` L ${(x + step * 0.45).toFixed(1)},${(y + 26 + rnd() * 60).toFixed(1)}`;
  }
  return `${d} L ${x1},${base + 400} Z`;
}

/** 무너진 도시 — 꼭대기가 잘려 나간 탑들. 하나는 기울어 있다 */
function skyline(x0, base, count, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let out = "";
  let x = x0;
  for (let i = 0; i < count; i++) {
    const w = 26 + rnd() * 54;
    const h = 90 + rnd() * 230;
    const lean = i % 5 === 3 ? (rnd() - 0.5) * 9 : 0;
    // 부러진 꼭대기 — 한쪽이 더 낮게 사선으로 잘린다
    const cut = rnd() * 0.45;
    const d = `M ${x},${base} L ${x},${base - h} L ${(x + w * (1 - cut)).toFixed(1)},${(base - h + h * cut * 0.5).toFixed(1)}
               L ${(x + w).toFixed(1)},${(base - h * (0.62 + rnd() * 0.3)).toFixed(1)} L ${(x + w).toFixed(1)},${base} Z`;
    out += `<path d="${d}" fill="${TONE.mid}" transform="rotate(${lean.toFixed(2)} ${(x + w / 2).toFixed(1)} ${base})"/>`;
    // 창 — 잉크를 비운 칸. 실크스크린은 구멍으로 창을 만든다
    if (h > 150) {
      for (let r = 0; r < Math.floor(h / 54); r++) {
        if (rnd() < 0.45) continue;
        out += `<rect x="${(x + w * 0.28).toFixed(1)}" y="${(base - h + 30 + r * 46).toFixed(1)}"
                 width="${(w * 0.2).toFixed(1)}" height="9" style="fill:var(--scn-window)"/>`;
      }
    }
    x += w + 6 + rnd() * 26;
  }
  return out;
}

/** 폐허 — 무너진 아치와 남은 기둥 */
function ruins(x0, base, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let out = "";
  let x = x0;
  for (let i = 0; i < 6; i++) {
    const h = 42 + rnd() * 86;
    const w = 16 + rnd() * 20;
    const chip = 0.25 + rnd() * 0.5;
    out += `<path d="M ${x.toFixed(1)},${base} L ${x.toFixed(1)},${(base - h).toFixed(1)}
             L ${(x + w * chip).toFixed(1)},${(base - h * (0.78 + rnd() * 0.14)).toFixed(1)}
             L ${(x + w).toFixed(1)},${(base - h * (0.86 + rnd() * 0.12)).toFixed(1)}
             L ${(x + w).toFixed(1)},${base} Z"
             style="fill:${TONE.mid};stroke:${TONE.key}" stroke-width="1.1"/>`;
    if (i > 0 && rnd() < 0.55) {
      // 두 기둥을 잇다 만 아치
      out += `<path d="M ${(x - 34).toFixed(1)},${(base - h * 0.82).toFixed(1)}
               q ${17},${-30} ${34},0 l -9,6 q ${-8},${-18} ${-16},0 Z"
               style="fill:${TONE.mid};stroke:${TONE.key}" stroke-width="1"/>`;
    }
    x += w + 30 + rnd() * 54;
  }
  return out;
}

/** 마른 나무 — 잎이 없다. 가지가 위로 갈라지기만 한다 */
function deadTree(x, base, scale, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const segs = [];
  const branch = (bx, by, ang, len, wdt, depth) => {
    const ex = bx + Math.cos(ang) * len;
    const ey = by - Math.sin(ang) * len;
    segs.push(`<path d="M ${bx.toFixed(1)},${by.toFixed(1)} L ${ex.toFixed(1)},${ey.toFixed(1)}"
                style="stroke:${TONE.near}" stroke-width="${(wdt + 1.6).toFixed(2)}" stroke-linecap="round" fill="none"/>`);
    segs.push(`<path d="M ${bx.toFixed(1)},${by.toFixed(1)} L ${ex.toFixed(1)},${ey.toFixed(1)}"
                style="stroke:${TONE.key}" stroke-width="${Math.max(0.6, wdt * 0.35).toFixed(2)}"
                stroke-linecap="round" fill="none" opacity="0.7"/>`);
    if (depth === 0) return;
    const n = rnd() < 0.35 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      branch(ex, ey, ang + (rnd() - 0.5) * 1.5, len * (0.58 + rnd() * 0.22), wdt * 0.62, depth - 1);
    }
  };
  branch(x, base, Math.PI / 2 + (rnd() - 0.5) * 0.3, 60 * scale, 11 * scale, 3);
  return segs.join("");
}

/** 달 — 밝아서 달이 아니라 윤곽과 후광으로 달이다 */
function moon(cx, cy, r) {
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" style="fill:${TONE.moon}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" style="stroke:${TONE.moonRing}" stroke-width="2.2" opacity="0.55"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 16}" fill="none" style="stroke:${TONE.moonRing}" stroke-width="1.2" opacity="0.24"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 34}" fill="none" style="stroke:${TONE.moonRing}" stroke-width="0.9" opacity="0.12"/>
    <circle cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.22).toFixed(1)}" r="${(r * 0.2).toFixed(1)}" style="fill:${TONE.mid}"/>
    <circle cx="${(cx + r * 0.28).toFixed(1)}" cy="${(cy + r * 0.3).toFixed(1)}" r="${(r * 0.13).toFixed(1)}" style="fill:${TONE.mid}"/>`;
}

/* ── 배경 심볼 — 형광 라임으로 찍는 유일한 것들 ─────────────────────
 *
 * 라임은 배경 전용 잉크다. 통로에도 기믹에도 오지 않는다. 그리고 **면으로
 * 칠하지 않는다** — 전부 가는 선이고, 잉크를 0.5~0.6 으로 얇게 올려 화면에서
 * 판정선(#9fb4d8)보다 밝아지지 않게 한다. 죽는 영역에 화면 최고 밝기를 두면
 * 시선이 통로에서 끌려 나가고, 그건 이 컨셉이 처음부터 피하려던 것이다.
 *
 * 폐허에 스텐실로 찍힌 마크라는 설정이라 실크스크린과도 맞는다 — 스텐실은
 * 이 공정의 조상이다. */

/** 무너진 도시 벽의 문장 — 원 안의 파형. 프레임이 있어야 궤적으로 오독되지 않는다 */
function emblem(cx, cy, r, mast) {
  const w = r * 0.62;
  const wave = `M ${cx - w},${cy + w * 0.38} L ${cx - w * 0.33},${cy - w * 0.38}
                L ${cx + w * 0.33},${cy + w * 0.38} L ${cx + w},${cy - w * 0.38}`;
  return `
    <g style="stroke:var(--mark)" fill="none" stroke-linejoin="miter" opacity="0.62">
      <path d="M ${cx},${cy + r} L ${cx},${cy + r + (mast || 74)}" stroke-width="1.6" opacity="0.6"/>
      <path d="M ${cx - 16},${cy + r + (mast || 74)} L ${cx + 16},${cy + r + (mast || 74)}" stroke-width="1.6" opacity="0.6"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="2.2"/>
      <circle cx="${cx}" cy="${cy}" r="${r + 7}" stroke-width="1" opacity="0.5"/>
      <path d="${wave}" stroke-width="3"/>
    </g>`;
}

/** 첨탑 끝의 표지등 — 점 하나와 그 둘레 */
function beacon(cx, cy, mast) {
  return `
    <g opacity="0.6">
      <path d="M ${cx},${cy + 3} L ${cx},${cy + (mast || 96)}" fill="none"
            style="stroke:var(--mark)" stroke-width="1.4" opacity="0.45"/>
      <circle cx="${cx}" cy="${cy}" r="3.4" style="fill:var(--mark)"/>
      <circle cx="${cx}" cy="${cy}" r="11" fill="none" style="stroke:var(--mark)" stroke-width="1.2" opacity="0.55"/>
      <circle cx="${cx}" cy="${cy}" r="20" fill="none" style="stroke:var(--mark)" stroke-width="0.8" opacity="0.25"/>
    </g>`;
}

/** 폐허 기둥의 스텐실 — 구역 표시처럼 읽히는 짧은 획 */
function stencil(x, y, kind) {
  const g = [
    `<path d="M ${x},${y} L ${x + 15},${y} M ${x},${y + 7} L ${x + 15},${y + 7} M ${x},${y + 14} L ${x + 9},${y + 14}"/>`,
    `<path d="M ${x},${y + 13} L ${x + 8},${y} L ${x + 16},${y + 13}"/>`,
    `<path d="M ${x},${y + 6} L ${x + 16},${y + 6}" /><circle cx="${x + 8}" cy="${y + 6}" r="5" fill="none"/>`
  ][kind];
  return `<g style="stroke:var(--mark)" fill="none" stroke-width="2.4" opacity="0.5">${g}</g>`;
}
