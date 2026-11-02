import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveRenderProfile} from '../../.agents/skills/diorama-worlds/kit/world.js';
test('harbor high quality profile is adaptive rather than universal mobile shadow cost',()=>{
 const config={rendering:{background:'#e9e3d7',camera:[14,32,31],shadowSize:2048,samples:4,padding:1.035,focus:.18}};
 assert.equal(resolveRenderProfile(config,1200).shadowSize,2048);
 assert.equal(resolveRenderProfile(config,390).shadowSize,1024);
 assert.equal(resolveRenderProfile(config,390).samples,2);
 assert.equal(resolveRenderProfile(config,1200).padding,1.035);
});
test('legacy worlds retain original rendering defaults',()=>{
 const p=resolveRenderProfile({},1200);assert.equal(p.background,'#ffffff');assert.equal(p.shadowSize,1024);assert.deepEqual(p.camera,[24,21,26]);assert.equal(p.focus,0);assert.equal(p.bias,-.0005);
});
