import {luminous} from './paris-city.js';

/** Small shared-resource street fixtures, placed only on supported clear surfaces. */
export function buildParisStreets(W,{ground,obstacles,fixtures=[]}){
 const T=W.THREE,root=W.group();root.name='paris-daily-life';
 const roadMeshes=ground.roads.children.filter(o=>o.isMesh&&Math.abs(o.scale.y-.025)<1e-6),waterMeshes=ground.river.children.filter(o=>o.isMesh&&o.material===ground.water);
 for(const o of[ground.roads,ground.river,...obstacles,...fixtures])o.updateMatrixWorld(true);
 const obstacleBounds=[...obstacles,...fixtures].map(o=>new T.Box3().setFromObject(o).expandByScalar(.018)),occupied=[],ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0));
 const headlights=luminous(W,'#ffebbd',1.8),tailLights=luminous(W,'#d55334',.85),glass=W.own(new T.MeshStandardMaterial({color:'#536771',roughness:.25,metalness:.2}));
 function surface(x,z,roadOnly=false){ray.ray.origin.set(x,6,z);if(ray.intersectObjects(waterMeshes,false).length)return null;const height=ground.groundHeight(x,z);if(roadOnly){const hit=ray.intersectObjects(roadMeshes,false)[0];if(!hit||Math.abs(hit.point.y-height)>.015)return null;}return height;}
 function place(x,z,w,d,yaw,roadOnly=false,height=.3){const width=Math.abs(Math.cos(yaw))*w+Math.abs(Math.sin(yaw))*d,depth=Math.abs(Math.sin(yaw))*w+Math.abs(Math.cos(yaw))*d,y=surface(x,z,roadOnly);if(y===null)return null;for(const dx of[-width/2,width/2])for(const dz of[-depth/2,depth/2]){const h=surface(x+dx,z+dz,roadOnly);if(h===null||Math.abs(h-y)>.015)return null;}const box=new T.Box3(new T.Vector3(x-width/2,y+.005,z-depth/2),new T.Vector3(x+width/2,y+height,z+depth/2));if([...obstacleBounds,...occupied].some(b=>b.intersectsBox(box)))return null;return{y,box};}
 const cars=[];
 for(const [roadIndex,road] of roadMeshes.entries()){
  const alongX=road.scale.x>road.scale.z,length=alongX?road.scale.x:road.scale.z,yaw=alongX?Math.PI/2:0,laneOffset=Math.min(.13,Math.max(0,((alongX?road.scale.z:road.scale.x)-.21)/2-.012));let count=0;
  for(let k=1;k<=12&&count<3;k++){
   const along=-length/2+k*length/13,side=k%2?-laneOffset:laneOffset,x=road.position.x+(alongX?along:side),z=road.position.z+(alongX?side:along),pose=place(x,z,.21,.37,yaw,true);if(!pose)continue;
   const car=W.group(x,pose.y,z,root);car.name='paris-street-car';car.rotation.y=yaw+(k%2?0:Math.PI);const paint=['#e6e0ce','#3b5363','#9d443c','#657b68','#a7aaa5'][(cars.length+roadIndex)%5];
   W.box(.16,.065,.31,paint,0,.085,0,car);W.box(.135,.06,.16,paint,0,.145,-.025,car);W.box(.112,.012,.12,paint,0,.18,-.025,car);
   for(const side of[-1,1]){const pane=W.box(.006,.042,.115,'#536771',side*.07,.15,-.025,car);pane.material=glass;const windscreen=W.box(.115,.04,.006,'#536771',0,.15,side*.062-.025,car);windscreen.material=glass;for(const z of[-.10,.10]){const wheel=W.cylinder(.035,.025,'#303536',side*.079,.035,z,car,12);wheel.rotation.z=Math.PI/2;wheel.name='car-wheel';}const head=W.box(.028,.022,.012,'#ffebbd',side*.052,.09,.16,car);head.material=headlights;const rear=W.box(.027,.021,.012,'#d55334',side*.052,.09,-.16,car);rear.material=tailLights;}
   W.box(.15,.014,.012,'#a4aaa7',0,.062,.163,car);cars.push(car);occupied.push(pose.box.expandByScalar(.09));count++;
  }
 }
 const crossings=[];
 for(const road of roadMeshes){const alongX=road.scale.x>road.scale.z,length=alongX?road.scale.x:road.scale.z,yaw=alongX?Math.PI/2:0,crossWidth=Math.min(.46,(alongX?road.scale.z:road.scale.x)-.035);for(const ratio of[.12,.22,.32,.42,.52,.62,.72,.82,.92]){const along=(ratio-.5)*length,x=road.position.x+(alongX?along:0),z=road.position.z+(alongX?0:along),pose=place(x,z,crossWidth,.54,yaw,true,.012);if(!pose)continue;const crossing=W.group(x,pose.y,z,root);crossing.name='paris-boulevards';crossing.rotation.y=yaw;for(let i=0;i<5;i++)W.box(crossWidth-.02,.005,.062,'#e9e4d7',0,.004,-.21+i*.105,crossing);crossings.push(crossing);occupied.push(pose.box);break;}}
 const benches=[];
 for(const[x,z,yaw]of[[-2.65,5.4,0],[.7,5.65,Math.PI/2],[1.3,4.2,Math.PI/2],[-5.9,-3.1,0],[-2.2,-3.85,0],[4.1,-3.55,0]]){const pose=place(x,z,.36,.20,yaw);if(!pose)continue;const bench=W.group(x,pose.y,z,root);bench.name='paris-bench';bench.rotation.y=yaw;for(const side of[-1,1]){W.box(.025,.13,.15,'#364b42',side*.14,.065,0,bench);W.box(.025,.15,.025,'#364b42',side*.14,.18,-.075,bench);}for(let i=0;i<3;i++){W.box(.36,.02,.035,'#698171',0,.14,-.047+i*.047,bench);W.box(.36,.028,.025,'#698171',0,.185+i*.036,-.075,bench);}benches.push(bench);occupied.push(pose.box);}
 return{root,cars,crossings,benches};
}
