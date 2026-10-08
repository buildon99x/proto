import {ISO, projectWorld} from './visual.js';

const TILE = ISO.tile;
const finitePoint = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);

export const MINIMAP_MARKERS = Object.freeze({
  exit: {shape: 'door', color: '#ffd18a', label: '출구'},
  return: {shape: 'return', color: '#9edbf4', label: '귀환'},
  chest: {shape: 'chest', color: '#e9b575', label: '상자'},
  shrine: {shape: 'cross', color: '#aee2b0', label: '회복'},
  bird: {shape: 'diamond', color: '#bdb3f1', label: '운반꾼'},
  relic: {shape: 'diamond', color: '#bdb3f1', label: '유물'},
  orb: {shape: 'diamond', color: '#bdb3f1', label: '기술'},
  dummy: {shape: 'diamond', color: '#bdb3f1', label: '연습'}
});
const LEGEND = ['exit', 'return', 'chest', 'shrine', 'bird'];

// These are the renderer's axes, not a rotation of the player's heading. Thus
// screen-right movement stays right on the map, including diagonal controls.
export function projectMinimap(x, y, isometric = true) {
  return isometric ? projectWorld(x, y) : {x, y};
}

export function minimapFacing(angle = 0, isometric = true) {
  const direction = projectMinimap(Math.cos(Number.isFinite(angle) ? angle : 0),
    Math.sin(Number.isFinite(angle) ? angle : 0), isometric);
  const length = Math.hypot(direction.x, direction.y);
  return {x: direction.x / length, y: direction.y / length};
}

// Canvas coordinates match the game's responsive canvas. Reserve the bottom
// battlebar/growth hint and, on narrow views, the higher touch controls as well.
// On an impossibly small viewport, hiding is preferable to covering controls.
export function minimapLayout(width, height) {
  if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const narrow = width <= 560;
  const edge = Math.max(6, Math.min(16, width * .025, height * .025));
  const topReserve = width <= 700 ? 142 : 64;
  const bottomReserve = narrow ? 202 : 134;
  const availableHeight = height - topReserve - bottomReserve - edge;
  const availableWidth = width - edge * 2;
  if (availableWidth < 112 || availableHeight < 68) return null;
  const panelWidth = Math.min(narrow ? 208 : 268,
    Math.max(narrow ? 172 : 208, width * (narrow ? .54 : .24)), availableWidth);
  const panelHeight = Math.min(narrow ? 222 : 248, availableHeight);
  const padding = panelWidth < 170 ? 8 : 11;
  const detailed = panelHeight >= 150 && panelWidth >= 172;
  const headerHeight = detailed ? 39 : 24;
  const columns = Math.max(1, Math.min(5, Math.floor((panelWidth - padding * 2) / 43)));
  const showLegend = panelHeight >= 132;
  const legendHeight = showLegend ? Math.ceil(LEGEND.length / columns) * 17 + 5 : 0;
  const panel = {x: width - edge - panelWidth, y: height - bottomReserve - edge - panelHeight,
    width: panelWidth, height: panelHeight};
  const plot = {x: panel.x + padding, y: panel.y + headerHeight,
    width: panelWidth - padding * 2, height: panelHeight - headerHeight - legendHeight - padding};
  const legend = showLegend ? LEGEND.map((type, index) => ({type,
    label: type === 'bird' ? '도움' : MINIMAP_MARKERS[type].label,
    x: panel.x + padding + (index % columns) * ((panelWidth - padding * 2) / columns),
    y: panel.y + panelHeight - legendHeight + 11 + Math.floor(index / columns) * 17,
    width: (panelWidth - padding * 2) / columns
  })) : [];
  return {panel, plot, legend, detailed, padding, topReserve, bottomReserve};
}

// Deliberately ignore map bounds, rooms and unrevealed walls when fitting. A
// hidden branch must not change the scale, offset, or visible silhouette.
export function revealedMinimapTiles(map, seen) {
  const tiles = [];
  if (!Array.isArray(seen) || !Array.isArray(map?.tiles)) return tiles;
  for (let y = 0; y < seen.length; y++) {
    const row = seen[y], floor = map.tiles[y];
    if (!row || !floor) continue;
    for (let x = 0; x < row.length; x++) if (row[x] && floor[x]) tiles.push({x, y});
  }
  return tiles;
}

