import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
const root='/workspace/shared/emberwatch-frame-stall-diagnostics/app/';
const source=readFileSync(root+'src/main.js','utf8');
const {mainImports}=await import(root+'tests/support/main-imports.mjs');
const {stages}=await import(root+'tests/support/earned-wilderness-route.mjs');
const {connectedFloor}=await import(root+'src/scene-visibility.js');
const {wildernessClue,validateWildernessProgress,validateWildernessAncestry}=await import(root+'src/wilderness.js');
const {createMap,getRegion}=mainImports;
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const cacheSource=source.slice(source.indexOf('function wildernessView('),source.indexOf('function interactionCandidates('));
const start=source.indexOf('   const sceneVisibility=wildernessSceneVisibility('),end=source.indexOf("   if(frameObservation.enabled)frameObservation.endPhase('scene');",start);
assert.ok(start>0&&end>start);
const sceneSource=source.slice(start,end);
const makeRunner=(deps=mainImports)=>new Function('deps',`const {${Object.keys(mainImports).join(',')}}=deps;\n${cacheSource}\nreturn function(state,battle,contactTrace={enabled:false}) {const qaStepped=false,qaMove=null;\n${sceneSource}\nreturn {sceneVisibility,objects};}`)(deps);
const summarize=xs=>{const a=[...xs].sort((a,b)=>a-b);return {n:a.length,p50Ms:a[Math.ceil(a.length*.5)-1],p95Ms:a[Math.ceil(a.length*.95)-1],maxMs:a.at(-1),minMs:a[0],totalMs:a.reduce((a,b)=>a+b,0)};};
const results={version:'R14a15',node:process.version,measurement:'Plain Node production JavaScript only. Exact extracted main scene block. No browser/Canvas/DOM/storage/audio/render; wall-clock intervals include scheduling/GC and are not exclusive CPU timings.',mainSha256:hash(source),sceneBlockSha256:hash(sceneSource),cases:[],components:[],attribution:[],fixtures:{}};
const dir='/workspace/shared/r14a15-scene-cost-audit';
const fixtureFile=dir+'/earned-scene-fixtures.json';
let earned;
if(process.argv.includes('--fixtures-ready'))earned=JSON.parse(readFileSync(fixtureFile,'utf8'));else{const t=performance.now();earned=stages();writeFileSync(fixtureFile,JSON.stringify(earned));results.fixtureGenerationMs=performance.now()-t;}
const runScene=makeRunner();
let retained;
for(const stage of ['entered','chosen','approach','evidence']){
 const base=earned[stage],b=mainImports.createBattle(base),before=hash({base,b}),r=getRegion(b.region);
 results.fixtures[stage]={level:base.character.level,region:b.region,mapWidth:b.map.w,mapHeight:b.map.h,tiles:b.map.w*b.map.h,floorTiles:b.map.tiles.flat().filter(x=>x===1).length,reachableTiles:connectedFloor(b.map,b.p).flat().filter(Boolean).length,objects:r.objects.length,npcs:r.npcs.length,portals:r.portals.length,defeated:Object.values(base.world.defeated).reduce((n,a)=>n+a.length,0),sourceHash:hash(base)};
 for(const mode of ['cold-new-state','warm-same-state']){
  const n=mode==='cold-new-state'?12:1000,inputs=mode==='cold-new-state'?Array.from({length:n},()=>structuredClone(base)):Array(n).fill(base),times=[];
  if(mode==='warm-same-state')retained=runScene(base,b);
  const cpu=process.cpuUsage(),wall=performance.now();
  for(const s of inputs){const t=performance.now();retained=runScene(s,b);times.push(performance.now()-t);}
  const cpuUsed=process.cpuUsage(cpu);
  results.cases.push({stage,mode,...summarize(times),loopWallMs:performance.now()-wall,cpuUserMs:cpuUsed.user/1000,cpuSystemMs:cpuUsed.system/1000,outputObjects:retained.objects.length});
 }
 const metrics={};const deps={...mainImports};
 for(const name of ['wildernessSceneVisibility','signalSceneVisibility','wildernessObjectView','wildernessPortalView','getRegion'])deps[name]=(...args)=>{const t=performance.now();const out=mainImports[name](...args);(metrics[name]??=[]).push(performance.now()-t);return out;};
 const timed=makeRunner(deps),cold=structuredClone(base),t=performance.now();timed(cold,b);results.attribution.push({stage,totalMs:performance.now()-t,overlappingInclusiveFunctions:Object.fromEntries(Object.entries(metrics).map(([k,xs])=>[k,summarize(xs)]))});
 assert.equal(hash({base,b}),before,'scene mutated frozen fixture');
}
const base=earned.entered,b=mainImports.createBattle(base);
for(const [name,n,fn] of [
 ['connectedFloor',2000,()=>connectedFloor(b.map,b.p)],
 ['createMap',2000,()=>createMap(b.region,base)],
 ['validateWildernessProgress',20,()=>validateWildernessProgress(base)],
 ['validateWildernessAncestry',20,()=>validateWildernessAncestry(base)],
 ['wildernessClue',20,()=>wildernessClue(base)],
 ['allObjectViewsWithoutMainCache',12,()=>getRegion(b.region).objects.map(o=>mainImports.wildernessObjectView(base,o))],
 ['allPortalViewsWithoutMainCache',12,()=>getRegion(b.region).portals.map(o=>mainImports.wildernessPortalView(base,o))]
]){const times=[],cpu=process.cpuUsage(),wall=performance.now();for(let i=0;i<n;i++){const t=performance.now();retained=fn();times.push(performance.now()-t);}const used=process.cpuUsage(cpu);results.components.push({name,...summarize(times),loopWallMs:performance.now()-wall,cpuUserMs:used.user/1000,cpuSystemMs:used.system/1000});}
writeFileSync(dir+'/benchmark-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
