import test from 'node:test';
import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState} from '../src/state.js';
import {poeControlPreset,createInputRouter} from '../src/controls.js';
import {createBattle,stepBattle,acceptBattleInput,clearPoeInput,configurePoeControls,resetPoeMobility,cancelBattleAction,applyHeroStatus} from '../src/combat.js';
import {battleReport,validateRecovery} from '../src/recovery.js';
import {createStore} from '../src/save.js';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';
import {RUN_GAIT} from '../src/motion.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {REBORN_POE_MOBILITY_TUNING as T,skillTimeline,skillCanDodgeCancel,skillCanRetarget} from '../src/poe-skill-policy.js';
const near=(a,b,message='')=>assert.ok(Math.abs(a-b)<1e-7,`${message}: ${a} != ${b}`);
function fixture({poe=true,tracking=true,keep=false,mode='wasd'}={}){
 let s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 if(poe){const controls=poeControlPreset(s.options.controls,mode);controls.poe.cursorTrackingAfterRelease=tracking;controls.poe.keepSprintingWhileMoving=keep;s=reduceRuntime(s,{type:'setControls',controls}).state;}
 const b=createBattle(s);b.map=mapFromRegion({w:80,h:80});b.p.x=600;b.p.y=600;b.enemies=[];return {s,b};
}
const sample=(f,input={})=>({aim:{x:f.b.p.x+200,y:f.b.p.y},...input});
const tick=(f,dt=1/60,input={})=>stepBattle(f.b,f.s.character,dt,sample(f,input));
function run(f,seconds,input={},hz=60){const events=[];for(let t=0;t<seconds-1e-10;){const dt=Math.min(1/hz,seconds-t);events.push(...tick(f,dt,typeof input==='function'?input(f):input));t+=dt;}return events;}
const begin=(f,input)=>acceptBattleInput(f.b,sample(f,input));
const mobility=(f,action='dodgeOnly',extra={})=>begin(f,{[action]:true,heldActions:{[action]:true},move:{x:1,y:0},...extra});
function hostile(f,shape='cone',delay=.001){const p=f.b.p,e={id:'test-enemy',kind:'scout',x:p.x-30,y:p.y,hp:100,max:100,active:true,angle:0,state:'windup',timer:delay,windupDuration:delay,stun:0,attackId:99,attackSpec:{damage:10,damageType:'fire',recovery:10,attackFamily:'weapon'},telegraph:{progress:0,shapes:[shape==='circle'?{type:'circle',x:p.x,y:p.y,r:600}:{type:'cone',x:p.x-30,y:p.y,r:600,angle:0,halfAngle:Math.PI}]}};f.b.enemies=[e];return e;}
function projectile(f){const p=f.b.p;f.b.shots.push({kind:'arrow',enemy:true,x:p.x,y:p.y,vx:0,vy:0,damage:10,life:1,attackId:100});}

