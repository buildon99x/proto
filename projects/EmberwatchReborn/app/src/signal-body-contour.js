import {SIGNAL_REGION} from './signal-content.js';

// Quiet sprite-derived edges only for the already drawn S keeper that overlaps
// the hero. Body alpha, depth, visibility, warnings and floor marks are unchanged.
export const SIGNAL_CONTOUR_STYLE=Object.freeze({color:'#d8ded2',alpha:.72,keyColor:'#111626',keyAlpha:.82,footClearance:6,padding:3,maxFrames:16});
export function signalBodyContourAllowed(actor,regionId,opacity){
 return regionId===SIGNAL_REGION&&actor?.kind==='signal_keeper'&&actor.active&&actor.hp>0&&!actor.dead&&opacity>0&&opacity<1;
}

// Two tiny transparent masks per sprite frame. Draw at the actor's existing
// sorted slot, never in a late overlay. Optional-canvas failure is fail-open to
// the unchanged renderer; no image reads, gameplay state, or DOM state are used.
export function createSignalBodyContourCache(createCanvas,protectedContext=null){
 let image=null,scale=null,frames=new Map(),usedCanvases=new Set();
 return (img,frame,k,kx)=>{
  if(!createCanvas||!img||!frame)return null;
  const nextScale=k+':'+kx;
  if(image!==img||scale!==nextScale){image=img;scale=nextScale;frames.clear();usedCanvases.clear();}
  if(frames.has(frame))return frames.get(frame);
  if(frames.size>=SIGNAL_CONTOUR_STYLE.maxFrames){frames.clear();usedCanvases.clear();}
  const p=SIGNAL_CONTOUR_STYLE.padding,width=Math.ceil(frame.w*kx)+p*2,height=Math.ceil(frame.h*k)+p*2;
  const masks=[];
  try{
   for(const [radius,color,alpha] of [[2,SIGNAL_CONTOUR_STYLE.keyColor,SIGNAL_CONTOUR_STYLE.keyAlpha],[1,SIGNAL_CONTOUR_STYLE.color,SIGNAL_CONTOUR_STYLE.alpha]]){
    const canvas=createCanvas(width,height),ctx=canvas?.getContext?.('2d');
    if(!ctx||ctx===protectedContext||canvas===protectedContext?.canvas||usedCanvases.has(canvas)||typeof ctx.clearRect!=='function'){frames.set(frame,null);return null;}
    usedCanvases.add(canvas);
    canvas.width=width;canvas.height=height;ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=false;
    const draw=(dx,dy)=>ctx.drawImage(img,frame.x,frame.y,frame.w,frame.h,p+dx,p+dy,frame.w*kx,frame.h*k);
    for(const [dx,dy] of [[-radius,0],[radius,0],[0,-radius],[0,radius],...(radius===2?[[-1,-1],[1,-1],[-1,1],[1,1]]:[])])draw(dx,dy);
    ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,width,height);
    ctx.globalCompositeOperation='destination-out';draw(0,0);
    ctx.globalCompositeOperation='source-over';masks.push({canvas,alpha});
   }
  }catch{frames.set(frame,null);return null;}
  const value={masks,padding:p,width,height};frames.set(frame,value);return value;
 };
}
