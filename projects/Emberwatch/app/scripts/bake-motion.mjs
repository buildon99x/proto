// Builds deterministic articulated raster frames. Original source pixels are
// split into anatomical parts; every sampled pose independently changes joints.
// Run with Node and @napi-rs/canvas available as an offline tooling dependency.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {MOTION_ACTIONS,MOTION_ASSETS,MOTION_FRAME_COUNT,sampleActorMotion,motionSamplePhase} from '../src/motion.js';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const root=new URL('../src/assets/',import.meta.url),proof=new URL('../../assets/screenshots/motion-warrior/',import.meta.url);
fs.mkdirSync(proof,{recursive:true});
const source=await loadImage(new URL('hero.png',root).pathname),weaponSource=await loadImage(new URL('../../assets/motion-source/motion-warrior-axes-source.png',import.meta.url).pathname);
// Explicit, reviewed masks are in original source-atlas coordinates. Intentional
// small overlaps at shoulders, hips, knees and neck close articulation seams.
const rigs=[
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
function mask(poly){const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),x=Math.floor(Math.min(...xs))-2,y=Math.floor(Math.min(...ys))-2,w=Math.ceil(Math.max(...xs))-x+3,h=Math.ceil(Math.max(...ys))-y+3,c=createCanvas(w,h),ctx=c.getContext('2d');ctx.beginPath();poly.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p[0]-x,p[1]-y));ctx.closePath();ctx.clip();ctx.drawImage(source,-x,-y);return {canvas:c,x,y,w,h};}
function splitLeg(poly,kneeY){const part=mask(poly);function half(top){const c=createCanvas(part.w,part.h),ctx=c.getContext('2d');ctx.beginPath();ctx.rect(0,top?0:kneeY-part.y-5,part.w,top?kneeY-part.y+5:part.h);ctx.clip();ctx.drawImage(part.canvas,0,0);return {...part,canvas:c};}return [half(true),half(false)];}
for(const r of rigs){r.parts={};for(const key of ['head','body','cloth','upper','lower','sword','shield'])r.parts[key]=mask(r[key]);r.parts.leftLeg=splitLeg(r.leftLeg,r.knees[0][1]);r.parts.rightLeg=splitLeg(r.rightLeg,r.knees[1][1]);}
function raw(ctx,part){ctx.drawImage(part.canvas,part.x,part.y);}
function rotateAt(ctx,point,angle){ctx.translate(...point);ctx.rotate(radians(angle));ctx.translate(-point[0],-point[1]);}
function segment(ctx,part,a,b,A,B){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),target=Math.hypot(B[0]-A[0],B[1]-A[1]),angle=Math.atan2(b[1]-a[1],b[0]-a[0]),newAngle=Math.atan2(B[1]-A[1],B[0]-A[0]);ctx.save();ctx.translate(...A);ctx.rotate(newAngle);ctx.scale(target/len,1);ctx.rotate(-angle);ctx.translate(-a[0],-a[1]);raw(ctx,part);ctx.restore();}
// Source axle cropped from the original generated two-axe sheet, then resampled
// once. The animation uses real axe pixels rather than a rectangular substitute.
const axe=createCanvas(180,224),ax=axe.getContext('2d');ax.drawImage(weaponSource,73,40,700,820,0,0,180,224);fs.writeFileSync(new URL('motion-warrior-axe.png',root),axe.toBuffer('image/png'));
function render(ctx,rig,pose,origin=[56,94],scale=64/240){
 const u=2.4,bodyX=pose.rootX*u,bodyY=pose.rootY*u;ctx.save();ctx.translate(...origin);ctx.scale(scale,scale);ctx.translate(-rig.anchor[0],-rig.anchor[1]);ctx.globalAlpha=pose.alpha;
 for(let i=0;i<2;i++){const hip=rig.hips[i],knee=rig.knees[i],foot=rig.feet[i],dx=(i?pose.rightFootX:pose.leftFootX)*u,dy=(i?pose.rightFootY:pose.leftFootY)*u,bend=(i?pose.rightKnee:pose.leftKnee)*u,A=[hip[0]+bodyX,hip[1]+bodyY],B=[foot[0]+dx,foot[1]+dy],T=[(A[0]+B[0])/2+bend,(A[1]+B[1])/2-1],parts=i?rig.parts.rightLeg:rig.parts.leftLeg;segment(ctx,parts[0],hip,knee,A,T);segment(ctx,parts[1],knee,foot,T,B);}
 ctx.save();ctx.translate(bodyX,bodyY);rotateAt(ctx,rig.hip,pose.bodyAngle);ctx.translate(...rig.hip);ctx.scale(1,pose.bodyScaleY);ctx.translate(-rig.hip[0],-rig.hip[1]);
 const arm=()=>{ctx.save();rotateAt(ctx,rig.shoulder,pose.weaponAngle);raw(ctx,rig.parts.upper);rotateAt(ctx,rig.elbow,pose.weaponElbow);raw(ctx,rig.parts.lower);if(pose.action==='axes'){
  if(pose.phase<.44){const hand=[[94,227],[104,511],[216,816],[240,1100]][pose.direction];ctx.save();ctx.translate(...hand);ctx.rotate(radians([22,-23,24,16][pose.direction]));ctx.drawImage(axe,-27,-73,54,78);ctx.restore();}else if(pose.phase>.83)raw(ctx,rig.parts.sword);
 }else raw(ctx,rig.parts.sword);ctx.restore();};
 const shield=()=>{ctx.save();rotateAt(ctx,rig.shieldPivot,pose.shieldAngle);raw(ctx,rig.parts.shield);ctx.restore();};
 if(pose.direction===1)arm();if(pose.direction===2||pose.direction===3)shield();
 raw(ctx,rig.parts.body);
 ctx.save();ctx.translate(pose.clothX*u,pose.clothY*u);rotateAt(ctx,rig.clothPivot,pose.clothAngle);raw(ctx,rig.parts.cloth);ctx.restore();
 ctx.save();ctx.translate(pose.headX*u,pose.headY*u);rotateAt(ctx,rig.headPivot,pose.headAngle);raw(ctx,rig.parts.head);ctx.restore();
 if(pose.direction!==1)arm();if(pose.direction===0||pose.direction===1)shield();
 ctx.restore();ctx.restore();
}
const set=MOTION_ASSETS.hero,atlas=createCanvas(set.frameWidth*24,set.frameHeight*40),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
const validation=[];
for(let direction=0;direction<4;direction++)for(let actionIndex=0;actionIndex<MOTION_ACTIONS.length;actionIndex++){
 const action=MOTION_ACTIONS[actionIndex],hashes=[],bboxes=[],poses=[];
 for(let frame=0;frame<24;frame++){
  const phase=motionSamplePhase(action,frame),pose=sampleActorMotion({action,phase,direction,kind:'hero'}),x=frame*112,y=(direction*10+actionIndex)*112;
  ctx.save();ctx.beginPath();ctx.rect(x,y,112,112);ctx.clip();render(ctx,rigs[direction],pose,[x+56,y+94]);ctx.restore();
  const bytes=ctx.getImageData(x,y,112,112).data;hashes.push(createHash('sha256').update(bytes).digest('hex'));let minX=112,minY=112,maxX=-1,maxY=-1,alpha=0;for(let j=0;j<112;j++)for(let i=0;i<112;i++)if(bytes[(j*112+i)*4+3]>24){minX=Math.min(minX,i);maxX=Math.max(maxX,i);minY=Math.min(minY,j);maxY=Math.max(maxY,j);alpha++;}bboxes.push({minX,minY,maxX,maxY,alpha});poses.push(pose);
 }
 validation.push({direction,action,frameCount:24,uniqueFrames:new Set(hashes).size,hashes,bboxes,jointPoses:poses});
}
fs.writeFileSync(new URL('motion-hero.png',root),atlas.toBuffer('image/png'));
fs.writeFileSync(new URL('motion-warrior-validation.json',proof),JSON.stringify({description:'Offscreen deterministic image and joint checks. Not browser gameplay QA.',atlasSha256:createHash('sha256').update(fs.readFileSync(new URL('motion-hero.png',root))).digest('hex'),generatedAt:new Date().toISOString(),frameWidth:112,frameHeight:112,anchor:[56,94],bodyHeight:64,clips:validation},null,2));
// Contact sheets display every pose in order, with the same ground line and a
// contact-frame marker; no trimming/recentering may conceal foot-anchor drift.
for(let direction=0;direction<4;direction++){
 const sheet=createCanvas(24*84+160,10*110+70),s=sheet.getContext('2d');s.fillStyle='#171c29';s.fillRect(0,0,sheet.width,sheet.height);s.font='15px sans-serif';s.fillStyle='#d5e5e0';s.fillText(`WARRIOR / ${['SOUTH','WEST','EAST','NORTH'][direction]} / 24 articulated poses per action / OFFSCREEN EVIDENCE`,20,30);
 for(let ai=0;ai<10;ai++){s.fillStyle='#b1cfc9';s.fillText(MOTION_ACTIONS[ai],12,88+ai*110);for(let f=0;f<24;f++){const x=160+f*84,y=52+ai*110;s.strokeStyle=f===8&&MOTION_ACTIONS[ai].startsWith('attack')?'#e7b573':'#314349';s.beginPath();s.moveTo(x,y+70.5);s.lineTo(x+82,y+70.5);s.stroke();s.imageSmoothingEnabled=false;s.drawImage(atlas,f*112,(direction*10+ai)*112,112,112,x,y,84,84);s.fillStyle='#819994';s.font='9px monospace';s.fillText(String(f+1).padStart(2,'0'),x+3,y+101);}}
 fs.writeFileSync(new URL(`warrior-direction-${direction}.png`,proof),sheet.toBuffer('image/png'));
}
// A compact four-direction key-pose overview is easier to inspect than 960 poses.
const overview=createCanvas(1510,10*154+80),ov=overview.getContext('2d');ov.fillStyle='#1b2330';ov.fillRect(0,0,overview.width,overview.height);ov.fillStyle='#e5e9df';ov.font='18px sans-serif';ov.fillText('WARRIOR: anticipation / contact / recovery. Original articulated pixels. Offscreen evidence.',20,30);
for(let a=0;a<10;a++){ov.fillStyle='#b6d5d0';ov.font='14px sans-serif';ov.fillText(MOTION_ACTIONS[a],10,80+a*154);for(let d=0;d<4;d++)for(let j=0;j<3;j++){const x=125+(d*3+j)*112,y=55+a*154,f=[4,8,17][j];ov.imageSmoothingEnabled=false;ov.drawImage(atlas,f*112,(d*10+a)*112,112,112,x,y,112,112);ov.fillStyle='#668f8d';ov.font='9px monospace';ov.fillText(`${['S','W','E','N'][d]} ${f+1}`,x+31,y+124);}}
fs.writeFileSync(new URL('warrior-key-poses.png',proof),overview.toBuffer('image/png'));
const detail=createCanvas(5*336,4*336),dc=detail.getContext('2d');dc.fillStyle='#24313b';dc.fillRect(0,0,detail.width,detail.height);dc.imageSmoothingEnabled=false;for(let d=0;d<4;d++)for(let j=0;j<5;j++){const f=[0,4,8,12,19][j];dc.drawImage(atlas,f*112,(d*10+2)*112,112,112,j*336,d*336,336,336);}fs.writeFileSync(new URL('warrior-attack-detail.png',proof),detail.toBuffer('image/png'));
const deathDetail=createCanvas(5*280,4*280),ddc=deathDetail.getContext('2d');ddc.fillStyle='#24313b';ddc.fillRect(0,0,deathDetail.width,deathDetail.height);ddc.imageSmoothingEnabled=false;for(let d=0;d<4;d++)for(let j=0;j<5;j++){const f=[0,6,12,18,23][j];ddc.drawImage(atlas,f*112,(d*10+9)*112,112,112,j*280,d*280,280,280);}fs.writeFileSync(new URL('warrior-death-detail.png',proof),deathDetail.toBuffer('image/png'));
console.log(JSON.stringify({atlas:new URL('motion-hero.png',root).pathname,dimensions:[atlas.width,atlas.height],frames:960,bytes:fs.statSync(new URL('motion-hero.png',root)).size,clips:validation.map(v=>({direction:v.direction,action:v.action,unique:v.uniqueFrames,edgeClips:v.bboxes.filter(b=>b.minX===0||b.minY===0||b.maxX===111||b.maxY===111).length}))},null,2));
