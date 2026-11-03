import {ambientHome,tickAmbient,migrateAmbientHome} from '../../shared/ambient.mjs';
import {WORLD_OBSTACLES,WALK_HALF,PLAYER_RADIUS} from '../../shared/space.mjs';
import {spawnBall,tickBall,chaseBall} from '../../shared/ball.mjs';
import {tickFeather} from '../../shared/feather.mjs';
const names=['모카','구름','호두','치즈','보리','달콩'];
// Open rug spots in reach of the unchanged entrance spawn. These existing cats
// sleep/rest for the first thirty seconds under the shared ambient clock.
const WELCOME_CAT_SPOTS={
 sunroom:{index:2,x:-1.65,z:3.45},
 garden:{index:7,x:1.7,z:3.45},
 moonlight:{index:15,x:-1.7,z:3.65}
};
// Explicit single-player simulation. It never represents a live room membership.
export class SoloPreview {
 constructor(room){this.room=room;this.time=0;this.seq=0;this.cooldown=0;this.player={id:'solo-you',name:'나 · 혼자 둘러보기',x:0,z:5,yaw:0,color:0};this.toys=[];this.cats=Array.from({length:18},(_,i)=>({id:`cat-${i}`,name:names[i%6]+(i<6?'':` ${Math.floor(i/6)+1}`),...ambientHome(i),skin:i%6,mode:'idle',owner:null,until:0}));
  const {index,x,z}=WELCOME_CAT_SPOTS[room]??WELCOME_CAT_SPOTS.sunroom;
  Object.assign(this.cats[index],{x,z,homeX:x,homeZ:z});
 }
 valid(x,z){return Math.abs(x)<=WALK_HALF-PLAYER_RADIUS&&Math.abs(z)<=WALK_HALF-PLAYER_RADIUS&&!WORLD_OBSTACLES.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+PLAYER_RADIUS);}
 step(body,dx,dz){if(this.valid(body.x+dx,body.z))body.x+=dx;if(this.valid(body.x,body.z+dz))body.z+=dz;if(dx||dz)body.yaw=Math.atan2(dx,dz);}
 tick(input={x:0,z:0},dt=.05){dt=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;this.time+=dt;this.seq++;const p=this.player;if(Number.isFinite(input.x)&&Number.isFinite(input.z)){const n=Math.max(1,Math.hypot(input.x,input.z));this.step(p,input.x/n*3.6*dt,input.z/n*3.6*dt);}this.toys=this.toys.filter(t=>t.until>this.time);for(const toy of this.toys){const cat=this.cats.find(c=>c.owner===toy.owner&&c.mode==='ball');tickBall(toy,cat,dt,(x,z)=>this.valid(x,z));}
 for(let i=0;i<this.cats.length;i++){const c=this.cats[i];if(c.until<=this.time){c.owner=null;c.mode='idle';}if(!c.owner){migrateAmbientHome(c,(x,z)=>this.valid(x,z));tickAmbient(c,this.time*1000,dt,(x,z)=>this.valid(x,z),this.room);continue;}if(c.mode==='pet')continue;if(c.mode==='feather'){tickFeather(c,p,c.until*1000,this.time*1000,dt,(x,z)=>this.valid(x,z));continue;}const toy=this.toys.find(t=>t.owner===c.owner);if(c.mode==='ball'&&toy)chaseBall(c,toy,dt,(x,z)=>this.valid(x,z));}
 }
 action(action,catId){const c=this.cats.find(c=>c.id===catId),p=this.player;if(!c||!['pet','feather','ball'].includes(action))return{ok:false,reason:'INVALID_ACTION'};if(Math.hypot(p.x-c.x,p.z-c.z)>2.8)return{ok:false,reason:'TOO_FAR'};if(this.cooldown>this.time)return{ok:false,reason:'COOLDOWN'};const placement=action==='ball'?spawnBall(c,p.yaw,(x,z)=>this.valid(x,z)):null;if(action==='ball'&&!placement)return{ok:false,reason:'NO_SPACE'};for(const cat of this.cats){cat.owner=null;cat.until=0;}this.toys=[];c.owner=p.id;c.mode=action;c.until=this.time+4;this.cooldown=this.time+1.2;if(action==='ball')this.toys.push({id:`solo-ball-${this.seq}`,...placement,owner:p.id,until:c.until});return{ok:true};}
 snapshot(){return{type:'state',preview:true,seq:this.seq,time:this.time*1000,room:this.room,players:[{...this.player}],cats:this.cats.map(c=>({...c,until:c.until*1000})),toys:this.toys.map(t=>({...t})),rooms:[]};}
}
