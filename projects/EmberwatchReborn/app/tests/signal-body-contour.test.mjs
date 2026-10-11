import test from 'node:test';import assert from 'node:assert/strict';
import {createVisualRenderer,ISO,projectWorld} from '../src/visual.js';
import {SIGNAL_REGION} from '../src/signal-content.js';
import {signalBodyContourAllowed,createSignalBodyContourCache,SIGNAL_CONTOUR_STYLE as STYLE} from '../src/signal-body-contour.js';
import {signalSceneVisibility} from '../src/signal-scene-visibility.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {SIGNAL_REGIONS} from '../src/signal-content.js';
import {ART} from '../src/art.js';
import {overlapFixture,record,bodies,heroes,statues} from './overlap-fixture.mjs';
import {recordingContext,recordingCanvases} from './recording-context.mjs';
const cueDraws=calls=>calls.filter(c=>c.op==='image'&&c.args[0].id?.startsWith('cue-'));
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};

test('contour eligibility is strict S-only, active, living keeper with existing overlap fade',()=>{
 const e=overlapFixture().entities[0];assert.equal(signalBodyContourAllowed(e,SIGNAL_REGION,.64),true);
 for(const [actor,region,alpha] of [[e,'furnace_hall',.64],[e,'ash_road',.64],[e,undefined,.64],[e,SIGNAL_REGION,1],[e,SIGNAL_REGION,0],[e,SIGNAL_REGION,NaN],[{...e,kind:'signal_runner'},SIGNAL_REGION,.64],[{...e,active:false},SIGNAL_REGION,.64],[{...e,hp:0},SIGNAL_REGION,.64],[{...e,dead:true},SIGNAL_REGION,.64]])assert.equal(signalBodyContourAllowed(actor,region,alpha),false);
});
test('only two static edge draws are added, before the same body and depth-sorted shrine',()=>{
 const s=overlapFixture(),a=record(createVisualRenderer,s),b=record(createVisualRenderer,s,{createActorCueCanvas:null}),cues=cueDraws(a.calls);
 assert.equal(cues.length,2);assert.deepEqual(cues.map(c=>c.globalAlpha),[STYLE.keyAlpha,STYLE.alpha]);
 assert.ok(cues.every(c=>c.filter==='none'&&c.globalCompositeOperation==='source-over'));
 assert.ok(cues.every(c=>a.calls.indexOf(c)<a.calls.indexOf(bodies(a.calls)[0])));
 assert.ok(a.calls.indexOf(bodies(a.calls)[0])<a.calls.indexOf(statues(a.calls).find(c=>c.globalAlpha===.3)));
 assert.deepEqual(a.calls.filter(c=>!cueDraws([c]).length),b.calls,'all legacy render commands, warning paths, body alphas, architecture and hero restoration remain byte-for-byte equivalent at the recording boundary');
});
test('sprite masks are transparent edge-only composites using the original frame and scales',()=>{
 const s=overlapFixture(),a=record(createVisualRenderer,s),body=bodies(a.calls)[0];assert.equal(a.surfaces.length,2);
 for(const surface of a.surfaces){
  const images=surface.calls.filter(c=>c.op==='image'),tint=surface.calls.find(c=>c.op==='fillRect');
  assert.equal(tint.globalCompositeOperation,'source-in');assert.equal(images.at(-1).globalCompositeOperation,'destination-out');
  assert.deepEqual(images.at(-1).args.slice(1,5),body.args.slice(1,5));assert.deepEqual(images.at(-1).args.slice(7),body.args.slice(7));
  assert.ok(images.slice(0,-1).every(c=>c.globalCompositeOperation==='source-over'));
  assert.ok(surface.canvas.width<=90&&surface.canvas.height<=90,'authored keeper frame remains a tiny optional surface');
 }
});
test('contour never reaches foot marks or raises actor dimensions/anchors',()=>{
 const s=overlapFixture(),a=record(createVisualRenderer,s),q=projectWorld(s.entities[0].x-s.p.x,s.entities[0].y-s.p.y),foot=s.height*.55+q.y*ISO.zoom;
 for(const c of cueDraws(a.calls))assert.ok(c.args[6]+c.args[8]<=foot-STYLE.footClearance*ISO.zoom);
 const body=bodies(a.calls)[0],base=bodies(record(createVisualRenderer,s,{createActorCueCanvas:null}).calls)[0];assert.deepEqual(body,base);
});
test('hidden idle gate, dead, inactive, offscreen and separated actors gain no contour',()=>{
 const s=overlapFixture(),e=s.entities[0];
 for(const change of [{active:false},{hp:0,dead:true,deathTime:.4},{x:8000,y:8000},{x:e.x+96},{kind:'signal_archer'}])assert.equal(cueDraws(record(createVisualRenderer,{...s,entities:[{...e,...change}]}).calls).length,0);
 assert.equal(cueDraws(record(createVisualRenderer,{...s,sceneVisibility:{...s.sceneVisibility,entityVisible:()=>false}}).calls).length,0);
 const map=mapFromRegion(SIGNAL_REGIONS[SIGNAL_REGION],{signal_accepted:1}),p={x:416,y:240,hp:100},idle={...e,x:336,y:112,active:false,telegraph:null};
 const v=signalSceneVisibility({region:SIGNAL_REGION,map,p,enemies:[idle]},{objectives:{signal_accepted:1}}),calls=record(createVisualRenderer,{...s,map,p,entities:[idle],sceneVisibility:v,seen:v.seen}).calls;
 assert.equal(bodies(calls).length,0);assert.equal(cueDraws(calls).length,0);
});
test('disconnected active threat keeps the original warning and body without a new visibility bypass',()=>{
 const s=overlapFixture(),map=mapFromRegion(SIGNAL_REGIONS[SIGNAL_REGION],{signal_accepted:1}),p={x:416,y:240,hp:100};
 const e={...s.entities[0],x:416,y:136},v=signalSceneVisibility({region:SIGNAL_REGION,map,p,enemies:[e]},{objectives:{signal_accepted:1}});
 const calls=record(createVisualRenderer,{...s,map,p,entities:[e],sceneVisibility:v,seen:v.seen}).calls;
 assert.equal(v.threatVisible(e),true);assert.equal(bodies(calls).length,1);assert.ok(calls.some(c=>c.op==='stroke'&&c.strokeStyle==='#f29187'));
 assert.equal(cueDraws(calls).length,0,'far/non-overlap threat is preserved without emphasis');
});
test('static contour survives flash0/reduced settings and leaves frozen simulation state untouched',()=>{
 const s=overlapFixture(),snapshot=JSON.stringify(s),a=record(createVisualRenderer,freeze(s)),b=record(createVisualRenderer,{...s,reduced:false,flashScale:1,time:9,entities:s.entities.map(e=>({...e,flash:1}))});
 const geometry=calls=>cueDraws(calls).map(c=>({args:c.args.slice(1),alpha:c.globalAlpha,filter:c.filter}));
 assert.deepEqual(geometry(a.calls),geometry(b.calls));assert.equal(JSON.stringify(s),snapshot);
});
test('unsupported or failing optional canvas factory exactly retains the legacy render',()=>{
 const s=overlapFixture(),base=record(createVisualRenderer,s,{createActorCueCanvas:null});
 for(const createActorCueCanvas of [()=>null,()=>({getContext:()=>null}),()=>{throw new Error('fixture canvas failure');}]){
  const a=record(createVisualRenderer,s,{createActorCueCanvas});assert.deepEqual(a.calls,base.calls);
 }
});
test('contour frame cache reuses masks and is bounded to 16 frames',()=>{
 const a=recordingCanvases(),cached=createSignalBodyContourCache(a.createCanvas),img={},frame=ART.enemy.frames[0];
 const first=cached(img,frame,.23,.253);assert.equal(cached(img,frame,.23,.253),first);assert.equal(a.surfaces.length,2);
 for(const r of ART.enemy.frames.slice(1))cached(img,r,.23,.253);assert.equal(a.surfaces.length,32);
 assert.equal(cached(img,frame,.23,.253),first);assert.equal(a.surfaces.length,32);
 cached(img,{...frame},.23,.253);assert.equal(a.surfaces.length,34);assert.notEqual(cached(img,frame,.23,.253),first);
 const next=cached({},frame,.23,.253);assert.notEqual(next,first);
});
test('optional canvas factory cannot resize or clear the main canvas or reuse an existing mask',()=>{
 const main=recordingContext(),canvas={width:900,height:650,getContext:()=>main.ctx};main.ctx.canvas=canvas;
 const cached=createSignalBodyContourCache(()=>canvas,main.ctx),frame=ART.enemy.frames[0];
 assert.equal(cached({},frame,.23,.253),null);assert.equal(canvas.width,900);assert.equal(canvas.height,650);assert.equal(main.calls.length,0);
 const a=recordingCanvases(),one=a.createCanvas(80,80),reused=createSignalBodyContourCache(()=>one);
 assert.equal(reused({},frame,.23,.253),null,'a repeated canvas is rejected before the second mask can overwrite the first');
 assert.equal(a.surfaces[0].calls.filter(c=>c.op==='clearRect').length,1);
});
