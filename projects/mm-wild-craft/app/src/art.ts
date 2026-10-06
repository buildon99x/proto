/**
 * Original, resolution-independent woodland illustrations.
 * All actor and prop positions are centre / feet. Time is in seconds.
 * Every public painter restores the context, including transforms and alpha.
 */
type Ctx = CanvasRenderingContext2D;

const TAU = Math.PI * 2;
const INK = '#294741';

export const MONSTER_COLORS: Record<string, string> = {
  slime: '#87cfa0', mushroom: '#f3a269', stump: '#ad9167',
  octopus: '#b29ddd', boar: '#cba382', rare: '#94d4e3', guardian: '#eaa35b',
};

const random = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return n - Math.floor(n);
};

function ellipse(c: Ctx, x: number, y: number, rx: number, ry: number,
  fill: string, stroke?: string, line = 2.3, rotation = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rotation, 0, TAU);
  c.fillStyle = fill;
  c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = line; c.stroke(); }
}

function shape(c: Ctx, fill: string, draw: () => void, stroke?: string, line = 2.4) {
  c.beginPath();
  draw();
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = line; c.stroke(); }
}

function line(c: Ctx, color: string, width: number, draw: () => void) {
  c.beginPath(); draw(); c.strokeStyle = color; c.lineWidth = width; c.stroke();
}

function box(c: Ctx, x: number, y: number, w: number, h: number, radius: number | number[],
  fill: string, stroke?: string, width = 2.4) {
  c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = fill; c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}

function leaf(c: Ctx, x: number, y: number, size: number, angle: number,
  fill: string, vein = false) {
  c.save(); c.translate(x, y); c.rotate(angle);
  shape(c, fill, () => {
    c.moveTo(0, 0); c.bezierCurveTo(-size * .7, -size * .7, -size * .25, -size * 1.55, 0, -size * 1.75);
    c.bezierCurveTo(size * .85, -size * 1.35, size * .68, -size * .4, 0, 0);
  });
  if (vein) line(c, 'rgba(245,245,192,.36)', .8, () => { c.moveTo(0, -2); c.lineTo(0, -size * 1.35); });
  c.restore();
}

function sparkle(c: Ctx, x: number, y: number, r: number, alpha = 1) {
  c.save(); c.globalAlpha *= alpha;
  shape(c, '#fffbd5', () => {
    c.moveTo(x, y - r); c.quadraticCurveTo(x + r * .18, y - r * .15, x + r * .7, y);
    c.quadraticCurveTo(x + r * .16, y + r * .15, x, y + r);
    c.quadraticCurveTo(x - r * .16, y + r * .15, x - r * .7, y);
    c.quadraticCurveTo(x - r * .18, y - r * .15, x, y - r);
  }); c.restore();
}

function shadow(c: Ctx, size: number) {
  ellipse(c, 0, 1.5, size, size * .17, 'rgba(37,73,48,.18)');
}

function tuft(c: Ctx, x: number, y: number, size: number, color: string, seed: number) {
  shape(c, color, () => {
    c.moveTo(x - size * .65, y);
    c.quadraticCurveTo(x - size * .75, y - size * .7, x - size * 1.1, y - size * .9);
    c.quadraticCurveTo(x - size * .25, y - size * .72, x - size * .22, y - size * .27);
    c.quadraticCurveTo(x - size * .5, y - size * 1.35, x - size * .13, y - size * 1.55);
    c.quadraticCurveTo(x + size * .16, y - size * 1.15, x + size * .22, y - size * .4);
    c.quadraticCurveTo(x + size * .65, y - size * (1.1 + random(seed) * .5), x + size * .95, y - size * 1.04);
    c.quadraticCurveTo(x + size * .53, y - size * .4, x + size * .65, y);
  });
}

function canopy(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, seed: number) {
  const points = Array.from({ length: 18 }, (_, i) => {
    const a = i / 18 * TAU;
    const r = .88 + random(seed + i * 2) * .17;
    return { x: x + Math.cos(a) * rx * r, y: y + Math.sin(a) * ry * r };
  });
  shape(c, fill, () => {
    c.moveTo((points[0].x + points[17].x) / 2, (points[0].y + points[17].y) / 2);
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      c.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
  });
}

function cloud(c: Ctx, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  shape(c, 'rgba(255,253,230,.62)', () => {
    c.moveTo(-72, 8); c.bezierCurveTo(-91, 6, -87, -12, -62, -11);
    c.bezierCurveTo(-63, -34, -19, -39, -10, -20);
    c.bezierCurveTo(9, -49, 53, -33, 48, -13);
    c.bezierCurveTo(84, -16, 93, 6, 62, 10);
    c.bezierCurveTo(8, 17, -36, 12, -72, 8);
  });
  c.restore();
}

function littleMushroom(c: Ctx, x: number, y: number, size: number, color: string) {
  box(c, x - size * .14, y - size * .65, size * .28, size * .65, size * .08, '#e4dbb5');
  shape(c, color, () => {
    c.moveTo(x - size * .64, y - size * .54);
    c.bezierCurveTo(x - size * .6, y - size * 1.23, x + size * .52, y - size * 1.3, x + size * .67, y - size * .55);
    c.quadraticCurveTo(x, y - size * .33, x - size * .64, y - size * .54);
  });
  ellipse(c, x - size * .22, y - size * .84, size * .13, size * .09, 'rgba(255,243,207,.65)', undefined, 0, -.3);
  ellipse(c, x + size * .28, y - size * .67, size * .09, size * .07, 'rgba(255,243,207,.65)');
}

