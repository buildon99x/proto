export const meta={viewport:{width:640,height:400}};
import {run as base} from './good-drop-pressure.mjs';
export async function run(ctx){
 let summary;const records=[];
 await base({...ctx,log:(label,json)=>{ctx.log(label,json);if(label==='DROP DEFENCE PASS')summary=JSON.parse(json);if(label==='DROP MATCH')records.push(JSON.parse(json))}});
 const matches=summary?.matches||[];
 if(matches.length!==2)throw Error('Missing pressure windows');
 const returned=matches.reduce((n,m)=>n+m.metrics.returned,0),winners=matches.reduce((n,m)=>n+m.metrics.directWinners,0);
 const strongWinners=records.flatMap(r=>r.attempts).filter(a=>a.directWinner&&['good','perfect'].includes(a.hit.quality)).length;
 if(!returned||!strongWinners)throw Error('Strong soft attacks/AI replies not both observed');
 ctx.log('EXPERIENCE PRESSURE PASS',JSON.stringify({returned,directWinners:winners,goodPerfectWinners:strongWinners,method:'Original GOOD-drop pressure controller, two NORMAL patterns,10 settled attempts or natural match end per window. Rendering viewport only reduced; no physics/AI changes.'}));
}
