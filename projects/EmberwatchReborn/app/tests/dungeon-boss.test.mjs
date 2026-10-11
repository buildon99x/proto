import test from 'node:test';import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';import {createBattle,stepBattle,physicalDamage} from '../src/combat.js';
import {mapFromRegion} from '../src/world-geometry.js';import {DUNGEON_FOES} from '../src/dungeon-content.js';
// Isolated combat fixtures deliberately place actors/remove other foes. These
// are not campaign acquisition tests or normal-input/browser play evidence.
function fixture(difficulty='normal'){
 const s=reduceRuntime(createState({difficulty}),{type:'trainStarter',position:{x:260,y:325}}).state;
 const b=createBattle(s),f=DUNGEON_FOES.sluice_keeper;b.awaitingAdvance=false;b.map=mapFromRegion({w:20,h:20});
 b.p.x=250;b.p.y=300;b.seed=1000;const e={id:'test-keeper',kind:'sluice_keeper',type:'boss',x:300,y:300,hp:f.hp*b.difficulty.enemyHealth,max:f.hp*b.difficulty.enemyHealth,angle:0,active:false,state:'idle',timer:0,stun:0,telegraph:null};b.enemies=[e];return {s,b,e};
}
const advance=(s,b,n=1,input={})=>{for(let i=0;i<n;i++)stepBattle(b,s.character,.02,input);};
test('keeper uses cone, line and circle in a fixed cycle rather than a renamed health sponge',()=>{const {s,b,e}=fixture();b.p.invuln=100;const shapes=[],contacts=[];for(let i=0;i<420;i++){const before=e.state;const events=stepBattle(b,s.character,.02,{});if(e.state==='windup'&&before!=='windup')shapes.push(e.telegraph.shapes[0].type);if(events.some(v=>v.type==='sound'&&v.name==='enemyRelease'))contacts.push(i);}assert.deepEqual(shapes.slice(0,4),['cone','line','circle','cone']);assert.equal(contacts.length,4);assert.ok(contacts.slice(1).every((frame,i)=>frame-contacts[i]>=100));});
test('each keeper windup keeps its aim and authored geometry after the player moves',()=>{const {s,b,e}=fixture();advance(s,b);const shape=structuredClone(e.telegraph.shapes[0]);advance(s,b,20,{move:{x:0,y:1}});assert.deepEqual(e.telegraph.shapes[0],shape);assert.equal(e.windupDuration,1);});
test('keeper release damages once and cannot tick repeatedly during recovery',()=>{const {s,b,e}=fixture();advance(s,b,52);const hp=b.p.hp;assert.ok(hp<55);assert.ok(Math.abs(55-hp-physicalDamage(16,4))<1e-7);assert.equal(e.state,'recovery');advance(s,b,35);assert.equal(b.p.hp,hp);});
test('keeper difficulty scales health and outgoing impact without shortening warning time',()=>{let normalDamage;for(const [difficulty,hpScale,dmgScale] of [['normal',1,1],['easy',.66,.66],['hard',1.25,1.25],['serious',1.5,2]]){const {s,b,e}=fixture(difficulty);assert.equal(e.hp,220*hpScale);advance(s,b);assert.equal(e.timer,1);advance(s,b,51);const damage=55-b.p.hp;if(difficulty==='normal')normalDamage=damage;assert.ok(Math.abs(damage-normalDamage*dmgScale)<1e-7);}});
test('charge interruption clears keeper telegraph and still pays its resource cost',()=>{const {s,b,e}=fixture();advance(s,b);assert.ok(e.telegraph);advance(s,b,4,{charge:true,aim:e});assert.ok(e.stun>0);assert.equal(e.telegraph,null);assert.ok(b.p.stamina<45);assert.ok(b.p.cooldowns.shield_charge>0);});
test('keeper death is emitted once despite repeated contact inputs',()=>{const {s,b,e}=fixture();e.hp=1;let kills=0;for(let i=0;i<100;i++)kills+=stepBattle(b,s.character,.02,{attack:true,aim:e}).filter(v=>v.type==='defeated').length;assert.equal(kills,1);assert.equal(e.hp,0);});
