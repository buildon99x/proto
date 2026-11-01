import {pathToFileURL} from 'node:url';
// No provider import or network work on main, other projects or ordinary builds.
export async function runBuildDiagnostic(env=process.env,diagnostic){
 if(!['bootstrap-once','budget-readonly'].includes(env.CAT_CAFE_REDIS_DIAGNOSTIC)||env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='codex/cat-cafe-metaverse')return{skipped:true};
 if(env.CAT_CAFE_REALTIME_ENABLED==='1')throw Error('Disable live service before diagnostic');
 const run=diagnostic??(env.CAT_CAFE_REDIS_DIAGNOSTIC==='budget-readonly'?(await import('../projects/cat-cafe-metaverse/server/distributed/budget-inspection.mjs')).inspectBudget:(await import('../projects/cat-cafe-metaverse/server/distributed/diagnostic.mjs')).runDiagnostic);
 return run(env);
}
export function safeDiagnosticStage(error){return ['join','movement','shared-join','approach-cat','cat-race','replay-fence','switch-resume','cleanup'].includes(error?.diagnosticStage)?error.diagnosticStage:'initialization-or-unknown';}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 runBuildDiagnostic().then(result=>{if(!result.skipped)console.log('CAT_CAFE_REDIS_DIAGNOSTIC',JSON.stringify(result));}).catch(error=>{console.error('CAT_CAFE_REDIS_DIAGNOSTIC failed at '+safeDiagnosticStage(error)+'; private provider details omitted');process.exitCode=1;});
}
