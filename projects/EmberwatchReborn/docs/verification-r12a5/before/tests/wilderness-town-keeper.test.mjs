import {wildernessSceneVisibility} from '../src/wilderness-scene-visibility.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import vm from 'node:vm';
import {getRegion,createMap,FOES,near} from '../src/world.js';
import {inMap,lineOfSight,traceSegment,findPathStep} from '../src/world-geometry.js';
import {createBattle,stepBattle,clearBattleIntent} from '../src/combat.js';
import {battleReport} from '../src/recovery.js';
import {reduceRuntime} from '../src/state.js';
import {selectInteractionTarget} from '../src/interaction-target.js';
import {battlefieldPortalLabel} from '../src/battlefield-presentation.js';
import {tombPortalLabel} from '../src/tomb-presentation.js';
import {wildernessObjectView,wildernessPortalView} from '../src/wilderness-presentation.js';
import {WILDERNESS_REGION,WILDERNESS_LINKS,WILDERNESS_FOES,WILDERNESS_GROUPS,WILDERNESS_REWARDS} from '../src/wilderness-content.js';
import {BATTLEFIELD_FOES} from '../src/battlefield-content.js';
import {ART} from '../src/art.js';
import {projectWorld,screenMovement,ISO} from '../src/visual.js';
import {stages,wTravel,copyRuntime} from './support/earned-wilderness-route.mjs';

// Production movement/selection/combat with a scripted command-earned route.
// Earlier victories are settlement fixtures, not AI wins or ordinary-input play.
// Keeper setup changes only the hero's arena position; selected interruption
// cases explicitly inject enemy debuffs. No combat handler is replaced.
const cached=new Map();
function route(difficulty='normal'){if(!cached.has(difficulty))cached.set(difficulty,stages(difficulty));return copyRuntime(cached.get(difficulty));}
const town=getRegion('ash_hamlet'),map=createMap(town.id),links=WILDERNESS_LINKS.ash_hamlet;
const legacy=town.portals.filter(p=>!p.id.startsWith('town-wilderness-'));
const oldCandidates=[...town.npcs.map(p=>({...p,kind:'npc'})),...legacy.map(p=>({...p,kind:'portal'}))];
const point=o=>({x:o.x,y:o.y}),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const selectors=main.slice(main.indexOf('function wildernessView('),main.indexOf('function interact(){'));
assert.ok(selectors.includes('function nearest(){'));
const labels=main.split('\n').find(line=>line.startsWith('function drawLabels('));
function townRuntime(s){
 const calls=[],ctx={save(){},restore(){},fillRect(...args){calls.push({type:'rect',args});},fillText(...args){calls.push({type:'text',args});}};
 const context={wildernessSceneVisibility,state:s,battle:createBattle(s),getRegion,selectInteractionTarget,battlefieldPortalLabel,tombPortalLabel,wildernessObjectView,wildernessPortalView,near,projectWorld,ISO,ctx,canvas:{width:1200,height:900}};
 vm.createContext(context);vm.runInContext(selectors+'\n'+labels,context);
 return {context,calls,select(position){Object.assign(context.battle.p,position);return context.nearest();}};
}
function townStages(){const a=route();return [['before',a.before],['accepted/anchor locked',a.accepted],['anchor unlocked',wTravel(a.anchor,'wilderness-anchor-return')],['reported',a.finished]];}
const baseline=position=>selectInteractionTarget({position,map,candidates:oldCandidates,regionId:town.id,objectives:{}});
function moveTo(b,character,target,{reach=1,limit=1200}={}){
 for(let n=0;n<limit&&distance(b.p,target)>reach;n++){
  const previous=point(b.p),d=distance(b.p,target),dt=Math.min(.02,d/(b.stats.moveSpeed||100));
  stepBattle(b,character,dt,{move:{x:target.x-b.p.x,y:target.y-b.p.y}});
  assert.ok(inMap(b.map,b.p.x,b.p.y,11));assert.equal(traceSegment(b.map,previous,b.p,11).blocked,false);
 }
 assert.ok(distance(b.p,target)<=reach,'real movement reaches its target without teleporting');
}

