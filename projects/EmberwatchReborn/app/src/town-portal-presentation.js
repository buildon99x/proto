// Original Emberwatch ember/cyan doorway. It is a non-solid utility marker,
// rendered below hostile warning geometry and actors, with no screen flash.
export function drawTownPortal(ctx,{portal,toScreen,zoom=1,nowMs=0,reduced=false}){
 if(!portal)return;
 const q=toScreen(portal),age=Math.max(0,(nowMs-portal.openedAtMs)/1000),opening=reduced?1:Math.min(1,.35+age*2),pulse=reduced?0:Math.sin(nowMs/650)*.06;
 ctx.save();ctx.lineWidth=2*zoom;ctx.strokeStyle='#d9b977';ctx.globalAlpha=portal.pending?.48:.82;
 ctx.beginPath();ctx.ellipse(q.x,q.y+2*zoom,25*zoom,11*zoom,0,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='#8dced0';ctx.globalAlpha=portal.pending?.32:.56+pulse;
 ctx.beginPath();ctx.ellipse(q.x,q.y-28*zoom,18*zoom*opening,30*zoom*opening,0,0,Math.PI*2);ctx.stroke();
 ctx.globalAlpha=portal.pending?.3:.45;ctx.lineWidth=zoom;
 ctx.beginPath();ctx.ellipse(q.x,q.y-28*zoom,13*zoom*opening,24*zoom*opening,0,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='#e4c694';ctx.globalAlpha=.7;
 for(let i=0;i<6;i++){const angle=i*Math.PI/3+(reduced?0:age*.18),x=q.x+Math.cos(angle)*25*zoom,y=q.y+2*zoom+Math.sin(angle)*11*zoom;ctx.beginPath();ctx.moveTo(x-2*zoom,y-2*zoom);ctx.lineTo(x+2*zoom,y+2*zoom);ctx.stroke();}
 ctx.restore();
}
