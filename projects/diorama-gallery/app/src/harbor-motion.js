export const DURATION = 96;
const ease = x => { x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
const mix = (a,b,x) => a+(b-a)*ease(x);
// One reversible transfer: no cargo respawn or invisible return trip.
export function cranePose(time) {
 const t=((time%32)+32)%32;
 let x=-1.1,y=.24,hook=.48;
 if(t<2) hook=mix(.88,.48,t/2);
 else if(t<5) { y=mix(.24,2.65,(t-2)/3); hook=y+.24; }
 else if(t<10) { x=mix(-1.1,1.65,(t-5)/5); y=2.65; hook=y+.24; }
 else if(t<13) { x=1.65;y=mix(2.65,.24,(t-10)/3);hook=y+.24; }
 else if(t<15) { x=1.65;hook=mix(.48,.88,(t-13)/2); }
 else if(t<17) { x=1.65;hook=mix(.88,.48,(t-15)/2); }
 else if(t<20) { x=1.65;y=mix(.24,2.65,(t-17)/3);hook=y+.24; }
 else if(t<25) { x=mix(1.65,-1.1,(t-20)/5);y=2.65;hook=y+.24; }
 else if(t<28) { y=mix(2.65,.24,(t-25)/3);hook=y+.24; }
 else if(t<30) hook=mix(.48,.88,(t-28)/2);
 else hook=.88;
 return {cargoX:x,cargoY:y,hookY:hook,trolleyX:x};
}
export function vesselPose(time,index) {
 const a=time/DURATION*Math.PI*2;
 if(index===0) return {x:.85+.25*Math.sin(a),z:4.2+1.1*Math.cos(a),yaw:.07*Math.sin(a),bob:.025*Math.sin(a*12)};
 if(index===1) return {x:-.8+.25*Math.cos(a),z:-7+.45*Math.sin(a),yaw:Math.PI+.08*Math.cos(a),bob:.018*Math.sin(a*16)};
 const s=index===2?1:-1, p=a*2+(index===2?0:Math.PI);
 return {x:s*2.8+Math.cos(p)*.25,z:-s*6.3+Math.sin(p)*.8,yaw:Math.atan2(-Math.sin(p)*.25,Math.cos(p)*.8),bob:.02*Math.sin(a*24+index)};
}
