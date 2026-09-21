/* 배경 — 아홉 개의 모티프를 **라임 선화**로 찍는다.
 *   계곡 · 절벽 · 바위 · 폐허 · 무너진 도시 · 마른 나무 · 달 · 부엉이 · 표범
 *
 * 덩어리(면)는 여전히 먹이고 통로 종이보다 어둡다. 라임이 맡는 것은 **선**뿐이다.
 * 면을 라임으로 칠하면 죽는 영역이 화면에서 가장 밝아지고, 그 순간 이 컨셉이
 * 처음부터 피하려던 일이 일어난다.
 *
 * ## 농도가 거리다
 *
 * 아홉을 같은 강도로 찍으면 배경이 통로 경계와 같은 무게가 된다. 그래서 한 잉크를
 * 세 농도로 나눈다 — 실크스크린이 한 판을 농도로 나누는 바로 그 방식이다.
 *
 *   지형 0.17  (계곡 · 절벽)      — 가장 멀고 가장 얇다
 *   구조 0.25  (도시 · 폐허 · 바위 · 나무)
 *   상징 0.44  (달 · 부엉이 · 표범) — 눈이 머무는 셋만 진하다
 *
 * 어느 것도 통로 경계선(85% 잉크)을 넘지 않는다. */
const TONE = {
  far: "var(--scn-far)",
  mid: "var(--scn-mid)",
  near: "var(--scn-near)",
  moon: "var(--scn-moon)"
};
const D = { land: 0.17, build: 0.25, sign: 0.44 };

const rng = (seed) => {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
};
const mark = (d, density, w) =>
  `<g style="stroke:var(--mark)" fill="none" stroke-width="${w}" opacity="${density}"
      stroke-linejoin="round" stroke-linecap="round">${d}</g>`;

/** 계곡 — 들쭉날쭉한 먼 능선 */
function ridge(x0, x1, base, peaks, seed) {
  const rnd = rng(seed);
  const step = (x1 - x0) / peaks;
  let line = `M ${x0},${base}`;
  for (let i = 0; i <= peaks; i++) {
    const x = x0 + i * step;
    const y = base - (18 + rnd() * 120);
    line += ` L ${x.toFixed(1)},${y.toFixed(1)} L ${(x + step * 0.45).toFixed(1)},${(y + 26 + rnd() * 60).toFixed(1)}`;
  }
  const fill = `${line} L ${x1},${base + 400} L ${x0},${base + 400} Z`;
  return `<path d="${fill}" style="fill:${TONE.far}"/>` + mark(`<path d="${line}"/>`, D.land, 1.6);
}

/** 절벽 — 수직 암벽. 층리가 가로선으로 드러난다 */
function cliff(x, top, w, h, seed) {
  const rnd = rng(seed);
  let edge = `M ${x},${top + h}`;
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    edge += ` L ${(x + (w * i) / steps).toFixed(1)},${(top + rnd() * 34).toFixed(1)}`;
  }
  const body = `${edge} L ${x + w},${top + h} Z`;
  let strata = "";
  for (let i = 1; i < 4; i++) {
    const y = top + 40 + (h / 4.4) * i;
    const x0 = x + 10 + rnd() * 26;
    strata += `<path d="M ${x0.toFixed(1)},${y.toFixed(1)} L ${(x0 + w * (0.34 + rnd() * 0.3)).toFixed(1)},${(y + rnd() * 9 - 4).toFixed(1)}"/>`;
  }
  // 수직 균열 둘 — 가로선만 있으면 절벽이 아니라 선반이 된다
  for (let i = 0; i < 2; i++) {
    const cx = x + w * (0.34 + i * 0.36) + rnd() * 16;
    strata += `<path d="M ${cx.toFixed(1)},${(top + 22 + rnd() * 24).toFixed(1)}
                        L ${(cx + 6 - rnd() * 12).toFixed(1)},${(top + h - 10 - rnd() * 40).toFixed(1)}"/>`;
  }
  return (
    `<path d="${body}" style="fill:${TONE.mid}"/>` +
    mark(`<path d="${edge}"/>${strata}`, D.land, 1.5)
  );
}

/** 바위 — 각진 덩어리와 면을 가르는 한 줄 */
function boulder(x, base, s, seed) {
  const rnd = rng(seed);
  const W = 62 * s;
  const p = [
    [0, 0], [0.08, -0.22 - rnd() * 0.06], [0.28, -0.42], [0.55, -0.46],
    [0.78, -0.34], [0.94, -0.14], [1, 0]
  ].map(([a, b]) => `${(x + a * W).toFixed(1)},${(base + b * W).toFixed(1)}`);
  const outline = `M ${p.join(" L ")} Z`;
  // 면을 가르는 한 줄이 있어야 덩어리가 바위로 읽힌다
  const facet = `M ${p[2]} L ${(x + 0.46 * W).toFixed(1)},${(base - 0.16 * W).toFixed(1)} L ${p[5]}`;
  return `<path d="${outline}" style="fill:${TONE.mid}"/>` + mark(`<path d="${outline}"/><path d="${facet}"/>`, D.build, 1.4);
}