/** A quiet, layered forest. Camera affects scenery only; no gameplay UI is drawn. */
export function drawBackdrop(c: Ctx, w: number, h: number, camera: number,
  time: number, zone: 'field' | 'camp' = 'field') {
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  const scale = h / 600, width = w / scale;
  c.scale(scale, scale);
  const sky = c.createLinearGradient(0, 0, 0, 490);
  sky.addColorStop(0, '#e9f1d9'); sky.addColorStop(.47, '#c5dfbf'); sky.addColorStop(1, '#73b7a5');
  c.fillStyle = sky; c.fillRect(0, 0, width, 600);

  // The broad halo keeps the clearing bright even behind the HUD.
  const sunX = width * .66 - Math.sin(camera * .0002) * 36;
  const sun = c.createRadialGradient(sunX, 104, 10, sunX, 104, 295);
  sun.addColorStop(0, 'rgba(255,248,202,.92)'); sun.addColorStop(.4, 'rgba(255,244,191,.43)'); sun.addColorStop(1, 'rgba(255,246,203,0)');
  c.fillStyle = sun; c.fillRect(0, 0, width, 440);
  ellipse(c, sunX, 94, 45, 45, 'rgba(255,249,215,.72)');
  for (let i = -1; i < width / 450 + 2; i++) {
    const k = i + Math.floor(camera * .035 / 450);
    cloud(c, i * 450 - camera * .035 % 450 + 150, 115 + random(k + 13) * 44, .8 + random(k) * .7);
  }

  // Rolling, distant tree line with a warm haze between layers.
  for (let layer = 0; layer < 3; layer++) {
    const step = [200, 190, 150][layer], parallax = [.08, .15, .24][layer];
    const colors = ['#a5cbbb', '#83baa8', '#64a78f'];
    const offset = camera * parallax;
    for (let i = Math.floor(offset / step) - 1; i < Math.floor((offset + width) / step) + 2; i++) {
      const x = i * step - offset;
      const y = 315 + layer * 24 + random(i + layer * 40) * 22;
      canopy(c, x, y, step * .85, 82 + random(i * 2 + layer) * 40, colors[layer], i + layer * 100);
      box(c, x - 9, y + 25, 18, 180, 6, colors[layer]);
      if (layer === 1) {
        line(c, '#9bc5af', 4, () => { c.moveTo(x, y + 90); c.lineTo(x - 35, y + 32); c.moveTo(x, y + 55); c.lineTo(x + 34, y + 6); });
      }
    }
  }

  // Fine, branching silhouettes turn the soft bands into a distant woodland.
  const farOffset = camera * .28;
  for (let i = Math.floor(farOffset / 155) - 1; i < Math.floor((farOffset + width) / 155) + 2; i++) {
    const x = i * 155 - farOffset + random(i + 22) * 50;
    const top = 227 + random(i + 11) * 52;
    line(c, '#70ac98', 8 + random(i) * 4, () => {
      c.moveTo(x, 441); c.quadraticCurveTo(x - 9, 344, x + 3, top + 4);
      c.moveTo(x - 2, 354); c.quadraticCurveTo(x - 24, 330, x - 38, top + 43);
      c.moveTo(x - 2, 319); c.quadraticCurveTo(x + 24, 302, x + 35, top + 20);
    });
    canopy(c, x - 30, top + 37, 44, 28, '#79b19b', i + 68);
    canopy(c, x + 27, top + 13, 39, 28, '#80b59e', i + 71);
    canopy(c, x + 2, top - 8, 45, 32, '#8cbda5', i + 21);
  }

  const hills = c.createLinearGradient(0, 375, 0, 490);
  hills.addColorStop(0, '#8bb98b'); hills.addColorStop(1, '#619c77');
  c.fillStyle = hills; c.beginPath(); c.moveTo(0, 600); c.lineTo(0, 424);
  for (let x = 0; x <= width + 20; x += 20) c.lineTo(x, 425 + Math.sin((x + camera * .3) / 220) * 17 + Math.sin((x + camera * .3) / 78) * 5);
  c.lineTo(width, 600); c.closePath(); c.fill();

  // A tiny mushroom hamlet on the far bank hints at a world beyond the path.
  const hamletOffset = camera * .32;
  for (let i = Math.floor(hamletOffset / 1060) - 1; i < Math.floor((hamletOffset + width) / 1060) + 1; i++) {
    const x = i * 1060 + 906 - hamletOffset;
    c.save(); c.translate(x, 420); c.scale(.58, .58); c.globalAlpha = .5;
    box(c, -34, -63, 62, 63, 12, '#b3ba8e');
    shape(c, '#d1b188', () => {
      c.moveTo(-51, -58); c.bezierCurveTo(-49, -84, -15, -112, 10, -101);
      c.bezierCurveTo(29, -98, 50, -75, 47, -60); c.quadraticCurveTo(-1, -49, -51, -58);
    });
    ellipse(c, -19, -83, 9, 5, '#ead2a4', undefined, 0, -.5);
    ellipse(c, 19, -73, 6, 4, '#ead2a4');
    box(c, -12, -36, 20, 36, 9, '#729a77');
    ellipse(c, 16, -44, 5, 6, '#e4d298');
    littleMushroom(c, -48, 1, 39, '#bea987'); c.restore();
  }

  // Tall sentinels: curved roots and forked trunks make the opening feel sheltered.
  const treeStep = 570, treeOffset = camera * .42;
  for (let i = Math.floor(treeOffset / treeStep) - 1; i < Math.floor((treeOffset + width) / treeStep) + 2; i++) {
    const x = i * treeStep - treeOffset + 28;
    const base = 458 + random(i + 80) * 13;
    const lean = (random(i + 8) - .5) * 42;
    const thickness = 37 + random(i + 20) * 20;
    shape(c, '#447f70', () => {
      c.moveTo(x - thickness - 27, base); c.quadraticCurveTo(x - thickness * .75, base - 18, x - thickness * .8, base - 100);
      c.bezierCurveTo(x - thickness * 1.3, 285, x - thickness * .48 + lean, 174, x - thickness * .7 + lean, 61);
      c.lineTo(x + thickness * .4 + lean, 61); c.bezierCurveTo(x + thickness * .42 + lean, 232, x + thickness * 1.2, 314, x + thickness * .65, base - 78);
      c.quadraticCurveTo(x + thickness * .78, base - 10, x + thickness + 30, base);
      c.quadraticCurveTo(x, base + 13, x - thickness - 27, base);
    });
    shape(c, '#5c9980', () => {
      c.moveTo(x - thickness * .6, base - 16); c.bezierCurveTo(x + 3, 355, x - thickness * .35 + lean, 197, x - thickness * .4 + lean, 65);
      c.lineTo(x - thickness * .15 + lean, 65); c.bezierCurveTo(x - thickness * .05 + lean, 258, x + thickness * .28, 352, x - thickness * .12, base - 33);
    });
    line(c, '#447f70', thickness * .48, () => {
      c.moveTo(x - 3, 235); c.quadraticCurveTo(x - 58, 202, x - 102, 129);
      c.moveTo(x + 6, 294); c.quadraticCurveTo(x + 60, 260, x + 90, 199);
    });
    line(c, 'rgba(37,91,75,.36)', 2, () => {
      c.moveTo(x + 15, base - 38); c.bezierCurveTo(x + 24, 333, x + 1, 289, x + 9, 230);
      c.moveTo(x - 22, 267); c.quadraticCurveTo(x - 15, 310, x - 20, 337);
    });
    for (let j = 0; j < 6; j++) {
      canopy(c, x + (j - 2.6) * 53, 73 + Math.abs(j - 2.6) * 12,
        106, 68 + random(i * 20 + j) * 23, j % 2 ? '#4b8e74' : '#397c68', i * 10 + j);
      canopy(c, x + (j - 2.5) * 47 - 9, 49 + Math.abs(j - 2.5) * 9,
        78, 40, '#64a081', i * 15 + j);
    }
    // Scattered paired leaves catch the canopy's golden rim light.
    for (let j = 0; j < 16; j++) {
      const lx = x - 151 + random(i * 31 + j + 90) * 292;
      const ly = 40 + random(i * 37 + j + 30) * 75;
      const angle = -.8 + random(j + i * 20) * 1.6;
      leaf(c, lx, ly, 5 + random(j + 12) * 5, angle, j % 3 ? 'rgba(149,190,126,.22)' : 'rgba(188,207,143,.26)');
      if (j % 2 === 0) leaf(c, lx + 7, ly + 1, 5, angle + .8, 'rgba(156,195,135,.25)');
    }
    canopy(c, x + 93, 192, 76, 47, '#4f9278', i + 55);
    canopy(c, x + 97, 174, 58, 26, '#71aa85', i + 78);

    const vineX = x + 142;
    line(c, '#559773', 2, () => { c.moveTo(vineX, 79); c.bezierCurveTo(vineX + 10, 125, vineX - 28, 152, vineX - 13, 203); });
    for (let j = 0; j < 4; j++) leaf(c, vineX - j * 3, 116 + j * 20, 10, j % 2 ? .95 : -.9, '#82b68a');
    ellipse(c, vineX - 13, 208, 5, 8, '#e4d59a');
    for (let j = 0; j < 4; j++) tuft(c, x - 54 + j * 29, base + 3, 14 + random(i + j) * 10, '#448668', i + j);
  }

  // Light shafts are intentionally translucent, never a gameplay obstruction.
  c.save(); c.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const x = sunX - 95 + i * 100;
    const ray = c.createLinearGradient(x, 80, x - 130, 488);
    ray.addColorStop(0, 'rgba(255,243,182,0)'); ray.addColorStop(.3, 'rgba(255,245,190,.11)'); ray.addColorStop(1, 'rgba(255,250,215,0)');
    c.fillStyle = ray; c.beginPath(); c.moveTo(x, 58); c.lineTo(x + 30, 58); c.lineTo(x - 112, 488); c.lineTo(x - 205, 488); c.closePath(); c.fill();
  }
  c.restore();

  // Small discoveries in the middle distance.
  const decoStep = 245, decoOffset = camera * .62;
  for (let i = Math.floor(decoOffset / decoStep) - 1; i < Math.floor((decoOffset + width) / decoStep) + 1; i++) {
    const x = i * decoStep - decoOffset + 92;
    const y = 457 + random(i + 25) * 11;
    if (i % 3 === 0) {
      littleMushroom(c, x, y, 36, '#d6aa80'); littleMushroom(c, x + 25, y + 2, 19, '#dfb58a');
    } else {
      canopy(c, x, y - 11, 55, 29, '#539b76', i * 3);
      canopy(c, x - 10, y - 18, 38, 22, '#70ad7b', i * 7);
      for (let j = 0; j < 3; j++) ellipse(c, x - 18 + j * 14, y - 18 + Math.sin(j) * 5, 2.4, 2.6, '#e9d69c');
    }
    if (zone === 'camp' && i % 4 === 1) {
      line(c, '#816b4d', 3, () => { c.moveTo(x - 76, y); c.lineTo(x - 76, y - 39); c.moveTo(x + 77, y); c.lineTo(x + 77, y - 49); });
      line(c, '#9a9666', 1.3, () => { c.moveTo(x - 76, y - 36); c.quadraticCurveTo(x, y - 12, x + 77, y - 46); });
      for (let j = 0; j < 5; j++) {
        const px = x - 53 + j * 28, py = y - 28 - (j - 1.5) ** 2 * 2;
        shape(c, ['#e2a27c', '#edcd80', '#a4ceac'][j % 3], () => { c.moveTo(px - 6, py); c.lineTo(px + 6, py - 1); c.lineTo(px + 1, py + 12); });
      }
    }
  }

  // Drifting leaflets and pollen move slowly enough to keep targets readable.
  for (let i = 0; i < 20; i++) {
    const px = ((random(i + 29) * (width + 90) + time * (5 + random(i) * 5) - camera * .12) % (width + 90) + width + 90) % (width + 90) - 45;
    const py = 168 + random(i + 72) * 267 + Math.sin(time * .4 + i * 2) * 13;
    if (i % 4 === 0) {
      c.save(); c.globalAlpha = .58; leaf(c, px, py, 4.6, Math.sin(time * .6 + i) * 1.6, '#dceba4'); c.restore();
    } else ellipse(c, px, py, 1.3, 1.3, `rgba(255,249,195,${.3 + Math.sin(time + i) * .18})`);
  }
  c.restore();
}