test('W-only town endpoints retain every old coordinate, floor and physical arch base',()=>{
 assert.deepEqual(links.map(point),[{x:80,y:168},{x:240,y:208}]);
 assert.deepEqual(legacy.map(p=>[p.id,p.x,p.y]),[['town-sluice-lift',545,480],['town-quarry-entry',620,300],['town-quarry-lift',620,560],['town-pass-entry',112,320],['town-pass-shortcut',112,544],['town-signal-entry',112,448],['town-signal-shortcut',112,592],['town-furnace-entry',352,560],['town-furnace-shortcut',528,560],['town-tomb-entry',624,112],['town-tomb-shortcut',464,112],['town-battlefield-entry',304,104],['road',590,375]]);
 assert.deepEqual(town.npcs.map(p=>[p.id,p.x,p.y]),[['trainer',260,325],['elder',450,325],['healer',350,250],['blacksmith',250,470],['workshop',430,480]]);
 assert.deepEqual(town.spawn,{x:350,y:420});assert.deepEqual(town.objects,[{id:'townfire',type:'torch',x:360,y:345}]);assert.deepEqual(map.rooms,[{x:1,y:1,w:21,h:18,index:0}]);
 assert.ok(distance(...links)>152,'the two W reach circles are disjoint');
 for(const p of links){assert.ok(inMap(map,p.x,p.y,11));assert.ok(findPathStep(map,town.spawn,p));for(const x of [-55,55]){const offset=screenMovement(x,0);assert.ok(inMap(map,p.x+offset.x,p.y+offset.y,11),'110-unit projected arch base plus player clearance fits floor');}}
 const anchor=links[1],overlaps=oldCandidates.filter(p=>distance(anchor,p)<152).map(p=>p.id).sort();
 assert.deepEqual(overlaps,['healer','town-battlefield-entry','trainer'],'remaining outer reach overlaps are explicit');
 for(const p of oldCandidates)assert.ok(distance(anchor,p)>2*48,'all old inner48 zones remain owned');
});

for(const [name,index]of [['unaccepted',0],['accepted locked',1],['anchored',2],['reported',3]])test(`real main nearest and labels preserve legacy targets with W ${name}`,()=>{
 const [,s]=townStages()[index],h=townRuntime(s);
 for(const p of oldCandidates){assert.equal(h.select(p)?.id,p.id);for(let n=0;n<24;n++)for(const radius of [24,48]){const angle=n*Math.PI/12,q={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};if(!inMap(map,q.x,q.y,11))continue;assert.equal(h.select(q)?.id,baseline(q)?.id,`${name}: ${p.id} inner ${radius}`);}}
 for(const p of links){assert.equal(h.select(p)?.id,index===0?undefined:p.id);assert.equal(wildernessPortalView(s,p).allowed,index>0&&(p===links[0]||index>1));}
 h.context.drawLabels();for(const p of links)assert.equal(h.calls.some(c=>c.type==='text'&&c.args[0]===p.name),index>0,'actual label visibility matches actual selection');
});

test('accepted W selection is deterministic at the remaining outer-circle overlap and unique throughout its own inner48',()=>{
 const h=townRuntime(route().accepted),all=[...oldCandidates,...links.map(p=>({...p,kind:'portal'}))];
 for(const p of links)for(let n=0;n<48;n++)for(const radius of [0,24,48]){const angle=n*Math.PI/24,q={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};if(inMap(map,q.x,q.y,11))assert.equal(h.select(q)?.id,p.id);}
 let shared=0;for(let y=136;y<=296;y+=4)for(let x=160;x<=328;x+=4){const q={x,y};if(!inMap(map,x,y,11))continue;const reachable=all.filter(p=>near(q,p)&&lineOfSight(map,q,p));if(!reachable.some(p=>p.id===links[1].id)||reachable.length<2)continue;shared++;reachable.sort((a,b)=>distance(q,a)-distance(q,b));assert.equal(h.select(q)?.id,reachable[0].id);}
 assert.ok(shared>50,'test actually covers overlapping legacy/W circles');
 for(let n=0;n<48;n++){const angle=n*Math.PI/24,q={x:links[0].x+Math.cos(angle)*75.99,y:links[0].y+Math.sin(angle)*75.99};if(inMap(map,q.x,q.y,11))assert.equal(h.select(q)?.id,links[0].id);}
});

test('real stepBattle town movement reaches either W endpoint from each legacy center without altered collision',()=>{
 const s=route().accepted;
 for(const start of [town.spawn,...oldCandidates])for(const p of links){const b=createBattle(s);Object.assign(b.p,start);moveTo(b,s.character,p,{reach:40});const h=townRuntime(s);h.context.battle=b;assert.equal(h.context.nearest()?.id,p.id);}
});

