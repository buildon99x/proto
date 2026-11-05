import test from 'node:test';
import assert from 'node:assert/strict';
import * as geometry from '../src/harbor-geometry.js';
import {toolkit} from '../../.agents/skills/diorama-worlds/kit/world.js';
test('naval hull is multi-level, tapered below waterline and bounded for cargo clearance',()=>{
 assert.equal(typeof geometry.hullGeometry,'function','tapered hull geometry API');
 const T=toolkit({}).THREE,root=new T.Group(),W=toolkit(root);
 for(const tug of [false,true]) {
  const geo=geometry.hullGeometry(W,4.7,1.6,tug);const pos=geo.attributes.position;
  const ys=new Set();let bottom=Infinity,top=-Infinity;
  for(let i=0;i<pos.count;i++){ys.add(pos.getY(i).toFixed(3));bottom=Math.min(bottom,pos.getY(i));top=Math.max(top,pos.getY(i));}
  assert.ok(ys.size>=4,'multiple naval hull levels');let beamBottom=0,beamTop=0;
  for(let i=0;i<pos.count;i++){if(pos.getY(i)<bottom+.001)beamBottom=Math.max(beamBottom,Math.abs(pos.getX(i)));if(pos.getY(i)>top-.06)beamTop=Math.max(beamTop,Math.abs(pos.getX(i)));}
  assert.ok(beamBottom<beamTop*.75,'keel narrows below upper chine');geo.computeBoundingBox();
  assert.ok(geo.boundingBox.max.x<=.82&&geo.boundingBox.min.x>=-.82);assert.ok(geo.boundingBox.max.z<=2.36&&geo.boundingBox.min.z>=-2.36);
  let outward=0;for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i))>.7&&pos.getY(i)>.1)outward+=pos.getX(i)*geo.attributes.normal.getX(i);assert.ok(outward>0,'naval hull normals face outwards');
  assert.equal(geometry.hullGeometry(W,4.7,1.6,tug),geo,'hulls reuse per-world cached resources');
 }
 W.dispose();
});