test('only opt-in controls4 creates mobility; original action costs and contact are unchanged',()=>{
 const a=fixture({poe:false}),b=fixture();assert.equal(a.b.poeMobility,undefined);assert.ok(b.b.poeMobility);
 const ev=begin(b,{hammer:true});begin(a,{hammer:true});assert.equal(b.b.time,0);assert.equal(b.b.p.action.elapsed,0);assert.equal(b.b.shots.length,0);assert.deepEqual(b.b.p.action.spec,a.b.p.action.spec);assert.equal(b.b.p.mana,a.b.p.mana);assert.ok(ev.some(e=>e.type==='actionStarted'));
 assert.equal(begin(a,{dodgeOnly:true}).some(e=>e.type==='roll-start'),false);
});
test('numeric skill windows preserve contact and protect the final fifth of startup',()=>{
 const f=fixture();begin(f,{attack:true});const a=f.b.p.action,t=skillTimeline(a);assert.ok(t.retargetWindows.every(row=>row.length===2&&row.every(Number.isFinite)));
 a.elapsed=a.contact*.79;assert.equal(skillCanDodgeCancel(a),true);a.elapsed=a.contact*.8;assert.equal(skillCanDodgeCancel(a),false);a.elapsed=a.contact;assert.equal(skillCanDodgeCancel(a),true);assert.equal(skillCanRetarget(a),false);
});
test('instant dodge consumes no world time, MP, STA, skill CD or generic invulnerability',()=>{
 const f=fixture(),before={hp:f.b.p.hp,mana:f.b.p.mana,stamina:f.b.p.stamina,cooldowns:{...f.b.p.cooldowns}};const ev=mobility(f);
 assert.equal(ev.filter(e=>e.type==='roll-start').length,1);assert.equal(f.b.time,0);assert.equal(f.b.poeMobility.snapshot().elapsed,0);assert.equal(f.b.p.invuln,0);assert.deepEqual({hp:f.b.p.hp,mana:f.b.p.mana,stamina:f.b.p.stamina,cooldowns:f.b.p.cooldowns},before);
});
test('actual router short dodge tap survives release and never becomes sprint',()=>{
 const f=fixture(),r=createInputRouter({captureAttackTap:true}),c=f.s.options.controls;r.down('Space',c);r.up('Space');const ev=begin(f,r.snapshot(c));assert.ok(ev.some(e=>e.type==='roll-start'));run(f,T.rollDuration+.1,{move:{x:1,y:0}});assert.equal(f.b.poeMobility.snapshot().state,'idle');
});
test('new roll beats basic held, cancels unfired contact, and resumes held basic after roll',()=>{
 const f=fixture();begin(f,{attack:true,attackHeld:true});const first=f.b.p.action,ev=mobility(f,'dodgeOnly',{attack:true,attackHeld:true});assert.equal(f.b.p.action,null);assert.equal(first.fired,false);assert.ok(ev.some(e=>e.type==='actionCancelled'&&!e.contactOccurred));
 const later=run(f,T.rollDuration,{attack:true,attackHeld:true});assert.equal(later.some(e=>e.type==='actionContact'&&e.castId===first.castId),false);assert.equal(f.b.p.action?.id,'mace_swing');assert.equal(f.b.p.action.elapsed,0);
});
test('cancel before hammer contact never creates a projectile and never refunds MP',()=>{
 const f=fixture();begin(f,{hammer:true});const mana=f.b.p.mana,cooldown=f.b.p.cooldowns.righteous_hammer;mobility(f);assert.equal(f.b.p.mana,mana);assert.equal(f.b.p.cooldowns.righteous_hammer,cooldown);run(f,.8);assert.equal(f.b.shots.length,0);assert.equal(f.b.p.action,null);
});
test('cancel after hammer contact preserves already spawned projectile',()=>{
 const f=fixture();begin(f,{hammer:true});run(f,f.b.p.action.contact);assert.equal(f.b.shots.length,1);const shot=f.b.shots[0],mana=f.b.p.mana;const ev=mobility(f);assert.equal(f.b.shots[0],shot);assert.equal(f.b.p.mana,mana);assert.ok(ev.some(e=>e.type==='actionCancelled'&&e.contactOccurred));run(f,.01);assert.ok(f.b.shots.includes(shot));
});
test('protected contact window rejects dodge without restarting or cancelling action',()=>{
 const f=fixture();begin(f,{attack:true});run(f,f.b.p.action.contact*.9);const a=f.b.p.action;const ev=mobility(f);assert.equal(f.b.p.action,a);assert.equal(f.b.poeMobility.snapshot().state,'idle');assert.ok(ev.some(e=>e.type==='mobilityRejected'&&e.reason==='skill-locked'));run(f,.1);assert.equal(a.fired,true);
});
test('shield charge retains authored motion and has no implicit roll-cancel window',()=>{
 const f=fixture();begin(f,{charge:true});const a=f.b.p.action;mobility(f);assert.equal(f.b.p.action,a);assert.equal(f.b.poeMobility.snapshot().state,'idle');
});
test('roll cannot restart with same edge, another dodge binding, or release/repress',()=>{
 const f=fixture();mobility(f);run(f,.1);const before=f.b.poeMobility.snapshot().elapsed;
 for(const action of ['dodgeOnly','dodgeSprint','sprint']){const ev=mobility(f,action);assert.equal(ev.some(e=>e.type==='roll-start'),false);near(f.b.poeMobility.snapshot().elapsed,before);}
});
for(const hz of [30,60,120])test(`${hz}Hz roll-to-sprint distance, exact boundary, release semantics`,()=>{
 const f=fixture();const x=f.b.p.x;mobility(f,'dodgeSprint');const ev=run(f,.8,{dodgeSprintHeld:true,move:{x:1,y:0}},hz);near(f.b.p.x-x,T.rollSpeed*T.rollDuration+f.b.stats.moveSpeed*T.sprintSpeedMultiplier*(.8-T.rollDuration));assert.equal(ev.filter(e=>e.type==='sprint-start').length,1);near(ev.find(e=>e.type==='sprint-start').time,T.rollDuration);
 tick(f,0,{move:{x:1,y:0}});assert.equal(f.b.poeMobility.snapshot().state,'idle');assert.equal(f.b.events.some(e=>e.type==='roll-start'),false);
});
test('roll-only never inherits held combined dodge into sprint',()=>{const f=fixture();mobility(f);run(f,.6,{dodgeSprintHeld:true,move:{x:1,y:0}});assert.equal(f.b.poeMobility.snapshot().state,'idle');});
test('keep-sprinting option survives combined release, stops with movement, and permits new roll',()=>{
 const f=fixture({keep:true});mobility(f,'dodgeSprint');run(f,.5,{dodgeSprintHeld:true,move:{x:1,y:0}});tick(f,.02,{move:{x:1,y:0}});assert.equal(f.b.poeMobility.snapshot().state,'sprint');assert.ok(mobility(f).some(e=>e.type==='roll-start'));run(f,.5);assert.equal(f.b.poeMobility.snapshot().state,'idle');
});
test('direct sprint requires actual press and stops on successful skill, not unavailable skill',()=>{
 const f=fixture();tick(f,0,{sprintHeld:true,move:{x:1,y:0}});assert.equal(f.b.poeMobility.snapshot().state,'idle');begin(f,{sprint:true,sprintHeld:true,move:{x:1,y:0}});assert.equal(f.b.poeMobility.snapshot().state,'sprint');f.b.p.cooldowns.righteous_hammer=2;begin(f,{hammer:true,sprintHeld:true,move:{x:1,y:0}});assert.equal(f.b.poeMobility.snapshot().state,'sprint');begin(f,{attack:true,sprintHeld:true,move:{x:1,y:0}});assert.equal(f.b.poeMobility.snapshot().state,'idle');assert.equal(f.b.p.action.id,'mace_swing');
});
test('move wins over aim for roll direction; no move uses the independent aim',()=>{
 const a=fixture(),b=fixture();mobility(a,'dodgeOnly',{move:{x:0,y:-1},aim:{x:1000,y:600}});near(a.b.poeMobility.snapshot().direction.y,-1);mobility(b,'dodgeOnly',{move:{x:0,y:0},aim:{x:600,y:1000}});near(b.b.poeMobility.snapshot().direction.y,1);
});
test('hammer movement is independent from aim and per-skill slowdown',()=>{
 const f=fixture();begin(f,{hammer:true,aim:{x:1000,y:600},heldActions:{hammer:true}});const y=f.b.p.y;tick(f,.05,{move:{x:0,y:-1},aim:{x:1000,y:600},heldActions:{hammer:true}});near(f.b.p.y-y,-f.b.stats.moveSpeed*.55*.05);near(f.b.p.action.angle,0);
});
for(const tracking of [false,true])test(`released aim tracking ${tracking} respects angle commit while walking`,()=>{
 const f=fixture({tracking});begin(f,{hammer:true,heldActions:{hammer:true},aim:{x:1000,y:600}});tick(f,.01,{heldActions:{hammer:false},aim:{x:1000,y:600}});const angle=f.b.p.action.angle;tick(f,.02,{move:{x:0,y:-1},aim:{x:600,y:1000}});
 if(tracking)assert.ok(f.b.p.action.angle>1);else near(f.b.p.action.angle,angle);
});
test('retargeting ends at contact even with tracking ON and input held',()=>{
 const f=fixture();begin(f,{hammer:true,heldActions:{hammer:true}});run(f,f.b.p.action.contact,{heldActions:{hammer:true}});const angle=f.b.p.action.angle;tick(f,.02,{heldActions:{hammer:true},aim:{x:600,y:1000}});near(f.b.p.action.angle,angle);
});
test('per-skill resolved aim is used instead of the common fallback point',()=>{
 const f=fixture();begin(f,{hammer:true,aimBySkill:{righteous_hammer:{aim:{x:600,y:1000},groundPoint:{x:800,y:800},targetId:null}}});near(f.b.p.action.angle,Math.PI/2);assert.deepEqual(f.b.p.action.poeAim.groundPoint,{x:800,y:800});
});
test('queued skill follows latest aim even after release with tracking OFF',()=>{
 const f=fixture({tracking:false});begin(f,{attack:true});run(f,.36);begin(f,{hammer:true,aim:{x:1000,y:600}});assert.equal(f.b.skillIntent.id,'righteous_hammer');run(f,.2,{aim:{x:600,y:1000}});assert.equal(f.b.p.action.id,'righteous_hammer');near(f.b.p.action.angle,Math.PI/2);
});
test('RMB hammer held repeats after CD without starving a newer explicit skill',()=>{
 const f=fixture();const ev=begin(f,{hammer:true,heldActions:{hammer:true}});ev.push(...run(f,2.1,{heldActions:{hammer:true}}));assert.ok(ev.filter(e=>e.type==='actionStarted'&&e.id==='righteous_hammer').length>=2);
 while(f.b.p.action)tick(f,.02);const e=begin(f,{charge:true,attack:true,heldActions:{attack:true,hammer:true}});assert.equal(f.b.p.action.id,'shield_charge');assert.ok(e.some(e=>e.type==='actionStarted'&&e.id==='shield_charge'));
});
for(const kind of ['cone','projectile'])test(`early roll evades ${kind} without generic invulnerability`,()=>{
 const f=fixture();mobility(f);if(kind==='cone')hostile(f);else projectile(f);const hp=f.b.p.hp,ev=tick(f,.01);assert.equal(f.b.p.hp,hp);assert.equal(f.b.p.invuln,0);assert.ok(ev.some(e=>e.type==='heroEvaded'));
});
for(const time of [T.evadeEnd,T.evadeEnd+.02])test(`roll does not evade melee at elapsed ${time}`,()=>{
 const f=fixture();mobility(f);run(f,time);hostile(f);const hp=f.b.p.hp;tick(f,.001);assert.ok(f.b.p.hp<hp);
});
test('circle/AoE hits during early roll',()=>{const f=fixture();mobility(f);hostile(f,'circle');const hp=f.b.p.hp;tick(f,.001);assert.ok(f.b.p.hp<hp);assert.equal(f.b.events.some(e=>e.type==='heroEvaded'),false);});
test('environmental DoT hits during early roll',()=>{const f=fixture();applyHeroStatus(f.b,'r11_burn');f.b.p.negativeStatuses.burn.nextTick=.001;mobility(f);const hp=f.b.p.hp;tick(f,.001);assert.ok(f.b.p.hp<hp);});
for(const grace of [true,false])test(`sprint hit keeps real damage and knockdown grace=${grace}`,()=>{
 const f=fixture();begin(f,{sprint:true,sprintHeld:true,move:{x:1,y:0}});if(!grace)run(f,T.sprintGrace+.01,{sprintHeld:true,move:{x:1,y:0}});hostile(f,'circle');const hp=f.b.p.hp;const ev=tick(f,.001,{sprintHeld:true,move:{x:1,y:0}});assert.ok(f.b.p.hp<hp);assert.equal(f.b.poeMobility.snapshot().state,grace?'sprint':'knockdown');assert.equal(ev.some(e=>e.type==='knockdown-start'),!grace);
});
test('stun blocks mobility and attack; it cannot be escaped by roll',()=>{const f=fixture();applyHeroStatus(f.b,'r11_stun');const ev=mobility(f);assert.equal(f.b.poeMobility.snapshot().state,'idle');assert.ok(ev.some(e=>e.type==='mobilityRejected'));begin(f,{attack:true});assert.equal(f.b.p.action,null);});
test('swept radius-11 wall collision blocks roll and permits axis slide',()=>{
 const f=fixture();f.b.map=mapFromRegion({w:10,h:10,rooms:[{x:1,y:1,w:4,h:8},{x:6,y:1,w:3,h:8}]});f.b.p.x=142;f.b.p.y=144;mobility(f,'dodgeOnly',{move:{x:1,y:1}});run(f,T.rollDuration);assert.ok(f.b.p.x<149);assert.ok(f.b.p.y>144);
});
for(const reason of ['menu','blur','region-change','rebind'])test(`${reason} safety clear preserves debt, drops held repeat, and forbids stale sprint`,()=>{
 const f=fixture();mobility(f,'dodgeSprint');run(f,.1,{dodgeSprintHeld:true,move:{x:1,y:0}});const debt=f.b.poeMobility.serializeRecoveryDebt();cancelBattleAction(f.b,reason);near(f.b.poeMobility.serializeRecoveryDebt(),debt);assert.equal(f.b.poeMobility.snapshot().evadeWindow,false);assert.equal(f.b.poeMobility.snapshot().state,'idle');run(f,.6,{sprintHeld:true,dodgeSprintHeld:true,attack:true,attackHeld:true,heldActions:{hammer:true},move:{x:1,y:0}});assert.equal(f.b.p.action,null);assert.equal(f.b.poeMobility.snapshot().state,'idle');
});
test('battleReport/state/store/reload conservatively restores scalar debt with no held, roll or immunity',()=>{
 const f=fixture();f.b.p.x=260;f.b.p.y=325;mobility(f);run(f,.1);const report=battleReport(f.b);near(report.recovery.lock,T.rollDuration-.1);assert.equal(validateRecovery(report.recovery),true);const r=reduceRuntime(f.s,{type:'checkpoint',...report});assert.equal(r.ok,true);assert.equal(validateState(r.state).ok,true);
 const data=new Map(),store=createStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},{profile:'qa-poe2-mobility'});assert.equal(store.save(r.state,{expectedRevision:0}).ok,true);const s=store.load().state,b=createBattle(s),g={s,b};assert.equal(b.poeMobility.snapshot().state,'idle');assert.equal(b.poeMobility.snapshot().evadeWindow,false);assert.deepEqual(b.poeMobility.snapshot().held,{dodgeOnly:false,dodgeSprint:false,sprint:false});const x=b.p.x,y=b.p.y;begin(g,{attack:true,dodgeOnly:true});run(g,.2,{move:{x:1,y:0},attack:true});assert.equal(b.p.action,null);near(b.p.x,x);near(b.p.y,y);run(g,.13);begin(g,{attack:true});assert.equal(b.p.action.id,'mace_swing');
});
test('report max merges original action debt rather than adding mobility debt',()=>{const f=fixture();begin(f,{hammer:true});const duration=f.b.p.action.duration;f.b.poeMobility.restoreRecoveryDebt(.2);near(battleReport(f.b).recovery.lock,duration);});
test('presentation metadata follows start, elapsed state and safety clear',()=>{const f=fixture();mobility(f);assert.equal(f.b.p.presentationPose.state,'roll');run(f,.1);near(f.b.p.presentationPose.elapsed,.1);assert.equal(f.b.p.presentationPose.evadeWindow,true);clearPoeInput(f.b);assert.equal(f.b.p.presentationPose.state,'idle');assert.equal(f.b.p.presentationPose.blocksSkills,true);});

