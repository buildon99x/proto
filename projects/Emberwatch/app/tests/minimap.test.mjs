// Pure geometry and Canvas contract checks. Real navigation/readability still
// requires the normal-control browser journey; these tests do not claim it.
import test from 'node:test';
import assert from 'node:assert/strict';
import {screenMovement} from '../src/visual.js';
import {MINIMAP_MARKERS, projectMinimap, minimapFacing, minimapLayout, revealedMinimapTiles,
  fitMinimap, minimapPoint, clampMinimapPointer, createMinimapModel, drawMinimap} from '../src/minimap.js';

const near = (actual, expected, message = '') => assert(Math.abs(actual - expected) < 1e-8,
  `${message}: ${actual} != ${expected}`);
const directions = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
function fixture() {
  const map = {w: 50, h: 50, tiles: Array.from({length: 50}, () => Array(50).fill(0)), rooms: []};
  const seen = Array.from({length: 50}, () => Array(50).fill(false));
  // A visible room and an L-shaped corridor: the next turn must stay on the
  // same screen side as the scene. The other branch is deliberately hidden.
  for (let y = 3; y <= 9; y++) for (let x = 3; x <= 9; x++) {
    map.tiles[y][x] = 1; seen[y][x] = true;
  }
  for (let x = 10; x <= 18; x++) {map.tiles[6][x] = 1; seen[6][x] = true;}
  for (let y = 7; y <= 13; y++) {map.tiles[y][18] = 1; seen[y][18] = true;}
  map.tiles[20][20] = 1;
  const objects = [
    {type: 'return', x: 4.5 * 32, y: 4.5 * 32},
    {type: 'chest', x: 8.5 * 32, y: 4.5 * 32},
    {type: 'shrine', x: 4.5 * 32, y: 8.5 * 32},
    {type: 'bird', x: 8.5 * 32, y: 8.5 * 32},
    {type: 'exit', x: 18.5 * 32, y: 13.5 * 32, locked: true},
    {type: 'chest', x: 20.5 * 32, y: 20.5 * 32},
    {type: 'exit', x: 40.5 * 32, y: 40.5 * 32},
    {type: 'torch', x: 6.5 * 32, y: 6.5 * 32}
  ];
  return {width: 1280, height: 800, map, seen, objects,
    p: {x: 6.5 * 32, y: 6.5 * 32, angle: 0}, discovered: [true, false, false, false], isometric: true};
}
function assertInBox(point, box, inset = 0) {
  assert(point.x >= box.x + inset - 1e-8 && point.x <= box.x + box.width - inset + 1e-8,
    `x ${point.x} outside ${JSON.stringify(box)}`);
  assert(point.y >= box.y + inset - 1e-8 && point.y <= box.y + box.height - inset + 1e-8,
    `y ${point.y} outside ${JSON.stringify(box)}`);
}

test('all eight real screen-control vectors and facing arrows agree with screen travel', () => {
  for (const isometric of [true, false]) for (const [width, height] of [[1280, 800], [390, 844], [844, 390]]) {
    const data = {...fixture(), width, height, isometric};
    const {fit} = createMinimapModel(data);
    const origin = minimapPoint(data.p.x, data.p.y, fit);
    for (const [screenX, screenY] of directions) {
      // This is the actual input conversion, not an inverse built in this test.
      const move = isometric ? screenMovement(screenX, screenY) : {x: screenX, y: screenY};
      const target = minimapPoint(data.p.x + move.x * 32, data.p.y + move.y * 32, fit);
      const dx = target.x - origin.x, dy = target.y - origin.y;
      const distance = Math.hypot(dx, dy), expectedLength = Math.hypot(screenX, screenY);
      near(dx / distance, screenX / expectedLength, 'horizontal travel');
      near(dy / distance, screenY / expectedLength, 'vertical travel');
      const facing = minimapFacing(Math.atan2(move.y, move.x), isometric);
      near(facing.x, screenX / expectedLength, 'arrow horizontal');
      near(facing.y, screenY / expectedLength, 'arrow vertical');
    }
  }
});

