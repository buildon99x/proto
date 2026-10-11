// Authored tile-space collision/navigation. No browser or game-state mutation.
const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function inMap(map,x,y,radius=11) {
 return Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(radius)&&radius>=0&&[[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]].every(([dx,dy])=>map.tiles[Math.floor((y+dy)/32)]?.[Math.floor((x+dx)/32)]===1);
}
export function traceSegment(map,a,b,radius=0) {
 if(!finitePoint(a)||!finitePoint(b)||!inMap(map,a.x,a.y,radius))return {x:a?.x??0,y:a?.y??0,blocked:true};
 const dx=b.x-a.x,dy=b.y-a.y,n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
 let safe={x:a.x,y:a.y};
 for(let i=1;i<=n;i++){const p={x:a.x+dx*i/n,y:a.y+dy*i/n};if(!inMap(map,p.x,p.y,radius))return {...safe,blocked:true};safe=p;}
 return {...safe,blocked:false};
}
export const lineOfSight=(map,a,b)=>!traceSegment(map,a,b).blocked;
export function mapFromRegion(region,objectives={}) {
 const rooms=region.rooms??[{x:1,y:1,w:region.w-2,h:region.h-2}],tiles=Array.from({length:region.h},()=>Array(region.w).fill(0));
 for(const r of rooms)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(x>0&&y>0&&x<region.w-1&&y<region.h-1)tiles[y][x]=1;
 for(const d of region.doors??[])if(!(objectives[d.unlockObjective]>=1))for(let y=d.y;y<d.y+d.h;y++)for(let x=d.x;x<d.x+d.w;x++)if(tiles[y]?.[x]!==undefined)tiles[y][x]=0;
 return {w:region.w,h:region.h,tiles,rooms:rooms.map((r,index)=>({...r,index}))};
}
export function findPathStep(map,a,b) {
 if(!finitePoint(a)||!finitePoint(b))return null;
 const start={x:Math.floor(a.x/32),y:Math.floor(a.y/32)},goal={x:Math.floor(b.x/32),y:Math.floor(b.y/32)},key=p=>p.y*map.w+p.x;
 const legal=p=>inMap(map,p.x*32+16,p.y*32+16,11);
 if(!legal(start)||!legal(goal))return null;
 if(key(start)===key(goal))return {x:b.x,y:b.y};
 const queue=[start],parents=new Map([[key(start),null]]);let found=null;
 for(let head=0;head<queue.length&&head<4096;head++){
  const p=queue[head];if(key(p)===key(goal)){found=p;break;}
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const n={x:p.x+dx,y:p.y+dy};if(legal(n)&&!parents.has(key(n))){parents.set(key(n),p);queue.push(n);}}
 }
 if(!found)return null;
 let previous=parents.get(key(found));while(previous&&key(previous)!==key(start)){found=previous;previous=parents.get(key(found));}
 return {x:found.x*32+16,y:found.y*32+16};
}
