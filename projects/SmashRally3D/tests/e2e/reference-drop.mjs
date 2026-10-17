export {meta} from './drop-defence.mjs';
import {run as base} from './drop-defence.mjs';
export async function run(ctx) {
 let summary;
 await base({...ctx,settledLimit:3,log:(label,json)=>{
   ctx.log(label,json);
   if(label==='DROP DEFENCE PASS')summary=JSON.parse(json);
 }});
 if(summary?.matches.length!==9)throw Error('Nine difficulty/placement windows were not completed');
 for(const m of summary.matches) {
   if(m.metrics.returned<3 || m.metrics.directWinners)throw Error('Repeated DROP defence regressed: '+JSON.stringify(m));
 }
 ctx.log('BOUNDED DROP REGRESSION PASS',JSON.stringify({windows:9,settledReturns:summary.matches.reduce((n,m)=>n+m.metrics.returned,0),directWinners:0}));
}