test('room-to-corridor turns preserve the visible isometric slope; fallback stays top-down', () => {
  const data = fixture(), {fit} = createMinimapModel(data);
  const door = minimapPoint(9.5 * 32, 6.5 * 32, fit);
  const elbow = minimapPoint(18.5 * 32, 6.5 * 32, fit);
  const exit = minimapPoint(18.5 * 32, 13.5 * 32, fit);
  assert(elbow.x > door.x && elbow.y > door.y, 'first passage goes down-right');
  assert(exit.x < elbow.x && exit.y > elbow.y, 'turn goes down-left');
  near((elbow.y - door.y) / (elbow.x - door.x), .53);
  near((exit.y - elbow.y) / (exit.x - elbow.x), -.53);
  assert.deepEqual(projectMinimap(96, 64, false), {x: 96, y: 64});
  const point = projectMinimap(96, 64);
  near(point.x, 32); near(point.y, 84.8);
});

test('hidden topology, room coordinates and objects cannot change the visible fit or markers', () => {
  const data = fixture(), before = createMinimapModel(data);
  assert.equal(before.tiles.length, 65);
  assert.deepEqual(before.markers.map(marker => marker.type), ['return', 'chest', 'shrine', 'bird', 'exit']);
  assert.equal(before.progress, 25);
  data.map.w = 4000; data.map.h = 4000;
  data.map.rooms = [{x: 2000, y: 2000, w: 200, h: 200}];
  data.map.tiles[1000] = []; data.map.tiles[1000][1000] = 1;
  data.map.tiles[20][21] = 1;
  data.objects.push({type: 'return', x: 32000, y: 32000});
  data.discovered = [true, true, true, true];
  const after = createMinimapModel(data);
  assert.deepEqual(after.fit, before.fit);
  assert.deepEqual(after.tiles, before.tiles);
  assert.deepEqual(after.markers, before.markers);
  assert.deepEqual(after.player, before.player);
  assert.equal(after.progress, 100, 'discovery percentage is informational, not geometry');
  data.seen[20][20] = true;
  const revealed = createMinimapModel(data);
  assert.equal(revealed.tiles.length, before.tiles.length + 1);
  assert.equal(revealed.markers.filter(marker => marker.type === 'chest').length, 2);
  assert.notDeepEqual(revealed.fit, before.fit, 'actually revealing a branch may expand the map');
});

test('observed walls do not invent passages and missing fog never reveals the floor', () => {
  const data = fixture();
  data.seen[1][1] = true;
  assert(!revealedMinimapTiles(data.map, data.seen).some(tile => tile.x === 1 && tile.y === 1));
  assert.deepEqual(revealedMinimapTiles(data.map, undefined), []);
  const empty = createMinimapModel({...data, seen: []});
  assert.equal(empty.tiles.length, 0);
  assert.equal(empty.markers.length, 0);
  assertInBox(empty.player, empty.plot, 9);
  assert.equal(empty.player.clamped, false);
  assert.equal(createMinimapModel({...data, p: {x: NaN, y: 0}}), null);
});

test('each revealed tile fits with margin, without nonuniformly stretching either axis', () => {
  const tiles = [{x: -3, y: 7}, {x: 95, y: 7}, {x: 95, y: 41}];
  for (const isometric of [true, false]) for (const plot of [
    {x: 10, y: 20, width: 220, height: 160}, {x: 100, y: 120, width: 70, height: 38}
  ]) {
    const fit = fitMinimap(tiles, plot, {isometric});
    assert(fit.scale > 0);
    for (const tile of tiles) for (const [dx, dy] of [[0, 0], [1, 0], [1, 1], [0, 1]])
      assertInBox(minimapPoint((tile.x + dx) * 32, (tile.y + dy) * 32, fit), plot, fit.margin);
    const origin = minimapPoint(0, 0, fit);
    const horizontal = minimapPoint(32, isometric ? -32 : 0, fit);
    const vertical = minimapPoint(isometric ? 32 : 0, 32, fit);
    near(horizontal.y, origin.y); near(vertical.x, origin.x);
    near((vertical.y - origin.y) / (horizontal.x - origin.x), isometric ? .53 : 1);
  }
});

