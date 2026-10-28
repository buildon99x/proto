/* Bounded single-contact fist sweep. Provisional local-PvE tuning, no inventory effects. */
(function(root){
'use strict';
const P=root.DFProjectiles||(typeof require==='function'?require('./player-projectiles.js'):null),M=root.DFMuzzleBallistics||(typeof require==='function'?require('./muzzle-ballistics.js'):null);
const Metal=root.DFLiquidMetal||(typeof require==='function'?require('./liquid-metal.js'):null);
const RANGE=1.8,DAMAGE=35,ARC=9*Math.PI/180,EPS=1e-8;
function strike(world,{yaw=0,pitch=0}={}){
 if(!Number.isFinite(yaw)||!Number.isFinite(pitch)||!world?.player||world.player.hp<=0||world.paused||world.extracted)return {ok:false,reason:'unavailable'};
 const p=world.player,from={x:p.x,y:p.y+Math.max(.45,p.eyeHeight*.75),z:p.z};let target=null,blocked=false;
 for(const offset of [0,-ARC,ARC]){
  const angle=yaw+offset,vertical=Math.max(-.85,Math.min(.85,pitch)),to={x:from.x-Math.sin(angle)*Math.cos(vertical)*RANGE,y:from.y+Math.sin(vertical)*RANGE,z:from.z-Math.cos(angle)*Math.cos(vertical)*RANGE};
  let obstacle=world.wallHit(from.x,from.y,from.z,to.x,to.y,to.z,.035);
  for(const barrel of world.pickups){if(!barrel.alive||barrel.type!=='barrel')continue;const hit=M.segmentBox(from,to,{x:barrel.x,y:barrel.y||0,z:barrel.z,w:1.1,d:1.1,h:1.45},.035);if(hit&&(obstacle===null||hit.fraction<obstacle))obstacle=hit.fraction;}
  if(obstacle!==null)blocked=true;
  for(const enemy of world.enemies){if(!enemy.alive)continue;const pose={x:enemy.x,y:enemy.y||0,z:enemy.z,boss:!!enemy.boss,yaw:Metal.isMetal(enemy)?enemy.metal.yaw:Math.atan2(p.x-enemy.x,p.z-enemy.z)+Math.PI,...(Metal.isMetal(enemy)?{metalPose:Metal.pose(enemy)}:{})},hit=P.enemyHit(from,to,pose,pose);
   if(hit&&(obstacle===null||hit.fraction<obstacle-EPS)&&(!target||hit.fraction<target.fraction-EPS||Math.abs(hit.fraction-target.fraction)<=EPS&&enemy.id<target.enemy.id))target={enemy,part:hit.part,fraction:hit.fraction,point:{x:from.x+(to.x-from.x)*hit.fraction,y:from.y+(to.y-from.y)*hit.fraction,z:from.z+(to.z-from.z)*hit.fraction}};
  }
 }
 if(!target){world.emit('meleecontact',{hit:false,blocked});return {ok:true,hit:false,blocked};}
 const e=target.enemy;if(Metal.isMetal(e)){const response=Metal.impact(world,e,{source:'melee',damage:DAMAGE,part:target.part,point:target.point,time:world.time});world.meleeHits=(world.meleeHits||0)+1;const result={ok:true,hit:true,id:e.id,armorDamage:0,point:target.point,distance:target.fraction*RANGE,...response};world.emit('meleecontact',result);return result;}
 const armor=Math.max(0,Number.isFinite(e.armor)?e.armor:0),armorDamage=Math.min(armor,DAMAGE*.5),damage=DAMAGE-armorDamage;
 e.armor=armor-armorDamage;e.hp-=damage;e.hit=.16;e.alert=true;world.meleeHits=(world.meleeHits||0)+1;
 const result={ok:true,hit:true,id:e.id,damage,armorDamage,point:target.point,distance:target.fraction*RANGE};
 world.emit('meleecontact',result);if(e.hp<=0)world.kill(e,80);return result;
}
const api={RANGE,DAMAGE,ARC,strike};root.DFMelee=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