/** The upper edge is walkable; the deep cutaway gives the world a storybook stage. */
export function drawGround(c: Ctx, x: number, y: number, width: number, height: number, time: number) {
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
  const earth = c.createLinearGradient(0, y, 0, y + Math.max(height, 80));
  earth.addColorStop(0, '#baa176'); earth.addColorStop(.18, '#a68864'); earth.addColorStop(1, '#76634f');
  c.fillStyle = earth; c.fillRect(x, y + 6, width, height);
  const grass = c.createLinearGradient(0, y, 0, y + 24);
  grass.addColorStop(0, '#a8c47d'); grass.addColorStop(1, '#78a26b');
  c.fillStyle = grass; c.beginPath(); c.moveTo(x, y); c.lineTo(x + width, y); c.lineTo(x + width, y + 17);
  for (let px = x + width; px >= x; px -= 13) c.lineTo(px, y + 16 + random(Math.floor(px / 13)) * 10);
  c.lineTo(x, y); c.closePath(); c.fill();
  line(c, '#d5d99d', 3, () => { c.moveTo(x, y + 1); c.lineTo(x + width, y + 1); });
  line(c, 'rgba(67,81,47,.23)', 2, () => { c.moveTo(x, y + 27); c.lineTo(x + width, y + 27); });

  // World-position hashes keep pebbles fixed as the camera scrolls.
  for (let px = Math.floor(x / 43) * 43; px < x + width; px += 43) {
    const n = Math.floor(px / 43);
    if (px < x + 5 || px > x + width - 6) continue;
    const ry = y + 42 + random(n + 79) * Math.max(10, height - 58);
    ellipse(c, px + random(n) * 12, ry, 2 + random(n + 1) * 4, 1.5 + random(n + 3) * 2, random(n + 10) > .5 ? '#c0a980' : '#665d4c', undefined, 0, random(n + 6));
    if (n % 3 === 0) {
      line(c, 'rgba(220,193,139,.22)', 1.4, () => { c.moveTo(px, y + 23); c.quadraticCurveTo(px - 3, y + 40, px + 12, y + 49); c.moveTo(px + 2, y + 38); c.lineTo(px + 14, y + 36); });
    }
    if (n % 2 === 0) {
      const sway = Math.sin(time * 1.5 + n) * 2;
      tuft(c, px + sway, y + 2, 5 + random(n + 8) * 5, n % 4 ? '#7ca567' : '#bad28c', n);
    }
  }
  c.restore();
}

function eyes(c: Ctx, x: number, y: number, distance = 8, sleeping = false, angry = false) {
  if (sleeping) {
    for (const side of [-1, 1]) line(c, INK, 2.1, () => { c.moveTo(x + side * distance - 3, y); c.quadraticCurveTo(x + side * distance, y + 3, x + side * distance + 3, y); });
  } else {
    for (const side of [-1, 1]) {
      ellipse(c, x + side * distance, y, 2.4, 3.4, INK);
      ellipse(c, x + side * distance + .65, y - 1.05, .65, .85, '#fff8dc');
      if (angry) line(c, INK, 1.6, () => { c.moveTo(x + side * distance - 3, y - 6 - side * 1.5); c.lineTo(x + side * distance + 3, y - 6 + side * 1.5); });
    }
  }
}

function smile(c: Ctx, x: number, y: number, width = 3) {
  line(c, INK, 1.5, () => { c.moveTo(x - width, y); c.quadraticCurveTo(x, y + 3, x + width, y); });
}

function crown(c: Ctx, x: number, y: number, size: number) {
  shape(c, '#edc870', () => {
    c.moveTo(x - size, y); c.lineTo(x - size * 1.17, y - size * .98); c.lineTo(x - size * .5, y - size * .59);
    c.lineTo(x, y - size * 1.45); c.lineTo(x + size * .53, y - size * .57); c.lineTo(x + size * 1.14, y - size * .96); c.lineTo(x + size, y);
  }, '#65583b', 1.8);
  ellipse(c, x, y - size * .35, size * .14, size * .2, '#c27358');
  line(c, '#fff0b6', 1.6, () => { c.moveTo(x - size * .72, y - 3); c.lineTo(x + size * .72, y - 3); });
}

export type MonsterDrawOptions = { flip?: boolean; hurt?: boolean; elite?: boolean; sleeping?: boolean; alpha?: number };

