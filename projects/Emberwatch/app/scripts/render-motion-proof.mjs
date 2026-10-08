// Renders an annotated motion proof, NOT a live browser gameplay capture.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {MOTION_ACTIONS,MOTION_CLIPS,MOTION_ASSETS,MOTION_AXE_ASSET,createMotionRenderer,motionSamplePhase} from '../src/motion.js';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const output=new URL('../../assets/screenshots/motion-warrior/',import.meta.url);fs.mkdirSync(output,{recursive:true});
const image=await loadImage(new URL('../src/'+MOTION_ASSETS.hero.file,import.meta.url).pathname),axe=await loadImage(new URL('../src/'+MOTION_AXE_ASSET.file,import.meta.url).pathname);
const width=960,height=560,fps=60,canvas=createCanvas(width,height),ctx=canvas.getContext('2d'),renderer=createMotionRenderer(ctx,null,{motion:{hero:image}});
const proofName=process.argv[2]||'warrior-motion-proof.mp4';const destination=new URL(proofName,output).pathname;
const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',`${width}x${height}`,'-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',destination],{stdio:['pipe','ignore','pipe']});
let errors='';encoder.stderr.on('data',b=>errors+=b);const completion=once(encoder,'close');
function draw(action,phase,time){
 const clip=MOTION_CLIPS[action];ctx.fillStyle='#171e2b';ctx.fillRect(0,0,width,height);ctx.fillStyle='#e9e5d6';ctx.font='bold 25px sans-serif';ctx.fillText(`WARRIOR  /  ${action.toUpperCase()}`,30,42);ctx.fillStyle='#8dafac';ctx.font='14px sans-serif';ctx.fillText('Original articulated source art · authored clip timing · OFFSCREEN PROOF, not gameplay',30,70);
 let activeFrame=0;
 for(let d=0;d<4;d++){
  const x=145+d*225;ctx.fillStyle='#202b38';ctx.fillRect(x-104,99,208,298);ctx.strokeStyle='#486864';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-85,351);ctx.lineTo(x+85,351);ctx.stroke();ctx.fillStyle='#0e121d99';ctx.beginPath();ctx.ellipse(x,351,30,9,0,0,Math.PI*2);ctx.fill();
  const r=renderer.draw({player:true,actor:{classId:'warrior'},x,y:351,height:128,time,action,phase,direction:d});activeFrame=r.frame;
  ctx.fillStyle='#93b5b0';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText(['SOUTH','WEST','EAST','NORTH'][d],x,120);ctx.fillStyle='#b6c9c5';ctx.fillText('2× inspection scale',x,381);
  ctx.strokeStyle='#31474a';ctx.beginPath();ctx.moveTo(x-48,478);ctx.lineTo(x+48,478);ctx.stroke();renderer.draw({player:true,actor:{classId:'warrior'},x,y:478,height:49,time,action,phase,direction:d});ctx.fillText('native standing height: 49 px',x,505);ctx.textAlign='left';
 }
 ctx.fillStyle='#27383f';ctx.fillRect(30,535,900,5);ctx.fillStyle='#82b3ad';ctx.fillRect(30,535,900*Math.min(1,phase),5);if(clip.contact!==undefined){const x=30+900*clip.contact;ctx.fillStyle='#efbd7d';ctx.fillRect(x-1,528,2,18);ctx.font='12px sans-serif';ctx.fillText('contact',x-20,524);if(Math.abs(phase-clip.contact)<.045){ctx.fillStyle='#ffca88';ctx.font='bold 16px sans-serif';ctx.fillText('CONTACT POSE',725,42);}}
 ctx.fillStyle='#b2cbc4';ctx.font='14px monospace';ctx.fillText(`pose ${String(activeFrame+1).padStart(2,'0')} / 24`,790,70);
 if(action==='axes'&&phase>=.44&&phase<.84){ctx.save();ctx.translate(68+(phase-.44)*210,210);ctx.rotate((phase-.44)*30);ctx.imageSmoothingEnabled=false;ctx.drawImage(axe,-16,-20,32,40);ctx.restore();}
 return activeFrame;
}
let frameCount=0;const coverage={};
for(const action of MOTION_ACTIONS){
 const clip=MOTION_CLIPS[action],frames=Math.ceil(clip.duration*fps),observed=new Set();
 for(let repeat=0;repeat<2;repeat++)for(let frame=0;frame<frames;frame++){
  const phase=frame/(frames-1),active=draw(action,phase,frameCount/fps);observed.add(active);const bytes=Buffer.from(ctx.getImageData(0,0,width,height).data);if(!encoder.stdin.write(bytes))await once(encoder.stdin,'drain');frameCount++;
 }
 coverage[action]={duration:clip.duration,renderedFrames:frames*2,observedPoses:[...observed]};
 // An explicitly sampled small contact panel guarantees every source pose can be
 // reviewed even when a short native clip skips samples at 60 fps.
 const strip=createCanvas(24*112,112),s=strip.getContext('2d');for(let f=0;f<24;f++)s.drawImage(image,f*112,(2*10+MOTION_ACTIONS.indexOf(action))*112,112,112,f*112,0,112,112);fs.writeFileSync(new URL(`motion-east-${action}-strip.png`,output),strip.toBuffer('image/png'));
 for(let f=0;f<12;f++){draw(action,clip.loop?f/24:1,frameCount/fps);if(!encoder.stdin.write(Buffer.from(ctx.getImageData(0,0,width,height).data)))await once(encoder.stdin,'drain');frameCount++;}
}
encoder.stdin.end();const [code]=await completion;if(code!==0)throw new Error(`ffmpeg ${code}: ${errors}`);
const result={kind:'Offscreen rendered animation proof, not browser gameplay',file:proofName,width,height,fps,frameCount,duration:frameCount/fps,coverage};fs.writeFileSync(new URL(process.argv[2]?proofName.replace(/\.mp4$/,'.json'):'motion-proof-report.json',output),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
