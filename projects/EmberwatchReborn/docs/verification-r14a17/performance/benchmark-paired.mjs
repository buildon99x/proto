import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const dir='/workspace/shared/r14a15-scene-cost-audit',roots={baseline:'/workspace/shared/emberwatch-frame-stall-diagnostics/app/',candidate:(process.argv[2]??'/workspace/shared/emberwatch-scene-validation-cache-patch/app/')};
const fixtures=JSON.parse(readFileSync(dir+'/earned-scene-fixtures.json','utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
const summary=xs=>{const a=[...xs].sort((a,b)=>a-b);return {n:a.length,p50Ms:a[Math.ceil(a.length*.5)-1],p95Ms:a[Math.ceil(a.length*.95)-1],maxMs:a.at(-1)};};
const results={measurement:'Node exact-main scene: synthetic command-earned fixtures. Cold candidate includes canonical-copy+freeze cost and first scene. No native/browser/frame-gap acceptance.',sourceHashes:{},pairs:[]};
const runners={};
for(const [tag,root] of Object.entries(roots)){
 const {mainImports}=await import(root+'tests/support/main-imports.mjs'),source=readFileSync(root+'src/main.js','utf8');
 const helper=source.slice(source.indexOf('function wildernessView('),source.indexOf('function interactionCandidates('));
 const a=source.indexOf('   const sceneVisibility=wildernessSceneVisibility('),b=source.indexOf("   if(frameObservation.enabled)frameObservation.endPhase('scene');",a);assert.ok(a>0&&b>a);
 const run=new Function('deps',`const {${Object.keys(mainImports).join(',')}}=deps;\n${helper}\nreturn function(state,battle){const contactTrace={enabled:false},qaStepped=false,qaMove=null;${source.slice(a,b)};return {sceneVisibility,objects};}`)(mainImports);
 runners[tag]={run,mainImports};results.sourceHashes[tag]=hash(source);
}
for(const stage of ['entered','chosen','approach','evidence']){
 const base=fixtures[stage],battle=runners.baseline.mainImports.createBattle(base),before=JSON.stringify({base,battle}),row={stage,cold:{},warm:{},outputsEqual:true};
 const semantic=v=>JSON.stringify({objects:v.objects,seen:v.sceneVisibility.seen,combat:v.sceneVisibility.combat,foes:battle.enemies.map(v.sceneVisibility.entityVisible)});
 const outputs={};
 // Alternate execution order by stage to avoid always giving the same variant a cold CPU.
 const order=['chosen','evidence'].includes(stage)?['candidate','baseline']:['baseline','candidate'];
 for(const tag of order){
  const {run,mainImports}=runners[tag],times=[],prep=[],states=Array.from({length:10},()=>structuredClone(base)),cpu=process.cpuUsage(),start=performance.now();let state,out;
  for(const raw of states){const t=performance.now();state=tag==='candidate'?mainImports.freezeOwnedSnapshot(raw):raw;const p=performance.now()-t;out=run(state,battle);times.push(performance.now()-t);prep.push(p);}
  const usage=process.cpuUsage(cpu);row.cold[tag]={...summary(times),canonicalCopyFreeze:summary(prep),loopWallMs:performance.now()-start,cpuUserMs:usage.user/1000,cpuSystemMs:usage.system/1000};outputs[tag]=semantic(out);
  const warm=[];for(let i=0;i<1000;i++){const t=performance.now();out=run(state,battle);warm.push(performance.now()-t);}row.warm[tag]=summary(warm);
 }
 assert.equal(outputs.candidate,outputs.baseline,'scene output mismatch '+stage);assert.equal(JSON.stringify({base,battle}),before,'fixture mutated');results.pairs.push(row);
}
writeFileSync(dir+'/paired-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
