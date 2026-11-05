/** Conservative horizontal footprints shared by the authored layout and its audit. */
export const overlaps=(a,b,pad=0)=>a.x0<b.x1+pad&&a.x1>b.x0-pad&&a.z0<b.z1+pad&&a.z1>b.z0-pad;
export function footprint(box,pad=0){return{x0:box.min.x-pad,x1:box.max.x+pad,z0:box.min.z-pad,z1:box.max.z+pad};}
function inside(point,polygon){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
function segments(a,b,c,d){const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);return cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]));}
export function polygonOverlapsRect(poly,r){const corners=[[r.x0,r.z0],[r.x1,r.z0],[r.x1,r.z1],[r.x0,r.z1]];if(corners.some(p=>inside(p,poly))||poly.some(p=>p[0]>=r.x0&&p[0]<=r.x1&&p[1]>=r.z0&&p[1]<=r.z1))return true;for(let i=0;i<poly.length;i++)for(let j=0;j<4;j++)if(segments(poly[i],poly[(i+1)%poly.length],corners[j],corners[(j+1)%4]))return true;return false;}
export function planParisRoads(blockers,water){
 const authored=[[-6.98,2.7,.34,9.8],[-7.28,-4.8,.42,5.6],[-3.1,4.4,.46,5.9],[.35,6.3,6.9,.40],[7.7,0,.28,15.3],[0,-6.85,14.4,.45],[-4,-3.65,6.8,.48],[4.9,-3.55,3.3,.45],[-.8,2.85,5.6,.46],[1.15,5.9,.38,3.3],[4.05,5.9,.38,3.3],[2.6,7.35,3.3,.38],[2.6,4.45,3.3,.38]];
 const roads=[];
 for(const[x,z,w,d]of authored){const horizontal=w>d,length=horizontal?w:d,n=Math.ceil(length/.07),step=length/n;let start=null;
  const flush=i=>{if(start===null)return;const span=(i-start)*step;if(span>.22){const along=-length/2+(start+i)*step/2;roads.push({x:x+(horizontal?along:0),z:z+(horizontal?0:along),w:horizontal?span:w,d:horizontal?d:span});}start=null;};
  for(let i=0;i<n;i++){const a=-length/2+i*step,b=a+step,r=horizontal?{x0:x+a,x1:x+b,z0:z-d/2,z1:z+d/2}:{x0:x-w/2,x1:x+w/2,z0:z+a,z1:z+b};const clear=!blockers.some(o=>overlaps(r,o,.045))&&!water.some(poly=>polygonOverlapsRect(poly,r));if(clear){if(start===null)start=i;}else flush(i);}flush(n);
 }
 return roads;
}
export function planParisBridges(riverPose,architecture,water){
 const planned=[],targets=[[-4,-1.7],[-1,1.4],[4.75,3.2]];
 for(const [tx,tz]of targets){let best=null,score=Infinity;
  for(let i=15;i<985;i+=3){const p=riverPose(i/1000),yaw=p.yaw+Math.PI/2,c=Math.cos(yaw),s=Math.sin(yaw),point=(x,z)=>[p.x+x*c+z*s,p.z-x*s+z*c];
   if(planned.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<2.3))continue;
   for(const length of[2.05,2.25,2.5,2.8,3.1]){const h=length/2+.06,poly=[point(-.56,-h),point(.56,-h),point(.56,h),point(-.56,h)];if(poly.some(([x,z])=>Math.abs(x)>7.9||Math.abs(z)>7.9)||architecture.some(r=>polygonOverlapsRect(poly,{x0:r.x0-.025,x1:r.x1+.025,z0:r.z0-.025,z1:r.z1+.025})))continue;
    let dry=true;for(const side of[-1,1])for(const edge of[-.32,.32]){const[x,z]=point(edge,side*(length/2-.02));if(water.some(poly=>polygonOverlapsRect(poly,{x0:x-.015,x1:x+.015,z0:z-.015,z1:z+.015})))dry=false;}if(!dry)continue;
    const cost=(p.x-tx)**2+(p.z-tz)**2+(length-2.05)**2*.2;if(cost<score){score=cost;best={x:p.x,z:p.z,yaw,length};}
   }
  }
  if(!best)throw new Error('No physically clear Paris bridge placement');planned.push(best);
 }
 return planned;
}
