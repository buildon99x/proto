// Authored, compact hammer silhouette. Geometry only: no simulation state,
// target queries, collision, randomness, sound scheduling or new damage events.
const finite=Number.isFinite;
const clamp=n=>Math.max(0,Math.min(1,finite(n)?n:0));
export function drawHammerShape(ctx,{returning=false}={}){
 ctx.save();ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=2;
 // Head/shaft are deliberately opaque local pixels with a dark casing, not bloom.
 ctx.strokeStyle='#151b27';ctx.fillStyle='#70523c';ctx.beginPath();ctx.moveTo(-2,-5);ctx.lineTo(2,-5);ctx.lineTo(2,13);ctx.lineTo(-2,13);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.fillStyle=returning?'#adcdd1':'#d8bd89';ctx.beginPath();ctx.moveTo(-10,-15);ctx.lineTo(8,-15);ctx.lineTo(11,-12);ctx.lineTo(11,-6);ctx.lineTo(8,-3);ctx.lineTo(-10,-3);ctx.lineTo(-12,-6);ctx.lineTo(-12,-12);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle=returning?'#d7ebe5':'#f4e3b6';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-8,-12);ctx.lineTo(7,-12);ctx.stroke();ctx.fillStyle='#547c79';ctx.fillRect(-2,-11,4,5);ctx.restore();
}
export function drawWarriorHammer(ctx,shot,{project,zoom=1,flashScale=1,reduced=false}={}){
 if(!shot||shot.enemy||shot.kind!=='hammer'||!(shot.life>0)||![shot.x,shot.y,shot.vx,shot.vy,zoom].every(finite)||!(zoom>0)||typeof project!=='function')return false;
 const point=project(shot),speed=Math.hypot(shot.vx,shot.vy),back=speed>1e-9?project({x:shot.x-shot.vx/speed*18,y:shot.y-shot.vy/speed*18}):point;
 if(![point.x,point.y,back.x,back.y].every(finite))return false;
 ctx.save();ctx.globalCompositeOperation='source-over';ctx.lineCap='round';ctx.lineJoin='round';
 // The short wake follows actual velocity on each leg. It cannot resemble a
 // full collision lane or a second ground AoE and has no filled danger floor.
 if(speed>1e-9){ctx.beginPath();ctx.moveTo(back.x,back.y-9*zoom);ctx.lineTo(point.x,point.y-9*zoom);ctx.strokeStyle='#17202b';ctx.globalAlpha=.72;ctx.lineWidth=4*zoom;ctx.stroke();ctx.strokeStyle=shot.leg==='return'?'#93c5c6':'#c7b07b';ctx.globalAlpha=.52;ctx.lineWidth=1.7*zoom;ctx.stroke();}
 ctx.globalAlpha=1;ctx.translate(point.x,point.y-9*zoom);const heading=speed>1e-9?Math.atan2(point.y-back.y,point.x-back.x):0;ctx.rotate(heading+(finite(shot.age)?shot.age:0)*15);ctx.scale(.72*zoom,.72*zoom);drawHammerShape(ctx,{returning:shot.leg==='return'});
 const flashes=reduced?0:clamp(flashScale);if(flashes>0){ctx.globalAlpha=flashes*.65;ctx.fillStyle='#ead7a4';ctx.fillRect(-13,-17,2,2);ctx.fillRect(12,-4,1.5,1.5);}
 ctx.restore();return true;
}
