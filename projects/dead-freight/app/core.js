/* Original browser recreation study. No game assets or game code used. */
(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
class Mission {
 constructor(level=1,difficulty=1,seed=731){this.level=level;this.difficulty=difficulty;this.seed=seed;this.player={x:0,z:24,hp:100,armor:0,stamina:100,dash:0,invulnerable:0};this.walls=[];this.enemies=[];this.pickups=[];this.particles=[];this.time=0;this.kills=0;this.bounty=false;this.extracted=false;this.shots=0;this.hits=0;this.destroyed=0;this.cash=0;this.weapon=0;this.ammo=[6,2,24];this.reserve=[72,24,144];this.cocked=true;this.reload=0;this.cooldown=0;this.events=[];this.projectiles=[];this.combo=0;this.comboTimer=0;this.style=0;this.perfect=0;this.reloadDuration=0;this.build();}
 rand(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 wall(x,z,w,d,h,kind='concrete',destructible=false){let o={id:this.walls.length,x,z,w,d,h,kind,hp:destructible?75:Infinity,alive:true};this.walls.push(o);return o;}
 build(){
 // Forest route: a fallen-tree gate can be breached, or skirted through the eastern hollow.
 this.wall(-25,0,2,66,8,'boundary');this.wall(25,0,2,66,8,'boundary');this.wall(0,33,50,2,8,'boundary');this.wall(0,-33,50,2,8,'boundary');
 for(let [x,z,w,d] of [[-12,10,9,4],[14,11,8,5],[-12,-4,13,3],[13,-11,10,4],[-12,-22,8,6],[12,-26,6,4]])this.wall(x,z,w,d,2.5,'rock');
 for(let x=-5;x<=3;x+=2)this.wall(x,-7,2,1.2,2.6,'wood',true);
 for(let [x,z] of [[-7,19],[7,16],[-17,4],[18,-3],[-5,-17],[8,-19]])this.wall(x,z,.75,.75,10,'trunk');
 for(let [x,z] of [[3,4],[-8,-11],[13,-17]])this.pickups.push({type:'barrel',x,z,hp:25,alive:true});
 let spots=[[-5,8],[9,4],[-13,-7],[11,-10],[-7,-17],[9,-24],[0,-27]];
 spots.forEach(([x,z],i)=>this.enemies.push({id:i,x,z,hp:i===6?150:70,boss:i===6,alive:true,attack:1+this.rand()*2,windup:0,alert:false,phase:this.rand()*6,hit:0}));
 this.pickups.push({type:'health',x:-18,z:0,alive:true},{type:'ammo',x:17,z:-3,alive:true},{type:'health',x:-12,z:-24,alive:true});
 }
 dash(){if(this.player.stamina<45||this.player.dash>0||this.player.hp<=0)return false;this.player.stamina-=45;this.player.dash=.2;this.player.invulnerable=.15;this.emit('dash');return true;}
 reward(points){this.combo++;this.comboTimer=4;this.style+=Math.round(points*(1+Math.min(4,this.combo)*.25));}

 blocked(x,z,r=.4){return this.walls.some(w=>w.alive&&!(w.y>1.7)&&x>w.x-w.w/2-r&&x<w.x+w.w/2+r&&z>w.z-w.d/2-r&&z<w.z+w.d/2+r);}
 move(dx,dz){const p=this.player;if(!this.blocked(p.x+dx,p.z))p.x+=dx;if(!this.blocked(p.x,p.z+dz))p.z+=dz;}
 segmentWall(ax,az,bx,bz){let d=Math.hypot(bx-ax,bz-az),steps=Math.ceil(d/.2);for(let i=1;i<steps;i++){let t=i/steps;if(this.blocked(ax+(bx-ax)*t,az+(bz-az)*t,.02))return true;}return false;}
 emit(type,data={}){this.events.push({type,...data});}
 damage(n){if(this.player.invulnerable>0)return;this.combo=0;this.comboTimer=0;let shield=Math.min(this.player.armor,n*.65);this.player.armor-=shield;this.player.hp=Math.max(0,this.player.hp-(n-shield));this.emit('hurt',{amount:n});}
 cycle(){if(!this.cocked&&!this.reload){this.cocked=true;this.cooldown=.19;this.emit('cycle');}}
 load(){if(this.reload>0){let progress=1-this.reload/this.reloadDuration;if(progress>.44&&progress<.62){this.reload=.04;this.perfect=3;this.reward(45);this.emit('perfect');}else{this.reload+=.35;this.emit('mistime');}return;}if(this.ammo[this.weapon]>=[6,2,24][this.weapon]||this.reserve[this.weapon]<=0)return;this.reload=this.reloadDuration=[1.6,1.9,2][this.weapon];this.emit('reload');}
 switchWeapon(n){if(n<0||n>2||n===this.weapon)return;this.weapon=n;this.reload=0;this.cocked=true;this.cooldown=.25;this.emit('switch');}
 fire(hit){if(this.player.hp<=0||this.extracted||this.reload||this.cooldown>0)return false;if(!this.cocked){this.emit('needcycle');return false;}if(!this.ammo[this.weapon]){this.emit('empty');return false;}
 this.ammo[this.weapon]--;this.shots++;this.cooldown=[.2,.4,.1][this.weapon];if(this.weapon<2)this.cocked=false;this.emit('shot',{weapon:this.weapon});
 if(hit){this.hits++;if(hit.kind==='enemy'){let e=this.enemies[hit.id];if(e?.alive){e.hp-=([48,105,21][this.weapon])*(hit.head?2.5:1)*(this.perfect>0?1.3:1);e.hit=.16;e.alert=true;this.emit('blood',{x:e.x,z:e.z,head:hit.head});if(e.hp<=0){e.alive=false;this.kills++;this.reward(hit.head?150:80);this.cash+=e.boss?750:70;this.emit('kill',{id:e.id,x:e.x,z:e.z,boss:e.boss});if(e.boss)this.pickups.push({type:'bounty',x:e.x,z:e.z,alive:true});}}}
 if(hit.kind==='wall'){let w=this.walls[hit.id];if(w?.alive&&isFinite(w.hp)){w.hp-=[40,90,19][this.weapon];if(w.hp<=0){w.alive=false;this.destroyed++;this.emit('break',{id:w.id,x:w.x,z:w.z,y:w.y||0});}}}
 if(hit.kind==='barrel'){let b=this.pickups[hit.id];if(b?.alive){b.hp-=50;if(b.hp<=0)this.explode(b);}}}return true;}
 explode(b){b.alive=false;this.emit('explosion',{x:b.x,z:b.z});for(let e of this.enemies)if(e.alive&&Math.hypot(e.x-b.x,e.z-b.z)<6){e.hp-=140;e.alert=true;if(e.hp<=0){e.alive=false;this.kills++;this.cash+=e.boss?750:70;this.emit('kill',{id:e.id,x:e.x,z:e.z,boss:e.boss});if(e.boss)this.pickups.push({type:'bounty',x:e.x,z:e.z,alive:true});}}for(let w of this.walls)if(w.alive&&isFinite(w.hp)&&Math.hypot(w.x-b.x,w.z-b.z)<5){w.alive=false;this.destroyed++;this.emit('break',{id:w.id,x:w.x,z:w.z,y:w.y||0});}if(Math.hypot(this.player.x-b.x,this.player.z-b.z)<5)this.damage(25);}
 interact(){let p=this.player;for(let item of this.pickups){if(!item.alive||Math.hypot(p.x-item.x,p.z-item.z)>2.5||item.type==='barrel')continue;item.alive=false;if(item.type==='health')p.hp=clamp(p.hp+45,0,100);if(item.type==='armor')p.armor=clamp(p.armor+45,0,100);if(item.type==='ammo')this.reserve=this.reserve.map((v,i)=>v+[24,8,60][i]);if(item.type==='bounty')this.bounty=true;this.emit('pickup',{kind:item.type});}if(this.bounty&&Math.hypot(p.x,p.z-25)<3.5){this.extracted=true;this.emit('win');}}
 tick(dt){if(this.player.hp<=0||this.extracted)return;dt=Math.min(.05,dt);this.time+=dt;this.player.stamina=clamp(this.player.stamina+dt*24,0,100);this.player.dash=Math.max(0,this.player.dash-dt);this.player.invulnerable=Math.max(0,this.player.invulnerable-dt);this.perfect=Math.max(0,this.perfect-dt);this.comboTimer=Math.max(0,this.comboTimer-dt);if(!this.comboTimer)this.combo=0;this.cooldown=Math.max(0,this.cooldown-dt);if(this.reload>0){this.reload-=dt;if(this.reload<=0){this.reload=0;let n=Math.min([6,2,24][this.weapon]-this.ammo[this.weapon],this.reserve[this.weapon]);this.ammo[this.weapon]+=n;this.reserve[this.weapon]-=n;this.cocked=true;this.emit('loaded');}}
 for(let e of this.enemies){if(!e.alive)continue;e.hit=Math.max(0,e.hit-dt);let dx=this.player.x-e.x,dz=this.player.z-e.z,d=Math.hypot(dx,dz),visible=!this.segmentWall(e.x,e.z,this.player.x,this.player.z);if(d<19&&visible)e.alert=true;if(!e.alert)continue;
 if(e.windup>0){e.windup-=dt;if(e.windup<=0&&visible){let speed=e.boss?15:12;this.projectiles.push({x:e.x,z:e.z,vx:dx/Math.max(.1,d)*speed,vz:dz/Math.max(.1,d)*speed,life:3,alive:true});e.attack=e.boss?1.5:2.4;this.emit('enemyshot',{id:e.id,x:e.x,z:e.z});}}else{e.attack-=dt;if(visible&&d<24&&e.attack<=0){e.windup=e.boss?.65:.9;this.emit('warning',{id:e.id});}if(d>7&&visible){let speed=1.6*dt,nx=e.x+dx/d*speed,nz=e.z+dz/d*speed;if(!this.blocked(nx,e.z,.3))e.x=nx;if(!this.blocked(e.x,nz,.3))e.z=nz;}}
 }
 for(let p of this.projectiles){if(!p.alive)continue;p.life-=dt;p.x+=p.vx*dt;p.z+=p.vz*dt;if(p.life<=0||this.blocked(p.x,p.z,.06))p.alive=false;if(p.alive&&Math.hypot(p.x-this.player.x,p.z-this.player.z)<.46){this.damage(24*this.difficulty);p.alive=false;}}
 this.projectiles=this.projectiles.filter(p=>p.alive);

 }
}
root.HC={Mission,clamp};if(typeof module!=='undefined')module.exports=root.HC;
})(typeof globalThis!=='undefined'?globalThis:this);
