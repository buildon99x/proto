export class PointerGesture {
 constructor(){this.reset();}
 start(id,x,y){if(this.active)return false;this.active={id,x,y,startX:x,startY:y,maxDistance:0};return true;}
 move(id,x,y){const a=this.active;if(!a||a.id!==id)return null;const delta={x:x-a.x,y:y-a.y};a.x=x;a.y=y;a.maxDistance=Math.max(a.maxDistance,Math.hypot(x-a.startX,y-a.startY));return delta;}
 end(id,x,y){const a=this.active;if(!a||a.id!==id)return null;this.move(id,x,y);this.active=null;return{tap:a.maxDistance<8};}
 reset(){this.active=null;}
}
export function joystickVector(x,y,r){const radius=Math.max(1,Math.min(r.width,r.height)*.32);let dx=(x-r.left-r.width/2)/radius,dz=(y-r.top-r.height/2)/radius;const length=Math.max(1,Math.hypot(dx,dz));return{x:dx/length,z:dz/length};}
export function bindPointerControls({scene,joystick,onAxis,onRotate,onSelect,onRelease=()=>{},blocked=()=>false}){const camera=new PointerGesture(),stick=new PointerGesture();const capture=(el,e)=>{try{el.setPointerCapture(e.pointerId);}catch{}};const release=(el,id)=>{try{el.releasePointerCapture(id);}catch{}};const axis=e=>onAxis(joystickVector(e.clientX,e.clientY,joystick.getBoundingClientRect()));
 scene.addEventListener('pointerdown',e=>{if(blocked()||(e.pointerType==='mouse'&&e.button!==0))return;if(camera.start(e.pointerId,e.clientX,e.clientY))capture(scene,e);});scene.addEventListener('pointermove',e=>{if(blocked())return;const d=camera.move(e.pointerId,e.clientX,e.clientY);if(d)onRotate(d.x,d.y);});scene.addEventListener('pointerup',e=>{const ended=camera.end(e.pointerId,e.clientX,e.clientY);if(ended){release(scene,e.pointerId);if(ended.tap&&!blocked())onSelect(e);}});for(const type of ['pointercancel','lostpointercapture'])scene.addEventListener(type,e=>{if(camera.active?.id===e.pointerId)camera.reset();});
 joystick.addEventListener('pointerdown',e=>{if(blocked()||(e.pointerType==='mouse'&&e.button!==0))return;if(stick.start(e.pointerId,e.clientX,e.clientY)){capture(joystick,e);axis(e);}});joystick.addEventListener('pointermove',e=>{if(!blocked()&&stick.move(e.pointerId,e.clientX,e.clientY))axis(e);});const endStick=e=>{if(stick.active?.id!==e.pointerId)return;stick.reset();release(joystick,e.pointerId);onAxis({x:0,z:0});onRelease();};for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,endStick);
 return{reset(){const cameraId=camera.active?.id,stickId=stick.active?.id;camera.reset();stick.reset();if(cameraId!==undefined)release(scene,cameraId);if(stickId!==undefined)release(joystick,stickId);onAxis({x:0,z:0});}};
}