/** Six original creature silhouettes plus the enormous mushroom guardian. */
export function drawMonster(c: Ctx, species: string, x: number, y: number,
  size: number, time: number, options: MonsterDrawOptions = {}) {
  c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
  c.globalAlpha *= options.alpha ?? 1;
  const factor = size / 25;
  c.scale(factor * (options.flip ? -1 : 1), factor);
  shadow(c, species === 'boar' ? 26 : 23);
  if (options.hurt) c.filter = 'brightness(1.7) saturate(.65)';
  const t = options.sleeping ? time * .5 : time;
  const bob = Math.sin(t * 3.1 + x * .01) * 1.4;
  c.translate(0, bob);

  if (species === 'slime') {
    const squish = Math.sin(t * 3.1 + x * .01) * .035;
    c.scale(1 + squish, 1 - squish);
    shape(c, '#88cda0', () => {
      c.moveTo(-23, -7); c.bezierCurveTo(-29, -21, -14, -28, -13, -38);
      c.bezierCurveTo(-10, -48, 3, -49, 8, -36); c.bezierCurveTo(12, -30, 23, -27, 25, -14);
      c.bezierCurveTo(29, 3, -16, 6, -23, -7);
    }, INK);
    shape(c, '#afe2ad', () => {
      c.moveTo(-18, -12); c.bezierCurveTo(-23, -23, -11, -29, -8, -38);
      c.bezierCurveTo(-5, -43, 1, -43, 3, -38); c.bezierCurveTo(-3, -30, -8, -16, -18, -12);
    });
    ellipse(c, -8, -30, 3, 5, '#d9efc5', undefined, 0, .55);
    ellipse(c, 0, -3, 16, 3, 'rgba(47,128,88,.14)');
    leaf(c, 2, -43, 10, -.8, '#4a9670', true); leaf(c, 2, -43, 7, .67, '#6baa75', true);
    eyes(c, 1, -19, 7.8, options.sleeping); smile(c, 1, -12);
    ellipse(c, -13, -14, 4, 2, '#c6d99e'); ellipse(c, 15, -14, 4, 2, '#c6d99e');
  } else if (species === 'mushroom' || species === 'guardian') {
    const guardian = species === 'guardian';
    if (guardian) {
      shape(c, '#699971', () => { c.moveTo(-13, -28); c.lineTo(-27, -3); c.lineTo(-13, -8); c.lineTo(0, 0); c.lineTo(14, -7); c.lineTo(28, -2); c.lineTo(15, -29); }, INK);
    }
    ellipse(c, -11, -2, 8, 4.2, '#bea77d', INK, 1.9); ellipse(c, 12, -2, 8, 4.2, '#bea77d', INK, 1.9);
    shape(c, '#f1dfb2', () => {
      c.moveTo(-15, -29); c.quadraticCurveTo(-16, -13, -18, -7); c.bezierCurveTo(-21, 5, 20, 4, 18, -8); c.lineTo(14, -29);
    }, INK);
    ellipse(c, -16, -12, 5, 4, '#f1dfb2', INK, 1.8, -.6);
    ellipse(c, 17, -12, 5, 4, '#f1dfb2', INK, 1.8, .6);
    shape(c, guardian ? '#e59956' : '#efa274', () => {
      c.moveTo(-28, -26); c.bezierCurveTo(-32, -36, -17, -51, -2, -52);
      c.bezierCurveTo(14, -55, 28, -38, 30, -28); c.bezierCurveTo(31, -22, -20, -18, -28, -26);
    }, INK, 2.5);
    shape(c, guardian ? '#f8bc70' : '#ffc18e', () => {
      c.moveTo(-23, -30); c.bezierCurveTo(-22, -39, -7, -49, 2, -47);
      c.bezierCurveTo(-5, -42, -13, -35, -23, -30);
    });
    ellipse(c, -12, -39, 6.5, 4.8, '#fff0bc', undefined, 0, -.42);
    ellipse(c, 12, -34, 5.2, 3.7, '#ffedbd', undefined, 0, .5);
    ellipse(c, 0, -46, 3.6, 2.2, '#fff0c7');
    line(c, '#be7752', 1.3, () => { c.moveTo(-22, -26); c.quadraticCurveTo(0, -20, 24, -26); });
    eyes(c, 1, -14, 7.7, options.sleeping, guardian); smile(c, 1, -7, guardian ? 2 : 3);
    if (!guardian) { ellipse(c, -12, -9, 3.7, 2, '#e8b495'); ellipse(c, 14, -9, 3.7, 2, '#e8b495'); }
    if (guardian) {
      crown(c, -1, -48, 11);
      ellipse(c, 1, -4, 3.6, 3.6, '#dab269', INK, .9);
      for (let i = 0; i < 3; i++) sparkle(c, -34 + i * 34, -52 + Math.sin(time * 2 + i) * 7, 2, .4 + Math.sin(time + i) * .2);
    }
  } else if (species === 'stump') {
    ellipse(c, -13, -2, 9, 4.4, '#836f50', INK, 1.8); ellipse(c, 12, -2, 9, 4.4, '#836f50', INK, 1.8);
    line(c, INK, 9, () => { c.moveTo(-18, -19); c.lineTo(-29, -27); c.lineTo(-28, -34); c.moveTo(18, -19); c.lineTo(28, -24); });
    line(c, '#a88b61', 5, () => { c.moveTo(-18, -19); c.lineTo(-29, -27); c.lineTo(-28, -34); c.moveTo(18, -19); c.lineTo(28, -24); });
    shape(c, '#ad9064', () => { c.moveTo(-18, -37); c.lineTo(18, -37); c.lineTo(22, -5); c.quadraticCurveTo(0, 4, -22, -5); }, INK);
    shape(c, '#c4a679', () => { c.moveTo(-13, -34); c.lineTo(-6, -35); c.lineTo(-7, -5); c.lineTo(-14, -6); });
    line(c, '#826e50', 1.6, () => { c.moveTo(-16, -29); c.lineTo(-14, -14); c.moveTo(12, -29); c.lineTo(15, -8); c.moveTo(5, -9); c.lineTo(4, -3); });
    ellipse(c, 0, -37, 19, 7.4, '#e0bf8c', INK, 2.2);
    ellipse(c, 0, -37, 12, 3.8, 'rgba(0,0,0,0)', '#b18d5f', 1.2);
    ellipse(c, 1, -37, 5, 1.7, 'rgba(0,0,0,0)', '#b18d5f', 1);
    for (let i = 0; i < 5; i++) leaf(c, 4, -40, 9 + i % 2 * 3, -1.2 + i * .55, i % 2 ? '#6ca27b' : '#8db87e', true);
    eyes(c, 0, -23, 8, options.sleeping); smile(c, 1, -15, 3);
    littleMushroom(c, -16, -4, 10, '#dfa078');
  } else if (species === 'octopus') {
    for (let i = 0; i < 5; i++) {
      const tx = -21 + i * 10.5;
      shape(c, i % 2 ? '#af98cb' : '#bba8db', () => {
        c.moveTo(tx - 5, -16); c.quadraticCurveTo(tx - 4, -4, tx - 8, -3 + Math.sin(t * 4 + i) * 2);
        c.bezierCurveTo(tx - 12, 4, tx + 8, 5, tx + 7, -4); c.lineTo(tx + 5, -16);
      }, INK, 2);
      ellipse(c, tx, -1.5, 3, 1.5, '#dbc6e3');
    }
    shape(c, '#b5a0d7', () => {
      c.moveTo(-21, -15); c.bezierCurveTo(-24, -27, -20, -44, -5, -46);
      c.bezierCurveTo(14, -50, 25, -34, 23, -16); c.bezierCurveTo(18, -8, -13, -9, -21, -15);
    }, INK);
    ellipse(c, -8, -34, 5.5, 7.2, '#d5c5e8', undefined, 0, .7);
    eyes(c, 2, -25, 7, options.sleeping); ellipse(c, 3, -17, 2.8, 2.2, '#806383');
    ellipse(c, -12, -20, 3.7, 2.2, '#d4aed3'); ellipse(c, 16, -20, 3.7, 2.2, '#d4aed3');
    shape(c, '#92b99b', () => { c.moveTo(-9, -43); c.lineTo(-8, -48); c.lineTo(9, -49); c.lineTo(11, -42); }, INK, 1.4);
    ellipse(c, 0, -43, 17, 3, '#bcd6a9', INK, 1.5);
  } else if (species === 'boar') {
    for (const bx of [-16, 13]) box(c, bx - 5, -13, 10, 14, 3.5, '#79604c', INK, 2);
    ellipse(c, -2, -23, 28, 22, '#ba9170', INK, 2.5);
    shape(c, '#d3ae87', () => { c.moveTo(-23, -26); c.bezierCurveTo(-16, -44, 9, -45, 18, -29); c.quadraticCurveTo(-4, -34, -23, -26); });
    shape(c, '#8e735b', () => { c.moveTo(-15, -39); c.lineTo(-20, -48); c.lineTo(-8, -43); c.lineTo(-3, -48); c.lineTo(3, -40); }, INK, 1.8);
    shape(c, '#c49c7a', () => { c.moveTo(11, -35); c.quadraticCurveTo(8, -54, 22, -44); c.lineTo(25, -33); }, INK, 2);
    shape(c, '#e4b7a0', () => { c.moveTo(15, -38); c.lineTo(17, -43); c.lineTo(21, -37); });
    ellipse(c, 17, -19, 14, 11, '#dbb48c', INK, 2);
    ellipse(c, 24, -19, 10, 7.5, '#d89486', INK, 1.7);
    ellipse(c, 21, -19, 1.2, 2, '#86564e'); ellipse(c, 27, -19, 1.2, 2, '#86564e');
    eyes(c, 3, -28, 7, options.sleeping);
    shape(c, '#fff0cd', () => { c.moveTo(11, -15); c.quadraticCurveTo(5, -10, 5, -24); c.quadraticCurveTo(11, -21, 11, -15); }, INK, 1.4);
    line(c, INK, 2.3, () => { c.moveTo(-29, -25); c.bezierCurveTo(-41, -20, -35, -12, -30, -19); });
    leaf(c, -13, -40, 8, -.68, '#769d69', true);
  } else {
    // Moonmoss, a rare forest spirit, deliberately has its own silhouette.
    const glow = c.createRadialGradient(0, -24, 6, 0, -24, 40);
    glow.addColorStop(0, 'rgba(213,255,234,.2)'); glow.addColorStop(1, 'rgba(213,255,234,0)');
    c.fillStyle = glow; c.fillRect(-40, -64, 80, 80);
    for (const s of [-1, 1]) {
      shape(c, '#a5d8d6', () => {
        c.moveTo(s * 17, -24); c.quadraticCurveTo(s * 35, -40, s * 35, -23); c.lineTo(s * 28, -22);
        c.quadraticCurveTo(s * 37, -16, s * 30, -10); c.lineTo(s * 18, -14);
      }, INK, 1.8);
      shape(c, '#a5d8d6', () => { c.moveTo(s * 9, -36); c.quadraticCurveTo(s * 18, -65, s * 24, -53); c.quadraticCurveTo(s * 28, -43, s * 16, -29); }, INK, 2);
      line(c, '#e6f2cc', 2, () => { c.moveTo(s * 17, -42); c.lineTo(s * 20, -51); });
    }
    ellipse(c, -11, -2, 8, 4, '#9fc9be', INK, 1.7); ellipse(c, 11, -2, 8, 4, '#9fc9be', INK, 1.7);
    shape(c, '#a7dbd7', () => {
      c.moveTo(-22, -11); c.bezierCurveTo(-27, -33, -13, -45, 0, -44);
      c.bezierCurveTo(19, -44, 25, -28, 22, -11); c.bezierCurveTo(18, 3, -17, 3, -22, -11);
    }, INK);
    ellipse(c, 0, -14, 14, 12, '#d7edcd');
    eyes(c, 0, -24, 8, options.sleeping); smile(c, 0, -17);
    shape(c, '#edd18a', () => { c.moveTo(0, -39); c.lineTo(4, -34); c.lineTo(0, -30); c.lineTo(-4, -34); }, '#a8a578', 1);
    ellipse(c, -14, -19, 3.6, 2, '#bdcbd7'); ellipse(c, 14, -19, 3.6, 2, '#bdcbd7');
    sparkle(c, -29, -40 + Math.sin(time * 2) * 4, 4, .8); sparkle(c, 29, -18 + Math.cos(time * 2) * 5, 3, .7);
  }
  if (options.elite && species !== 'guardian') crown(c, 0, -55, 7.5);
  if (options.sleeping) {
    c.save(); c.globalAlpha *= .65;
    ellipse(c, 26, -44, 2.3 + Math.sin(time) * .6, 2.3 + Math.sin(time) * .6, '#d8e6c5', INK, .8);
    ellipse(c, 31, -53, 1.5, 1.5, '#d8e6c5'); c.restore();
  }
  c.restore();
}

