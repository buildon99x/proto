// Owned geometry; actual guard/proc clocks remain read only.
export function drawMagmaFX(ctx,e,project,zoom){
 if(!['magma-block','magma-bash','magma-spray'].includes(e.type))return false;
 ctx.save();ctx.globalAlpha*=Math.max(0,e.life/e.max);ctx.strokeStyle=e.color;ctx.lineWidth=e.type==='magma-spray'?3:2;
 if(e.type==='magma-block'){
  const p=project({x:e.x+Math.cos(e.angle)*18,y:e.y+Math.sin(e.angle)*18});ctx.translate(p.x,p.y-23*zoom);ctx.strokeStyle='#fff0cf';ctx.beginPath();ctx.moveTo(-8*zoom,-9*zoom);ctx.lineTo(8*zoom,-9*zoom);ctx.lineTo(10*zoom,3*zoom);ctx.lineTo(0,12*zoom);ctx.lineTo(-10*zoom,3*zoom);ctx.closePath();ctx.stroke();
  for(const x of [-1,1]){ctx.beginPath();ctx.moveTo(x*13*zoom,-3*zoom);ctx.lineTo(x*19*zoom,-9*zoom);ctx.stroke();}
 }else for(let i=0;i<7;i++){
  const a=e.angle-e.arc/2+e.arc*i/6,start=project({x:e.x+Math.cos(a)*e.r*.22,y:e.y+Math.sin(a)*e.r*.22}),end=project({x:e.x+Math.cos(a)*e.r,y:e.y+Math.sin(a)*e.r});ctx.beginPath();ctx.moveTo(start.x,start.y-12*zoom);ctx.lineTo(end.x,end.y-12*zoom);ctx.stroke();
 }
 ctx.restore();return true;
}
export function drawMagmaMeter(ctx,p,project,zoom){
 if(!p.magmaPose||!(p.hp>0))return false;const q=project(p),ratio=Math.max(0,Math.min(1,p.magmaCharge??0));ctx.save();ctx.strokeStyle=ratio>=1?'#f3c78c':'#b3bac0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(q.x,q.y-55*zoom,6*zoom,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);ctx.stroke();ctx.restore();return true;
}