test('desktop, portrait and short landscape layouts stay above the HUD with separate label regions', () => {
  for (const [width, height] of [[1440, 900], [1280, 800], [800, 400], [844, 390],
    [700, 500], [560, 800], [390, 844], [390, 600], [320, 568], [180, 600], [128, 600], [390, 480]]) {
    const layout = minimapLayout(width, height);
    assert(layout, `${width}×${height} should have room for a map`);
    const {panel, plot} = layout;
    assert(panel.x >= 0 && panel.y >= layout.topReserve);
    assert(panel.x + panel.width <= width);
    assert(panel.y + panel.height <= height - layout.bottomReserve);
    assert(plot.width > 0 && plot.height > 0);
    assertInBox({x: plot.x, y: plot.y}, panel);
    assertInBox({x: plot.x + plot.width, y: plot.y + plot.height}, panel);
    const byRow = new Map();
    for (const item of layout.legend) {
      assert(item.y - 9 >= plot.y + plot.height, 'legend cannot overlap the map');
      assertInBox({x: item.x, y: item.y}, panel);
      assertInBox({x: item.x + item.width, y: item.y}, panel);
      const previous = byRow.get(item.y);
      if (previous) assert(previous.x + previous.width <= item.x + 1e-8, 'legend text regions cannot overlap');
      byRow.set(item.y, item);
    }
  }
  for (const [width, height] of [[390, 400], [90, 800], [1, 1], [800, 200], [0, 800], [NaN, 800]])
    assert.equal(minimapLayout(width, height), null, 'hide when controls leave no useful safe region');
});

test('off-map pointers retain bearing and deterministic bounds in all eight directions', () => {
  const box = {x: 100, y: 200, width: 180, height: 100}, center = {x: 190, y: 250};
  for (const [dx, dy] of directions) {
    const target = {x: center.x + dx * 10000, y: center.y + dy * 10000};
    const result = clampMinimapPointer(target, box);
    assert.equal(result.clamped, true);
    assertInBox(result, box, 9);
    near((result.x - center.x) * dy - (result.y - center.y) * dx, 0, 'clamp preserves bearing');
    assert.deepEqual(result, clampMinimapPointer(target, box));
  }
  assert.deepEqual(clampMinimapPointer(center, box), {...center, clamped: false, bearing: 0});
  assert.equal(clampMinimapPointer({x: Infinity, y: 0}, box), null);
  const data = fixture(); data.p.x = -100000; data.p.y = -100000;
  const model = createMinimapModel(data);
  assert.equal(model.player.clamped, true);
  assertInBox(model.player, model.plot, 9);
});

test('landmarks have shape as well as color, and used markers keep their position', () => {
  assert.equal(new Set(['exit', 'return', 'chest', 'shrine', 'bird'].map(type => MINIMAP_MARKERS[type].shape)).size, 5);
  const data = fixture(), before = createMinimapModel(data);
  data.objects[1].open = true; data.objects[2].used = true;
  const after = createMinimapModel(data);
  for (const index of [1, 2]) {
    assert.equal(after.markers[index].spent, true);
    near(after.markers[index].x, before.markers[index].x);
    near(after.markers[index].y, before.markers[index].y);
  }
  assert.equal(after.markers.find(marker => marker.type === 'exit').locked, true);
});

test('Canvas rendering balances state, uses bounded Korean labels and preserves its inputs', () => {
  let depth = 0; const labels = [];
  const ctx = new Proxy({
    save() {depth++;}, restore() {assert(depth > 0); depth--;},
    fillText(text, x, y, maxWidth) {assert(Number.isFinite(x + y + maxWidth) && maxWidth > 0); labels.push(text);}
  }, {get(object, key) {return key in object ? object[key] : (...args) => {
    for (const value of args) if (typeof value === 'number') assert(Number.isFinite(value), `${String(key)} invalid coordinate`);
  };}});
  const data = fixture(), snapshot = JSON.stringify(data);
  assert(drawMinimap(ctx, data));
  assert.equal(depth, 0);
  assert.equal(JSON.stringify(data), snapshot);
  for (const label of ['탐색 지도', '25% 탐색', '출구', '귀환', '상자', '회복', '도움']) assert(labels.includes(label));
  assert(labels.some(label => label.includes('화면 방향')));
  drawMinimap(ctx, {...data, width: 390, height: 844, isometric: false});
  assert(labels.some(label => label.includes('위에서 본 지도')));
  assert.equal(depth, 0);
  assert.equal(drawMinimap(ctx, {...data, width: 30, height: 50}), null);
  assert.equal(depth, 0);
});