export type PlayerDrawOptions = { flip?: boolean; moving?: boolean; attack?: number; hurt?: boolean; grounded?: boolean };

/** A little woodland surveyor in a moss cloak, saffron scarf and hand-sewn cap. */
export function drawPlayer(c: Ctx, x: number, y: number, time: number, options: PlayerDrawOptions = {}) {
  c.save(); c.translate(x, y); c.scale(options.flip ? -1 : 1, 1);
  c.lineJoin = 'round'; c.lineCap = 'round'; shadow(c, 18);
  if (options.hurt) c.filter = 'brightness(1.65)';
  const stride = options.moving ? Math.sin(time * 13) : 0;
  const bounce = options.moving && options.grounded !== false ? Math.abs(stride) * -2 : Math.sin(time * 2) * .45;
  c.translate(0, bounce);
  // Bedroll and brass bottle sit behind the cape.
  box(c, -20, -34, 12, 22, 5, '#b99461', INK, 2);
  box(c, -22, -36, 14, 7, 3, '#d2b786', INK, 1.6);
  line(c, '#7b7855', 1.4, () => { c.moveTo(-16, -35); c.lineTo(-16, -30); });
  for (const s of [-1, 1]) {
    const px = s * 7 + stride * s * 4, py = Math.max(0, stride * s) * -3;
    box(c, px - 4, -16 + py, 8, 13, 3, '#5b6860', INK, 1.7);
    box(c, px - 5, -6 + py, 12, 7, 3, '#795c47', INK, 1.8);
    line(c, '#c6a376', 1.3, () => { c.moveTo(px - 3, -4 + py); c.lineTo(px + 2, -4 + py); });
  }
  shape(c, '#629b7c', () => {
    c.moveTo(-10, -39); c.lineTo(10, -38); c.quadraticCurveTo(12, -24, 19, -13);
    c.quadraticCurveTo(3, -7, -17, -14); c.quadraticCurveTo(-13, -28, -10, -39);
  }, INK, 2.3);
  shape(c, '#82b192', () => { c.moveTo(-7, -35); c.lineTo(-9, -14); c.lineTo(3, -12); c.lineTo(5, -36); });
  line(c, '#4d795f', 1.5, () => { c.moveTo(6, -30); c.lineTo(9, -17); });
  // Far sleeve.
  ellipse(c, -13 - stride * 2, -25, 5, 8, '#74a488', INK, 1.8, .2 + stride * .2);
  ellipse(c, -14 - stride * 2, -19, 4, 4, '#eec7a0', INK, 1.6);
  // Head, hair and broad, soft explorer's hat.
  ellipse(c, 0, -43, 14, 14, '#785b44', INK, 2.1);
  ellipse(c, 4, -42, 11.5, 12, '#f2d1a7', INK, 1.8);
  ellipse(c, -8, -40, 3.5, 4, '#e9bd97', INK, 1.4);
  shape(c, '#785b44', () => {
    c.moveTo(-10, -48); c.lineTo(-4, -54); c.lineTo(10, -52); c.lineTo(14, -44);
    c.lineTo(8, -47); c.lineTo(5, -42); c.lineTo(0, -47); c.lineTo(-5, -42); c.lineTo(-7, -37);
  });
  ellipse(c, 3, -42, 1.6, 2.3, INK); ellipse(c, 11, -42, 1.6, 2.3, INK);
  smile(c, 8, -36, 2); ellipse(c, 11, -37, 2.5, 1.6, '#e6ab85');
  shape(c, '#ddd0a0', () => {
    c.moveTo(-14, -50); c.bezierCurveTo(-17, -65, 9, -66, 14, -51); c.lineTo(11, -46); c.lineTo(-11, -46);
  }, INK, 2.1);
  shape(c, '#ece0b7', () => { c.moveTo(-12, -53); c.quadraticCurveTo(-7, -65, 7, -57); c.quadraticCurveTo(0, -58, -6, -52); });
  ellipse(c, 0, -49, 20, 4.5, '#d8c796', INK, 2.2, -.05);
  line(c, '#809770', 3, () => { c.moveTo(-12, -53); c.quadraticCurveTo(0, -49, 12, -53); });
  leaf(c, -9, -54, 10, -.6, '#699d78', true);
  // Scarf and fluttering tail are the player's distinctive golden focal point.
  shape(c, '#e9bb62', () => { c.moveTo(-7, -32); c.lineTo(9, -32); c.lineTo(7, -27); c.lineTo(-7, -29); }, INK, 1.6);
  shape(c, '#e3ab54', () => { c.moveTo(-7, -30); c.quadraticCurveTo(-18, -31, -23 - Math.abs(stride) * 4, -27 + Math.sin(time * 5) * 2); c.lineTo(-20, -20); c.quadraticCurveTo(-13, -26, -5, -26); }, INK, 1.6);
  ellipse(c, 11, -25, 5, 8, '#80aa86', INK, 1.8, -.4);
  const attack = options.attack ?? 0;
  c.save(); c.translate(15, -20); c.rotate(attack > 0 ? -1.2 + Math.min(1, attack) * 2.5 : -.3);
  ellipse(c, 0, 0, 4, 4, '#f1c99e', INK, 1.7);
  box(c, -2.3, -4, 4.6, 11, 1.6, '#8a6b48', INK, 1.2);
  shape(c, '#d9e8d9', () => { c.moveTo(-2.8, -7); c.lineTo(-3.3, -28); c.lineTo(0, -35); c.lineTo(4.3, -28); c.lineTo(3.3, -7); }, INK, 1.6);
  shape(c, '#f6f6dc', () => { c.moveTo(.4, -31); c.lineTo(.4, -8); c.lineTo(3.2, -8); c.lineTo(3.5, -28); });
  box(c, -7, -8, 14, 3.4, 1.5, '#dab568', INK, 1.3); c.restore();
  c.restore();
}

