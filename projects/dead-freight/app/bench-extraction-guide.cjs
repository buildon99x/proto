/* Pure CPU diagnostic only. This is not browser frame-rate measurement. */
'use strict';
const assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),W=require('./world.js');
const walls=W.definition.walls.map(w=>({...w,alive:true})),zone=W.definition.extractionZones[1];
const points=[{x:126,z:-108},{x:138,z:-121},{x:119,z:-118},{x:142,z:-120}],warm=W.createExtractionGuide(walls);
for(const p of points)assert.deepEqual(warm(p,zone),W.extractionGuide(p,zone,walls));
function run(fn,count){const start=performance.now();for(let i=0;i<count;i++)fn(points[i%points.length],zone);return (performance.now()-start)/count;}
// Warm up JIT separately; cold below still rebuilds each fixed-node graph.
run((p,z)=>W.extractionGuide(p,z,walls),200);run(warm,200);
const result={units:'milliseconds per call',runtime:process.version,wallCount:walls.length,points:points.length,samples:5,callsPerSample:1000,scope:'Pure Node CPU; not browser FPS or visual/input acceptance'};
for(const [name,fn] of [['uncached',(p,z)=>W.extractionGuide(p,z,walls)],['coldCache',(p,z)=>W.createExtractionGuide(walls)(p,z)],['warmCache',warm]]){const samples=Array.from({length:5},()=>run(fn,1000));result[name]={median:samples.slice().sort((a,b)=>a-b)[2],samples};}
console.log(JSON.stringify(result,null,2));
