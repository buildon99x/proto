// One bounded historical comparison; requires the named local Git checkpoint.
// Synthetic states are not normal-input QA or campaign/save acceptance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createState,reduceRuntime} from '../src/state.js';
import * as current from '../src/combat.js';
import {mapFromRegion} from '../src/world-geometry.js';
const base='5192eeca1884cd28b46e3db486b334faec2b27a7',path='projects/EmberwatchReborn/app/src/combat.js';
const previous=execFileSync('git',['show',`${base}:${path}`],{cwd:new URL('../../../../',import.meta.url),encoding:'utf8'}),source=readFileSync(new URL('../src/combat.js',import.meta.url),'utf8');
const before="fx(b,shape.type==='circle'?'ring':'slash',e.x,e.y,'#e67c78',shape.r??attack.range,.25,{angle:e.angle});";
const after="fx(b,'enemyRelease',shape.x,shape.y,'#e67c78',0,.25,{shape:{...shape}});";
assert.equal(previous.split(before).length,2);assert.equal(source,previous.replace(before,after),'No other combat source byte may change in this presentation correction.');
const absolute=previous.replace(/from '(\.\/[^']+)'/g,(_,relative)=>`from '${new URL(relative,new URL('../src/combat.js',import.meta.url)).href}'`);
const legacy=await import(`data:text/javascript;base64,${Buffer.from(absolute).toString('base64')}`);
const withoutEffects=b=>{const {effects,...gameplay}=b;return gameplay;};
const cases=[
 {name:'boss line hit',kind:'battlefield_usurper',distance:180},
 {name:'boss line side-step miss',kind:'battlefield_usurper',distance:180,miss:true},
 {name:'boss line wall',kind:'battlefield_usurper',distance:180,wall:true},
 {name:'boss line silence cancel',kind:'battlefield_usurper',distance:180,silence:true},
 {name:'boss sweep hit',kind:'battlefield_usurper',distance:60,pattern:1},
 {name:'boss sweep locked miss',kind:'battlefield_usurper',distance:60,pattern:1,miss:true},
 {name:'circle hit and stun',kind:'battlefield_bulwark',distance:40},
 {name:'circle locked miss',kind:'battlefield_bulwark',distance:40,miss:true},
 {name:'older archer',kind:'archer',distance:180},
 {name:'old random boss circle',kind:'warden',distance:80,seed:0},
 {name:'old random boss cone',kind:'warden',distance:80,seed:1000},
 {name:'player attack concurrent',kind:'battlefield_usurper',distance:60,pattern:1,attack:true},
];
let comparisons=0;
for(const c of cases)for(const dt of [.01,.02,.05,.25]){
 const state=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;
 state.world.region=c.kind.startsWith('battlefield_')?'beacon_battlefield':'ash_road';state.world.objectives.battlefield_accepted=1;state.world.objectives.battlefield_devices_ready=1;
 const make=api=>{const b=api.createBattle(structuredClone(state)),e=b.enemies.find(e=>e.kind===c.kind);b.enemies=[e];b.map=mapFromRegion({w:40,h:40});b.awaitingAdvance=false;b.seed=c.seed??1000;Object.assign(e,{x:512,y:512,active:true,patternIndex:c.pattern??0});Object.assign(b.p,{x:512+c.distance,y:512,invuln:0});return b;};
 const a=make(current),b=make(legacy);let altered=false,releaseSeen=false;
 for(let time=0;time<4;time+=Math.min(dt,.05)){
  const input=c.attack?{attack:true,aim:{x:512,y:512}}:{};
  assert.deepEqual(current.stepBattle(a,state.character,dt,input),legacy.stepBattle(b,state.character,dt,input),`${c.name}/${dt}: events`);
  assert.deepEqual(withoutEffects(a),withoutEffects(b),`${c.name}/${dt}: all non-FX state`);comparisons++;
  const e=a.enemies[0];releaseSeen ||= a.events.some(e=>e.type==='sound'&&e.name==='enemyRelease');
  if(!altered&&e.state==='windup'){
   altered=true;
   for(const battle of [a,b]){
    if(c.miss)battle.p.y+=160;
    if(c.wall)for(let y=0;y<battle.map.h;y++)battle.map.tiles[y][18]=0;
    if(c.silence)battle.enemies[0].silence={remaining:3};
   }
  }
 }
 if(!c.silence&&!c.attack)assert.equal(releaseSeen,true,`${c.name}: real release must execute`);
 console.log(`PASS ${c.name}; dt=${dt}`);
}
console.log(`PASS ${cases.length*4} historical scenarios; ${comparisons} frame-by-frame whole-state/event comparisons excluding only effects.`);
console.log(`Baseline ${base}; SHA256 ${createHash('sha256').update(previous).digest('hex')}`);
console.log(`Candidate combat SHA256 ${createHash('sha256').update(source).digest('hex')}`);
console.log('PASS exact combat source equality after only the release-FX expression substitution.');