for(const hz of [30,60,120])test(`${hz}Hz policy/contact splits integrate hammer movement exactly`,()=>{
 const f=fixture();begin(f,{hammer:true});const {contact,duration}=f.b.p.action,y=f.b.p.y;const ev=run(f,.7,{move:{x:0,y:-1}},hz);near(f.b.p.y-y,-f.b.stats.moveSpeed*(contact*.55+(duration-contact)*.8+(.7-duration)));const hits=ev.filter(e=>e.type==='actionContact');assert.equal(hits.length,1);near(hits[0].elapsed,contact);
});
for(const hz of [30,60,120])test(`${hz}Hz shared hitstop clock keeps roll elapsed and distance invariant`,()=>{
 const f=fixture();mobility(f);f.b.hitstop=.055;const x=f.b.p.x;run(f,.2,{},hz);const elapsed=.055*.35+.145;near(f.b.poeMobility.snapshot().elapsed,elapsed);near(f.b.p.x-x,T.rollSpeed*elapsed);
});
for(const hz of [30,60,120])for(const at of [.179,.18,.181])test(`${hz}Hz melee release at ${at}s uses the precise half-open evade boundary`,()=>{
 const f=fixture();mobility(f);hostile(f,'cone',at);const hp=f.b.p.hp,ev=run(f,.2,{},hz);assert.equal(ev.some(e=>e.type==='heroEvaded'),at<T.evadeEnd);assert.equal(f.b.p.hp<hp,at>=T.evadeEnd);
});
test('captured keyup aim wins over a newer pointer when tracking OFF',()=>{
 const f=fixture({tracking:false});begin(f,{hammer:true,heldActions:{hammer:true}});const released={aim:{x:600,y:1000},groundPoint:{x:600,y:1000}};begin(f,{heldActions:{hammer:false},aim:{x:1000,y:600},releasedAimBySkill:{righteous_hammer:released}});near(f.b.p.action.angle,Math.PI/2);tick(f,.03,{move:{x:1,y:0},aim:{x:1000,y:600}});near(f.b.p.action.angle,Math.PI/2);
});
test('busy-save released tap starts at captured keyup aim with zero world time',()=>{
 const f=fixture({tracking:false});begin(f,{hammer:true,heldActions:{hammer:false},releasedAimBySkill:{righteous_hammer:{aim:{x:600,y:1000},groundPoint:{x:600,y:1000}}}});assert.equal(f.b.time,0);near(f.b.p.action.angle,Math.PI/2);tick(f,.01);near(f.b.p.action.angle,Math.PI/2);
});
test('click waypoint distance is recomputed on each policy boundary without overshoot',()=>{
 const f=fixture({mode:'click'});begin(f,{hammer:true});run(f,f.b.p.action.contact-.01);const x=f.b.p.x,target={x:x+3,y:f.b.p.y};tick(f,.05,{move:{x:1,y:0},moveTarget:target,moveDistance:3});near(f.b.p.x,target.x);
});
test('waypoint clamp applies to sprint but not the independent fixed roll displacement',()=>{
 const f=fixture(),x=f.b.p.x;begin(f,{sprint:true,sprintHeld:true,move:{x:1,y:0}});tick(f,.05,{sprintHeld:true,move:{x:1,y:0},moveTarget:{x:x+3,y:600}});near(f.b.p.x,x+3);mobility(f,'dodgeOnly',{moveTarget:{x:x+4,y:600}});run(f,.1,{moveTarget:{x:x+4,y:600}});assert.ok(f.b.p.x>x+20);
});
test('dead roll clears mobility intent and stale held attack cannot revive it',()=>{
 const f=fixture();f.b.p.hp=1;mobility(f);hostile(f,'circle');tick(f,.001);assert.equal(f.b.dead,true);assert.equal(f.b.poeMobility.snapshot().state,'idle');assert.equal(f.b.poeMobility.snapshot().evadeWindow,false);assert.deepEqual(begin(f,{attack:true,dodgeOnly:true}),[]);
});
for(const hz of [30,60,120])for(const at of [.179,.18,.181])test(`${hz}Hz swept projectile at ${at}s uses the actual moving-hero contact boundary`,()=>{
 const f=fixture();mobility(f);f.b.shots.push({kind:'arrow',enemy:true,x:f.b.p.x+15+(310+240)*at,y:f.b.p.y,vx:-240,vy:0,damage:10,damageType:'fire',life:1,attackId:101});const hp=f.b.p.hp,ev=run(f,.2,{},hz);assert.equal(ev.some(e=>e.type==='heroEvaded'),at<T.evadeEnd);assert.equal(f.b.p.hp<hp,at>=T.evadeEnd);
});
test('settings commit enables, reconfigures and disables POE without rebuilding or forgiving debt',()=>{
 const f=fixture({poe:false}),hero=f.b.p,enemies=f.b.enemies,controls=poeControlPreset(f.s.options.controls);configurePoeControls(f.b,controls);assert.equal(f.b.p,hero);assert.equal(f.b.enemies,enemies);assert.ok(f.b.poeMobility);mobility(f);run(f,.1);const debt=f.b.poeMobility.serializeRecoveryDebt();controls.poe.keepSprintingWhileMoving=true;configurePoeControls(f.b,controls);assert.equal(f.b.poeMobility.snapshot().keepSprintingWhileMoving,true);near(f.b.poeMobility.serializeRecoveryDebt(),debt);assert.equal(f.b.poeMobility.snapshot().state,'idle');configurePoeControls(f.b,controls.priorControls);assert.equal(f.b.poeMobility,undefined);near(f.b.p.recoveryLock,debt);assert.equal(f.b.p,hero);
});
test('new physical attack edge after safety clear rearms without requiring a blank render frame',()=>{const f=fixture();clearPoeInput(f.b,'blur');begin(f,{attack:true,attackHeld:true,attackPressed:true});assert.equal(f.b.p.action.id,'mace_swing');});
test('cleared settings cannot revive stale held hammer or sprint',()=>{const f=fixture();configurePoeControls(f.b,f.s.options.controls);run(f,.2,{heldActions:{hammer:true},sprintHeld:true,move:{x:1,y:0}});assert.equal(f.b.p.action,null);assert.equal(f.b.poeMobility.snapshot().state,'idle');});
test('dead target metadata is removed without snapping committed aim to a replacement',()=>{
 const f=fixture({tracking:false}),e={id:'aim-target',kind:'scout',x:650,y:600,hp:100,max:100,active:true,stun:10,state:'idle',timer:10};f.b.enemies=[e];begin(f,{hammer:true,heldActions:{hammer:true},aimBySkill:{righteous_hammer:{aim:{x:1000,y:600},groundPoint:{x:1000,y:600},targetId:e.id}}});begin(f,{heldActions:{hammer:false}});const angle=f.b.p.action.angle;e.hp=0;tick(f,.01,{aim:{x:600,y:1000}});assert.equal(f.b.p.action.poeAim.targetId,null);near(f.b.p.action.angle,angle);
});
function expertFixture(){
 let s=earnedTombRoute('normal');let r=reduceRuntime(s,{type:'promoteExpert',position:{x:260,y:325},life:s.world.life,vitals:s.vitals,recovery:s.recovery,expectedRevision:1,expectedGoldCost:120},{revision:1});assert.equal(r.ok,true);s=r.state;
 for(const skillId of ['zealous_onslaught','zealous_lance']){r=reduceRuntime(s,{type:'purchaseSkill',skillId,position:{x:260,y:325}});assert.equal(r.ok,true);s=r.state;}
 s=reduceRuntime(s,{type:'setControls',controls:poeControlPreset(s.options.controls)}).state;const b=createBattle(s);b.map=mapFromRegion({w:80,h:80});b.p.x=600;b.p.y=600;b.enemies=[];return {s,b};
}
test('channel retarget uses its timed window; roll cancel ends payments with no release Lance or refund',()=>{
 const f=expertFixture(),channel={held:true,ownerToken:'poe-owner'};begin(f,{expert1:'zealous_onslaught',channel});const action=f.b.p.action;assert.equal(action.id,'zealous_onslaught');run(f,action.spec.duration+.3,{channel});assert.ok(action.pulses>=1);tick(f,.01,{channel,aim:{x:f.b.p.x,y:f.b.p.y+100}});near(action.angle,Math.PI/2);const stamina=f.b.p.stamina,ev=mobility(f,'dodgeOnly',{channel});assert.equal(f.b.p.action,null);assert.equal(f.b.p.stamina,stamina);assert.ok(ev.some(e=>e.type==='channelEnded'&&e.reason==='dodge'));assert.equal(ev.some(e=>e.type==='lanceResolved'),false);const later=run(f,.5,{attack:true,attackHeld:true});assert.equal(later.some(e=>e.type==='channelPayment'),false);assert.equal(f.b.p.action?.id,'mace_swing');
});
for(const hz of [30,60,120])for(const at of [.119,.12,.121])test(`${hz}Hz sprint grace boundary ${at}s preserves damage and correct knockdown`,()=>{
 const f=fixture();begin(f,{sprint:true,sprintHeld:true,move:{x:1,y:0}});hostile(f,'circle',at);const hp=f.b.p.hp,ev=run(f,.14,{sprintHeld:true,move:{x:1,y:0}},hz);assert.ok(f.b.p.hp<hp);assert.equal(ev.some(e=>e.type==='knockdown-start'),at>=T.sprintGrace);
});
for(const hz of [30,60,120])test(`${hz}Hz restored lock admits new attack exactly when debt ends`,()=>{
 const f=fixture();f.s.recovery=battleReport(f.b).recovery;f.s.recovery.lock=.32;f.b=createBattle(f.s);const x=f.b.p.x;run(f,.32,{move:{x:1,y:0}},hz);near(f.b.p.x,x);begin(f,{attack:true});assert.equal(f.b.p.action?.id,'mace_swing');
});
test('sprint applies existing slow and follows current derived walking speed',()=>{
 const f=fixture();applyHeroStatus(f.b,'r11_slow');begin(f,{sprint:true,sprintHeld:true,move:{x:1,y:0}});const x=f.b.p.x;run(f,.1,{sprintHeld:true,move:{x:1,y:0}});near(f.b.p.x-x,f.b.stats.moveSpeed*T.sprintSpeedMultiplier*.6*.1);
 const before=f.b.p.x;f.b.stats.moveSpeed+=6;tick(f,.01,{sprintHeld:true,move:{x:1,y:0}});near(f.b.p.x-before,(f.b.stats.moveSpeed+6)*T.sprintSpeedMultiplier*.6*.01);
});
test('immediate action start publishes skill presentation metadata without advancing time',()=>{const f=fixture();begin(f,{hammer:true});assert.equal(f.b.p.presentationPose.skillId,'righteous_hammer');assert.equal(f.b.p.presentationPose.skillElapsed,0);assert.equal(f.b.p.presentationPose.skillContact,f.b.p.action.contact);});
test('committed full recovery reset clears mobility debt and pose without resurrecting held keys',()=>{const f=fixture();mobility(f,'dodgeSprint');run(f,.1,{dodgeSprintHeld:true,move:{x:1,y:0}});f.b.p.action=null;f.b.p.recoveryLock=0;resetPoeMobility(f.b,'rest');assert.equal(f.b.poeMobility.serializeRecoveryDebt(),0);assert.equal(f.b.p.presentationPose.blocksSkills,false);assert.equal(f.b.p.presentationPose.evadeWindow,false);run(f,.5,{dodgeSprintHeld:true,sprintHeld:true,heldActions:{hammer:true}});assert.equal(f.b.poeMobility.snapshot().state,'idle');assert.equal(f.b.p.action,null);});
for(const sprint of [false,true])for(const hz of [30,60,120])test(`${hz}Hz ${sprint?'sprint':'walk'} accumulates actual-distance gait and one sound per foot contact`,()=>{
 const f=fixture(),phase=f.b.p.walkPhase,x=f.b.p.x,input={move:{x:1,y:0},sprintHeld:sprint};if(sprint)begin(f,{...input,sprint:true});const ev=run(f,.61,input,hz),distance=f.b.p.x-x,cycles=distance/RUN_GAIT.distance,contacts=Math.floor((phase+cycles+1e-10)*2)-Math.floor((phase+1e-10)*2);near(f.b.p.walkPhase,(phase+cycles)%1);assert.equal(ev.filter(e=>e.type==='sound'&&e.name==='footstep').length,contacts);assert.ok(contacts>0);
});
test('skill recovery walking retains attack gait phase and emits no footstep',()=>{
 const f=fixture();begin(f,{attack:true});run(f,f.b.p.action.contact);const phase=f.b.p.walkPhase,x=f.b.p.x,ev=run(f,.1,{move:{x:1,y:0}});assert.ok(f.b.p.x>x);near(f.b.p.walkPhase,phase);assert.equal(ev.some(e=>e.type==='sound'&&e.name==='footstep'),false);assert.equal(f.b.p.action.id,'mace_swing');
});
test('wall-blocked walk and sprint leave gait phase and footstep count unchanged',()=>{
 for(const sprint of [false,true]){const f=fixture();f.b.map=mapFromRegion({w:10,h:10,rooms:[{x:1,y:1,w:4,h:8}]});f.b.p.x=148.999999;f.b.p.y=144;const input={move:{x:1,y:0},sprintHeld:sprint};if(sprint)begin(f,{...input,sprint:true});const ev=run(f,.2,input);near(f.b.p.walkPhase,0);assert.equal(ev.some(e=>e.type==='sound'&&e.name==='footstep'),false);}
});
