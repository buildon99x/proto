import test from 'node:test';
import assert from 'node:assert/strict';
import {getRegion,createMap} from '../src/world.js';
import {inMap,lineOfSight,findPathStep,mapFromRegion} from '../src/world-geometry.js';
import {BATTLEFIELD_FOES} from '../src/battlefield-content.js';
import {WILDERNESS_REGION,WILDERNESS_REGIONS,WILDERNESS_LINKS,WILDERNESS_FOES,WILDERNESS_GROUPS,WILDERNESS_PROGRESS_DEFAULTS} from '../src/wilderness-content.js';
import {wildernessMap,wildernessInputRevision,wildernessClue,reduceWildernessRuntime} from '../src/wilderness.js';
import {wildernessObjectView,wildernessCommandFields,wildernessGuidance,wildernessElderView,wildernessPortalView,wildernessPresentationHints} from '../src/wilderness-presentation.js';
import {W,stages,object,interaction,quest,wRun,wSettle,act,wTravel,report,copyRuntime,runtimeContext,storeRevision} from './support/earned-wilderness-route.mjs';
const copy=copyRuntime;
let cached;function all(){cached??=stages();return copy(cached);}
function flags(values){return {world:{objectives:{...WILDERNESS_PROGRESS_DEFAULTS,...values}}};}
const full={wilderness_surveyed:1,wilderness_anchored:1,wilderness_calibrated:1,wilderness_mode:1,wilderness_routed:1,wilderness_keeper_open:1,wilderness_evidence_taken:1};

test('W registered content resolves; all authored spawns, objects and foes fit their actual collision floors',()=>{
 assert.equal(getRegion(WILDERNESS_REGION),W);const map=wildernessMap(flags(full));assert.ok(inMap(map,W.spawn.x,W.spawn.y));
 for(const o of [...W.objects,...W.foes,...W.portals])assert.ok(inMap(map,o.x,o.y),o.id);
 for(const p of [...WILDERNESS_LINKS.ash_hamlet,...W.portals]){const target=p.to===WILDERNESS_REGION?map:createMap(p.to);assert.ok(inMap(target,p.arrival.x,p.arrival.y),p.id);}
 const town=createMap('ash_hamlet');for(const p of WILDERNESS_LINKS.ash_hamlet)assert.ok(inMap(town,p.x,p.y));
 assert.equal(new Set(W.foes.map(e=>e.id)).size,25);for(const e of W.foes)assert.ok(WILDERNESS_FOES[e.kind]);
});

test('mandatory gated floors open sequentially with a permanent retreat; no puzzle/boss condition on anchor return',()=>{
 const a=all(),checks=[['entered','survey','anchor'],['survey','anchor','receiver'],['anchor','receiver','relay'],['calibrated','receiver','relay'],['chosen','relay','approach'],['routed','approach','boss'],['approach','boss','scouts'],['evidence','scouts',null]];
 for(const [stage,reachable,blocked]of checks){const map=wildernessMap(a[stage]),goal=W.foes.find(e=>e.id===WILDERNESS_GROUPS[reachable][0]);assert.ok(findPathStep(map,W.spawn,goal),stage+':'+reachable);if(blocked){const target=W.foes.find(e=>e.id===WILDERNESS_GROUPS[blocked][0]);assert.equal(findPathStep(map,W.spawn,target),null,stage+':'+blocked);}assert.ok(findPathStep(map,a[stage].world.position,W.portals[0]),stage+':safe-retreat');}
 const portal=W.portals.find(p=>p.id==='wilderness-anchor-return'),anchor=object('anchor');assert.ok(Math.hypot(portal.x-anchor.x,portal.y-anchor.y)>76,'locked portal cannot take F at the anchor itself');
 assert.ok(findPathStep(wildernessMap(a.hook),object('hook'),anchor));assert.equal(wildernessPortalView(a.anchor,portal).allowed,true);
});