export function fitMinimap(tiles, plot, {p, isometric = true, margin = 10} = {}) {
  if (!plot || ![plot.x, plot.y, plot.width, plot.height].every(Number.isFinite)
    || plot.width <= 0 || plot.height <= 0) return null;
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
  const halfWidth = isometric ? TILE * ISO.x : TILE / 2;
  const halfHeight = isometric ? TILE * ISO.y : TILE / 2;
  for (const tile of tiles) {
    const point = projectMinimap((tile.x + .5) * TILE, (tile.y + .5) * TILE, isometric);
    left = Math.min(left, point.x - halfWidth); right = Math.max(right, point.x + halfWidth);
    top = Math.min(top, point.y - halfHeight); bottom = Math.max(bottom, point.y + halfHeight);
  }
  if (!tiles.length) {
    const point = projectMinimap(finitePoint(p) ? p.x : 0, finitePoint(p) ? p.y : 0, isometric);
    left = point.x - halfWidth; right = point.x + halfWidth;
    top = point.y - halfHeight; bottom = point.y + halfHeight;
  }
  const inset = Math.min(Math.max(0, margin), plot.width / 4, plot.height / 4);
  const scale = Math.min(.28, (plot.width - inset * 2) / (right - left),
    (plot.height - inset * 2) / (bottom - top));
  return {isometric, scale, margin: inset, bounds: {left, right, top, bottom},
    offsetX: plot.x + plot.width / 2 - (left + right) * scale / 2,
    offsetY: plot.y + plot.height / 2 - (top + bottom) * scale / 2};
}

export function minimapPoint(x, y, fit) {
  const point = projectMinimap(x, y, fit.isometric);
  return {x: fit.offsetX + point.x * fit.scale, y: fit.offsetY + point.y * fit.scale};
}

// Ray/rectangle intersection retains the bearing of a player outside explored
// geometry. The whole arrow (including its outline) stays inside the plot.
export function clampMinimapPointer(point, box, inset = 9) {
  if (!box || ![box.x, box.y, box.width, box.height].every(Number.isFinite)
    || box.width <= 0 || box.height <= 0 || !finitePoint(point)) return null;
  const center = {x: box.x + box.width / 2, y: box.y + box.height / 2};
  const halfWidth = Math.max(0, box.width / 2 - Math.max(0, inset));
  const halfHeight = Math.max(0, box.height / 2 - Math.max(0, inset));
  const dx = point.x - center.x, dy = point.y - center.y;
  const amount = Math.min(1, dx === 0 ? 1 : halfWidth / Math.abs(dx),
    dy === 0 ? 1 : halfHeight / Math.abs(dy));
  return {x: center.x + dx * amount, y: center.y + dy * amount,
    clamped: amount < 1, bearing: Math.atan2(dy, dx)};
}

export function createMinimapModel({width, height, map, seen, objects = [], p,
  discovered = [], isometric = true} = {}) {
  const layout = minimapLayout(width, height);
  if (!layout || !map || !finitePoint(p)) return null;
  const tiles = revealedMinimapTiles(map, seen);
  const fit = fitMinimap(tiles, layout.plot, {p, isometric});
  const markers = [];
  for (const object of objects) {
    const style = MINIMAP_MARKERS[object?.type];
    if (!style || !finitePoint(object) || !seen?.[Math.floor(object.y / TILE)]?.[Math.floor(object.x / TILE)]) continue;
    const point = minimapPoint(object.x, object.y, fit);
    // Malformed/old objects outside known walkable geometry cannot pull the
    // map toward unexplored tiles or leave the panel to cover other UI.
    if (point.x < layout.plot.x + 5 || point.x > layout.plot.x + layout.plot.width - 5
      || point.y < layout.plot.y + 5 || point.y > layout.plot.y + layout.plot.height - 5) continue;
    markers.push({...style, ...point, type: object.type, spent: !!(object.open || object.used), locked: !!object.locked});
  }
  const position = clampMinimapPointer(minimapPoint(p.x, p.y, fit), layout.plot);
  const total = Array.isArray(discovered) ? discovered.length : 0;
  const progress = total ? Math.round(discovered.filter(Boolean).length / total * 100) : null;
  return {...layout, tiles, fit, markers,
    player: {...position, direction: minimapFacing(p.angle, isometric)}, progress};
}

