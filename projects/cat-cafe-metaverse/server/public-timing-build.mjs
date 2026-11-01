import {runTimingDiagnostic} from './timing-diagnostic.mjs';
// Operator sets only an independently verified immutable candidate origin.
export function timingTarget(value){
 const u=new URL(value);
 if(u.protocol!=='https:'||u.origin!==value||u.username||u.password||u.port||!/^loop-[a-z0-9]{9}-silentstacks-projects\.vercel\.app$/.test(u.hostname))throw Error('TIMING_TARGET_DENIED');
 return{origin:u.origin,url:`wss://${u.host}/api/cat-cafe-metaverse/ws`};
}
export async function runPublicTiming(env=process.env,{run=runTimingDiagnostic}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='codex/cat-cafe-metaverse'||env.CAT_CAFE_REDIS_DIAGNOSTIC!=='public-timing')throw Error('Timing scope denied');
 const target=timingTarget(env.CAT_CAFE_TIMING_URL);
 const result=await run({...target,room:'sunroom',durationMs:15000});
 return{kind:'public-timing',passed:result.status==='completed'&&result.samples>=21&&result.deadlineCompleted===true&&result.movementStopSent===true&&result.closed===true,executionRegion:/^[a-z]{3}\d{1,2}$/.test(env.VERCEL_REGION??'')?env.VERCEL_REGION:'unknown',...result,regionCaveat:'Build-region observation and synthetic replay; not Korea/mobile latency, browser FPS or visual validation'};
}
