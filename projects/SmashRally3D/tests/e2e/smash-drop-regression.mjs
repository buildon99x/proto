export const meta={viewport:{width:640,height:400}};
import {run as base} from './drop-defence.mjs';
export async function run(ctx) {
 let summary;
 await base({...ctx,difficulties:['NORMAL','HARD'],patterns:['centre-soft'],selectedIntent:'drop',settledLimit:3,
  log:(label,json)=>{ctx.log(label,json);if(label==='DROP DEFENCE PASS')summary=JSON.parse(json);}});
 if(summary?.matches.length!==2)throw Error('Incomplete defence windows');
 for(const m of summary.matches)if(m.metrics.returned<3||m.metrics.directWinners)throw Error('Drop defence regression');
 ctx.log('SMASH DROP REGRESSION PASS',JSON.stringify({windows:2,physicalAiReturns:6,directWinners:0,method:'Visible selected DROP cue and native right click; no state injection'}));
}
