import {mesh} from './dubai-architecture.js';
import {railPose,TRACK_LENGTH,RAIL_Y} from './dubai-motion.js';
function ribbon(W,start,end,left,right,y,color,parent){
 const T=W.THREE,positions=[],uv=[],indices=[],n=Math.max(8,Math.ceil((end-start)*12));
 for(let i=0;i<=n;i++){const s=start+(end-start)*i/n;for(const offset of [left,right]){const p=railPose(s,offset);positions.push(p.x,y,p.z);uv.push(i/n,offset===left?0:1);}if(i<n){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return mesh(W,geometry,new T.MeshStandardMaterial({color,roughness:.82,side:T.DoubleSide}),parent);
}
function railLine(W,start,end,offset,y,color,radius,parent){const n=Math.max(2,Math.ceil((end-start)*14));return W.line(Array.from({length:n+1},(_,i)=>{const p=railPose(start+(end-start)*i/n,offset);return[p.x,y,p.z];}),color,radius,parent);}
function station(W,start,end,name,parent){
 const T=W.THREE,g=W.group(0,0,0,parent);g.name=name;
 ribbon(W,start,end,.33,.98,RAIL_Y-.015,'#d0c8ad',g);railLine(W,start,end,.36,RAIL_Y+.005,'#c9ab53',.018,g);railLine(W,start,end,.98,RAIL_Y-.07,'#929580',.045,g);
 const p=railPose((start+end)/2,.72),roof=W.group(p.x,RAIL_Y,p.z,g);roof.rotation.y=p.yaw;
 // Slender folded shade roof, benches and stairs, never inside the train envelope.
 W.box(.64,.045,2.6,'#d9dccb',0,.81,0,roof);W.box(.06,.06,2.7,'#557e7c',.27,.82,0,roof);
 for(const z of [-1.05,1.05]){W.cylinder(.025,.8,'#667e76',.2,.4,z,roof,8);W.box(.25,.035,.6,'#8d8369',.08,.25,z*.6,roof);for(const zz of [-.2,.2])W.box(.025,.23,.025,'#6d776b',.08,.12,z*.6+zz,roof);}
 for(let i=0;i<10;i++){const height=.12+i*.15;W.box(.3,height,.13,'#b7ac90',-.5,-RAIL_Y+.05+height/2,1.05-i*.12,roof);}W.box(.4,.05,.35,'#c8bda0',-.35,0,0,roof);
 const sign=W.group(.24,.59,-.94,roof);W.box(.045,.28,.31,'#315f65',0,0,0,sign);W.box(.052,.025,.17,'#eadcae',0,.065,0,sign);W.box(.052,.025,.17,'#eadcae',0,-.065,0,sign);
 return g;
}
export function buildTransit(W){
 const T=W.THREE,g=W.group();g.name='diagonal-metro-viaduct';
 ribbon(W,0,TRACK_LENGTH,-.34,.34,RAIL_Y-.1,'#b8b39c',g);
 for(const offset of [-.34,.34]){railLine(W,0,TRACK_LENGTH,offset,RAIL_Y-.18,'#a09f8c',.09,g);railLine(W,0,TRACK_LENGTH,offset,RAIL_Y+.12,'#b4beb1',.012,g);}
 for(const offset of [-.18,.18])railLine(W,0,TRACK_LENGTH,offset,RAIL_Y,'#526461',.019,g);
 for(let s=.2;s<TRACK_LENGTH;s+=.32){const p=railPose(s);const sleeper=W.box(.5,.035,.055,'#797c6e',p.x,RAIL_Y-.04,p.z,g);sleeper.rotation.y=p.yaw;for(const offset of [-.34,.34]){const q=railPose(s,offset);W.cylinder(.012,.24,'#a5b3a6',q.x,RAIL_Y,q.z,g,5);}}
 for(let s=.5;s<TRACK_LENGTH;s+=1.0){const p=railPose(s);W.cylinder(.075,RAIL_Y-.28,'#b3ac94',p.x,(RAIL_Y-.28)/2,p.z,g,10);const cap=W.box(.66,.12,.18,'#cec4a7',p.x,RAIL_Y-.25,p.z,g);cap.rotation.y=p.yaw;W.box(.3,.08,.3,'#a49a7f',p.x,.08,p.z,g);}
 for(const s of [0,TRACK_LENGTH]){const p=railPose(s),buffer=W.group(p.x,RAIL_Y,p.z,g);buffer.rotation.y=p.yaw;W.box(.43,.09,.055,'#526463',0,.09,0,buffer);for(const x of [-.15,.15])W.box(.04,.15,.12,'#b9aa84',x,.04,0,buffer);}
 station(W,.05,4.15,'beach-station',g);station(W,TRACK_LENGTH-4.15,TRACK_LENGTH-.05,'city-station',g);
 const train=W.group();train.name='dubai-metro';
 const shellGeometry=W.own(new T.CapsuleGeometry(.205,.46,4,10));shellGeometry.rotateX(Math.PI/2);
 const shellMaterial=W.own(new T.MeshStandardMaterial({color:'#cbd6d1',roughness:.38,metalness:.25}));
 for(let i=0;i<4;i++){
  const car=W.group(0,0,0,train);const shell=new T.Mesh(shellGeometry,shellMaterial);shell.position.y=.28;shell.castShadow=shell.receiveShadow=true;car.add(shell);
  W.box(.412,.055,.67,'#39828b',0,.27,0,car);W.box(.3,.035,.6,'#e7e9d5',0,.48,0,car);
  for(const side of [-1,1]){for(let j=0;j<4;j++)W.box(.012,.125,.115,'#254e5d',side*.202,.35,-.27+j*.18,car);W.box(.014,.2,.09,'#729da0',side*.206,.3,0,car);}
  for(const z of [-.27,.27])for(const side of [-1,1])W.cylinder(.06,.03,'#344340',side*.18,.09,z,car,12).rotation.z=Math.PI/2;
  if(i===0||i===3){const sign=i===0?-1:1,glass=W.box(.3,.11,.025,'#274d5b',0,.36,sign*.418,car);glass.rotation.x=-sign*.3;for(const x of [-.13,.13])W.box(.045,.025,.025,'#f5efd1',x,.24,sign*.425,car);}
 }
 return train;
}
