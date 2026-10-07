/* Original browser recreation study. No game assets or game code used. */
(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
class Mission {
 constructor(level=1,difficulty=1,seed=731){this.level=level;this.difficulty=difficulty;this.seed=seed;this.player={x:0,z:24,hp:100,armor:35};this.walls=[];this.enemies=[];this.pickups=[];this.particles=[];this.time=0;this.kills=0;this.bounty=false;this.extracted=false;this.shots=0;this.hits=0;this.destroyed=0;this.cash=0;this.weapon=0;this.ammo=[6,2,24];this.reserve=[72,24,144];this.cocked=true;this.reload=0;this.cooldown=0;this.events=[];this.build();}
 rand(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 wall(x,z,w,d,h,kind='concrete',destructible=false){let o={id:this.walls.length,x,z,w,d,h,kind,hp:destructible?75:Infinity,alive:true};this.walls.push(o);return o;}
 build(){
 // Two connected routes: street through warehouse, or breakable service entrance.
 this.wall(-24,0,2,62,13);this.wall(24,0,2,62,13);this.wall(0,31,48,2,12);this.wall(0,-31,48,2,12);
 this.wall(-14,12,16,12,9,'brick');this.wall(15,13,14,10,11);
 this.wall(-13,-9,18,2,8,'brick');this.wall(15,-9,18,2,8,'brick');
 this.wall(-6,-1,2,14,7,'steel');this.wall(6,-3,2,10,7,'steel');
 for(let x=-3;x<=3;x+=2)for(let y=0;y<3;y++) {let b=this.wall(x,-9,2,1.2,1.6,'plaster',true);b.y=y*1.6;}
 this.wall(-15,-21,2,18,8,'red');this.wall(15,-21,2,18,8,'red');
 for(let x of [-10,10])this.wall(x,-18,3,3,5,'gold');
 for(let [x,z] of [[-9,19],[12,4],[-16,0],[10,-3],[-10,-14],[11,-22]])this.wall(x,z,2.2,2.2,1.8,'crate',true);
 for(let [x,z] of [[3,8],[-11,-3],[9,-12],[-10,-23]])this.pickups.push({type:'barrel',x,z,hp:25,alive:true});
 let spots=[[-8,7],[9,8],[-13,-4],[13,-5],[-10,-16],[10,-18],[-4,-23],[4,-25],[0,-27]];
 spots.forEach(([x,z],i)=>this.enemies.push({id:i,x,z,hp:i===8?220:70+this.level*8,boss:i===8,alive:true,attack:1+this.rand()*2,alert:false,phase:this.rand()*6,hit:0}));
 this.pickups.push({type:'health',x:-18,z:2,alive:true},{type:'ammo',x:18,z:0,alive:true},{type:'armor',x:-11,z:-25,alive:true});
 }
 blocked(x,z,r=.4){return this.walls.some(w=>w.alive&&!(w.y>1.7)&&x>w.x-w.w/2-r&&x<w.x+w.w/2+r&&z>w.z-w.d/2-r&&z<w.z+w.d/2+r);}
 move(dx,dz){const p=this.player;if(!this.blocked(p.x+dx,p.z))p.x+=dx;if(!this.blocked(p.x,p.z+dz))p.z+=dz;}
 segmentWall(ax,az,bx,bz){let d=Math.hypot(bx-ax,bz-az),steps=Math.ceil(d/.2);for(let i=1;i<steps;i++){let t=i/steps;if(this.blocked(ax+(bx-ax)*t,az+(bz-az)*t,.02))return true;}return false;}
 emit(type,data={}){this.events.push({type,...data});}
 damage(n){let shield=Math.min(this.player.armor,n*.65);this.player.armor-=shield;this.player.hp=Math.max(0,this.player.hp-(n-shield));this.emit('hurt',{amount:n});}
 cycle(){if(!this.cocked&&!this.reload){this.cocked=true;this.cooldown=.19;this.emit('cycle');}}
 load(){if(this.reload||this.ammo[this.weapon]>=[6,2,24][this.weapon]||this.reserve[this.weapon]<=0)return;this.reload=[1.4,1.7,1.9][this.weapon];this.emit('reload');}
 switchWeapon(n){if(n<0||n>2||n===this.weapon)return;this.weapon=n;this.reload=0;this.cocked=true;this.cooldown=.25;this.emit('switch');}
 fire(hit){if(this.player.hp<=0||this.extracted||this.reload||this.cooldown>0)return false;if(!this.cocked){this.emit('needcycle');return false;}if(!this.ammo[this.weapon]){this.emit('empty');return false;}
 this.ammo[this.weapon]--;this.shots++;this.cooldown=[.2,.4,.1][this.weapon];if(this.weapon<2)this.cocked=false;this.emit('shot',{weapon:this.weapon});
 if(hit){this.hits++;if(hit.kind==='enemy'){let e=this.enemies[hit.id];if(e?.alive){e.hp-=([48,105,21][this.weapon])*(hit.head?2.5:1);e.hit=.16;e.alert=true;this.emit('blood',{x:e.x,z:e.z,head:hit.head});if(e.hp<=0){e.alive=false;this.kills++;this.cash+=e.boss?750:70;this.emit('kill',{id:e.id,x:e.x,z:e.z,boss:e.boss});if(e.boss)this.pickups.push({type:'bounty',x:e.x,z:e.z,alive:true});}}}
 if(hit.kind==='wall'){let w=this.walls[hit.id];if(w?.alive&&isFinite(w.hp)){w.hp-=[40,90,19][this.weapon];if(w.hp<=0){w.alive=false;this.destroyed++;this.emit('break',{id:w.id,x:w.x,z:w.z,y:w.y||0});}}}
 if(hit.kind==='barrel'){let b=this.pickups[hit.id];if(b?.alive){b.hp-=50;if(b.hp<=0)this.explode(b);}}}return true;}
 explode(b){b.alive=false;this.emit('explosion',{x:b.x,z:b.z});for(let e of this.enemies)if(e.alive&&Math.hypot(e.x-b.x,e.z-b.z)<6){e.hp-=140;e.alert=true;if(e.hp<=0){e.alive=false;this.kills++;this.cash+=e.boss?750:70;this.emit('kill',{id:e.id,x:e.x,z:e.z,boss:e.boss});if(e.boss)this.pickups.push({type:'bounty',x:e.x,z:e.z,alive:true});}}for(let w of this.walls)if(w.alive&&isFinite(w.hp)&&Math.hypot(w.x-b.x,w.z-b.z)<5){w.alive=false;this.destroyed++;this.emit('break',{id:w.id,x:w.x,z:w.z,y:w.y||0});}if(Math.hypot(this.player.x-b.x,this.player.z-b.z)<5)this.damage(25);}
 interact(){let p=this.player;for(let item of this.pickups){if(!item.alive||Math.hypot(p.x-item.x,p.z-item.z)>2.5||item.type==='barrel')continue;item.alive=false;if(item.type==='health')p.hp=clamp(p.hp+45,0,100);if(item.type==='armor')p.armor=clamp(p.armor+45,0,100);if(item.type==='ammo')this.reserve=this.reserve.map((v,i)=>v+[24,8,60][i]);if(item.type==='bounty')this.bounty=true;this.emit('pickup',{kind:item.type});}if(this.bounty&&Math.hypot(p.x,p.z-25)<3.5){this.extracted=true;this.emit('win');}}
 tick(dt){if(this.player.hp<=0||this.extracted)return;dt=Math.min(.05,dt);this.time+=dt;this.cooldown=Math.max(0,this.cooldown-dt);if(this.reload>0){this.reload-=dt;if(this.reload<=0){let n=Math.min([6,2,24][this.weapon]-this.ammo[this.weapon],this.reserve[this.weapon]);this.ammo[this.weapon]+=n;this.reserve[this.weapon]-=n;this.cocked=true;this.emit('loaded');}}
 for(let e of this.enemies){if(!e.alive)continue;e.hit=Math.max(0,e.hit-dt);let dx=this.player.x-e.x,dz=this.player.z-e.z,d=Math.hypot(dx,dz),visible=!this.segmentWall(e.x,e.z,this.player.x,this.player.z);if(d<18&&visible)e.alert=true;if(!e.alert)continue;e.attack-=dt;if(d>5&&visible){let speed=(e.boss?1.25:1.75)*dt;let nx=e.x+dx/d*speed,nz=e.z+dz/d*speed;if(!this.blocked(nx,e.z,.3))e.x=nx;if(!this.blocked(e.x,nz,.3))e.z=nz;}if(visible&&d<24&&e.attack<=0){e.attack=(e.boss?1:1.9)+this.rand()*.5;this.emit('enemyshot',{id:e.id,x:e.x,z:e.z});this.damage((e.boss?11:6)*this.difficulty);}}
 }
}
root.HC={Mission,clamp};if(typeof module!=='undefined')module.exports=root.HC;
})(typeof globalThis!=='undefined'?globalThis:this);
