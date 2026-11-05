// Fictional ancient building activity, sampled only from the formation clock.
// Timber, rope and human hauling are intentionally simplified, not archaeological reconstruction.
const TAU=Math.PI*2;
const smooth=value=>{const x=Math.max(0,Math.min(1,value));return x*x*(3-2*x);};
const activity=(t,start,end)=>smooth((t-start)/3)*smooth((end-t)/3);

export function createAncientConstruction(W){
 const T=W.THREE,root=W.group();root.name='ancient-construction';
 const pyramidZone=W.group(-7.2,-.038,-1,root),templeZone=W.group(-6.2,-.038,2.4,root),zones=[pyramidZone,templeZone];
 pyramidZone.name='pyramid-worksite';templeZone.name='temple-worksite';
 const timber='#795538',paleTimber='#ae8556',ropeColor='#d4b98a',stoneColor='#c6a779';
 const actors=[],grips=[],scaffolds=[];
 const atSite=(object,x,y,z,zone)=>object.position.set(x-zone.position.x,y-zone.position.y,z-zone.position.z);
 function scaffold(parent,x,z,height){
  const frame=W.group(x,-.038,z,parent);frame.name='wooden-scaffold';atSite(frame,x,-.038,z,parent);
  for(const dx of [-.2,.2])for(const dz of [-.65,.65])W.box(.055,height,.055,timber,dx,height/2,dz,frame);
  for(const y of [.55,height-.12]){
   for(const dx of [-.2,.2])W.box(.045,.06,1.38,paleTimber,dx,y,0,frame);
   for(let i=0;i<5;i++)W.box(.44,.035,.23,paleTimber,0,y+.04,-.55+i*.275,frame);
  }
  for(const dx of [-.2,.2])W.line([[dx,.08,-.65],[dx,height-.1,.65]],timber,.022,frame);
  for(let i=0;i<8;i++)W.box(.32,.035,.045,paleTimber,0,.14+i*(height-.3)/8,.72,frame);
  for(const dx of [-.16,.16])W.box(.035,height,.035,timber,dx,height/2,.72,frame);
  scaffolds.push(frame);return frame;
 }
 scaffold(pyramidZone,-7.2,-3.5,2.15);scaffold(templeZone,-6.2,2.4,1.45);
 function person(parent,x,z){const actor=W.person(x,z,'#e4cba1','#9b7651',.2,'#986b46');parent.add(actor.root);actors.push(actor);return actor;}
 function anchor(parent,x,y,z){return W.group(x,y,z,parent);}
 function grip(actor,left,right){grips.push({actor,targets:[left,right],vectors:[new T.Vector3(),new T.Vector3()],arrays:[[0,0,0],[0,0,0]]});}
 // A small wooden handcart follows a closed, non-teleporting corridor west of the city.
 const cart=W.group(0,-.038,0,pyramidZone);cart.name='stone-handcart';
 W.box(.34,.07,.46,paleTimber,0,.18,0,cart);
 W.box(.38,.04,.055,timber,0,.13,0,cart);
 const wheels=[];
 for(const side of [-1,1]){
  const wheel=W.group(side*.22,.12,0,cart);wheel.name='cart-wheel';
  const disc=W.cylinder(.12,.045,timber,0,0,0,wheel,12);disc.rotation.z=Math.PI/2;
  for(const a of [0,Math.PI/3,2*Math.PI/3]){const spoke=W.box(.052,.2,.022,paleTimber,0,0,0,wheel);spoke.rotation.x=a;}
  wheels.push(wheel);
  W.box(.025,.035,.53,timber,side*.055,.22,-.35,cart);
 }
 for(const [x,z] of [[-.085,-.1],[.085,-.1],[0,.11]])W.box(.14,.12,.17,stoneColor,x,.275,z,cart);
 const pusher=person(cart,0,-.68);grip(pusher,anchor(cart,-.055,.22,-.61),anchor(cart,.055,.22,-.61));
 function carrier(parent,x,z){
  const motion=W.group(x,-.038,z,parent),actor=person(motion,0,0);motion.name='stone-carrier';atSite(motion,x,-.038,z,parent);
  W.box(.6,.4,.5,stoneColor,0,1.15,.35,actor.root);
  grip(actor,anchor(actor.root,-.3,1.15,.35),anchor(actor.root,.3,1.15,.35));
  return {motion,actor,x,z,zone:parent};
 }
 const carriers=[carrier(pyramidZone,-6.4,-.65),carrier(templeZone,-5.2,3.2)];
 // A timber shear-leg lifting frame with a suspended stone and a rope pulley.
 const liftRoot=W.group(-7.2,-.038,-1.8,pyramidZone);liftRoot.name='rope-lifting-frame';atSite(liftRoot,-7.2,-.038,-1.8,pyramidZone);
 for(const side of [-1,1]){
  W.line([[side*.25,0,-.22],[side*.14,1.65,0]],timber,.045,liftRoot);
  W.line([[side*.25,0,.22],[side*.14,1.65,0]],timber,.045,liftRoot);
 }
 W.box(.5,.075,.08,paleTimber,0,1.65,0,liftRoot);
 const pulley=W.cylinder(.09,.055,timber,0,1.59,0,liftRoot,12);pulley.rotation.z=Math.PI/2;
 const rope=W.cylinder(.012,1,ropeColor,0,1,0,liftRoot,6);rope.name='lifting-rope';
 const stone=W.group(0,.09,0,liftRoot);stone.name='hoisted-stone';
 W.box(.22,.18,.2,stoneColor,0,0,0,stone);
 const ropeEnd=anchor(rope,0,-.5,0),stoneTop=anchor(stone,0,.09,0);
 // Lashings stay attached to the load rather than floating beside it.
 for(const side of [-1,1])W.box(.014,.19,.215,ropeColor,side*.07,0,0,stone);
 const lift={root:liftRoot,rope,stone,ropeEnd,stoneTop};
 const crank=W.group(.32,.28,.1,liftRoot);W.cylinder(.055,.3,paleTimber,0,0,0,crank,8).rotation.z=Math.PI/2;
 W.box(.03,.19,.03,timber,.17,0,0,crank);W.box(.1,.03,.03,paleTimber,.21,.09,0,crank);
 const posture={crouch:.02,lean:.04,twist:0};
 function tick(t){
  if(!Number.isFinite(t))throw new TypeError('Construction time must be finite.');
  // Pose before applying the site envelope so inverse matrices used by the rig stay nonsingular.
  for(const zone of zones)zone.scale.setScalar(1);
  const q=TAU*t/12;
  atSite(cart,-8.2+.2*Math.sin(q),-.038,-3+1.05*Math.cos(q),pyramidZone);
  cart.rotation.y=Math.atan2(.2*Math.cos(q),-1.05*Math.sin(q));
  for(const wheel of wheels)wheel.rotation.x=-t*.62/.12;
  carriers.forEach((c,i)=>{const phase=q+i*Math.PI;
   atSite(c.motion,c.x+.25*Math.cos(phase),-.038,c.z+.12*Math.sin(phase),c.zone);
   c.motion.rotation.y=Math.atan2(-.25*Math.sin(phase),.12*Math.cos(phase));
  });
  stone.position.y=.09+.85*(1-Math.cos(TAU*t/8))/2;
  const bottom=stone.position.y+.09,length=1.59-bottom;
  rope.position.y=(1.59+bottom)/2;rope.scale.y=length;crank.rotation.x=t*2;
  for(const actor of actors)W.plant(actor,posture);
  for(const entry of grips)for(let i=0;i<2;i++){
   entry.targets[i].getWorldPosition(entry.vectors[i]);entry.vectors[i].toArray(entry.arrays[i]);
   W.reach(entry.actor,i===0?-1:1,entry.arrays[i]);
  }
  pyramidZone.scale.setScalar(activity(t,42,94));templeZone.scale.setScalar(activity(t,78,107));
 }
 function contacts(){
  root.updateMatrixWorld(true);const result=[],a=new T.Vector3(),b=new T.Vector3();
  for(const {actor,targets} of grips)for(let i=0;i<2;i++){
   (i===0?actor.leftHand:actor.rightHand).getWorldPosition(a);targets[i].getWorldPosition(b);
   result.push({label:`worker-${actors.indexOf(actor)}-${i?'right':'left'} grip`,a:a.toArray(),b:b.toArray()});
  }
  ropeEnd.getWorldPosition(a);stoneTop.getWorldPosition(b);result.push({label:'lifting rope meets stone',a:a.toArray(),b:b.toArray()});
  return result;
 }
 tick(0);
 return {root,zones,actors,scaffolds,cart,lift,dynamicRoots:[root],tick,contacts};
}
