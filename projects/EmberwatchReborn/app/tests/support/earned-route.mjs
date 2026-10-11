import assert from 'node:assert/strict';
import {createState,reduceRuntime,validateState} from '../../src/state.js';
import {validateDungeonProgress} from '../../src/dungeon.js';
import {DUNGEON_GROUPS} from '../../src/dungeon-content.js';
import {getRegion} from '../../src/world.js';
// Scripted legal settlement route: positions/kills supplied to real reducers.
// No XP, level, quest flag injection; NOT AI combat or ordinary browser play.
const copy=x=>JSON.parse(JSON.stringify(x));
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const report=(s,position=s.world.position)=>({life:s.world.life??0,position:{x:position.x,y:position.y},vitals:{...s.vitals},...(s.recovery?{recovery:copy(s.recovery)}:{})});
function run(s,c){const before=copy(s),request=copy(c),r=reduceRuntime(freeze(s),freeze(c));assert.equal(r.ok,true,JSON.stringify({command:c.type,id:c.objectId??c.portalId,reason:r}));assert.deepEqual(s,before);assert.deepEqual(c,request);assert.equal(validateState(r.state).ok,true);assert.equal(validateDungeonProgress(r.state).ok,true);return r;}
function rejected(s,c,code){const before=copy(s),request=copy(c),r=reduceRuntime(freeze(s),freeze(c));assert.equal(r.ok,false);assert.equal(r.code,code,JSON.stringify(r));assert.deepEqual(s,before);assert.deepEqual(c,request);return r;}
function travel(s,portalId){const p=getRegion(s.world.region).portals.find(p=>p.id===portalId);assert.ok(p,portalId);return run(s,{type:'travel',portalId,to:p.to,...report(s,p)}).state;}
function interact(s,objectId,value){const o=getRegion(s.world.region).objects.find(o=>o.id===objectId);assert.ok(o,objectId);return run(s,{type:'interactDungeon',objectId,...(value===undefined?{}:{value}),...report(s,o)}).state;}
function settle(s,ids,position=s.world.position,extra={}){return run(s,{type:'settleCombat',defeated:ids,...report(s,position),...extra}).state;}
function entry(difficulty='normal',full=false){
  let s=createState({difficulty});
  s=run(s,{type:'trainStarter',position:{x:260,y:325}}).state;
  s=run(s,{type:'acceptPatrol',position:{x:450,y:325}}).state;
  s=travel(s,'road');
  const foes=getRegion('ash_road').foes,ids=full?foes.map(f=>f.id):[...foes.filter(f=>f.kind==='scout').slice(0,5).map(f=>f.id),'road-warden'];
  s=settle(s,ids);
  if(full)s=run(s,{type:'openChest',chestId:'road-cache',...report(s,{x:588,y:604})}).state;
  s=run(s,{type:'openChest',chestId:'warden-cache',...report(s,{x:868,y:112})}).state;
  s=travel(s,'home');s=run(s,{type:'claimReward',rewardId:'watch_patrol',position:{x:450,y:325}}).state;
  return s;
}
function accepted(difficulty='normal',full=false){let s=entry(difficulty,full);return run(s,{type:'acceptSluiceQuest',...report(s,{x:450,y:325})}).state;}
function upper(difficulty='normal',full=false){let s=accepted(difficulty,full);s=travel(s,'road');return travel(s,'road-sluice-in');}
function afterGuard(difficulty='normal',full=false){let s=upper(difficulty,full);s=interact(s,'sluice-crank');return settle(s,DUNGEON_GROUPS.upper_guard,{x:432,y:528});}
function afterSequence(difficulty='normal',full=false){let s=afterGuard(difficulty,full);for(const id of ['sluice-rune-water','sluice-rune-gear','sluice-rune-ember'])s=interact(s,id);return s;}
function afterControl(difficulty='normal',full=false){let s=afterSequence(difficulty,full);return settle(s,DUNGEON_GROUPS.upper_control,{x:416,y:256});}
function lower(difficulty='normal',full=false,optional=false){let s=afterControl(difficulty,full);s=interact(s,'sluice-valve-inlet',0);s=interact(s,'sluice-valve-outlet',1);s=interact(s,'sluice-flow-selector',optional?2:1);return travel(s,'upper-descend');}
function readyBoss(difficulty='normal',full=false,optional=false){let s=lower(difficulty,full,optional);s=interact(s,'sluice-lift-chain');if(optional){s=settle(s,DUNGEON_GROUPS.store,{x:192,y:272});s=interact(s,'sluice-store-cache');}s=settle(s,DUNGEON_GROUPS.lower_antechamber,{x:416,y:400});return interact(s,'sluice-boss-bell');}
function cleared(difficulty='normal',full=false,optional=false){let s=readyBoss(difficulty,full,optional);s=settle(s,DUNGEON_GROUPS.boss,{x:560,y:144});return interact(s,'sluice-core');}
function route(difficulty='normal',full=false,optional=false){let s=cleared(difficulty,full,optional);const beforeReport=s.stats.earnedXp;s=travel(s,'lower-lift-town');s=run(s,{type:'reportSluiceQuest',...report(s,{x:450,y:325})}).state;return {state:s,beforeReport};}

export {route,report,run,travel,settle};