for(const [name,stage,returnId,entryId,arrival]of [['ordinary','entered','wilderness-town-return','town-wilderness-entry',{x:80,y:208}],['anchor','anchor','wilderness-anchor-return','town-wilderness-anchor',{x:240,y:248}]])test(`actual main F ${name} roundtrip returns inside its own nearest zone and immediately re-enters the same route`,()=>{
 const h=townRuntime(route()[stage]),c=h.context;let revision=0,result=null;
 Object.assign(c,{paused:false,busy:false,clearBattleIntent,battleReport,controller:{capture:()=>({state:c.state,revision})},toast:message=>assert.fail(message),keyName:()=> 'F',showNpc:id=>assert.fail('Unexpected NPC '+id),showWilderness:id=>assert.fail('Unexpected W object '+id),dispatch(command){result=reduceRuntime(c.state,structuredClone(command),{revision});assert.equal(result.ok,true,JSON.stringify(result));revision++;c.state=result.state;c.battle=createBattle(result.state);}});
 vm.runInContext(main.slice(main.indexOf('function report(){'),main.indexOf('function syncVitals('))+'\n'+main.split('\n').find(line=>line.startsWith('function interact(){')),c);
 const portal=getRegion(WILDERNESS_REGION).portals.find(p=>p.id===returnId),entry=links.find(p=>p.id===entryId);assert.deepEqual(portal.arrival,arrival);assert.ok(inMap(map,arrival.x,arrival.y,11));
 moveTo(c.battle,c.state.character,portal,{reach:40});assert.equal(c.nearest()?.id,returnId);
 const earned={xp:c.state.stats.earnedXp,gold:c.state.gold,receipts:[...c.state.world.claimedRewards]};
 for(let n=0;n<2;n++){const before=battleReport(c.battle);c.interact();assert.equal(c.state.world.region,town.id);assert.deepEqual(c.state.world.position,arrival);assert.deepEqual(c.state.vitals,before.vitals);assert.deepEqual(c.state.recovery,before.recovery);assert.equal(c.nearest()?.id,entryId);c.interact();assert.equal(c.state.world.region,WILDERNESS_REGION);assert.deepEqual(c.state.world.position,entry.arrival);assert.equal(c.nearest()?.id,returnId);assert.deepEqual(c.state.vitals,before.vitals);assert.deepEqual(c.state.recovery,before.recovery);}
 assert.deepEqual({xp:c.state.stats.earnedXp,gold:c.state.gold,receipts:[...c.state.world.claimedRewards]},earned);
});

function spriteBounds(o,key,width){const s=ART.environment.sprites[key],k=width/s.w,q=projectWorld(o.x,o.y);return {left:(q.x-s.ax*k)*ISO.zoom,right:(q.x+(s.w-s.ax)*k)*ISO.zoom,top:(q.y-s.ay*k)*ISO.zoom,bottom:(q.y+(s.h-s.ay)*k)*ISO.zoom};}
const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
function labelBounds(o){const q=projectWorld(o.x,o.y);return {left:q.x*ISO.zoom-60,right:q.x*ISO.zoom+60,top:q.y*ISO.zoom-74,bottom:q.y*ISO.zoom-53};}
// Read the actual bundled WOFF advances, rather than assuming Korean glyphs
// fit by character count. Browser shaping/fallback and screen QA remain open.
function textWidth(text){
 const bytes=readFileSync(new URL('../src/assets/fonts/EmberwatchKorean-Regular.woff',import.meta.url)),tables={};
 for(let i=0;i<bytes.readUInt16BE(12);i++){const n=44+i*20,key=bytes.toString('ascii',n,n+4),offset=bytes.readUInt32BE(n+4),length=bytes.readUInt32BE(n+8),raw=bytes.subarray(offset,offset+length);tables[key]=length<bytes.readUInt32BE(n+12)?inflateSync(raw):raw;}
 const cmap=tables.cmap;let format4;
 for(let i=0;i<cmap.readUInt16BE(2);i++){const offset=cmap.readUInt32BE(4+i*8+4);if(cmap.readUInt16BE(offset)===4){format4=cmap.subarray(offset);break;}}
 assert.ok(format4);const count=format4.readUInt16BE(6)/2,end=14,start=end+count*2+2,delta=start+count*2,ranges=delta+count*2,hmetrics=tables.hhea.readUInt16BE(34);
 const glyph=code=>{for(let i=0;i<count;i++)if(code>=format4.readUInt16BE(start+i*2)&&code<=format4.readUInt16BE(end+i*2)){const d=format4.readInt16BE(delta+i*2),range=format4.readUInt16BE(ranges+i*2);if(!range)return (code+d)&65535;const g=format4.readUInt16BE(ranges+i*2+range+2*(code-format4.readUInt16BE(start+i*2)));return g?(g+d)&65535:0;}return 0;};
 return [...text].reduce((sum,c)=>{const g=glyph(c.codePointAt(0));assert.ok(g,'label glyph is in bundled font');return sum+tables.hmtx.readUInt16BE(Math.min(g,hmetrics-1)*4);},0)*12/tables.head.readUInt16BE(18);
}