/** 무너진 도시 — 꼭대기가 잘려 나간 탑들 */
function skyline(x0, base, count, seed) {
  const rnd = rng(seed);
  let body = "", line = "";
  let x = x0;
  for (let i = 0; i < count; i++) {
    const w = 26 + rnd() * 54;
    const h = 90 + rnd() * 230;
    const cut = rnd() * 0.45;
    const d = `M ${x.toFixed(1)},${base} L ${x.toFixed(1)},${(base - h).toFixed(1)}
               L ${(x + w * (1 - cut)).toFixed(1)},${(base - h + h * cut * 0.5).toFixed(1)}
               L ${(x + w).toFixed(1)},${(base - h * (0.62 + rnd() * 0.3)).toFixed(1)}
               L ${(x + w).toFixed(1)},${base}`;
    body += `<path d="${d} Z" style="fill:${TONE.mid}"/>`;
    line += `<path d="${d}"/>`;
    if (h > 150) {
      for (let r = 0; r < Math.floor(h / 62); r++) {
        if (rnd() < 0.4) continue;
        const wy = base - h + 34 + r * 54;
        line += `<path d="M ${(x + w * 0.3).toFixed(1)},${wy.toFixed(1)} l ${(w * 0.22).toFixed(1)},0"/>`;
      }
    }
    x += w + 6 + rnd() * 26;
  }
  return body + mark(line, D.build, 1.4);
}

/** 폐허 — 부러진 기둥과 남다 만 아치 */
function ruins(x0, base, seed) {
  const rnd = rng(seed);
  let body = "", line = "";
  let x = x0;
  for (let i = 0; i < 6; i++) {
    const h = 42 + rnd() * 86;
    const w = 16 + rnd() * 20;
    const chip = 0.25 + rnd() * 0.5;
    const d = `M ${x.toFixed(1)},${base} L ${x.toFixed(1)},${(base - h).toFixed(1)}
               L ${(x + w * chip).toFixed(1)},${(base - h * (0.78 + rnd() * 0.14)).toFixed(1)}
               L ${(x + w).toFixed(1)},${(base - h * (0.86 + rnd() * 0.12)).toFixed(1)}
               L ${(x + w).toFixed(1)},${base}`;
    body += `<path d="${d} Z" style="fill:${TONE.mid}"/>`;
    line += `<path d="${d}"/>`;
    if (i > 0 && rnd() < 0.6) {
      line += `<path d="M ${(x - 36).toFixed(1)},${(base - h * 0.8).toFixed(1)} q 18,-32 36,0"/>`;
    }
    x += w + 30 + rnd() * 54;
  }
  return body + mark(line, D.build, 1.4);
}

/** 마른 나무 — 잎이 없다. 가지가 갈라지기만 한다 */
function deadTree(x, base, scale, seed) {
  const rnd = rng(seed);
  const body = [];
  const line = [];
  const branch = (bx, by, ang, len, wdt, depth) => {
    const ex = bx + Math.cos(ang) * len;
    const ey = by - Math.sin(ang) * len;
    const seg = `M ${bx.toFixed(1)},${by.toFixed(1)} L ${ex.toFixed(1)},${ey.toFixed(1)}`;
    body.push(`<path d="${seg}" style="stroke:${TONE.near}" fill="none"
                stroke-width="${(wdt + 1.8).toFixed(2)}" stroke-linecap="round"/>`);
    line.push(`<path d="${seg}"/>`);
    if (depth === 0) return { x: ex, y: ey };
    const n = rnd() < 0.35 ? 3 : 2;
    let fork = null;
    for (let i = 0; i < n; i++) {
      const r = branch(ex, ey, ang + (rnd() - 0.5) * 1.5, len * (0.58 + rnd() * 0.22), wdt * 0.62, depth - 1);
      if (i === 0) fork = r;
    }
    return fork;
  };
  const tip = branch(x, base, Math.PI / 2 + (rnd() - 0.5) * 0.3, 60 * scale, 11 * scale, 3);
  return { svg: body.join("") + mark(line.join(""), D.build, 1.1), perch: tip };
}

