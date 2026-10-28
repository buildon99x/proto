/* Specification foundation tests. These are simulation tests, not browser input/listening QA. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {RifleState,R4,RIFLE,damageAt,validateInstance}=require('./rifle-state.js');
const {AmmoLedger,ShotJournal,shotId}=require('./ammo-ledger.js');
const {definitions,validateDefinition}=require('./weapon-definitions.js');
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
const near=(a,b,e=1e-8)=>assert(Math.abs(a-b)<=e,`${a} != ${b}`);
function rifle(options={}){return new RifleState({definitionId:'r4',weaponInstanceId:'r4-instance-A',sessionId:'combat-A',...options});}
function step(r,seconds,hz=120,shoot=false){let remaining=seconds;while(remaining>1e-10){const dt=Math.min(1/hz,remaining);r.tick(dt);if(shoot)while(r.shouldFire())r.fire();remaining-=dt;}}
const total=r=>r.magazine+r.chamber+r.reserve;
function tap(r){r.requestTrigger();return r.fire();}

test('JSON is validated balance authority; new R4 is explicit while legacy fixtures retain 0.9 tuning',()=>{
 assert.equal(R4.damage,15);assert.equal(R4.rpm,690);near(R4.interval,60/690);assert.equal(R4.magazineSize,30);assert.equal(R4.inputBuffer,.08);assert.equal(R4.adsTime,.22);assert.equal(R4.switchTime,.46);assert.equal(R4.unequipTime,.22);assert.equal(R4.reload.tactical.duration,2.1);assert.equal(R4.reload.empty.duration,2.6);assert.equal(RIFLE.damage,30);
 assert(Object.isFrozen(definitions.r4.reload.empty.stages[0]));
 for(const patch of [{rpm:0},{rpm:Infinity},{initialMagazine:31},{initialChamber:2},{headMultiplier:-1},{minimumDamage:2},{maxShotsPerTick:100},{modes:['safe']},{unexpectedBalance:1}])assert.throws(()=>validateDefinition({...definitions.r4,...patch}));
 const bad=JSON.parse(JSON.stringify(definitions.r4));bad.reload.empty.chamberAt=.1;assert.throws(()=>validateDefinition(bad));
});
test('generated browser balance matches current JSON and fails closed without definitions',()=>{
 const context=vm.createContext({});for(const name of ['weapon-content.js','weapon-definitions.js','ammo-ledger.js','rifle-state.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),context,{filename:name});
 assert.equal(JSON.stringify(context.DFWeaponDefinitions.definitions.r4),JSON.stringify(definitions.r4));assert.equal(new context.DFRifle.RifleState({definitionId:'r4'}).config.damage,15);
 assert.throws(()=>vm.runInContext(fs.readFileSync(path.join(__dirname,'rifle-state.js'),'utf8'),vm.createContext({})),/must load/);
});
test('T01 30 plus chamber commits exactly 31 shots, never a 32nd ammo/damage/audio identity',()=>{
 const r=rifle({config:{initialMagazine:30,initialReserve:0}}),journal=new ShotJournal();let damage=0,sounds=0;
 r.setFireInput(true);for(let i=0;i<240;i++){const shot=r.fire();if(shot){if(journal.claim(shot.shotId,'damage'))damage+=damageAt(0,'torso',0,r.config).damage;if(journal.claim(shot.shotId,'audio'))sounds++;}r.tick(1/60);}
 assert.equal(r.shots,31);assert.equal(r.total,0);assert.equal(damage,465);assert.equal(sounds,31);assert.equal(r.drainEvents().filter(e=>e.type==='shot').length,31);assert.equal(r.fire(),null);assert(r.ledger.verify());assert.equal(r.ledger.spent,31);
});
test('shot command replay cannot mutate ammunition, recoil, cooldown, damage or audio twice',()=>{
 const r=rifle();r.requestTrigger();const command=r.shouldFire(),shot=r.fire(command);assert.equal(shot.shotId,shotId('r4-instance-A','combat-A',1));const before=r.snapshot();
 for(let i=0;i<10;i++)assert.equal(r.fire(command),null);assert.deepEqual(r.snapshot(),before);step(r,.1);r.requestTrigger();const ready=r.snapshot();assert.equal(r.fire(command),null);assert.deepEqual(r.snapshot(),ready);
 let hits=0,sounds=0;for(const event of [shot,shot,shot]){if(r.journal.claim(event.shotId,'damage'))hits++;if(r.journal.claim(event.shotId,'audio'))sounds++;}assert.equal(hits,1);assert.equal(sounds,1);assert(r.fire());
});
test('T02 partial tactical reload conserves total and produces 30 plus 1 only at resource commit',()=>{
 const r=rifle({config:{initialMagazine:8,initialReserve:50}}),original=total(r);assert(r.load());step(r,1.259);assert.equal(r.magazine,8);assert.equal(r.reserve,50);step(r,.001);assert.equal(r.magazine,30);assert.equal(r.chamber,1);assert.equal(r.reserve,28);assert.equal(total(r),original);assert.equal(r.ledger.drainEntries().filter(e=>e.type==='reload').length,1);step(r,.84);assert(!r.reload);assert(!r.load());assert.equal(total(r),original);
});
test('T02 insufficient reserve transfers only existing rounds',()=>{
 const r=rifle({config:{initialMagazine:5,initialReserve:3}});r.load();step(r,2.1);assert.equal(r.total,9);assert.equal(r.reserve,0);assert(r.ledger.verify());
});
test('reload animation keyframes never independently mutate ammunition',()=>{
 const reload=JSON.parse(JSON.stringify(definitions.r4.reload));reload.tactical.stages[1][1]=1.4;
 const r=rifle({config:{initialMagazine:4,reload}});r.load();step(r,1.26);assert.equal(r.magazine,30);assert.equal(r.reload.stage,'eject');const before=r.ledger.snapshot();step(r,.14);assert.equal(r.reload.stage,'insert');assert.deepEqual(r.ledger.snapshot(),before);
});
test('T03 automatic empty reload starts at 300ms; manual R starts earlier with equal resource use',()=>{
 const options={config:{initialMagazine:0,initialChamber:0,initialReserve:60}},auto=rifle(options),manual=rifle(options);assert(manual.load());step(auto,.299);assert(!auto.reload);step(auto,.001);assert(auto.reload);near(auto.reload.start,.3);step(manual,2.6);step(auto,2.6);assert.equal(total(auto),60);assert.equal(total(manual),60);assert.equal(auto.magazine,29);assert.equal(auto.chamber,1);assert.equal(auto.reserve,30);assert.equal(JSON.stringify(auto.ledger.state),JSON.stringify(manual.ledger.state));
});
test('T03 last committed shot starts empty reload timer without requiring a second dry click',()=>{
 const r=rifle({config:{initialMagazine:0,initialChamber:1,initialReserve:1}});assert(tap(r));step(r,.299);assert(!r.reload);step(r,.001);assert.equal(r.reload.kind,'empty');step(r,2.6);assert.equal(r.total,1);assert.equal(r.reserve,0);assert.equal(r.shots,1);
});
test('T03 empty holstered/paused/disabled instances never auto-start reload',()=>{
 for(const gate of ['inactive','paused','dead']){const r=rifle({config:{initialMagazine:0,initialChamber:0}});if(gate==='inactive')r.deactivate();if(gate==='paused')r.setPaused(true);if(gate==='dead')r.clearFireInput('dead');step(r,1);assert(!r.reload);assert.equal(r.total,0);assert.equal(r.reserve,120);}
});
test('T04 cancellation before and after every reload checkpoint preserves the ammo invariant',()=>{
 for(const kind of ['tactical','empty'])for(const at of [0,.25,.26,.28,1.239,1.24,1.259,1.26,1.55,2.079,2.08,2.1,2.6])for(const reason of ['switch','holster','melee','sprint','inventory','dead']){
  const r=rifle({config:{initialMagazine:kind==='empty'?0:7,initialChamber:kind==='empty'?0:1}}),original=total(r);r.load();step(r,at);r.cancelReload(reason);assert.equal(total(r),original,kind+' '+at+' '+reason);assert(r.ledger.verify());assert.equal(r.ledger.entries.filter(e=>e.type==='reload').length,at+1e-8>=r.config.reload[kind].transferAt?1:0);
 }
});
test('T04 trigger cancels tactical reload and fires only after minimum recovery',()=>{
 for(const at of [.4,1.3]){const r=rifle({config:{initialMagazine:7}});r.load();step(r,at);const before=total(r);r.setFireInput(true);r.setFireInput(false);assert(!r.reload);assert(!r.fire());step(r,.249);assert(!r.fire());step(r,.001);assert(r.fire());assert.equal(total(r),before-1);step(r,.2);assert(!r.fire());}
});
test('T04 dry LMB cannot cancel an empty reload or skip its charge/close gates',()=>{
 const r=rifle({config:{initialMagazine:0,initialChamber:0}});r.load();step(r,1.3);r.setFireInput(true);assert(r.reload);assert(!r.fire());step(r,.78);assert.equal(r.chamber,1);assert(r.reload);assert(!r.fire());step(r,.52);assert(!r.reload);assert(r.fire());assert.equal(r.shots,1);
});
test('T04 ADS request waits through reload and resumes at the correct interpolation rate',()=>{
 const r=rifle({config:{initialMagazine:5}});r.load();r.setIntent({ads:true});step(r,2.1);assert.equal(r.ads,0);step(r,.11);near(r.ads,.5);step(r,.11);near(r.ads,1);
});
test('T04 pause freezes reload resource timing; death cancels it at the committed boundary',()=>{
 for(const time of [1.25,1.27]){const r=rifle({config:{initialMagazine:4}});r.load();step(r,time);const before=total(r),magazine=r.magazine;r.setPaused(true);step(r,3);assert.equal(r.magazine,magazine);assert.equal(total(r),before);r.setPaused(false);r.clearFireInput('dead');step(r,3);assert(!r.reload);assert.equal(r.magazine,magazine);assert.equal(total(r),before);assert(!r.fire());}
});
test('T05 one burst commits three shots at the 690-RPM schedule at 30/60/120Hz',()=>{
 for(const hz of [30,60,120]){const r=rifle();r.setMode('burst');r.requestTrigger();assert(r.fire());step(r,1,hz,true);const shots=r.drainEvents().filter(e=>e.type==='shot');assert.equal(shots.length,3);near(shots[1].scheduledTime-shots[0].scheduledTime,60/690);near(shots[2].scheduledTime-shots[1].scheduledTime,60/690);assert.equal(r.total,27);}
});
test('T06 500 semi trigger requests never exceed RPM and leave only one buffered shot',()=>{
 const r=rifle({config:{modes:['semi'],initialMagazine:30,initialReserve:0}});for(let i=0;i<500;i++){r.requestTrigger();r.fire();r.tick(.002);}assert(r.shots<=Math.floor(690/60)+1);const shots=r.shots;step(r,.08,60,true);assert(r.shots<=shots+1);const after=r.shots;step(r,.5,60,true);assert.equal(r.shots,after);
 const q=rifle({config:{modes:['semi']}});assert(tap(q));step(q,.04);for(let i=0;i<500;i++)q.requestTrigger();step(q,.05);assert(q.fire());step(q,.2);assert(!q.fire());assert.equal(q.shots,2);
});
test('T06 ordinary trigger buffer expires after 80ms and cannot accumulate late equip taps',()=>{
 const r=rifle();r.activate();step(r,.3);r.requestTrigger();step(r,.16);assert(!r.fire());r.requestTrigger();assert(r.fire());
});
test('T21 focus delta clamps and clears held/burst input without a catch-up volley',()=>{
 for(const mode of ['auto','burst']){const r=rifle();if(mode==='burst')r.setMode(mode);r.setFireInput(true);assert(r.fire());r.tick(5);near(r.time,.25);for(let i=0;i<10;i++)assert(!r.fire());r.setFireInput(true);assert(!r.fire());r.setFireInput(false);r.setFireInput(true);assert(r.fire());assert.equal(r.shots,2);}
});
test('T21 pause and switch cancel cycle cues so no orphan shot identity plays after resume',()=>{
 for(const gate of ['pause','switch','death']){const r=rifle();assert(tap(r));r.drainEvents();if(gate==='pause'){r.setPaused(true);r.setPaused(false);}if(gate==='switch'){r.deactivate();r.activate();}if(gate==='death')r.clearFireInput('dead');step(r,.6);assert.equal(r.drainEvents().filter(e=>e.type==='riflecycle').length,0);}
});
test('T22 accumulated deadlines yield exactly 24 shots over two seconds at 30/60/120Hz',()=>{
 for(const hz of [30,60,120]){const r=rifle({config:{initialMagazine:30,initialReserve:0}});r.setFireInput(true);r.fire();step(r,2,hz,true);const shots=r.drainEvents().filter(e=>e.type==='shot');assert.equal(shots.length,24);near(shots.at(-1).scheduledTime,2);assert.equal(total(r),7);for(let i=1;i<shots.length;i++)near(shots[i].scheduledTime-shots[i-1].scheduledTime,60/690);}
});
test('T22 fixed 60Hz combat produces identical recoil, shot samples, damage and ammo at render 30/60/120',()=>{
 const outcomes=[];for(const renderHz of [30,60,120]){const r=rifle({config:{initialMagazine:30,initialReserve:0}});r.setFireInput(true);r.fire();let accumulator=0,damage=15;for(let frame=0;frame<renderHz*2;frame++){accumulator+=1/renderHz;while(accumulator+1e-10>=1/60){r.tick(1/60);while(r.shouldFire()){r.fire();damage+=damageAt(15,'torso',0,r.config).damage;}accumulator-=1/60;}}outcomes.push({damage,ammo:r.total,recoil:r.recoil,shots:r.drainEvents().filter(e=>e.type==='shot')});}assert.deepEqual(outcomes[0],outcomes[1]);assert.deepEqual(outcomes[1],outcomes[2]);assert.equal(outcomes[0].damage,360);
});
test('bounded catch-up permits due shots only up to the configured per-tick cap',()=>{
 const r=rifle({config:{rpm:3000,burstRpm:3000,cycleTime:.01}});r.setFireInput(true);r.fire();r.tick(.15);const due=[];while(r.shouldFire())due.push(r.fire());assert.equal(due.length,3);assert(!r.fire());assert.equal(r.total,26);
});
test('newly open equip, wall, sprint and reload gates never replay pre-gate timing debt',()=>{
 for(const gate of ['equip','wall','sprint','reload']){
  const r=rifle({config:{initialMagazine:gate==='reload'?0:29,initialChamber:gate==='reload'?0:1}});
  if(gate==='equip'){r.activate();r.setFireInput(true);step(r,.46);}
  if(gate==='wall'){r.setBlocked(true);r.setFireInput(true);step(r,.15);r.setBlocked(false);}
  if(gate==='sprint'){r.setIntent({sprint:true});r.setFireInput(true);step(r,.1);r.setIntent({});step(r,.19);}
  if(gate==='reload'){r.load();step(r,2.55);r.setFireInput(true);step(r,.05);}
  const shots=[];while(r.shouldFire())shots.push(r.fire());assert.equal(shots.length,1,gate);near(shots[0].scheduledTime,r.time);step(r,.08);assert(!r.fire(),gate);step(r,.007);assert(r.fire(),gate);
 }
});
test('T23 instance export/restore keeps rounds, identity, mode, sequence and commit recovery',()=>{
 const r=rifle({config:{initialMagazine:7}});r.setMode('burst');assert(tap(r));step(r,.2,120,true);r.load();step(r,1.3);const saved=r.exportInstance();assert(validateInstance(saved));assert(saved.reloadCheckpoint.committed);const reserve=r.reserve,q=rifle({weaponInstanceId:'temporary',sessionId:'new-session'});assert(q.restoreInstance(saved,{reserve,sessionId:'new-session'}));assert.equal(q.total,r.total);assert.equal(q.reserve,reserve);assert.equal(q.mode,'burst');assert.equal(q.shots,3);assert.equal(q.weaponInstanceId,r.weaponInstanceId);assert(!q.reload);assert(!q.fire());step(q,saved.recoveryRemaining);q.requestTrigger();const shot=q.fire();assert(shot);assert.equal(shot.shotSequence,4);assert(shot.shotId.includes('new-session'));assert.equal(q.reserve,reserve);
});
test('T23 invalid restore is rejected atomically without replacing current instance ammunition',()=>{
 const r=rifle(),saved=r.exportInstance();for(const change of [{magazine:31},{chamber:2},{shotSequence:-1},{recoveryRemaining:NaN},{weaponInstanceId:''},{reloadCheckpoint:{kind:'empty',committed:'yes'}},{unknown:true}]){const before=r.snapshot();assert.equal(r.restoreInstance({...saved,...change},{reserve:0}),false);assert.deepEqual(r.snapshot(),before);}assert.equal(r.restoreInstance(saved,{reserve:-1}),false);
});
test('T23 two R4 instances and separate sessions never share shot identity',()=>{
 const a=rifle(),b=rifle({weaponInstanceId:'r4-instance-B'}),c=rifle({sessionId:'combat-B'});const ids=[tap(a).shotId,tap(b).shotId,tap(c).shotId];assert.equal(new Set(ids).size,3);const saved=a.exportInstance();assert(b.restoreInstance(saved,{reserve:12,sessionId:'combat-C'}));step(b,.1);assert.equal(tap(b).shotSequence,2);assert.equal(a.reserve,120);assert.equal(b.reserve,12);
});
test('T24 repeated canceled-reload save/load boundaries never apply transfer a second time',()=>{
 for(const at of [1.2,1.3,2.09]){let r=rifle({config:{initialMagazine:0,initialChamber:0}});r.load();step(r,at);r.cancelReload('inventory');const original=total(r),saved=r.exportInstance(),reserve=r.reserve;for(let i=0;i<8;i++){const q=rifle();assert(q.restoreInstance(saved,{reserve,active:false}));step(q,3);assert.equal(total(q),original);assert.equal(q.magazine,saved.magazine);assert.equal(q.chamber,saved.chamber);assert(!q.reload);r=q;}}
});
test('near-contact wall overlay blocks both firing and ADS without a resource commit',()=>{
 const r=rifle();r.setIntent({ads:true,blockedByWall:true});r.setFireInput(true);step(r,.3);assert(!r.fire());assert.equal(r.total,30);assert.equal(r.ads,0);assert.equal(r.state,'blocked-by-wall');r.setBlocked(false);assert(r.fire());assert.equal(r.total,29);
});
test('R4 proposed distance/head/limb profile has exact endpoints',()=>{
 near(damageAt(35,'torso',0,R4).damage,15);near(damageAt(95,'torso',0,R4).damage,9.75);near(damageAt(0,'head',0,R4).damage,24);near(damageAt(0,'limb',0,R4).damage,12);near(damageAt(161,'torso',0,R4).damage,0);
});
test('AmmoLedger enforces conservation and commit replay across transfer, chamber and shot',()=>{
 const ledger=new AmmoLedger({magazine:0,chamber:0,reserve:31});assert(ledger.reload('reload-1'));assert.equal(ledger.reload('reload-1'),null);assert(ledger.chamberRound('charge-1'));assert.equal(ledger.chamberRound('charge-1'),null);assert(ledger.shot('shot-1'));assert.equal(ledger.shot('shot-1'),null);assert.equal(ledger.total,30);assert.equal(ledger.spent,1);assert(ledger.verify());assert.throws(()=>ledger.commit('bad','test',{magazine:30,chamber:1,reserve:1}));assert.equal(ledger.total,30);
});
console.log(`FINAL: ${count} R4 data/commit/cadence/instance foundation checks passed. Actual browser inputs and listening remain unverified.`);