function drawMarker(ctx, marker, radius = 4) {
  const {x, y, shape, color, spent, locked} = marker;
  ctx.save();
  ctx.globalAlpha = spent ? .42 : 1;
  ctx.strokeStyle = '#0d1723'; ctx.fillStyle = color; ctx.lineWidth = 2;
  ctx.beginPath();
  if (shape === 'diamond') {
    ctx.moveTo(x, y - radius - 1); ctx.lineTo(x + radius + 1, y);
    ctx.lineTo(x, y + radius + 1); ctx.lineTo(x - radius - 1, y); ctx.closePath();
  } else if (shape === 'cross') {
    const arm = radius * .38;
    for (const [index, [dx, dy]] of [[-arm, -radius], [arm, -radius], [arm, -arm], [radius, -arm],
      [radius, arm], [arm, arm], [arm, radius], [-arm, radius], [-arm, arm], [-radius, arm],
      [-radius, -arm], [-arm, -arm]].entries()) {
      if (index === 0) ctx.moveTo(x + dx, y + dy); else ctx.lineTo(x + dx, y + dy);
    }
    ctx.closePath();
  } else if (shape === 'return') {
    ctx.moveTo(x - radius - 1, y); ctx.lineTo(x, y - radius - 1);
    ctx.lineTo(x, y - radius * .4); ctx.lineTo(x + radius, y - radius * .4);
    ctx.lineTo(x + radius, y + radius * .5); ctx.lineTo(x, y + radius * .5);
    ctx.lineTo(x, y + radius + 1); ctx.closePath();
  } else {
    ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.stroke(); ctx.fill();
  ctx.strokeStyle = '#283243'; ctx.lineWidth = 1.3;
  if (shape === 'door') {
    ctx.beginPath(); ctx.moveTo(x - radius * .35, y + radius);
    ctx.lineTo(x - radius * .35, y - radius * .5); ctx.lineTo(x + radius * .35, y - radius * .5);
    ctx.lineTo(x + radius * .35, y + radius); ctx.stroke();
  } else if (shape === 'chest') {
    ctx.beginPath(); ctx.moveTo(x - radius, y - 1); ctx.lineTo(x + radius, y - 1); ctx.stroke();
    ctx.fillStyle = '#283243'; ctx.fillRect(x - 1, y - 2, 2, 4);
  }
  if (locked || spent) {
    ctx.beginPath(); ctx.moveTo(x - radius, y + radius); ctx.lineTo(x + radius, y - radius); ctx.stroke();
  }
  ctx.restore();
}

function label(ctx, text, x, y, width, color, size = 10, align = 'left') {
  if (width <= 0) return;
  ctx.font = `${size}px EmberwatchKorean, "Noto Sans KR", sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color;
  // Reserve explicit text regions; no object labels can collide with corridors.
  // maxWidth also handles a wider system fallback font during font loading.
  ctx.fillText(text, x, y, width);
}

/** Draw in screen coordinates after the scene. Returns geometry for inspection. */
export function drawMinimap(ctx, options) {
  const model = createMinimapModel(options);
  if (!ctx || !model) return model;
  const {panel, plot, fit, player, padding} = model;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0c1423ed'; ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  ctx.strokeStyle = '#81949299'; ctx.lineWidth = 1;
  ctx.strokeRect(panel.x + .5, panel.y + .5, panel.width - 1, panel.height - 1);
  const showProgress = model.progress !== null && panel.width >= 172;
  const titleWidth = panel.width - padding * 2 - (showProgress ? 65 : 0);
  label(ctx, panel.width >= 172 ? '탐색 지도' : '지도', panel.x + padding, panel.y + 17, titleWidth, '#e0dbbd', 11);
  if (showProgress) label(ctx, `${model.progress}% 탐색`, panel.x + panel.width - padding,
    panel.y + 17, 62, '#a6b9b7', 10, 'right');
  if (model.detailed) label(ctx, options.isometric === false ? '위에서 본 지도 · 화살표: 시선' : '화면 방향 그대로 · 화살표: 시선',
    panel.x + padding, panel.y + 32, panel.width - padding * 2, '#a6b9b7', 9);
  ctx.fillStyle = '#131f2d'; ctx.fillRect(plot.x, plot.y, plot.width, plot.height);
  ctx.save(); ctx.beginPath(); ctx.rect(plot.x, plot.y, plot.width, plot.height); ctx.clip();
  ctx.fillStyle = '#77928e';
  const halfWidth = (fit.isometric ? TILE * ISO.x : TILE / 2) * fit.scale;
  const halfHeight = (fit.isometric ? TILE * ISO.y : TILE / 2) * fit.scale;
  // One compound fill keeps adjoining corridor tiles seamless at small scales
  // and avoids a separate Canvas rasterization for every revealed tile.
  ctx.beginPath();
  for (const tile of model.tiles) {
    const point = minimapPoint((tile.x + .5) * TILE, (tile.y + .5) * TILE, fit);
    if (fit.isometric) {
      ctx.moveTo(point.x, point.y - halfHeight); ctx.lineTo(point.x + halfWidth, point.y);
      ctx.lineTo(point.x, point.y + halfHeight); ctx.lineTo(point.x - halfWidth, point.y); ctx.closePath();
    } else {
      ctx.rect(point.x - halfWidth, point.y - halfHeight, halfWidth * 2, halfHeight * 2);
    }
  }
  ctx.fill();
  for (const marker of model.markers) drawMarker(ctx, marker);
  if (player.clamped) {
    ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(player.x, player.y, 8, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.atan2(player.direction.y, player.direction.x));
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-2.5, 0); ctx.lineTo(-5, 4.5); ctx.closePath();
  ctx.lineJoin = 'round'; ctx.lineWidth = 3.5; ctx.strokeStyle = '#071421'; ctx.stroke();
  ctx.fillStyle = '#fff5c6'; ctx.fill();
  ctx.restore();
  for (const item of model.legend) {
    drawMarker(ctx, {...MINIMAP_MARKERS[item.type], x: item.x + 4, y: item.y - 4}, 3.2);
    label(ctx, item.label, item.x + 13, item.y, item.width - 15, '#c3d0c7', 9);
  }
  ctx.restore();
  return model;
}
