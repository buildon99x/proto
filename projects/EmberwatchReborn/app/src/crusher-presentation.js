// Read the authoritative runtime state only; never infer readiness from stun time.
export function drawCrusherPrimed(ctx,enemy,{x=0,y=0,height=46,zoom=1}={}){
 if(!enemy?.active||enemy.dead||!(enemy.hp>0)||enemy.primedForStun!==true||enemy.heavyStunned||![x,y,height,zoom].every(Number.isFinite))return false;
 const cx=x+18*zoom,cy=y-height-18*zoom,r=5*zoom;ctx.save();ctx.globalCompositeOperation='source-over';ctx.lineWidth=2;ctx.strokeStyle='#171b28';ctx.fillStyle='#dfc994';ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx+r,cy);ctx.lineTo(cx,cy+r);ctx.lineTo(cx-r,cy);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#fff0bd';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-2*zoom,cy-2*zoom);ctx.lineTo(cx+zoom,cy);ctx.lineTo(cx-zoom,cy+2*zoom);ctx.stroke();ctx.restore();return true;
}

// Read the existing confirmed-payoff FX record; the outer contour is the real
// instantaneous hit radius. Interior motion is decorative, never a new hit.
export function drawCrusherShockwave(ctx,e,project,zoom,{reduced=false,flashScale=1}={}){
 if(e?.crusherShockwave!==true||e.type!=='ring'||!(e.life>0)||!(e.max>0)||!(e.r>0))return false;
 const alpha=Math.max(0,Math.min(1,e.life/e.max)),age=1-alpha,detail=!reduced&&flashScale>0;
 const point=(a,r)=>{const q=project({x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r});return {x:q.x,y:q.y-3*zoom};};
 ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#d5c3a0';ctx.lineWidth=1.5;
 const ring=r=>{ctx.beginPath();for(let i=0;i<=32;i++){const q=point(i*Math.PI/16,r);ctx[i?'lineTo':'moveTo'](q.x,q.y);}ctx.closePath();ctx.stroke();};
 ring(e.r);
 if(detail){ctx.globalAlpha=alpha*Math.min(1,Math.max(0,flashScale));ctx.strokeStyle='#efdab2';ctx.lineWidth=2;ring(e.r*(.2+.8*age));
  for(let i=0;i<8;i++){const a=i*Math.PI/4,start=point(a,e.r*.12),bend=point(a+.09,e.r*(.35+.25*age)),end=point(a,e.r*(.55+.4*age));ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(bend.x,bend.y);ctx.lineTo(end.x,end.y);ctx.stroke();}
 }
 ctx.restore();return true;
}
