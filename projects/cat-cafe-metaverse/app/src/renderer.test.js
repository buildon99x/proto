import test from 'node:test';
import assert from 'node:assert/strict';
import {CAT_STYLE,sceneLayout} from './world.js';
test('reference-inspired cat silhouette is plump, big-headed and short-footed with six original palettes',()=>{assert.ok(CAT_STYLE.body[0]>=.48);assert.ok(CAT_STYLE.head[0]/CAT_STYLE.body[0]>=.85);assert.ok(CAT_STYLE.foot[1]<=.13);assert.equal(CAT_STYLE.palettes.length,6);assert.equal(CAT_STYLE.outlineParts,4);assert.ok(CAT_STYLE.outlineScale<=1.04);});
test('floor area doubles exactly without doubling furniture dimensions',()=>{const l=sceneLayout();assert.ok(Math.abs(l.floorSize*l.floorSize/(26*26)-2)<1e-12);assert.equal(l.tableRadius,1.25);assert.equal(l.sofaWidth,2.6);assert.ok(Math.abs(l.tableAnchors[0].x-(-7*Math.SQRT2))<1e-12);assert.equal(l.cameraDistance,27*Math.SQRT2);});
test('recreated local avatars reuse the cached marker geometry across room switches',async()=>{const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('./world.js',import.meta.url),'utf8');assert.match(source,/geometry\('player-marker',\(\)=>new T\.TorusGeometry\(\.45,\.035,8,24\)\)/);assert.doesNotMatch(source,/mesh\(new T\.TorusGeometry\(\.45/);});