test('actual atlas/projected arch and short-label bounds do not cover legacy targets or each other',()=>{
 const others=[...legacy.map(p=>[p,'arch',110]),...town.npcs.map(p=>[p,'statue',44]),[town.objects[0],'brazier',28],[{id:'seed-statue',x:80,y:80},'statue',44],[{id:'seed-pillar',x:656,y:80},'pillar',48]];
 const h=townRuntime(route().accepted),focus=projectWorld(h.context.battle.p.x,h.context.battle.p.y),offset={x:600-focus.x*ISO.zoom,y:495-focus.y*ISO.zoom};h.context.drawLabels();
 for(const p of links){const arch=spriteBounds(p,'arch',110),label=labelBounds(p);assert.ok(textWidth(p.name)<=120);for(const [other,key,width]of [...others,...links.filter(x=>x!==p).map(x=>[x,'arch',110])]){assert.equal(intersects(arch,spriteBounds(other,key,width)),false,`${p.id} arch covers ${other.id}`);assert.equal(intersects(label,spriteBounds(other,key,width)),false,`${p.id} label covers ${other.id}`);}for(const old of [...oldCandidates,...links.filter(x=>x!==p)])assert.equal(intersects(label,labelBounds(old)),false,`${p.id} label overlaps ${old.id}`);
  const textIndex=h.calls.findIndex(c=>c.type==='text'&&c.args[0]===p.name),rect=h.calls[textIndex-1];assert.equal(rect.type,'rect');const expected=[label.left+offset.x,label.top+offset.y,120,21];rect.args.forEach((n,i)=>assert.ok(Math.abs(n-expected[i])<1e-8,'bounds follow the real main drawLabels coordinates'));
 }
 assert.ok(Math.abs(textWidth(links[0].name)-71.616)<1e-8);assert.ok(Math.abs(textWidth(links[1].name)-57.888)<1e-8);
});

function keeper(difficulty='normal'){const s=route(difficulty).approach;s.world.position={x:720,y:304};const b=createBattle(s);b.awaitingAdvance=false;return {s,b,e:b.enemies.find(e=>e.id===WILDERNESS_GROUPS.boss[0])};}
const tick=(f,input={},dt=.02)=>stepBattle(f.b,f.s.character,dt,input);
function until(f,predicate,{input={},limit=600}={}){const events=[];for(let n=0;!predicate()&&n<limit;n++)events.push(...tick(f,input));assert.ok(predicate(),'bounded real combat condition reached');return events;}
function release(f){return until(f,()=>f.e.state!=='windup');}
const hits=events=>events.filter(e=>e.type==='heroHurt');