function log(c: Ctx, x: number, y: number, width: number, radius: number) {
  box(c, x, y - radius, width, radius * 2, radius * .6, '#ae8457', INK, 1.8);
  line(c, '#cfaa78', 1.2, () => { c.moveTo(x + 6, y - radius * .35); c.lineTo(x + width - 3, y - radius * .35); });
  ellipse(c, x, y, radius * .65, radius, '#e2bf88', INK, 1.7);
  ellipse(c, x, y, radius * .35, radius * .57, 'transparent', '#b38b5d', 1);
}

function crystal(c: Ctx, x: number, y: number, height: number, tilt = 0, color = '#a6d6d0') {
  c.save(); c.translate(x, y); c.rotate(tilt);
  shape(c, color, () => { c.moveTo(-height * .2, -height * .1); c.lineTo(-height * .2, -height * .72); c.lineTo(0, -height); c.lineTo(height * .22, -height * .69); c.lineTo(height * .2, -height * .1); c.lineTo(0, 0); }, '#577f78', 1.8);
  shape(c, '#dcf2dc', () => { c.moveTo(0, -height); c.lineTo(height * .22, -height * .69); c.lineTo(0, -height * .58); });
  shape(c, 'rgba(240,255,232,.4)', () => { c.moveTo(0, -height * .58); c.lineTo(height * .22, -height * .69); c.lineTo(height * .2, -height * .1); c.lineTo(0, 0); });
  line(c, 'rgba(77,126,121,.46)', 1, () => { c.moveTo(0, -height * .58); c.lineTo(0, 0); }); c.restore();
}

/** Depletion changes a node's silhouette, so it remains readable without a label. */
export function drawResource(c: Ctx, type: 'wood' | 'stone' | 'herb' | 'crystal',
  x: number, y: number, time: number, depleted = false) {
  c.save(); c.translate(x, y); c.lineJoin = 'round'; c.lineCap = 'round';
  shadow(c, type === 'wood' ? 34 : 24);
  if (type === 'wood') {
    if (depleted) {
      box(c, -13, -17, 26, 18, 3, '#9e8059', INK, 2); ellipse(c, 0, -17, 13, 5, '#d8ba84', INK, 1.7);
      ellipse(c, 0, -17, 7, 2.5, 'transparent', '#ac8b5d', 1); tuft(c, 15, 1, 8, '#7caa74', 3);
    } else {
      shape(c, '#a58b5e', () => { c.moveTo(-21, 0); c.quadraticCurveTo(-7, -21, -9, -61); c.lineTo(6, -64); c.quadraticCurveTo(5, -17, 22, 0); c.lineTo(5, -3); c.lineTo(-2, 2); c.lineTo(-12, -1); }, INK, 2.3);
      line(c, '#d0b783', 2.3, () => { c.moveTo(-3, -10); c.lineTo(-2, -50); });
      line(c, '#887b53', 7, () => { c.moveTo(-2, -39); c.lineTo(-24, -59); c.moveTo(2, -46); c.lineTo(23, -64); });
      const sway = Math.sin(time * .9 + x) * 1.6;
      canopy(c, -24 + sway, -72, 29, 29, '#5c986d', 3); canopy(c, 25 + sway, -79, 30, 31, '#6da97a', 9);
      canopy(c, sway, -99, 34, 35, '#83b87e', 14); canopy(c, -8 + sway, -105, 24, 22, '#a3c98a', 8);
      for (let i = 0; i < 6; i++) leaf(c, -24 + random(i) * 47 + sway, -74 - random(i + 9) * 44, 6, random(i + 50) * 2 - 1, i % 2 ? '#b6d293' : '#88b97b', true);
      tuft(c, -17, 2, 11, '#6e9f65', 9); tuft(c, 20, 1, 8, '#95ba77', 1);
    }
  } else if (type === 'stone') {
    if (depleted) {
      ellipse(c, -10, -2, 9, 4, '#9aaba0', '#617c6e', 1.5); ellipse(c, 11, -2, 7, 4, '#a5b4a4', '#617c6e', 1.4);
    } else {
      shape(c, '#9daea0', () => { c.moveTo(-28, -3); c.lineTo(-23, -25); c.lineTo(-8, -39); c.lineTo(14, -34); c.lineTo(29, -17); c.lineTo(27, -2); c.quadraticCurveTo(0, 6, -28, -3); }, '#536e62', 2.2);
      shape(c, '#c4cfb8', () => { c.moveTo(-23, -25); c.lineTo(-8, -39); c.lineTo(14, -34); c.lineTo(5, -20); c.lineTo(-13, -17); });
      shape(c, '#7e988a', () => { c.moveTo(5, -20); c.lineTo(14, -34); c.lineTo(29, -17); c.lineTo(27, -2); c.lineTo(12, 1); });
      line(c, '#678371', 1.6, () => { c.moveTo(-13, -17); c.lineTo(-7, -10); c.lineTo(-10, -1); });
      leaf(c, -18, -26, 6, -.8, '#789c6d'); tuft(c, 24, 1, 8, '#93b376', 3);
    }
  } else if (type === 'herb') {
    ellipse(c, 0, 0, 18, 4, '#8b9660');
    if (depleted) { for (let i = 0; i < 3; i++) leaf(c, i * 8 - 8, -1, 7, i - .8, '#719269'); }
    else {
      for (let i = 0; i < 7; i++) leaf(c, i * 3 - 8, -2, 14 + random(i) * 7, (i - 3) * .35 + Math.sin(time * 2 + i) * .07, i % 2 ? '#88b67d' : '#608f6b', true);
      for (let i = 0; i < 3; i++) {
        const px = i * 12 - 12, py = -32 - (i % 2) * 7;
        line(c, '#72966b', 1.7, () => { c.moveTo(px, -4); c.quadraticCurveTo(px - 4, -19, px, py); });
        for (let j = 0; j < 5; j++) ellipse(c, px + Math.cos(j / 5 * TAU) * 4, py + Math.sin(j / 5 * TAU) * 4, 3.7, 3, '#eed9af');
        ellipse(c, px, py, 2.6, 2.6, '#d8aa63');
      }
    }
  } else {
    ellipse(c, 0, -1, 24, 6, '#7f9f92', '#557c70', 1.7);
    if (depleted) { crystal(c, -7, 0, 12, -.2); crystal(c, 9, 0, 9, .4); }
    else {
      crystal(c, -14, -2, 29, -.35); crystal(c, 14, -2, 34, .3); crystal(c, 0, 0, 48, 0, '#98c8c9');
      sparkle(c, -11, -37, 4, .65 + Math.sin(time * 2) * .3); sparkle(c, 23, -18, 3, .6 + Math.cos(time * 2.4) * .3);
    }
  }
  c.restore();
}