test('cover/channel has actual six-tile collision/LOS difference and two open flanks in both modes',()=>{
 const cover=wildernessMap(flags(full)),channel=wildernessMap(flags({...full,wilderness_mode:2,wilderness_channel_open:1}));let changed=0;
 for(let y=0;y<W.h;y++)for(let x=0;x<W.w;x++)if(cover.tiles[y][x]!==channel.tiles[y][x]){changed++;assert.ok(x>=14&&x<16&&y>=16&&y<19);assert.equal(cover.tiles[y][x],0);assert.equal(channel.tiles[y][x],1);}assert.equal(changed,6);
 const east={x:560,y:560},west={x:368,y:560};assert.equal(lineOfSight(cover,east,west),false);assert.equal(lineOfSight(channel,east,west),true);
 for(const map of [cover,channel])for(const flank of [{x:480,y:464},{x:480,y:656}]){assert.ok(findPathStep(map,east,flank));assert.ok(findPathStep(map,flank,west));assert.ok(findPathStep(map,west,W.spawn));}
});

test('survey cover creates offset real sightlines while both sides remain reachable without increasing foe HP',()=>{
 const map=wildernessMap(flags({}));assert.equal(inMap(map,224,848),false);assert.equal(lineOfSight(map,{x:176,y:848},{x:336,y:848}),false);assert.ok(findPathStep(map,{x:176,y:848},{x:336,y:848}));
 const mapping={flanker:'revenant',revenant:'revenant',hexer:'hexer',binder:'binder',pyromancer:'pyromancer',lancer:'lancer',bulwark:'bulwark',keeper:'usurper'};
 for(const [suffix,source]of Object.entries(mapping)){const f=WILDERNESS_FOES['wilderness_'+suffix],old=BATTLEFIELD_FOES['battlefield_'+source];assert.equal(f.hp,old.hp);if(suffix==='keeper'){assert.notDeepEqual(f.patterns,old.patterns);assert.deepEqual(f.patterns.map(p=>p.shape),['line','circle']);}else assert.deepEqual(f.patterns,old.patterns);assert.equal(Object.hasOwn(f,'battlefieldRoleMovement'),false,'B-only footwork must not be advertised as W runtime');}
});

test('in-range interaction across closed cover fails with WALL_BLOCKED, never UI-only success',()=>{
 // Real surveyed history, authored wall-edge command fixture at the cover.
 const a=all(),s=a.chosen;const o=object('relay');
 // The relay is north-west of the central cover. Find a valid adjacent point
 // within reach whose segment crosses solid collision, rather than mocking LOS.
 let blocked=null;for(let y=o.y-76;y<=o.y+76&&!blocked;y+=2)for(let x=o.x-76;x<=o.x+76&&!blocked;x+=2){if(Math.hypot(x-o.x,y-o.y)<=76&&inMap(wildernessMap(s),x,y)&&!lineOfSight(wildernessMap(s),{x,y},o))blocked={x,y};}
 // Room corners can be tested independently if this particular object has no
 // wall in its interaction circle; assert the selected layout supplies one.
 assert.ok(blocked,'authored relay must supply an actual blocked nearby point');const before=copy(s),r=reduceWildernessRuntime(s,{...interaction(s,'relay'),position:blocked},runtimeContext(s));assert.equal(r.code,'WALL_BLOCKED');assert.deepEqual(s,before);
});

