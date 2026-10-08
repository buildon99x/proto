// Production motion renderer + actual game update in a mocked DOM.
// This is deterministic offscreen evidence, not normal-control browser gameplay.
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {runtime} from '../tests/helpers/warrior-runtime.mjs';
import {createMotionRenderer,resolveActorMotion,sampleActorMotion} from '../src/motion.js';
import {spriteDirection,projectWorld} from '../src/visual.js';
import {AUDIO_BANK} from '../src/assets/audio-manifest.js';
import {AUDIO_EVENTS} from '../src/audio.js';
const {createCanvas,loadImage,GlobalFonts}=createRequire(import.meta.url)('@napi-rs/canvas');
GlobalFonts.registerFromPath(new URL('../../assets/fonts/EmberwatchKorean-Regular.otf',import.meta.url).pathname,'EmberwatchKorean');
const out=new URL('../../assets/screenshots/feedback-0.4.2/',import.meta.url);fs.mkdirSync(out,{recursive:true});
const atlas=await loadImage(new URL('../src/assets/motion-hero.png',import.meta.url).pathname);
const directions=[['북',['w'],0,-1],['북동',['w','d'],1,-1],['동',['d'],1,0],['남동',['s','d'],1,1],['남',['s'],0,1],['남서',['s','a'],-1,1],['서',['a'],-1,0],['북서',['w','a'],-1,-1]];
const actors=directions.map(([name,keys,dx,dy])=>{const h=runtime();h.beginRun();h.arena();h.isometric();h.pointer(1220,440);keys.forEach(k=>h.key(k));return {h,name,keys,dx,dy,start:{...h.read().p},lastStep:null,lastAt:-1};});
const W=1280,H=760,fps=30,total=240,c=createCanvas(W,H),ctx=c.getContext('2d'),renderer=createMotionRenderer(ctx,null,{motion:{hero:atlas}});
const video=new URL('Warrior-travel-and-footsteps.mp4',out).pathname,rawVideo=video.replace('.mp4','-silent.mp4');
const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',`${W}x${H}`,'-r',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',rawVideo],{stdio:['pipe','ignore','pipe']});
let errors='';encoder.stderr.on('data',x=>errors+=x);const completion=once(encoder,'close');const audioCues=[];
for(let frame=0;frame<total;frame++){
 const time=frame/fps,moving=time<3||time>=5;
 ctx.fillStyle='#151d28';ctx.fillRect(0,0,W,H);ctx.textAlign='left';ctx.fillStyle='#f4e5c8';ctx.font='bold 25px EmberwatchKorean';ctx.fillText('전사 · 이동 방향과 발 접지 확인',26,38);
 ctx.fillStyle='#aac0c6';ctx.font='15px EmberwatchKorean';ctx.fillText('실제 게임 로직 + 캐릭터 렌더 · 오프스크린 검증 영상 · 실제 브라우저 플레이 아님',26,67);
 ctx.fillText('소리: 동쪽 패널 한 명만 / 0–3초 이동 → 3–5초 정지 → 5–8초 속도 증가',26,92);
 for(let i=0;i<actors.length;i++){
  const a=actors[i],before=a.h.sounds.length,p=a.h.read().p;
  if(frame===90)a.keys.forEach(k=>a.h.key(k,false));
  if(frame===150){a.keys.forEach(k=>a.h.key(k));p.warcry=10;}
  a.h.step(1/fps,1/fps);
  const step=a.h.sounds.slice(before).find(x=>x.type==='footstep');
  if(step){a.lastStep=step.options.foot;a.lastAt=time;if(i===2)audioCues.push({time,...step.options});}
  const x=22+(i%4)*316,y=116+Math.floor(i/4)*308,center=x+146,ground=y+222,delta=projectWorld(p.x-a.start.x,p.y-a.start.y);
  ctx.save();ctx.beginPath();ctx.rect(x,y,298,290);ctx.clip();ctx.fillStyle='#1d2b38';ctx.fillRect(x,y,298,290);
  ctx.strokeStyle='#2a414b';ctx.lineWidth=1;for(let j=-10;j<=10;j++){const offset=((delta.x*.5)%34),yy=((delta.y*.5)%24);ctx.beginPath();ctx.moveTo(x+j*34-offset,y);ctx.lineTo(x+j*34-offset,y+290);ctx.moveTo(x,y+j*24-yy);ctx.lineTo(x+298,y+j*24-yy);ctx.stroke();}
  ctx.fillStyle='#a3cbd1';ctx.font='bold 19px EmberwatchKorean';ctx.fillText(a.name+' · '+a.keys.join('+').toUpperCase(),x+14,y+27);
  const unit=Math.hypot(a.dx,a.dy),ax=a.dx/unit*34,ay=a.dy/unit*34;ctx.strokeStyle='#eec075';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(center,ground);ctx.lineTo(center+ax,ground+ay);ctx.stroke();
  renderer.draw({actor:p,player:true,x:center,y:ground,height:110,time,direction:spriteDirection(p.angle)});
  const pose=resolveActorMotion(p,time,true);ctx.fillStyle='#ccdad8';ctx.font='15px EmberwatchKorean';ctx.fillText(`${moving?'이동':'정지'} · ${pose.action==='run'?'달리기':'대기'} · 셀 ${pose.frame+1}/24`,x+14,y+260);
  if(time-a.lastAt<.13){ctx.fillStyle='#f0c477';ctx.fillText(a.lastStep==='left'?'최근 왼발 접지 · 0번':'최근 오른발 접지 · 12번',x+14,y+284);}
  ctx.restore();
 }
 if(frame===45)fs.writeFileSync(new URL('Warrior-eight-travel-directions.png',out),c.toBuffer('image/png'));
 if(!encoder.stdin.write(Buffer.from(ctx.getImageData(0,0,W,H).data)))await once(encoder.stdin,'drain');
}
encoder.stdin.end();const [exit]=await completion;if(exit!==0)throw Error(errors);
// Dry footstep cues at the exact simulation ticks shown, one Warrior only.
const bank=fs.readFileSync(new URL('../src/assets/audio-fantasy.wav',import.meta.url)),sr=AUDIO_BANK.sampleRate,pcm=Buffer.alloc(sr*8*2);
for(let i=0;i<audioCues.length;i++){const cue=audioCues[i],clip=AUDIO_BANK.clips.footstep[(cue.foot==='left'?0:1)+2*(i%2)],from=Math.round(clip.offset*sr),at=Math.round(cue.time*sr),length=Math.round(clip.duration*sr);for(let k=0;k<length&&at+k<sr*8;k++){const value=bank.readInt16LE(44+(from+k)*2)*AUDIO_EVENTS.footstep.gain*.78;pcm.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(value))),2*(at+k));}}
const raw=new URL('foot-contact-proof.s16le',out).pathname;fs.writeFileSync(raw,pcm);
const mux=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',rawVideo,'-f','s16le','-ar',String(sr),'-ac','1','-i',raw,'-c:v','copy','-c:a','aac','-b:a','96k','-shortest','-movflags','+faststart',video]);if(mux.status!==0)throw Error(mux.stderr.toString());fs.unlinkSync(raw);fs.unlinkSync(rawVideo);
const sheet=createCanvas(1120,740),s=sheet.getContext('2d');s.fillStyle='#18212d';s.fillRect(0,0,1120,740);s.fillStyle='#f0dec2';s.font='bold 23px EmberwatchKorean';s.fillText('실제 달리기 atlas · 착지 직전과 접지 셀',22,36);s.font='14px EmberwatchKorean';s.fillText('0번: 왼발 / 12번: 오른발. 직전 셀의 들린 발이 다음 셀에서 지면에 닿습니다.',22,62);
for(let d=0;d<4;d++)for(let i=0;i<4;i++){const f=[23,0,11,12][i],x=38+i*270,y=91+d*158;s.drawImage(atlas,f*112,(d*10+1)*112,112,112,x,y-18,168,168);const foot=(f===23||f===0)?0:1,feet=[[[136,304],[205,304]],[[126,581],[207,594]],[[120,880],[203,879]],[[134,1176],[208,1176]]],anchors=[[166,307],[164,596],[174,885],[168,1183]],pose=sampleActorMotion({action:'run',phase:f/24,direction:d}),fx=56+(feet[d][foot][0]-anchors[d][0]+(foot?pose.rightFootX:pose.leftFootX)*2.4)*64/240,fy=94+(feet[d][foot][1]-anchors[d][1]+(foot?pose.rightFootY:pose.leftFootY)*2.4)*64/240;s.strokeStyle=f===0||f===12?'#f3c773':'#9cc7d1';s.lineWidth=2;s.beginPath();s.ellipse(x+fx*1.5,y-18+fy*1.5,10,4,0,0,Math.PI*2);s.stroke();s.fillStyle='#c4d7da';s.font='14px EmberwatchKorean';s.fillText(`${['남','서','동','북'][d]} · ${f}번 ${f===0?'왼발 접지':f===12?'오른발 접지':'직전'}`,x,y+140);}
fs.writeFileSync(new URL('Warrior-run-contact-cells.png',out),sheet.toBuffer('image/png'));
const result={kind:'Actual source-update and production-motion offscreen evidence; not browser gameplay',fps,duration:8,audioCues,footContactCells:[0,12],contactPoses:[0,1,2,3].map(direction=>[23,0,11,12].map(frame=>({direction,frame,...sampleActorMotion({action:'run',phase:frame/24,direction})}))),controller:'No controller input is implemented in the game; no controller QA claimed.'};fs.writeFileSync(new URL('locomotion-proof.json',out),JSON.stringify(result,null,2));console.log(JSON.stringify({video,events:audioCues.length,kind:result.kind}));
