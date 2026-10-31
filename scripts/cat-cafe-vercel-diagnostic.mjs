import {pathToFileURL} from 'node:url';
// No provider import or network work on main, other projects or ordinary builds.
export async function runBuildDiagnostic(env=process.env,diagnostic){
 if(env.CAT_CAFE_REDIS_DIAGNOSTIC!=='bootstrap-once'||env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='codex/cat-cafe-metaverse')return{skipped:true};
 if(env.CAT_CAFE_REALTIME_ENABLED==='1')throw Error('Disable live service before diagnostic');
 const run=diagnostic??(await import('../projects/cat-cafe-metaverse/server/distributed/diagnostic.mjs')).runDiagnostic;
 return run(env);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 runBuildDiagnostic().then(result=>{if(!result.skipped)console.log('CAT_CAFE_REDIS_DIAGNOSTIC',JSON.stringify(result));}).catch(()=>{console.error('CAT_CAFE_REDIS_DIAGNOSTIC failed; private provider details omitted');process.exitCode=1;});
}