test('journal, object actions and Eda continuation are truthful, read-only and revision-bound',()=>{
 const a=all(),before=copy(a.finished);const fresh=wildernessElderView(a.before,runtimeContext(a.before));assert.equal(fresh.type,'acceptWildernessQuest');assert.deepEqual(wildernessCommandFields(fresh),{type:'acceptWildernessQuest',expectedRevision:0,expectedStoreRevision:storeRevision(a.before)});
 assert.equal(wildernessObjectView(a.entered,object('tablet'),runtimeContext(a.entered)).actions.length,0);const tablet=wildernessObjectView(a.survey,object('tablet'),runtimeContext(a.survey));assert.equal(tablet.completed,true);assert.match(tablet.detail,/바람깃 → 돌무덤 → 잿불/);assert.equal(tablet.actions.length,0);
 const glyph=wildernessObjectView(a.prefix,object('glyph-cairn'),runtimeContext(a.prefix));assert.equal(glyph.actions.length,1);assert.deepEqual(wildernessCommandFields(glyph.actions[0]),{type:'interactWilderness',objectId:'wilderness-glyph-cairn',expectedRevision:wildernessInputRevision(a.prefix),expectedStoreRevision:storeRevision(a.prefix),expectedStep:1});
 const choice=wildernessObjectView(a.calibrated,object('choice'),runtimeContext(a.calibrated));assert.deepEqual(choice.actions.map(x=>x.choice),['cover','channel']);assert.equal(wildernessObjectView(a.chosen,object('choice'),runtimeContext(a.chosen)).actions.length,0);
 const done=wildernessElderView(a.finished,runtimeContext(a.finished));assert.equal(done.action,null);assert.match(done.detail,/오린/);assert.match(done.detail,/지금 수락하거나 구매할 수 없습니다/);assert.match(wildernessGuidance(a.finished).detail,/캠페인 결말은 완료되지/);assert.deepEqual(a.finished,before);
 assert.equal(wildernessCommandFields({type:'interactWilderness',objectId:'fake',expectedRevision:1}),null);assert.equal(wildernessCommandFields({type:'interactWilderness',objectId:'wilderness-choice',choice:'freeXp',expectedRevision:1}),null);assert.equal(wildernessCommandFields({type:'interactWilderness',objectId:'wilderness-glyph-wind',expectedStep:4,expectedRevision:1}),null);
 const p=wildernessPortalView(a.boss,'wilderness-keeper-return');assert.equal(p.allowed,true);assert.match(p.name,/기록핵 미회수/);const hints=wildernessPresentationHints();assert.equal(hints.foes.wilderness_hexer.undead,true);assert.equal(hints.foes.wilderness_binder.undead,false);assert.deepEqual(hints.foes.wilderness_keeper.attackFamilies,['spell','weapon']);
 for(const text of [p.detail,hints.reentry]){assert.match(text,/지역 전환 자체는 자원이나 재사용 대기를 회복하지 않습니다\./);assert.match(text,/살아남은 적의 전투 재구성과 일반 보행 중 정상 재생은 기존 규칙을 따릅니다\./);assert.doesNotMatch(text,/이동은 자원이나 재사용 대기를 회복하지 않습니다/);}
});

test('authored small entry foyer breaks every initial enemy sightline and reaches an immediate return without a fight',()=>{
 const map=wildernessMap(flags({})),portal=W.portals.find(p=>p.id==='wilderness-town-return');assert.ok(findPathStep(map,W.spawn,portal));assert.ok(lineOfSight(map,W.spawn,portal));
 for(const id of WILDERNESS_GROUPS.survey){const enemy=W.foes.find(e=>e.id===id);assert.equal(lineOfSight(map,W.spawn,enemy),false,id);assert.equal(lineOfSight(map,portal,enemy),false,id);}
 assert.equal(wildernessPortalView(all().entered,portal).allowed,true);
});

test('pre-choice relay foes have no reachable position or line of sight through the mode-gated doorway',()=>{
 const s=all().calibrated,map=wildernessMap(s),choice=object('choice');assert.equal(s.world.objectives.wilderness_mode,0);assert.ok(findPathStep(map,W.spawn,choice));
 for(const id of WILDERNESS_GROUPS.relay){const enemy=W.foes.find(e=>e.id===id);assert.equal(findPathStep(map,W.spawn,enemy),null,id);for(let y=1;y<map.h-1;y++)for(let x=1;x<map.w-1;x++){const p={x:x*32+16,y:y*32+16};if(inMap(map,p.x,p.y)&&findPathStep(map,W.spawn,p))assert.equal(lineOfSight(map,p,enemy),false,`${id} visible from ${x},${y}`);}}
 for(const mode of ['cover','channel']){const chosen=act(s,'choice',{choice:mode}),opened=wildernessMap(chosen);for(const id of WILDERNESS_GROUPS.relay)assert.ok(findPathStep(opened,W.spawn,W.foes.find(e=>e.id===id)));}
});

test('views expose no executable actions without a captured trusted store epoch',()=>{
 const a=all();assert.equal(wildernessObjectView(a.surveyGuards,object('tablet')).actions.length,0);assert.equal(wildernessElderView(a.before).action,null);
 const action=wildernessObjectView(a.surveyGuards,object('tablet'),runtimeContext(a.surveyGuards)).actions[0];assert.equal(action.expectedStoreRevision,storeRevision(a.surveyGuards));const old={...action};delete old.expectedStoreRevision;assert.equal(wildernessCommandFields(old),null);
});
