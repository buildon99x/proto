import test from 'node:test';
import assert from 'node:assert/strict';
import {soloProfile,soloFeatherPhase,soloRoutine,soloExperience} from './solo-experience.js';
import {ambientPhase} from '../../shared/ambient.mjs';
import {featherPhase} from '../../shared/feather.mjs';
const rooms=['sunroom','garden','moonlight'];
const actions=['pet','feather','ball'];

test('all eighteen solo cats have deterministic balanced profiles across rooms',()=>{
 const profiles=[];
 for(let i=0;i<18;i++){
  const id=`cat-${i}`,profile=soloProfile(id);profiles.push(profile.key);
  assert.equal(profile,soloProfile(id));assert.ok(actions.includes(profile.preferred));
  for(const room of rooms){const a=soloExperience({id,mode:'idle',until:0},0,room);assert.equal(a.profile,profile);assert.deepEqual(a,soloExperience({id,mode:'idle',until:0},0,room));}
 }
 assert.deepEqual(Object.fromEntries(['sleepy','observant','playful'].map(key=>[key,profiles.filter(p=>p===key).length])),{sleepy:6,observant:6,playful:6});
 assert.equal(soloProfile('cat-2').preferred,'ball');assert.equal(soloProfile('cat-7').preferred,'feather');assert.equal(soloProfile('cat-15').preferred,'pet');
});

test('same action has distinct bounded profile factors without denying nonpreferred actions',()=>{
 const expected=[['cat-0',.10,.055,.65],['cat-1',.35,.020,.80],['cat-2',.25,.035,1]];
 for(const [id,eyes,nuzzle,speed]of expected)for(const room of rooms)for(const mode of actions){
  const p=soloExperience({id,mode,owner:'solo-you',until:4000},1000,room);
  assert.equal(p.action,mode);assert.equal(p.profile.petEyes,eyes);assert.equal(p.profile.petNuzzle,nuzzle);assert.equal(p.profile.ballStep,speed);assert.equal(p.routine,null);assert.equal(p.elapsed,1);
 }
});

test('solo feather profile timing uses only the four second lease and all have sustained watch intervals',()=>{
 const phase=(id,t)=>soloFeatherPhase(id,4000,t).phase;
 for(const [id,checks]of [['cat-0',[[0,'focus'],[799,'focus'],[800,'stalk'],[1300,'pounce'],[1650,'pause'],[3999,'pause']]],['cat-1',[[0,'focus'],[1499,'focus'],[1500,'stalk'],[2200,'pounce'],[2650,'pause'],[3999,'pause']]]])for(const [t,p]of checks)assert.equal(phase(id,t),p);
 for(let t=0;t<4000;t+=25)assert.deepEqual(soloFeatherPhase('cat-2',4000,t),featherPhase(4000,t));
 for(let i=0;i<18;i++){
  const id=`cat-${i}`;let quiet=0;
  for(let t=0;t<4000;t+=50){const p=soloFeatherPhase(id,4000,t);assert.ok(p.progress>=0&&p.progress<1);if(['focus','pause'].includes(p.phase))quiet+=50;assert.deepEqual(p,soloFeatherPhase(id,9000,t+5000));}
  assert.ok(quiet>=1900);
  for(const t of [-1,4000,Infinity])assert.deepEqual(soloFeatherPhase(id,4000,t),{phase:'idle',progress:0});
 }
});

test('room routines only use a short rest window and existing groom/stretch with majority sleep/rest',()=>{
 for(let i=0;i<18;i++)for(const room of rooms){
  let sleepRest=0,routineCount=0;
  for(let t=0;t<120000;t+=250){
   const phase=ambientPhase(`cat-${i}`,t,room),routine=soloRoutine(`cat-${i}`,t,room);
   if(['sleep','walk'].includes(phase))assert.equal(routine,null);
   if(phase==='rest'&&ambientPhase(`cat-${i}`,t-3000,room)==='rest')assert.equal(routine,null);
   if(routine){routineCount++;assert.ok(routine.text.length<45);assert.ok(['rest','stretch','groom'].includes(routine.pose));}
   if(['sleep','rest'].includes(routine?.pose??phase))sleepRest++;
  }
  assert.ok(sleepRest/480>=.8,`${room} cat-${i}: preserve quiet majority`);assert.equal(routineCount,44);
 }
 const times={sunroom:83000,garden:60000,moonlight:36000};
 assert.equal(soloRoutine('cat-0',times.sunroom,'sunroom').pose,'stretch');
 assert.equal(soloRoutine('cat-0',times.garden,'garden').key,'garden-watch');
 assert.equal(soloRoutine('cat-0',times.moonlight,'moonlight').key,'moonlight-rest');
});

test('action expiry invalid time and action switching clear prior reaction policy',()=>{
 for(let i=0;i<18;i++)for(const room of rooms){
  const id=`cat-${i}`;
  for(const mode of actions){
   assert.equal(soloExperience({id,mode,owner:'solo-you',until:4000},4000,room).action,null);
   assert.equal(soloExperience({id,mode,owner:null,until:4000},1000,room).action,null);
   assert.equal(soloExperience({id,mode,owner:'solo-you',until:4000},NaN,room).action,null);
  }
  assert.equal(soloExperience({id,mode:'pet',owner:'solo-you',until:5000},1250,room).hunt,null);
  assert.equal(soloExperience({id,mode:'idle',owner:null,until:0},0,room).hunt,null);
 }
});
