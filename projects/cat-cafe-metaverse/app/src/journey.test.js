import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./main.js',import.meta.url),'utf8');
test('both entry handlers gate rendering before changing sessions',()=>{assert.match(source,/function connect\(\)\{if\(!requireRenderer\(\)\)return;/);assert.match(source,/function startPreview\(\)\{if\(!requireRenderer\(\)\)return;/);});
test('leave returns to welcome and room transitions clear selected guidance',()=>{assert.match(source,/\$\('#leave'\)\.onclick=[^\n]+showModal\(\)/);assert.match(source,/selected=null;state=null;world\?\.setRoom\(room\)/);});
test('manual refresh is visible and throttled without polling',()=>{assert.match(source,/\$\('#recheck-service'\)\.onclick/);assert.match(source,/Date.now\(\)-lastDiscoveryAt<10000/);});
test('journey helper blocks callbacks until renderer is ready',async()=>{const {allowEntry}=await import('./journey.js');let calls=0;assert.equal(allowEntry(false,()=>calls++),false);assert.equal(calls,0);assert.equal(allowEntry(true,()=>calls++),true);assert.equal(calls,1);});
test('camera-relative directions handle yaw and zero distance',async()=>{const {catBearing}=await import('./journey.js');const me={x:0,z:0};assert.equal(catBearing(me,{x:0,z:-6},0).direction,'앞쪽');assert.equal(catBearing(me,{x:6,z:0},0).direction,'오른쪽');assert.equal(catBearing(me,{x:-6,z:0},Math.PI/2).direction,'앞쪽');assert.equal(catBearing(me,{x:0,z:-6},Math.PI/2).direction,'오른쪽');assert.equal(catBearing(me,me,0).direction,'바로 곁');assert.equal(catBearing(null,me,0),null);});
test('rest descriptions use shared phase and correct room not invented mode',async()=>{const {catActivity}=await import('./journey.js');assert.match(catActivity({id:'cat-0',mode:'idle'},60000,'sunroom'),/잠/);assert.match(catActivity({id:'cat-0',mode:'idle'},60000,'garden'),/쉬/);assert.match(catActivity({id:'cat-0',mode:'pet'},60000,'sunroom'),/쓰다듬/);});
test('context loss exits before showing renderer recovery',()=>{assert.match(source,/webglcontextlost[^\n]+rendererFailed=true;disconnect\(\);showRendererRecovery\(\)/);});
test('live feedback never praises newly selected cat or accepts late acknowledgement',async()=>{const {settleAction}=await import('./journey.js'),{ActionJourney}=await import('./action-journey.js'),{ActionFeedback}=await import('./audio.js');let now=0;const j=new ActionJourney({clock:()=>now}),f=new ActionFeedback(()=>now);j.begin({requestId:'r1',action:'pet',catId:'cat-1'});f.track('r1','pet');assert.equal(settleAction(j,f,{type:'actionResult',requestId:'other',ok:true},'cat-1').status,'ignored');assert.ok(j.pending);const other=settleAction(j,f,{type:'actionResult',requestId:'r1',ok:true},'cat-2');assert.equal(other.playSound,false);assert.equal(other.status,'succeeded');assert.equal(j.pending,null);j.begin({requestId:'r2',action:'ball',catId:'cat-2'});f.track('r2','ball');now=5000;assert.equal(settleAction(j,f,{type:'actionResult',requestId:'r2',ok:true},'cat-2').status,'timed-out');assert.equal(f.pending.size,0);});
test('actual entry function bodies perform no socket or preview side effect when renderer guard fails',()=>{for(const [name,next]of[['connect','disconnect'],['startPreview',null]]){const start=source.indexOf(`function ${name}(){`),end=next?source.indexOf(`function ${next}(){`,start):source.indexOf("$('#recheck-service').onclick",start);const body=source.slice(start,end);let checks=0;const run=new Function('requireRenderer',`${body};return ${name};`)(()=>{checks++;return false;});assert.doesNotThrow(run);assert.equal(checks,1);}});
test('blur and hidden refresh cleared pending UI without waiting for another snapshot',()=>{assert.match(source,/addEventListener\('blur',\(\)=>\{stop\(\);cafeAudio.cleanup\(\);actionFeedback.clear\(\);actionJourney.clear\(\);controls\(\)/);assert.match(source,/function enterBackground\(immediate=false\)\{if\(!wasBackground\)\{wasBackground=true;stop\(\);cafeAudio.cleanup\(\);actionFeedback.clear\(\);actionJourney.clear\(\);controls\(\)/);});

test('quiet selected-cat personality stays tied to real phase, stable and concise',async()=>{
 const {catActivity}=await import('./journey.js');
 const phrases=new Set();
 for(let id=0;id<18;id++){const cat={id:`cat-${id}`,mode:'idle'};const a=catActivity(cat,60000,'sunroom');assert.equal(a,catActivity(cat,60000,'sunroom'));assert.ok(a.length<=65);phrases.add(a);}
 assert.ok(phrases.size>=6,'different cats should offer more than the five generic phase labels');
 for(const action of ['pet','feather','ball'])assert.match(catActivity({id:'cat-0',mode:action},60000,'sunroom'),{pet:/쓰다듬/,feather:/깃털/,ball:/공/}[action]);
 assert.equal(catActivity(null,0,'sunroom'),'');
});

test('own active action is described with remaining time and only its repeated action is blocked',async()=>{
 const {activeCatAction}=await import('./journey.js');
 const cat={mode:'feather',owner:'me',until:4000};
 assert.deepEqual(activeCatAction(cat,'me',1750),{action:'feather',seconds:3,message:'깃털 놀이 중 · 약 3초 뒤 다시 놀 수 있어요'});
 assert.equal(activeCatAction(cat,'other',1750),null);
 assert.equal(activeCatAction(cat,'me',4000),null);
 assert.equal(activeCatAction({...cat,until:NaN},'me',1750),null);
 assert.equal(activeCatAction({...cat,mode:'idle'},'me',1750),null);
});