function mushroomRoof(c: Ctx, width = 61, y = -61, color = '#d68f73') {
  shape(c, color, () => {
    c.moveTo(-width, y); c.bezierCurveTo(-width * .95, y - 25, -width * .4, y - 49, 2, y - 43);
    c.bezierCurveTo(width * .6, y - 42, width * .93, y - 22, width, y);
    c.bezierCurveTo(width * .7, y + 11, -width * .74, y + 12, -width, y);
  }, INK, 2.7);
  shape(c, '#e9ab89', () => {
    c.moveTo(-width + 9, y - 3); c.quadraticCurveTo(-width * .55, y - 42, width * .2, y - 38);
    c.quadraticCurveTo(-width * .25, y - 27, -width + 9, y - 3);
  });
  ellipse(c, -width * .35, y - 25, width * .14, 5, '#f6d2a7', undefined, 0, -.4);
  ellipse(c, width * .41, y - 14, width * .12, 4.5, '#f4cda3', undefined, 0, .5);
  ellipse(c, width * .03, y - 35, width * .08, 3.4, '#f6d2a7');
  line(c, '#b47760', 1.5, () => { c.moveTo(-width + 6, y + 1); c.quadraticCurveTo(0, y + 10, width - 6, y + 1); });
}

function lamp(c: Ctx, x: number, y: number, active: boolean) {
  if (active) {
    const g = c.createRadialGradient(x, y, 1, x, y, 21); g.addColorStop(0, 'rgba(255,212,113,.27)'); g.addColorStop(1, 'rgba(255,212,113,0)'); c.fillStyle = g; c.fillRect(x - 21, y - 21, 42, 42);
  }
  line(c, '#726341', 1.3, () => { c.moveTo(x, y - 12); c.lineTo(x, y - 6); });
  box(c, x - 4, y - 6, 8, 12, 3, active ? '#f3d489' : '#bab992', INK, 1.2);
  line(c, '#8b7950', 1, () => { c.moveTo(x - 4, y - 3); c.lineTo(x + 4, y - 3); c.moveTo(x - 4, y + 3); c.lineTo(x + 4, y + 3); });
}

function crate(c: Ctx, x: number, y: number, w = 27, h = 24) {
  box(c, x, y, w, h, 2, '#b58f60', INK, 1.8);
  line(c, '#d8b77f', 2, () => { c.moveTo(x + 4, y + 4); c.lineTo(x + w - 4, y + 4); c.moveTo(x + 4, y + h - 4); c.lineTo(x + w - 4, y + h - 4); });
  line(c, '#725f43', 1.1, () => { c.moveTo(x + 2, y + h / 2); c.lineTo(x + w - 2, y + h / 2); });
  line(c, '#ddbb83', 3, () => { c.moveTo(x + 3, y + h - 3); c.lineTo(x + w - 3, y + 3); });
}

