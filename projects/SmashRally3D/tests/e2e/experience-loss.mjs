export const meta={viewport:{width:640,height:360}};
import {run as base} from './loss-rematch.mjs';
export async function run(ctx){
 await ctx.page.click('[data-action="settings"]');await ctx.page.select('#quality','LOW');await ctx.page.click('[data-action="close"]');
 await base(ctx);
 const d=await ctx.page.evaluate(()=>window.smashDiagnostics());
 if(d.pointAudioEvents!==0||d.rallyMiss)throw Error('Stale loss/rematch outcome state');
 ctx.log('EXPERIENCE LOSS PASS',JSON.stringify({rematch:d.phase,pointAudioEvents:d.pointAudioEvents}));
}
