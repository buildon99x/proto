// Read the authoritative runtime state only; never infer readiness from stun time.
export function drawCrusherPrimed(ctx,enemy,{x=0,y=0,height=46,zoom=1}={}){
 if(!enemy?.active||enemy.dead||!(enemy.hp>0)||enemy.primedForStun!==true||enemy.heavyStunned||![x,y,height,zoom].every(Number.isFinite))return false;
 const cx=x+18*zoom,cy=y-height-18*zoom,r=5*zoom;ctx.save();ctx.globalCompositeOperation='source-over';ctx.lineWidth=2;ctx.strokeStyle='#171b28';ctx.fillStyle='#dfc994';ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r,cy);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#fff0bd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-2*zoom,cy-2*zoom);ctx.lineTo(cx+zoom,cy);ctx.lineTo(cx-zoom,cy+2*zoom);ctx.stroke();ctx.restore();return true;
}
