const STRAIGHT=11.2,RADIUS=1.2,ARC=Math.PI*RADIUS;
export const TRACK_LENGTH=STRAIGHT*2+ARC*2;
/** Exact arc-length stadium route. Offset is along its unit normal, not world z. */
export function railPose(distance,offset=0){
 let s=((distance%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH,x,z,dx,dz;
 if(s<STRAIGHT){x=-5.6+s;z=6.2;dx=1;dz=0;}
 else if((s-=STRAIGHT)<ARC){const a=Math.PI/2-s/RADIUS;x=5.6+RADIUS*Math.cos(a);z=5+RADIUS*Math.sin(a);dx=Math.sin(a);dz=-Math.cos(a);}
 else if((s-=ARC)<STRAIGHT){x=5.6-s;z=3.8;dx=-1;dz=0;}
 else {s-=STRAIGHT;const a=-Math.PI/2-s/RADIUS;x=-5.6+RADIUS*Math.cos(a);z=5+RADIUS*Math.sin(a);dx=Math.sin(a);dz=-Math.cos(a);}
 return{x:x-dz*offset,z:z+dx*offset,yaw:Math.atan2(dx,dz)};
}
export function boatPose(t){const a=((t%120)+120)%120/120*Math.PI*2;return{x:-4.3+Math.cos(a)*1.65,y:-.035+.008*Math.sin(a*8),z:1.3+Math.sin(a)*1.4,yaw:Math.atan2(-1.65*Math.sin(a),1.4*Math.cos(a))+Math.PI};}