/** Each building is an individually illustrated prop, approximately 120 × 105. */
export function drawFacility(c: Ctx, type: string, x: number, y: number, time: number, active = false) {
  c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round'; shadow(c, 60);
  if (type === 'storage') {
    box(c, -43, -65, 86, 64, 13, '#dfc5a0', INK, 2.5);
    shape(c, '#edddbb', () => { c.moveTo(-37, -58); c.lineTo(-5, -61); c.lineTo(-6, -3); c.lineTo(-36, -3); });
    box(c, -15, -41, 31, 40, [14, 14, 2, 2], '#8f8060', INK, 2);
    line(c, '#bb9f71', 1.4, () => { c.moveTo(-5, -36); c.lineTo(-5, -5); c.moveTo(6, -36); c.lineTo(6, -5); });
    ellipse(c, 8, -20, 2, 2, '#e5c474', INK, .8);
    mushroomRoof(c);
    ellipse(c, 0, -60, 10, 8, '#edd4a0', INK, 1.8);
    line(c, '#a38156', 1.3, () => { c.moveTo(-4, -60); c.lineTo(4, -60); c.moveTo(0, -64); c.lineTo(0, -56); });
    crate(c, -55, -25); crate(c, 28, -20, 28, 20); lamp(c, 27, -36, active);
    leaf(c, -37, -64, 14, -.65, '#719b6e', true);
  } else if (type === 'workbench') {
    for (const s of [-1, 1]) box(c, s * 44 - 3, -74, 6, 74, 2, '#a1875c', INK, 1.8);
    shape(c, '#8ab199', () => { c.moveTo(-56, -73); c.lineTo(-33, -104); c.quadraticCurveTo(0, -95, 36, -99); c.lineTo(57, -72); c.quadraticCurveTo(6, -61, -56, -73); }, INK, 2.5);
    shape(c, '#b1c5a0', () => { c.moveTo(-33, -104); c.lineTo(-6, -99); c.lineTo(-20, -67); c.lineTo(-48, -71); });
    line(c, '#678e78', 1.4, () => { c.moveTo(16, -99); c.lineTo(28, -68); });
    box(c, -40, -34, 80, 11, 3, '#c2a074', INK, 2.3);
    for (const s of [-1, 1]) box(c, s * 30 - 4, -24, 8, 25, 2, '#977c55', INK, 1.8);
    line(c, '#826e4e', 4, () => { c.moveTo(-29, -8); c.lineTo(30, -8); });
    box(c, -21, -40, 28, 5, 2, '#dac59b', INK, 1.2);
    shape(c, '#758d80', () => { c.moveTo(4, -36); c.lineTo(4, -45); c.lineTo(-2, -48); c.lineTo(-2, -52); c.lineTo(28, -52); c.lineTo(27, -45); c.lineTo(16, -42); c.lineTo(17, -36); }, INK, 1.8);
    line(c, '#876c47', 3, () => { c.moveTo(-16, -38); c.lineTo(-22, -57); });
    box(c, -31, -59, 19, 7, 2, '#889587', INK, 1.5);
    const bookY = -37 + (active ? Math.sin(time * 3) : 0);
    shape(c, '#e9ddba', () => { c.moveTo(-37, bookY); c.lineTo(-37, bookY - 8); c.lineTo(-28, bookY - 6); c.lineTo(-20, bookY - 8); c.lineTo(-20, bookY); c.lineTo(-29, bookY + 2); }, INK, 1.3);
    lamp(c, 32, -64, active); crate(c, -43, -19, 20, 19);
  } else if (type === 'logging') {
    box(c, -43, -17, 84, 15, 4, '#9d8359', INK, 2);
    log(c, -32, -22, 59, 10); log(c, -23, -40, 59, 10); log(c, -39, -42, 59, 10);
    shape(c, '#a98b5e', () => { c.moveTo(18, -4); c.lineTo(22, -51); c.lineTo(44, -52); c.lineTo(49, -5); }, INK, 2.1);
    ellipse(c, 33, -51, 12, 5, '#e0c18d', INK, 1.6);
    ellipse(c, 33, -51, 6, 2.5, 'transparent', '#ad8c59', 1);
    c.save(); c.translate(29, -50); c.rotate(-.45 + (active ? Math.sin(time * 3) * .15 : 0));
    box(c, -2, -41, 4, 42, 1.5, '#b89057', INK, 1.5);
    shape(c, '#bec9b6', () => { c.moveTo(-3, -36); c.lineTo(-20, -42); c.quadraticCurveTo(-27, -32, -19, -24); c.lineTo(-3, -28); }, INK, 1.7); c.restore();
    box(c, -45, -85, 7, 69, 2, '#aa8d61', INK, 1.8);
    box(c, -57, -85, 38, 19, 4, '#d6b47f', INK, 1.8);
    line(c, '#8e7049', 2, () => { c.moveTo(-49, -76); c.lineTo(-30, -76); });
    leaf(c, -41, -84, 14, -.6, '#6b9b71', true);
    tuft(c, -51, 1, 13, '#7ba773', 5); tuft(c, 47, 1, 9, '#89ae70', 8);
  } else if (type === 'farm') {
    box(c, -51, -21, 102, 22, 5, '#b19361', INK, 2.2);
    ellipse(c, 0, -22, 50, 13, '#806c4b', INK, 2);
    for (let i = 0; i < 5; i++) {
      const px = -37 + i * 18;
      ellipse(c, px, -19, 6, 3, '#bba172');
      for (let j = 0; j < 3; j++) leaf(c, px, -24, 12 + (i % 2) * 5, (j - 1) * .7 + Math.sin(time + i) * .04, j % 2 ? '#a7bc77' : '#79a36b', true);
      if (i % 2) { ellipse(c, px, -24, 5, 5, '#dfad6d'); leaf(c, px, -26, 6, -.4, '#85af72'); }
    }
    line(c, '#d9b781', 2, () => { c.moveTo(-45, -9); c.lineTo(44, -9); });
    box(c, 32, -67, 4, 42, 1.5, '#a0885a', INK, 1.5);
    box(c, 21, -76, 26, 18, 3, '#e4c993', INK, 1.8);
    leaf(c, 33, -62, 7, -.3, '#79a06d', true);
    // Watering can, with a small moving water glint when tended.
    box(c, -54, -22, 19, 17, 5, '#8aadb1', INK, 1.6);
    line(c, INK, 2, () => { c.moveTo(-51, -20); c.bezierCurveTo(-63, -33, -38, -39, -39, -20); });
    shape(c, '#9eb9b6', () => { c.moveTo(-37, -15); c.lineTo(-24, -25); c.lineTo(-20, -22); c.lineTo(-35, -9); }, INK, 1.5);
    if (active) sparkle(c, -22, -29 + Math.sin(time * 2) * 2, 2.5, .7);
  } else if (type === 'quarry') {
    shape(c, '#aab19d', () => { c.moveTo(-54, -4); c.lineTo(-50, -42); c.lineTo(-30, -64); c.lineTo(-4, -73); c.lineTo(28, -66); c.lineTo(49, -39); c.lineTo(54, -3); }, INK, 2.5);
    shape(c, '#d0cfb2', () => { c.moveTo(-50, -42); c.lineTo(-30, -64); c.lineTo(-4, -73); c.lineTo(28, -66); c.lineTo(9, -47); c.lineTo(-16, -51); });
    shape(c, '#53776d', () => { c.moveTo(-21, 0); c.lineTo(-22, -30); c.quadraticCurveTo(0, -62, 23, -30); c.lineTo(25, 0); }, INK, 2);
    for (const s of [-1, 1]) box(c, s * 25 - 4, -42, 8, 44, 2, '#b09263', INK, 1.7);
    box(c, -33, -45, 64, 8, 2, '#bc9c69', INK, 2);
    line(c, '#7d8069', 1.5, () => { c.moveTo(-44, -24); c.lineTo(-33, -28); c.moveTo(31, -59); c.lineTo(39, -46); c.moveTo(-22, -62); c.lineTo(-18, -53); });
    crystal(c, -40, -1, 22, -.3); crystal(c, 42, 1, 30, .15); crystal(c, 31, 1, 19, -.2);
    lamp(c, 0, -27, active);
    if (active) sparkle(c, 45, -29, 3.5, .5 + Math.sin(time * 2) * .3);
  } else if (type === 'kitchen') {
    if (active) {
      for (let i = 0; i < 3; i++) {
        const progress = (time * .25 + i / 3) % 1;
        ellipse(c, 24 + Math.sin(progress * 6 + i) * 4, -87 - progress * 37, 4 + progress * 6, 5 + progress * 4, `rgba(233,228,198,${(1 - progress) * .5})`);
      }
    }
    box(c, 18, -92, 15, 41, 3, '#b29479', INK, 2);
    box(c, 15, -95, 21, 8, 2, '#c8aa89', INK, 1.7);
    box(c, -42, -58, 85, 59, 14, '#d4b895', INK, 2.4);
    mushroomRoof(c, 56, -61, '#ca876c');
    box(c, -20, -39, 39, 39, 14, '#736550', INK, 2);
    box(c, -14, -30, 27, 25, 9, '#514f40');
    if (active) {
      shape(c, '#e6a853', () => { c.moveTo(-11, -7); c.quadraticCurveTo(-15, -16, -7, -23); c.quadraticCurveTo(-4, -13, 0, -28 - Math.sin(time * 8) * 2); c.quadraticCurveTo(4, -18, 10, -18); c.quadraticCurveTo(16, -4, -11, -7); });
      shape(c, '#f9d98b', () => { c.moveTo(-4, -6); c.quadraticCurveTo(-8, -14, 0, -19); c.quadraticCurveTo(0, -10, 7, -10); c.lineTo(8, -6); });
    }
    box(c, -45, -9, 88, 9, 3, '#9d8967', INK, 1.8);
    box(c, 26, -30, 30, 7, 2, '#b39263', INK, 1.6);
    box(c, 43, -23, 5, 23, 1.5, '#b39263', INK, 1.5);
    ellipse(c, 39, -33, 13, 3.5, '#e6d6b0', INK, 1.2);
    ellipse(c, 36, -37, 7, 5, '#d6a361', '#a47c4e', 1.2);
    line(c, '#f3ce8b', 1.4, () => { c.moveTo(32, -39); c.lineTo(34, -35); c.moveTo(36, -40); c.lineTo(38, -36); });
    lamp(c, -30, -39, active);
  }
  if (active) {
    // A tiny physical glow signals a living facility without an icon or label.
    sparkle(c, 48, -57 + Math.sin(time * 1.8) * 4, 3.8, .45 + Math.sin(time * 1.8) * .2);
  }
  c.restore();
}
