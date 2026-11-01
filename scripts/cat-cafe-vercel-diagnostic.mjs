import {pathToFileURL} from 'node:url';
// No provider import or network work on main, other projects or ordinary builds.
export async function runBuildDiagnostic(env=process.env,diagnostic,{afterBuild=false}={}){
 const timing=env.CAT_CAFE_REDIS_DIAGNOSTIC==='public-timing';
 const migration=env.CAT_CAFE_REDIS_DIAGNOSTIC==='migrate-authority-v2';
 if((migration||timing)!==afterBuild)return{skipped:true};
 if(!['public-timing','migrate-authority-v2','bootstrap-once','budget-readonly','state-health-readonly','migration-inspect'].includes(env.CAT_CAFE_REDIS_DIAGNOSTIC)||env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='codex/cat-cafe-metaverse')return{skipped:true};
 if(!timing&&env.CAT_CAFE_REALTIME_ENABLED==='1')throw Error('Disable live service before diagnostic');
 const run=diagnostic??(env.CAT_CAFE_REDIS_DIAGNOSTIC==='migration-inspect'?(await import('../projects/cat-cafe-metaverse/server/distributed/budget-inspection.mjs')).inspectMigration:timing?(await import('../projects/cat-cafe-metaverse/server/public-timing-build.mjs')).runPublicTiming:migration?(await import('../projects/cat-cafe-metaverse/server/distributed/migration.mjs')).migrateAuthority:env.CAT_CAFE_REDIS_DIAGNOSTIC==='state-health-readonly'?(await import('../projects/cat-cafe-metaverse/server/distributed/budget-inspection.mjs')).inspectStateHealth:env.CAT_CAFE_REDIS_DIAGNOSTIC==='budget-readonly'?(await import('../projects/cat-cafe-metaverse/server/distributed/budget-inspection.mjs')).inspectBudget:(await import('../projects/cat-cafe-metaverse/server/distributed/diagnostic.mjs')).runDiagnostic);
 return run(env);
}
export function safeDiagnosticCode(error){const codes=['INVALID_CHECKPOINT','STORE_UNAVAILABLE','REDIS_NOSCRIPT','ERR_ASSERTION'];return codes.includes(error?.code)?error.code:'UNCLASSIFIED';}
export function safeDiagnosticStage(error){return ['join','movement','shared-join','approach-cat','cat-race','replay-fence','switch-resume','cleanup','migration-budget-before','migration-commit','migration-idempotence','migration-legacy-check','migration-legacy-open','migration-legacy-commit','migration-legacy-release','migration-legacy-bootstrap','migration-state-readback','migration-budget-readback','migration-budget-verify','migration-elapsed-verify','migration-reserve-verify','migration-state-verify'].includes(error?.diagnosticStage)?error.diagnosticStage:'initialization-or-unknown';}
export function safeDiagnosticReason(error){return ['ASSERTION','BUDGET_EXHAUSTED','SCHEMA_MISMATCH','STATE_TOO_LARGE','STORE_NOT_INITIALIZED','BUDGET_STATE_MISSING','BOOTSTRAP_CONFLICT'].includes(error?.diagnosticReason)?error.diagnosticReason:'UNCLASSIFIED';}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 runBuildDiagnostic(process.env,undefined,{afterBuild:process.argv.includes('--after-build')}).then(result=>{if(!result.skipped)console.log('CAT_CAFE_REDIS_DIAGNOSTIC',JSON.stringify(result));if(result.kind==='public-timing'&&!result.passed)process.exitCode=1;}).catch(error=>{console.error('CAT_CAFE_REDIS_DIAGNOSTIC failed at '+safeDiagnosticStage(error)+'; '+safeDiagnosticCode(error)+'; '+safeDiagnosticReason(error)+'; private provider details omitted');process.exitCode=1;});
}
