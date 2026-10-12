import {lineOfSight} from './world-geometry.js';
// Owned procedural staff/bell shapes. These helpers read state only.
export function drawStaffShape(ctx){
 ctx.save();ctx.strokeStyle='#292b32';ctx.lineWidth=11;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-48,-64);ctx.lineTo(48,64);ctx.stroke();ctx.strokeStyle='#bfa982';ctx.lineWidth=7;ctx.stroke();
 ctx.strokeStyle='#d8ded8';ctx.lineWidth=9;for(const t of [-.86,.86]){ctx.beginPath();ctx.moveTo(48*t-3,64*t-4);ctx.lineTo(48*t+3,64*t+4);ctx.stroke();}ctx.restore();
}
export function stormBellHover(pointer,battle,width,height,project,zoom){
 if(!pointer||!Number.isFinite(pointer.x)||!Number.isFinite(pointer.y))return null;
 const focus=project(battle.p.x,battle.p.y),rows=[];
 for(const bell of battle.storm?.bells??[])if(bell.active&&bell.remaining>1e-9&&lineOfSight(battle.map,battle.p,bell)){
  const q=project(bell.x,bell.y),x=width*.5+(q.x-focus.x)*zoom,y=height*.55+(q.y-focus.y)*zoom-23*zoom,score=((pointer.x-x)/(bell.radius*zoom))**2+((pointer.y-y)/(23*zoom))**2;
  if(score<=1)rows.push({id:bell.id,score,depth:bell.x+bell.y});
 }
 rows.sort((a,b)=>a.score-b.score||b.depth-a.depth||a.id.localeCompare(b.id));return rows[0]?.id??null;
}
export function drawStormBells(ctx,state,project,zoom){
 let count=0;for(const bell of state.stormBells??[])if(bell.active&&bell.remaining>1e-9&&lineOfSight(state.map,state.p,bell)){
  const q=project(bell);if(q.x< -60||q.x>state.width+60||q.y< -60||q.y>state.height+100)continue;
  ctx.save();ctx.translate(q.x,q.y);ctx.scale(zoom,zoom);ctx.fillStyle='#1b2029';ctx.beginPath();ctx.ellipse(0,0,19,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=bell.nextWave>0?'#8e8e83':'#c3b899';ctx.strokeStyle='#20252c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,-9);ctx.lineTo(-8,-29);ctx.lineTo(-5,-35);ctx.lineTo(5,-35);ctx.lineTo(8,-29);ctx.lineTo(12,-9);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#f0e7ce';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,-11);ctx.lineTo(10,-11);ctx.stroke();ctx.fillStyle='#b8d4d7';ctx.fillRect(-2,-40,4,5);
  ctx.strokeStyle='#9db7b9';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-21,22,-Math.PI/2,-Math.PI/2+Math.PI*2*bell.remaining/12);ctx.stroke();ctx.restore();count++;
 }return count;
}
export function drawStormEffect(ctx,e,project,zoom){
 if(!['storm-staff','storm-ground'].includes(e.type))return false;
 const alpha=Math.max(0,e.life/e.max);ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=e.color;ctx.lineWidth=e.type==='storm-staff'?3:1.5;
 if(e.type==='storm-staff'){
  const a=project({x:e.x+Math.cos(e.angle)*e.r,y:e.y+Math.sin(e.angle)*e.r}),p=project(e);ctx.beginPath();ctx.moveTo(p.x,p.y-23*zoom+(e.ordinal===2?3:-3));ctx.lineTo(a.x,a.y-23*zoom);ctx.stroke();
 }else{const p=project(e);ctx.beginPath();for(let i=0;i<8;i++){const angle=i*Math.PI/4,r=e.r*(i%2?.5:1);ctx[i?'lineTo':'moveTo'](p.x+Math.cos(angle)*r*zoom,p.y+Math.sin(angle)*r*.53*zoom);}ctx.closePath();ctx.stroke();}
 ctx.restore();return true;
}
