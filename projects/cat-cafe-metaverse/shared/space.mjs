// One authoritative layout contract shared by browser and room simulation.
// Scaling both horizontal axes by sqrt(2) doubles area, not furniture/character size.
export const SPACE_SCALE=Math.SQRT2;
export const FLOOR_SIZE=26*SPACE_SCALE;
export const WALK_HALF=12*SPACE_SCALE;
export const PLAYER_RADIUS=.3;
export const WORLD_OBSTACLES=Object.freeze([{x:-7,z:-5,r:1.35},{x:7,z:-5,r:1.35},{x:-8,z:6,r:1.5},{x:8,z:6,r:1.2},{x:0,z:-10,r:2}].map(o=>Object.freeze({...o,x:o.x*SPACE_SCALE,z:o.z*SPACE_SCALE})));
