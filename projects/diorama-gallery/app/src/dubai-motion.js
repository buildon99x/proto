// A real terminal-to-terminal metro: continuous geometry, arc-length car spacing,
// eased departure/braking and a visible return trip on the same track.
export const CAR_SPACING=.98, RAIL_Y=1.62;
const CONTROL=[[-6.8,6.8],[-1.3,5.7],[7.2,4.0],[6.95,-2.2]];
function curve(u){const v=1-u,[a,b,c,d]=CONTROL;return{x:v*v*v*a[0]+3*v*v*u*b[0]+3*v*u*u*c[0]+u*u*u*d[0],z:v*v*v*a[1]+3*v*v*u*b[1]+3*v*u*u*c[1]+u*u*u*d[1],dx:3*v*v*(b[0]-a[0])+6*v*u*(c[0]-b[0])+3*u*u*(d[0]-c[0]),dz:3*v*v*(b[1]-a[1])+6*v*u*(c[1]-b[1])+3*u*u*(d[1]-c[1])};}
const SAMPLES=1024,arc=[0];let previous=curve(0);for(let i=1;i<=SAMPLES;i++){const p=curve(i/SAMPLES);arc.push(arc[i-1]+Math.hypot(p.x-previous.x,p.z-previous.z));previous=p;}
export const TRACK_LENGTH=arc[SAMPLES];
export function railPose(distance,offset=0){const s=Math.max(0,Math.min(TRACK_LENGTH,distance));let low=0,high=SAMPLES;while(high-low>1){const mid=(low+high)>>1;if(arc[mid]<s)low=mid;else high=mid;}const u=(low+(s-arc[low])/(arc[high]-arc[low]))/SAMPLES,p=curve(u),len=Math.hypot(p.dx,p.dz),dx=p.dx/len,dz=p.dz/len;return{x:p.x-dz*offset,z:p.z+dx*offset,y:RAIL_Y,yaw:Math.atan2(dx,dz)};}
function tripProgress(seconds){const t=Math.max(0,Math.min(26,seconds)),a=2,total=24;if(t<a)return t*t/(2*a*total);if(t>26-a)return 1-(26-t)*(26-t)/(2*a*total);return(t-a/2)/total;}
export function trainState(time){const t=((time%60)+60)%60,min=2.05,max=TRACK_LENGTH-2.05;let p,direction;if(t<26){p=tripProgress(t);direction=1;}else if(t<30){p=1;direction=0;}else if(t<56){p=1-tripProgress(t-30);direction=-1;}else{p=0;direction=0;}return{distance:min+(max-min)*p,direction};}