test('every staged inactive W foe is physically unreachable and has no reachable-floor LOS until its real gate',()=>{
 const a=route(),region=getRegion(WILDERNESS_REGION),key=p=>`${Math.floor(p.x/32)},${Math.floor(p.y/32)}`;
 for(const stage of ['accepted','entered','survey','anchor','calibrated','chosen','routed','approach','boss','evidence']){
  const s=a[stage],floor=createMap(WILDERNESS_REGION,s),start={x:Math.floor(region.spawn.x/32)*32+16,y:Math.floor(region.spawn.y/32)*32+16},reachable=[start],seen=new Set([key(start)]);
  for(let n=0;n<reachable.length;n++)for(const [dx,dy]of [[32,0],[-32,0],[0,32],[0,-32]]){const p={x:reachable[n].x+dx,y:reachable[n].y+dy},id=key(p);if(!seen.has(id)&&inMap(floor,p.x,p.y,11)&&!traceSegment(floor,reachable[n],p,11).blocked){seen.add(id);reachable.push(p);}}
  const inactive=region.foes.filter(e=>!(s.world.objectives[e.gate]>=1));if(stage!=='evidence')assert.ok(inactive.length>0,stage+' exercises locked foes');
  for(const e of inactive){assert.equal(seen.has(key(e)),false,`${stage}: ${e.id} reachable`);assert.equal(findPathStep(floor,region.spawn,e),null,`${stage}: ${e.id} path`);for(const p of reachable)assert.equal(lineOfSight(floor,p,e),false,`${stage}: ${e.id} visible from ${key(p)}`);}
  // All currently activated positions join the same legal floor; no gate is
  // visually advertised as open while leaving a mandatory enemy unreachable.
  for(const e of region.foes.filter(e=>s.world.objectives[e.gate]>=1))assert.ok(seen.has(key(e)),`${stage}: active ${e.id} remains blocked`);
 }
});

test('registered W keeper owns authored patterns and unchanged health/body/rewards, with radial retreat in its actual arena',()=>{
 const f=WILDERNESS_FOES.wilderness_keeper,old=BATTLEFIELD_FOES.battlefield_usurper;
 assert.equal(FOES.wilderness_keeper,f);assert.deepEqual([f.hp,f.armor,f.speed],[old.hp,old.armor,old.speed]);assert.deepEqual([f.hp,f.armor,f.speed],[200,6,42]);assert.equal(f.battlefieldRoleMovement,undefined);
 assert.deepEqual(f.patterns,[{id:'wilderness-keeper-fireline',shape:'line',range:240,width:18,speed:200,travelRange:320,damage:13,damageType:'fire',attackFamily:'spell',statusRuleIds:['r11_burn'],windup:1.15,recovery:.9},{id:'wilderness-keeper-burst',shape:'circle',range:72,radius:72,damage:12,damageType:'physical',attackFamily:'weapon',statusRuleIds:[],windup:1.2,recovery:1.65}]);
 assert.equal(f.xp,280);assert.equal(f.gold,40);assert.equal(Object.values(WILDERNESS_REWARDS).reduce((n,r)=>n+r.xp,0),1000);
 for(const difficulty of ['normal','hard']){const b=keeper(difficulty).b,e=b.enemies.find(e=>e.kind==='wilderness_keeper');assert.equal(e.hp,200*b.difficulty.enemyHealth);assert.equal(e.type,'boss');for(const [dx,dy]of [[96,0],[-96,0],[0,96],[0,-96]]){const p={x:e.x+dx,y:e.y+dy};assert.ok(inMap(b.map,p.x,p.y,11));assert.equal(traceSegment(b.map,e,p,11).blocked,false);assert.ok(distance(e,p)>72+8);}}
});

test('keeper line aim and origin stay committed while real lateral movement avoids its delayed projectile',()=>{
 const f=keeper();tick(f);assert.equal(f.e.state,'windup');assert.equal(f.e.attackSpec.id,'wilderness-keeper-fireline');const home=point(f.e),tell=structuredClone(f.e.telegraph.shapes),hp=f.b.p.hp;
 moveTo(f.b,f.s.character,{x:800,y:304});assert.equal(f.e.state,'windup');assert.deepEqual(f.e.telegraph.shapes,tell);assert.deepEqual(point(f.e),home);
 const events=release(f);assert.equal(hits(events).length,0);assert.equal(f.b.p.hp,hp);assert.equal(f.b.shots.length,1);const shot=f.b.shots[0];assert.deepEqual([shot.damage,shot.damageType,shot.attackFamily,shot.originSkillId],[13,'fire','spell','wilderness-keeper-fireline']);assert.ok(Math.abs(shot.vx)<1e-8);assert.equal(shot.vy,200);
 assert.ok(shot.life<=1.6&&shot.life>1.55);const later=until(f,()=>!f.b.shots.length);assert.equal(hits(later).length,0);assert.equal(f.b.p.hp,hp);assert.equal(f.e.roleMovement,undefined);
});

