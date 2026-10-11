import test from 'node:test';
import assert from 'node:assert/strict';
import {configurePoeControls,acceptBattleInput,stepBattle,cancelBattleAction} from '../src/combat.js';
import {poeControlPreset,enableSkillLoadout} from '../src/controls.js';
import {canonicalSkillInput} from '../src/skill-loadout-input.js';
import {createPoeFeedback,drawPoeGroundFeedback,POE_FEEDBACK_STYLES} from '../src/poe-presentation.js';
import {createVisualRenderer,ISO,projectWorld,spriteDirection} from '../src/visual.js';
import {resolveActorMotion,MOTION_ACTIONS,motionFrame} from '../src/motion.js';
import {onslaughtPresentation} from '../src/expert-presentation.js';
import {ART} from '../src/art.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {fixture as expertFixture} from './support/expert-fixture.mjs';

// Synthetic learned-profile/position fixture. Every action, contact and ending
// comes from real controls5 acceptance/step handlers, never a fabricated action.
// Recording the production Canvas boundary is not pixel or visual acceptance.
function fixture(){
 const {s,b}=expertFixture({lay_on_hands:1,judgement:1,battle_banner:1,zealous_onslaught:1});
 const controls=enableSkillLoadout(poeControlPreset(s.options.controls),{skills:s.character.skills,actionSlots:s.actionSlots});
 configurePoeControls(b,controls);b.map=mapFromRegion({w:40,h:30});b.p.x=600;b.p.y=480;b.enemies=[];b.awaitingAdvance=false;
 return {s,b,feedback:createPoeFeedback(),events:[]};
}
const ownedChannel={ownerToken:'presentation-runtime-owner',held:true};
function input(f,id=null,channel){return {...canonicalSkillInput({pressedSkillId:id,heldSkills:{},channel}),aim:{x:f.b.p.x+200,y:f.b.p.y}};}
function accept(f,id){const events=acceptBattleInput(f.b,input(f,id,id==='zealous_onslaught'?ownedChannel:undefined));f.feedback.accept(events,f.b.p);f.events.push(...events);return events;}
function advance(f,seconds,{channel}={}){for(let elapsed=0;elapsed<seconds-1e-10;){const dt=Math.min(1/120,seconds-elapsed);f.feedback.step(dt);const events=stepBattle(f.b,f.s.character,dt,input(f,null,channel));f.feedback.accept(events,f.b.p);f.events.push(...events);elapsed+=dt;}}
const gradient={addColorStop(){}};
function recorder(){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over'};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:op==='stroke'||op==='fill'?structuredClone(path):[],...data});
 const point=(op,...v)=>{assert.ok(v.every(Number.isFinite),`${op} coordinates are finite`);path.push([op,...v]);};
 const methods={save(){stack.push({...data});},restore(){assert.ok(stack.length);Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){point('moveTo',...v);},lineTo(...v){point('lineTo',...v);},ellipse(...v){point('ellipse',...v);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){assert.ok(v.every(Number.isFinite));record('fillRect',v);},drawImage(...v){record('drawImage',v);},fillText(...v){record('fillText',v);},clip(){},translate(){},scale(){},rotate(){},setLineDash(){},createRadialGradient(){return gradient;},measureText(s){return {width:s.length*7};}};
 const ctx=new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)});return {ctx,calls,stack};
}
function harness(){const r=recorder(),images={environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{hero:{id:'motion'}}};return {...r,renderer:createVisualRenderer(r.ctx,ART,images,{createCanvas:null})};}
const warningColor='#f29187';
function render(f,r,flashScale){
 const b=f.b,p=b.p,before=JSON.stringify({p,shots:b.shots,effects:b.effects,banner:b.banner,stats:b.stats,feedback:f.feedback.snapshot()}),feedback=f.feedback.snapshot();
 const focus=projectWorld(p.x,p.y),offset={x:500-focus.x*ISO.zoom,y:750*.55-focus.y*ISO.zoom};
 const project=o=>{const q=projectWorld(o.x,o.y);return {x:q.x*ISO.zoom+offset.x,y:q.y*ISO.zoom+offset.y};};
 const overlay=recorder(),metrics=drawPoeGroundFeedback(overlay.ctx,{player:p,pose:p.presentationPose,feedback,project,zoom:ISO.zoom,flashScale,enabled:true});
 const enemy={id:'visible-warning',kind:'scout',type:'guardian',x:p.x+30,y:p.y,hp:100,max:100,active:true,angle:Math.PI,state:'windup',telegraph:{phase:'windup',color:warningColor,locked:true,progress:.4,shapes:[{type:'circle',x:p.x,y:p.y,r:65}]}};
 r.calls.length=0;r.renderer.render({width:1000,height:750,regionId:b.region,map:b.map,p,entities:[enemy],effects:b.effects,shots:b.shots,areas:b.areas,banner:b.banner,time:b.time,stats:b.stats,cleanView:true,poeInput:true,poeFeedback:feedback,presentationPose:p.presentationPose,flashScale,reduced:flashScale===0});
 const style=POE_FEEDBACK_STYLES[p.action?.id??feedback[0]?.skillId],colors=new Set(style?[style.color,style.accent]:[]),expected=overlay.calls.filter(c=>c.op==='stroke'),actual=r.calls.filter(c=>c.op==='stroke'&&colors.has(c.strokeStyle));
 assert.deepEqual(actual.map(c=>[c.path,c.strokeStyle,c.globalAlpha,c.lineWidth]),expected.map(c=>[c.path,c.strokeStyle,c.globalAlpha,c.lineWidth]),'renderer consumes exact real action/feedback floor geometry');
 const sparks=overlay.calls.filter(c=>c.op==='fillRect'),renderedSparks=r.calls.filter(c=>c.op==='fillRect'&&colors.has(c.fillStyle));assert.deepEqual(renderedSparks.map(c=>[c.args,c.fillStyle,c.globalAlpha,c.globalCompositeOperation]),sparks.map(c=>[c.args,c.fillStyle,c.globalAlpha,c.globalCompositeOperation]),'full renderer honors the same spark ceiling and flash0 suppression');assert.ok(sparks.every(c=>c.args[2]<=2.5*ISO.zoom&&c.args[3]<=2.5*ISO.zoom),'sparks stay local, never screen-sized');
 const danger=r.calls.filter(c=>c.op==='stroke'&&c.strokeStyle===warningColor),actors=r.calls.filter(c=>c.op==='drawImage'&&['motion','enemy'].includes(c.args[0].id));assert.ok(danger.length&&actors.length>=2);
 assert.ok(actual.every(c=>[...danger,...actors].every(d=>r.calls.indexOf(c)<r.calls.indexOf(d))),'FX remain below hostile warnings and actor art');
 if(p.action){const cue=onslaughtPresentation(p),motion=cue?.motion??resolveActorMotion(p,b.time,true),frame=motionFrame(motion.action,motion.phase),row=spriteDirection(cue?.angle??p.angle)*MOTION_ACTIONS.length+MOTION_ACTIONS.indexOf(motion.action);assert.ok(r.calls.some(c=>c.op==='drawImage'&&c.args[0].id==='motion'&&c.args[1]===frame*112&&c.args[2]===row*112),'real action drives existing motion art at its real phase');}
 assert.equal(r.stack.length,0);assert.equal(overlay.stack.length,0);assert.equal(JSON.stringify({p,shots:b.shots,effects:b.effects,banner:b.banner,stats:b.stats,feedback:f.feedback.snapshot()}),before,'render never changes combat/payment/contact state');assert.equal(metrics.sparks,flashScale?feedback.length*8:0);
 return {metrics,geometry:expected.map(c=>c.path)};
}
for(const id of Object.keys(POE_FEEDBACK_STYLES))for(const flashScale of [0,1])test(`${id} real start -> prepare -> contact/pulse -> end reaches renderer at flash ${flashScale}`,()=>{
 const f=fixture(),r=harness(),events=accept(f,id),a=f.b.p.action;
 assert.equal(events.filter(e=>e.type==='actionStarted'&&e.id===id).length,1);assert.equal(a.id,id);assert.equal(a.elapsed,0);assert.equal(f.b.time,0);assert.equal(a.contact,a.spec.contact);assert.ok(a.contact>0);assert.equal(f.feedback.snapshot().length,0);
 const started=render(f,r,flashScale);assert.ok(started.metrics.paths>=5,'preparation exists before a simulation step');const channel=id==='zealous_onslaught'?ownedChannel:undefined;
 advance(f,a.contact*.5,{channel});assert.equal(a.fired,false);assert.equal(f.feedback.snapshot().length,0);const prepared=render(f,r,flashScale);assert.ok(prepared.metrics.paths>=5);assert.notDeepEqual(prepared.geometry,started.geometry);
 advance(f,a.contact*.5,{channel});
 if(channel){assert.equal(a.fired,false,'real channel never sets ordinary fired flag');assert.equal(a.pulses,0);assert.equal(render(f,r,flashScale).metrics.paths,0,'preparation ends at channel startup, before a damage pulse');advance(f,a.spec.tickSeconds,{channel});assert.equal(a.pulses,1);assert.equal(f.events.filter(e=>e.type==='actionContact').length,0);assert.equal(f.events.filter(e=>e.type==='channelPulse').length,1);}
 else{assert.equal(a.fired,true);assert.equal(f.events.filter(e=>e.type==='actionContact'&&e.castId===a.castId).length,1);}
 assert.equal(f.feedback.snapshot().length,1);assert.ok(render(f,r,flashScale).metrics.paths>=2);
 f.feedback.accept(f.events.filter(e=>['actionContact','channelPulse'].includes(e.type)),f.b.p);assert.equal(f.feedback.snapshot().length,1,'redelivery cannot duplicate contact or pulse');
 if(channel){const ending=stepBattle(f.b,f.s.character,0,input(f,null,{...ownedChannel,held:false,released:true}));assert.ok(ending.some(e=>e.type==='channelEnded'));f.feedback.accept(ending,f.b.p);}else advance(f,a.duration-a.elapsed);
 assert.equal(f.b.p.action,null);advance(f,.43);assert.equal(f.feedback.snapshot().length,0);assert.equal(render(f,r,flashScale).metrics.paths,0,'no preparation or expired echo after ending');
});
test('real precontact roll cancellation removes preparation without inventing a hit',()=>{
 const f=fixture(),r=harness();accept(f,'righteous_hammer');const castId=f.b.p.action.castId;assert.ok(render(f,r,0).metrics.paths>=5);
 const events=acceptBattleInput(f.b,{dodgeOnly:true,move:{x:1,y:0},heldActions:{dodgeOnly:true}});f.feedback.accept(events,f.b.p);assert.ok(events.some(e=>e.type==='actionCancelled'&&e.castId===castId&&!e.contactOccurred));assert.equal(f.b.p.action,null);assert.equal(f.feedback.snapshot().length,0);advance(f,.8);assert.equal(f.b.shots.length,0);assert.equal(render(f,r,0).metrics.paths,0);
});
test('real pre-pulse channel safety cancellation leaves no preparation or invented contact',()=>{
 const f=fixture(),r=harness();accept(f,'zealous_onslaught');assert.ok(render(f,r,0).metrics.paths>=5);const castId=f.b.p.action.castId;
 const events=cancelBattleAction(f.b,'blur');f.feedback.accept(events,f.b.p);assert.ok(events.some(e=>e.type==='channelEnded'));assert.equal(f.b.p.action,null);assert.equal(f.feedback.snapshot().length,0);assert.equal(render(f,r,0).metrics.paths,0);f.feedback.accept([{type:'channelPulse',castId,index:1}],f.b.p);assert.equal(f.feedback.snapshot().length,0);
});
test('real channel completion retains final pulse, respects cap, and clears with scene',()=>{
 const f=fixture(),r=harness();accept(f,'zealous_onslaught');const a=f.b.p.action;advance(f,a.duration,{channel:ownedChannel});assert.equal(f.b.p.action,null);assert.equal(a.pulses,16);assert.equal(f.events.filter(e=>e.type==='channelPulse').length,16);assert.equal(f.events.filter(e=>e.type==='channelEnded'&&e.reason==='complete').length,1);assert.ok(f.feedback.snapshot().length>0&&f.feedback.snapshot().length<=12);assert.ok(render(f,r,0).metrics.paths>0);f.feedback.clear();assert.equal(render(f,r,0).metrics.paths,0);f.feedback.accept([{type:'channelPulse',castId:a.castId,index:17}],f.b.p);assert.equal(f.feedback.snapshot().length,0);
});
test('rejected real action never creates preparation, payment or contact FX',()=>{
 const f=fixture(),r=harness();f.b.p.mana=0;const events=accept(f,'righteous_hammer');assert.ok(events.some(e=>e.type==='skillIntentRejected'&&e.blockedReason==='mana'));assert.equal(f.b.p.action,null);assert.equal(f.b.p.mana,0);assert.equal(f.feedback.snapshot().length,0);assert.equal(render(f,r,0).metrics.paths,0);
});
