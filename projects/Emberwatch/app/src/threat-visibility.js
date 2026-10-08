import {ISO, projectWorld} from './visual.js';

// A fresh floor is safe for practice until its entry room is left. The caller
// also clears this flag on deliberate damage to a real opponent. An absent flag
// means an older/ongoing save; never turn protection on implicitly after resume.
export function updateEntryProtection(protectedAtEntry, player, entryRoom, tileSize = 32) {
  if (protectedAtEntry !== true || !player || !entryRoom || !(tileSize > 0)) return false;
  return player.x >= entryRoom.x * tileSize && player.x < (entryRoom.x + entryRoom.w) * tileSize
    && player.y >= entryRoom.y * tileSize && player.y < (entryRoom.y + entryRoom.h) * tileSize;
}

export const THREAT_NOTICE_SECONDS = 0.2;

// This is a presentation gate, independent of collision and line-of-sight.
// Include the actor and its legacy ground warning, not just an in-frame origin.
// Offscreen foes may still move; they cannot begin/release a fresh attack there.
export function enemyThreatReadable(enemy, player, {
  width, height, seen, isometric = true, camera, tileSize = 32,
  padding = {left: 24, right: 24, top: 40, bottom: 20}, occluders = []
} = {}) {
  if (!enemy || !player || ![enemy.x, enemy.y, player.x, player.y, width, height].every(Number.isFinite)
    || width <= 0 || height <= 0 || tileSize <= 0) return false;
  if (seen && !seen[Math.floor(enemy.y / tileSize)]?.[Math.floor(enemy.x / tileSize)]) return false;
  let x, y, scale;
  if (isometric) {
    const projected = projectWorld(enemy.x - player.x, enemy.y - player.y);
    x = width * 0.5 + projected.x * ISO.zoom;
    y = height * 0.55 + projected.y * ISO.zoom;
    scale = ISO.zoom;
  } else {
    if (!camera || !Number.isFinite(camera.x) || !Number.isFinite(camera.y)) return false;
    x = enemy.x - camera.x; y = enemy.y - camera.y; scale = 1;
  }
  const bodyHeight = (enemy.type === 'boss' ? 100 : enemy.type === 'rat' ? 28 : 46) * scale;
  const tellRadius = (enemy.type === 'boss' ? 100 : 45) * scale;
  const tellHeight = tellRadius * (isometric ? ISO.y : 1);
  const bounds = {left: x - Math.max(bodyHeight * 0.38, tellRadius), right: x + Math.max(bodyHeight * 0.38, tellRadius),
    top: y - Math.max(bodyHeight, tellHeight), bottom: y + Math.max(3, tellHeight)};
  if (bounds.left < (padding.left ?? 24) || bounds.right > width - (padding.right ?? 24)
    || bounds.top < (padding.top ?? 40) || bounds.bottom > height - (padding.bottom ?? 20)) return false;
  return !occluders.some(box => bounds.left < box.right && bounds.right > box.left
    && bounds.top < box.bottom && bounds.bottom > box.top);
}

// A newly revealed actor must be readable continuously before its full windup.
// Reset this transient field on resume and whenever visibility is lost.
export function advanceThreatReadiness(enemy, dt, readable) {
  if (!enemy) return false;
  const elapsed = Number.isFinite(enemy.threatReadableTime) ? Math.max(0, enemy.threatReadableTime) : 0;
  enemy.threatReadableTime = readable ? Math.min(THREAT_NOTICE_SECONDS, elapsed + (Number.isFinite(dt) ? Math.max(0, dt) : 0)) : 0;
  return readable && enemy.threatReadableTime + 1e-9 >= THREAT_NOTICE_SECONDS;
}