/** 달 — 원반은 어둡고 둘레만 라임이다 */
function moon(cx, cy, r) {
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:${TONE.moon}"/>
     <circle cx="${(cx - r * 0.3).toFixed(1)}" cy="${(cy - r * 0.22).toFixed(1)}" r="${(r * 0.2).toFixed(1)}" style="fill:${TONE.mid}"/>
     <circle cx="${(cx + r * 0.28).toFixed(1)}" cy="${(cy + r * 0.3).toFixed(1)}" r="${(r * 0.13).toFixed(1)}" style="fill:${TONE.mid}"/>` +
    mark(`<circle cx="${cx}" cy="${cy}" r="${r}"/>`, D.sign, 2.2) +
    mark(`<circle cx="${cx}" cy="${cy}" r="${r + 15}"/><circle cx="${cx}" cy="${cy}" r="${r + 32}"/>`, D.land, 1.1)
  );
}

/** 부엉이 — 마른 가지에 앉아 있다. 눈은 채우지 않는다 */
function owl(cx, cy, s) {
  const d = `
    <path d="M ${cx - 13 * s},${cy - 10 * s}
             C ${cx - 15 * s},${cy + 12 * s} ${cx - 8 * s},${cy + 22 * s} ${cx},${cy + 22 * s}
             C ${cx + 8 * s},${cy + 22 * s} ${cx + 15 * s},${cy + 12 * s} ${cx + 13 * s},${cy - 10 * s}
             C ${cx + 12 * s},${cy - 20 * s} ${cx - 12 * s},${cy - 20 * s} ${cx - 13 * s},${cy - 10 * s} Z"/>
    <path d="M ${cx - 13 * s},${cy - 14 * s} l ${-4 * s},${-9 * s} l ${7 * s},${3 * s}"/>
    <path d="M ${cx + 13 * s},${cy - 14 * s} l ${4 * s},${-9 * s} l ${-7 * s},${3 * s}"/>
    <circle cx="${cx - 5.4 * s}" cy="${cy - 7 * s}" r="${4.2 * s}"/>
    <circle cx="${cx + 5.4 * s}" cy="${cy - 7 * s}" r="${4.2 * s}"/>
    <path d="M ${cx},${cy - 4 * s} l ${-2.4 * s},${4 * s} l ${4.8 * s},0 Z"/>
    <path d="M ${cx - 9 * s},${cy + 4 * s} q ${9 * s},${9 * s} ${18 * s},0"/>
    <path d="M ${cx - 5 * s},${cy + 22 * s} l 0,${4 * s} M ${cx + 5 * s},${cy + 22 * s} l 0,${4 * s}"/>`;
  return mark(d, D.sign, 1.5);
}

/** 표범 — 바위 위에 선 옆모습. 로제트 넷으로 표범이 된다 */
function leopard(x, y, s) {
  const p = (a, b) => `${(x + a * s).toFixed(1)},${(y + b * s).toFixed(1)}`;
  const d = `
    <path d="M ${p(30, -30)} L ${p(64, -32)}
             C ${p(73, -32)} ${p(78, -28)} ${p(78, -21)}
             L ${p(78, -4)}
             M ${p(30, -30)} C ${p(24, -30)} ${p(20, -26)} ${p(20, -20)}
             L ${p(20, -4)}"/>
    <path d="M ${p(24, -14)} C ${p(40, -8)} ${p(58, -8)} ${p(74, -14)}"/>
    <path d="M ${p(20, -4)} l 0,${4 * 1} l ${5},0 M ${p(31, -12)} l ${-1},${14} l ${5},0
             M ${p(66, -13)} l ${1},${15} l ${5},0 M ${p(78, -4)} l 0,${4} l ${5},0"/>
    <path d="M ${p(20, -22)} C ${p(13, -25)} ${p(6, -28)} ${p(2, -33)}
             C ${p(-1, -37)} ${p(2, -42)} ${p(7, -42)}
             C ${p(14, -42)} ${p(19, -37)} ${p(21, -31)} Z"/>
    <path d="M ${p(4, -41)} l ${-2},${-6} l ${7},${3}"/>
    <path d="M ${p(15, -40)} l ${2},${-6} l ${4},${5}"/>
    <circle cx="${(x + 8 * s).toFixed(1)}" cy="${(y - 36 * s).toFixed(1)}" r="${1.6 * s}"/>
    <path d="M ${p(78, -26)} C ${p(92, -30)} ${p(99, -42)} ${p(92, -52)}
             C ${p(89, -56)} ${p(84, -56)} ${p(82, -53)}"/>
    <circle cx="${(x + 38 * s).toFixed(1)}" cy="${(y - 24 * s).toFixed(1)}" r="${2.6 * s}"/>
    <circle cx="${(x + 50 * s).toFixed(1)}" cy="${(y - 27 * s).toFixed(1)}" r="${2.2 * s}"/>
    <circle cx="${(x + 61 * s).toFixed(1)}" cy="${(y - 22 * s).toFixed(1)}" r="${2.4 * s}"/>
    <circle cx="${(x + 45 * s).toFixed(1)}" cy="${(y - 17 * s).toFixed(1)}" r="${1.8 * s}"/>`;
  return mark(d, D.sign, 1.6);
}
