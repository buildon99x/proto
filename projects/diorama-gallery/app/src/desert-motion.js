export function riverCenter(z){return 1.7*Math.sin(z*.52)+1.7;}
export function riverHalfWidth(z){return 1.05+.55*Math.min(1,Math.max(0,(z+9.65)/19.3));}
export function boatPose(t,i){const phase=2*Math.PI*((t%120+120)%120)/120+i*.7,z=[-5.8,-2.0,2.2,6.0][i]+.48*Math.cos(phase),x=riverCenter(z)+.42*Math.sin(phase),dz=-.48*Math.sin(phase),dx=.42*Math.cos(phase)+.884*Math.cos(z*.52)*dz;return{x,z,yaw:Math.atan2(dx,dz)};}
