import {MAGMA_RULES} from './magma-combat.js';
import {STORM_RULES,stormPerfectStart} from './storm-combat.js';
// Existing simulation clocks only. A timing window is not a resource/queue promise.
export function combatTimingWindows(b,{paused=false}={}){
 if(paused||!b||b.dead||!(b.p?.hp>0))return [];
 const rows=[],token=b.magma?.token;
 if(b.magmaEnabled&&b.p.block&&token?.remaining>1e-9)rows.push({kind:'shield-release',ratio:Math.min(1,token.remaining/MAGMA_RULES.releaseWindow),label:'해제 판정 창 · 방패 놓기'});
 if(b.stormEnabled&&b.storm.bells.some(x=>x.active&&x.remaining>1e-9)&&!b.p.action?.stormDash&&stormPerfectStart(b))rows.push({kind:'storm-perfect',ratio:Math.max(0,Math.min(1,(STORM_RULES.perfectWindow-(b.time-b.storm.lastTimedContact))/STORM_RULES.perfectWindow)),label:'정타 판정 창 · 돌진 시작'});
 return rows;
}
export function drawCombatTiming(ctx,b,project,{paused=false}={}){
 const rows=combatTimingWindows(b,{paused});if(!rows.length)return 0;
 const p=project(b.p);ctx.save();ctx.font='12px sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';
 rows.forEach((row,i)=>{const y=p.y-78-i*27;ctx.strokeStyle='#25323c';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(p.x-42,y);ctx.lineTo(p.x+42,y);ctx.stroke();ctx.strokeStyle=row.kind==='shield-release'?'#ffe1af':'#b7e9eb';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x-42,y);ctx.lineTo(p.x-42+84*row.ratio,y);ctx.stroke();ctx.fillStyle='#f5ede0';ctx.fillText(row.label,p.x,y-5);});
 ctx.restore();return rows.length;
}
