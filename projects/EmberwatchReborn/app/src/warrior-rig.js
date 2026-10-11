// Original Emberwatch hero.png anatomy, preserved from the owned 2026-10-08
// bake-motion.mjs (SHA256 b888ee5766f547613c466bf5a757a137b2237cf0ba170f2a16783ff55db4ce17).
// Runtime cutouts reuse those exact polygons. No new raster assets or copied
// commercial art. Only one hero is articulated; the existing atlas is fallback.
import {drawHammerShape} from './warrior-projectile-presentation.js';
const RIGS=[
 {anchor:[166,307],headPivot:[165,162],hip:[166,258],shoulder:[114,176],elbow:[105,205],shieldPivot:[207,181],feet:[[136,304],[205,304]],knees:[[138,282],[197,282]],hips:[[141,258],[190,258]],clothPivot:[168,223],
  head:[[113,65],[209,66],[220,137],[207,166],[166,179],[122,164],[105,139]],
  body:[[128,156],[198,156],[215,199],[205,245],[124,247],[113,203]],
  cloth:[[125,214],[199,212],[217,264],[177,277],[163,259],[148,277],[109,266]],
  leftLeg:[[120,256],[158,256],[159,284],[153,306],[117,309],[113,291]],rightLeg:[[175,256],[204,257],[217,286],[228,307],[189,309],[177,286]],
  upper:[[98,158],[127,153],[143,178],[127,205],[111,215],[86,198]],
  lower:[[88,191],[116,197],[122,217],[99,242],[78,234]],
  sword:[[83,218],[105,229],[77,276],[59,290],[48,278],[67,246]],
  shield:[[196,158],[224,159],[251,180],[266,219],[259,247],[226,270],[195,262],[188,214]]},
 {anchor:[164,596],headPivot:[153,455],hip:[163,550],shoulder:[128,472],elbow:[113,500],shieldPivot:[192,465],feet:[[126,581],[207,594]],knees:[[137,559],[194,567]],hips:[[145,536],[180,542]],clothPivot:[163,513],
  head:[[106,366],[177,365],[208,386],[218,421],[207,442],[167,465],[120,466],[96,437],[92,411]],
  body:[[126,446],[190,434],[215,483],[190,535],[130,540],[119,499]],
  cloth:[[128,505],[194,501],[207,557],[174,570],[159,552],[148,566],[121,555]],
  leftLeg:[[113,540],[153,537],[157,561],[149,583],[126,590],[101,581],[102,568]],rightLeg:[[175,541],[207,542],[218,566],[225,598],[202,606],[175,591],[173,567]],
  upper:[[113,451],[144,459],[151,480],[130,502],[109,511],[93,490]],lower:[[96,481],[123,489],[135,511],[119,536],[99,528],[84,511]],
  sword:[[48,446],[58,438],[93,466],[115,497],[104,517],[85,503],[73,479]],
  shield:[[174,443],[205,447],[231,476],[246,510],[239,543],[219,564],[185,565],[160,541],[156,505],[167,479]]},
 {anchor:[174,885],headPivot:[172,740],hip:[168,832],shoulder:[179,757],elbow:[188,789],shieldPivot:[112,752],feet:[[120,880],[203,879]],knees:[[131,853],[190,854]],hips:[[139,831],[177,830]],clothPivot:[156,802],
  head:[[130,658],[183,659],[210,680],[226,712],[221,735],[187,750],[143,746],[116,716],[114,690]],
  body:[[119,721],[168,724],[190,751],[198,799],[176,831],[127,826],[106,784]],
  cloth:[[124,792],[181,790],[198,825],[212,850],[176,856],[157,839],[144,857],[110,843]],
  leftLeg:[[107,829],[146,828],[150,854],[142,882],[103,887],[96,870]],rightLeg:[[169,828],[196,828],[206,849],[225,875],[219,885],[187,885],[168,855]],
  upper:[[164,735],[191,736],[211,760],[204,787],[180,798],[152,767]],lower:[[178,775],[201,780],[217,799],[238,809],[228,836],[203,831],[184,811]],
  sword:[[222,805],[242,765],[266,736],[277,741],[265,776],[245,816],[232,838],[215,826]],
  shield:[[102,725],[128,728],[142,746],[139,777],[122,814],[95,835],[77,824],[68,800],[75,757]]},
 {anchor:[168,1183],headPivot:[165,1035],hip:[168,1128],shoulder:[217,1049],elbow:[233,1078],shieldPivot:[109,1060],feet:[[134,1176],[208,1176]],knees:[[137,1153],[196,1151]],hips:[[141,1125],[188,1127]],clothPivot:[166,1097],
  head:[[113,939],[179,938],[211,968],[220,1015],[204,1038],[166,1047],[122,1040],[99,1015],[103,978]],
  body:[[118,1026],[201,1029],[219,1065],[204,1112],[124,1123],[110,1070]],
  cloth:[[119,1094],[201,1093],[220,1138],[178,1150],[165,1132],[148,1150],[102,1136]],
  leftLeg:[[116,1125],[155,1124],[158,1152],[151,1181],[114,1185],[108,1157]],rightLeg:[[177,1125],[203,1123],[217,1154],[228,1183],[189,1185],[174,1154]],
  upper:[[195,1023],[221,1024],[240,1048],[236,1073],[217,1089],[195,1066]],lower:[[215,1063],[239,1066],[253,1085],[252,1103],[228,1118],[215,1094]],
  sword:[[232,1090],[256,1043],[270,1015],[283,1021],[275,1057],[255,1099],[247,1117],[227,1105]],
  shield:[[94,1032],[118,1035],[136,1064],[126,1099],[109,1124],[82,1131],[60,1104],[58,1073],[74,1045]]}
];
const radians=d=>d*Math.PI/180;
const raw=(ctx,part)=>ctx.drawImage(part.canvas,part.x,part.y);
function rotateAt(ctx,p,angle){ctx.translate(...p);ctx.rotate(radians(angle));ctx.translate(-p[0],-p[1]);}
function segment(ctx,part,a,b,A,B){const length=Math.hypot(b[0]-a[0],b[1]-a[1]),target=Math.hypot(B[0]-A[0],B[1]-A[1]);ctx.save();ctx.translate(...A);ctx.rotate(Math.atan2(B[1]-A[1],B[0]-A[0]));ctx.scale(target/length,1);ctx.rotate(-Math.atan2(b[1]-a[1],b[0]-a[0]));ctx.translate(-a[0],-a[1]);raw(ctx,part);ctx.restore();}
export const WARRIOR_RIG_LIMITS=Object.freeze({directions:4,surface:128,maxMaskPixels:1_200_000});
export function createWarriorRig(source,{createCanvas}={}){
 const cache=new Map();let surface=null,pixels=0,disabled=false,rendered=0;
 const canvas=(w,h)=>{if(pixels+w*h>WARRIOR_RIG_LIMITS.maxMaskPixels)throw Error('Warrior cutout pixel cap');const result=createCanvas(w,h);if(!result?.getContext)throw Error('Canvas unavailable');result.width=w;result.height=h;pixels+=w*h;return result;};
 function directionRig(direction){
  if(cache.has(direction))return cache.get(direction);
  const rig=RIGS[direction],parts={};
  const mask=(poly,half=null)=>{const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),x=Math.floor(Math.min(...xs))-2,y=Math.floor(Math.min(...ys))-2,w=Math.ceil(Math.max(...xs))-x+3,h=Math.ceil(Math.max(...ys))-y+3,c=canvas(w,h),ctx=c.getContext('2d');ctx.beginPath();poly.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p[0]-x,p[1]-y));ctx.closePath();ctx.clip();if(half){ctx.beginPath();ctx.rect(0,half.top?0:half.y-y-5,w,half.top?half.y-y+5:h);ctx.clip();}ctx.drawImage(source,-x,-y);return {canvas:c,x,y};};
  for(const key of ['head','body','cloth','upper','lower','sword','shield'])parts[key]=mask(rig[key]);
  parts.leftLeg=[mask(rig.leftLeg,{y:rig.knees[0][1],top:true}),mask(rig.leftLeg,{y:rig.knees[0][1],top:false})];
  parts.rightLeg=[mask(rig.rightLeg,{y:rig.knees[1][1],top:true}),mask(rig.rightLeg,{y:rig.knees[1][1],top:false})];
  const result={...rig,parts};cache.set(direction,result);return result;
 }
 function render(pose,{legs=pose,weapon='sword'}={}){
  if(disabled||!source||typeof createCanvas!=='function'||source.complete===false||source.naturalWidth===0)return null;
  try{
   surface??=canvas(WARRIOR_RIG_LIMITS.surface,WARRIOR_RIG_LIMITS.surface);
   const ctx=surface.getContext('2d'),rig=directionRig(pose.direction),u=2.4,bodyX=pose.rootX*u,bodyY=pose.rootY*u;
   ctx.clearRect(0,0,surface.width,surface.height);ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.translate(64,102);ctx.scale(64/240,64/240);ctx.translate(-rig.anchor[0],-rig.anchor[1]);ctx.globalAlpha=pose.alpha;
   for(let i=0;i<2;i++){const hip=rig.hips[i],knee=rig.knees[i],foot=rig.feet[i],dx=(i?legs.rightFootX:legs.leftFootX)*u,dy=(i?legs.rightFootY:legs.leftFootY)*u,bend=(i?legs.rightKnee:legs.leftKnee)*u,A=[hip[0]+bodyX,hip[1]+bodyY],B=[foot[0]+dx,foot[1]+dy],T=[(A[0]+B[0])/2+bend,(A[1]+B[1])/2-1],parts=i?rig.parts.rightLeg:rig.parts.leftLeg;segment(ctx,parts[0],hip,knee,A,T);segment(ctx,parts[1],knee,foot,T,B);}
   ctx.save();ctx.translate(bodyX,bodyY);rotateAt(ctx,rig.hip,pose.bodyAngle);ctx.translate(...rig.hip);ctx.scale(1,pose.bodyScaleY);ctx.translate(-rig.hip[0],-rig.hip[1]);
   const arm=()=>{ctx.save();rotateAt(ctx,rig.shoulder,pose.weaponAngle);raw(ctx,rig.parts.upper);rotateAt(ctx,rig.elbow,pose.weaponElbow);raw(ctx,rig.parts.lower);if(weapon==='sword')raw(ctx,rig.parts.sword);else if(weapon==='hammer'){const hand=[[94,227],[104,511],[216,816],[240,1100]][pose.direction];ctx.save();ctx.translate(...hand);ctx.rotate(radians([22,-23,24,16][pose.direction]));ctx.scale(2.1,2.1);drawHammerShape(ctx);ctx.restore();}ctx.restore();};
   const shield=()=>{ctx.save();ctx.translate((pose.shieldX||0)*u,(pose.shieldY||0)*u);rotateAt(ctx,rig.shieldPivot,pose.shieldAngle);raw(ctx,rig.parts.shield);ctx.restore();};
   if(pose.direction===1)arm();if(!pose.shieldFront&&(pose.direction===2||pose.direction===3))shield();raw(ctx,rig.parts.body);
   ctx.save();ctx.translate(pose.clothX*u,pose.clothY*u);rotateAt(ctx,rig.clothPivot,pose.clothAngle);raw(ctx,rig.parts.cloth);ctx.restore();
   ctx.save();ctx.translate(pose.headX*u,pose.headY*u);rotateAt(ctx,rig.headPivot,pose.headAngle);raw(ctx,rig.parts.head);ctx.restore();
   if(pose.direction!==1)arm();if(pose.shieldFront||pose.direction===0||pose.direction===1)shield();ctx.restore();ctx.restore();rendered++;
   return {canvas:surface,anchorX:64,anchorY:102,bodyHeight:64};
  }catch{disabled=true;return null;}
 }
 return {render,metrics:()=>({directions:cache.size,pixels,rendered,disabled})};
}
