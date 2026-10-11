import test from 'node:test';import assert from 'node:assert/strict';
import {createState,reduceRuntime} from '../src/state.js';import {createBattle,stepBattle} from '../src/combat.js';
import {mapFromRegion} from '../src/world-geometry.js';
function fixture(){let s=reduceRuntime(createState(),{type:'trainStarter',position:{x:260,y:325}}).state;s=reduceRuntime(s,{type:'acceptPatrol',position:{x:450,y:325}}).state;s=reduceRuntime(s,{type:'travel',life:s.world.life??0,to:'ash_road',position:{x:590,y:375},vitals:s.vitals}).state;
 const b=createBattle(s);b.awaitingAdvance=false;b.map=mapFromRegion({w:10,h:10,rooms:[{x:1,y:1,w:4,h:8},{x:6,y:1,w:3,h:8}]});b.p.x=142;b.p.y=144;b.enemies=[{...b.enemies[0],x:205,y:144}];return {s,b,e:b.enemies[0]};}
const run=(s,b,seconds,input={})=>{for(let i=0;i<seconds*50;i++)stepBattle(b,s.character,.02,input);};
test('closed wall blocks nearby enemy activation and telegraph',()=>{const {s,b,e}=fixture();run(s,b,2);assert.equal(e.active,false);assert.equal(e.telegraph,null);assert.equal(b.p.hp,55);});
test('mace cannot damage an otherwise-in-range enemy through a wall',()=>{const {s,b,e}=fixture(),hp=e.hp;run(s,b,1,{attack:true,aim:e});assert.equal(e.hp,hp);});
test('hammer stops at wall before a nearby target instead of applying swept damage beyond it',()=>{const {s,b,e}=fixture(),hp=e.hp;run(s,b,1,{hammer:true,aim:e});assert.equal(e.hp,hp);assert.equal(b.shots.length,0);assert.ok(b.p.mana<40);});
test('enemy projectile cannot damage hero behind a wall',()=>{const {s,b}=fixture();b.shots.push({kind:'arrow',enemy:true,x:205,y:144,vx:-240,vy:0,damage:10,life:2});run(s,b,1);assert.equal(b.p.hp,55);assert.equal(b.shots.length,0);});
test('high-speed charge sweeps solid collision rather than jumping one-tile walls',()=>{const {s,b,e}=fixture();stepBattle(b,s.character,.05,{charge:true,aim:e});run(s,b,.5);assert.ok(b.p.x<149);assert.equal(e.stun,0);assert.equal(b.p.stamina<45,true);});
test('quest-gated enemies remain dormant even with clear line of sight',()=>{const {s,b,e}=fixture();b.map=mapFromRegion({w:10,h:10});e.gate={objective:'sluice_boss_awakened',minimum:1};run(s,b,2);assert.equal(e.active,false);assert.equal(b.p.hp,55);});