test('stationary hero receives keeper line damage and burn only when the real shot arrives',()=>{
 const f=keeper(),hp=f.b.p.hp;tick(f);const before=release(f);assert.equal(hits(before).length,0);assert.equal(f.b.p.hp,hp);const events=until(f,()=>f.b.p.hp<hp),hurt=hits(events);assert.equal(hurt.length,1);assert.equal(hurt[0].damage,13);assert.equal(hurt[0].context.originSkillId,'wilderness-keeper-fireline');assert.equal(hurt[0].context.attackFamily,'spell');assert.equal(f.b.p.negativeStatuses.burn.ruleId,'r11_burn');
});

for(const [name,target,damaged]of [['lateral flank',{x:784,y:240},true],['radial retreat',{x:720,y:336},false]])test(`keeper circle remains committed and ${name} ${damaged?'still hits':'avoids damage'} through actual movement`,()=>{
 const f=keeper();until(f,()=>f.e.state==='windup'&&f.e.attackSpec.id==='wilderness-keeper-burst');const tell=structuredClone(f.e.telegraph.shapes),home=point(f.e);assert.deepEqual(tell,[{type:'circle',x:720,y:240,r:72}]);
 moveTo(f.b,f.s.character,target);assert.equal(f.e.state,'windup');assert.deepEqual(f.e.telegraph.shapes,tell);assert.deepEqual(point(f.e),home);
 const events=release(f),burst=hits(events).filter(e=>e.context.originSkillId==='wilderness-keeper-burst');assert.equal(burst.length,damaged?1:0);if(damaged){assert.equal(burst[0].context.attackFamily,'weapon');assert.ok(burst[0].damage>=0,'the earned passive shield may fully block a valid radial hit');}assert.equal(f.e.state,'recovery');assert.ok(f.e.timer>=1.6);assert.equal(f.e.roleMovement,undefined);
});

test('keeper recovery stays vulnerable to a real mace action and returns to the line cycle without B footwork',()=>{
 const f=keeper();until(f,()=>f.e.state==='windup'&&f.e.attackSpec.id==='wilderness-keeper-burst');release(f);const hp=f.e.hp,home=point(f.e),time=f.b.time;
 const events=[...tick(f,{attack:true,aim:home}),...until(f,()=>f.e.hp<hp)];assert.ok(events.some(e=>e.type==='enemyHit'&&e.id===f.e.id&&e.context.originSkillId==='mace_swing'));assert.equal(f.e.state,'recovery');assert.deepEqual(point(f.e),home);assert.equal(f.e.invuln,undefined);
 until(f,()=>f.e.state==='windup');assert.equal(f.e.attackSpec.id,'wilderness-keeper-fireline');assert.ok(f.b.time-time>=1.6);assert.equal(f.e.roleMovement,undefined);assert.ok(f.e.hp<hp);
});

for(const [pattern,status]of [['wilderness-keeper-fireline','silence'],['wilderness-keeper-burst','disarm']])test(`existing ${status} interrupts the W ${pattern} without a late release`,()=>{
 const f=keeper();until(f,()=>f.e.state==='windup'&&f.e.attackSpec.id===pattern);f.e[status]={remaining:2};const shotCount=f.b.shots.length,events=tick(f);assert.equal(f.e.state,'recovery');assert.equal(f.e.telegraph,null);assert.equal(f.b.shots.length,shotCount);assert.ok(events.some(e=>e.type==='enemyAttackInterrupted'&&e.id===f.e.id));assert.equal(events.some(e=>e.type==='sound'&&e.name==='enemyRelease'),false);assert.equal(hits(events).some(e=>e.context.originSkillId===pattern),false);
});

test('real shield charge can interrupt the W locked tell without boss immunity or extra movement policy',()=>{
 const f=keeper();tick(f);const hp=f.e.hp,stamina=f.b.p.stamina,home=point(f.e);const events=[...tick(f,{charge:true,aim:home}),...until(f,()=>f.e.stun>0)];assert.ok(events.some(e=>e.type==='enemyHit'&&e.id===f.e.id&&e.context.originSkillId==='shield_charge'));assert.equal(f.e.hp,hp,'the earned base charge stuns but has zero authored damage');assert.ok(f.b.p.stamina<stamina);assert.equal(f.e.telegraph,null);assert.equal(f.e.invuln,undefined);assert.equal(f.e.roleMovement,undefined);assert.equal(f.b.shots.length,0);
});
