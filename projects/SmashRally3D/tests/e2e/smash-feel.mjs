import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
export const meta={viewport:{width:640,height:360}};
export async function run({page,sleep,shot,log}) {
 const out=path.resolve(process.env.SMASH_EVIDENCE_DIR);await mkdir(out,{recursive:true});
 await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
 await page.evaluateOnNewDocument(()=>{
  window.capturedAudio={chunks:[],recorder:null,started:0};
  const Original=window.AudioContext,connect=AudioNode.prototype.connect;
  const destinations=new WeakMap();
  AudioNode.prototype.connect=function(destination,...rest){
   const capture=destinations.get(this.context);
   if(capture&&destination===this.context.destination)connect.call(this,capture,...rest);
   return connect.call(this,destination,...rest);
  };
  window.AudioContext=class extends Original {
   constructor(...args){super(...args);const stream=this.createMediaStreamDestination();destinations.set(this,stream);
    const r=new MediaRecorder(stream.stream,{mimeType:'audio/webm;codecs=opus'});
    r.ondataavailable=e=>{if(e.data.size)window.capturedAudio.chunks.push(e.data)};
    window.capturedAudio.recorder=r;window.capturedAudio.started=performance.now();r.start(100);
   }
  };
 });
 await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');
 await page.evaluate(()=>{
  const app=[...window.__playcanvasApps.keys()][0];window.smashFrames=[];window.smashContactErrors=[];window.smashVisibleEvents=[];
  let lastImpact=-1,lastShotCount=0,attack=null;const seen=new Set();
  app.on('frameend',()=>{
   const d=window.smashDiagnostics(),p=d.motions[0].skinPose,r=p.racket;
   if(d.phase==='MENU'||d.phase==='RESULTS')return;
   const key=Math.round((d.time-r.phase)*1000)+':'+r.strokePhase+':'+d.points.length;
   const capture=(phase)=>({time:d.time,perf:performance.now(),phase,pose:p,shuttle:d.position,response:d.impactResponse,png:document.querySelector('canvas').toDataURL('image/png')});
   if(p.motion==='Smash'&&r.strokePhase!=='ready'&&!seen.has(key)&&window.smashFrames.length<60){seen.add(key);window.smashFrames.push(capture(r.strokePhase));}
   if(d.shots.length!==lastShotCount){window.smashVisibleEvents.push({perf:performance.now(),time:d.time,shot:d.shots.at(-1)});lastShotCount=d.shots.length;}
   const c=d.renderedContact;
   if(c?.actor===0&&c.time!==lastImpact){lastImpact=c.time;
    const h=d.shots.find(h=>h.actor===0&&h.time===c.time);
    if(h&&['smash','superSmash'].includes(h.shot)){
     const delta=Math.hypot(c.racket.x-c.contact.x,c.racket.y-c.contact.y,c.racket.z-c.contact.z);
     if(delta>.002)window.smashContactErrors.push({time:c.time,delta});
     attack={time:h.time,done:new Set()};
     window.smashFrames.push({...capture('impact'),hit:h,renderedContact:c});
    }
   }
   if(attack)for(const [name,delay] of [['flight-early',.08],['flight-mid',.18],['flight-late',.3],['post-700ms',.7]])if(d.time-attack.time>=delay&&!attack.done.has(name)){attack.done.add(name);window.smashFrames.push({...capture(name),afterHit:attack.time});}
  });
 });
 const clock=await page.evaluate(()=>({perf:performance.now(),origin:performance.timeOrigin}));
 const raw=await mkdtemp('/tmp/smash-capture-'),videoFrames=[],writes=[];
 const client=await page.createCDPSession();
 client.on('Page.screencastFrame',event=>{
  const file=path.join(raw,String(videoFrames.length).padStart(6,'0')+'.jpg');
  const bytes=Buffer.from(event.data,'base64');
  videoFrames.push({file,timestamp:event.metadata.timestamp,sha256:createHash('sha256').update(bytes).digest('hex')});
  writes.push(writeFile(file,bytes));void client.send('Page.screencastFrameAck',{sessionId:event.sessionId});
 });
 await client.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:640,maxHeight:360,everyNthFrame:1});
 const sessions=[];let allAttacks=0,allReplies=0;
 for(const difficulty of ['EASY','NORMAL','HARD']) {
  if((await page.evaluate(()=>window.smashDiagnostics())).phase!=='MENU') {
   const d=await page.evaluate(()=>window.smashDiagnostics());
   if(d.phase!=='RESULTS'){await page.keyboard.press('Escape');}
   await page.click('[data-action="menu"]');
  }
  await page.select('#difficulty',difficulty);await page.click('[data-action="start"]');
  let was=false,issued=0,d,lastShots=0;const commands=[],attackEvents=[];
  const deadline=Date.now()+Number(process.env.SMASH_FEEL_WINDOW_MS||300000);
  while(Date.now()<deadline){
   d=await page.evaluate(()=>window.smashDiagnostics());
   if(d.shots.length>lastShots){
    for(const h of d.shots.slice(lastShots))if(h.actor===0&&['smash','superSmash'].includes(h.shot)){allAttacks++;attackEvents.push({hit:h,perf:await page.evaluate(()=>performance.now())});}
    lastShots=d.shots.length;
   }
   if(d.phase==='RESULTS')break;
   if(d.phase==='SERVE_READY'&&d.server===0){
    const p=d.projectedTargets.find(p=>p.world.x===0&&p.world.z===5.8).screen;await page.mouse.click(p.x,p.y);
   }
   const cue=await page.$eval('#timing',e=>e.textContent||'');
   if(cue.includes('HIT NOW')&&!was&&d.receiver===0){
    const attack=/SMASH|NET FINISH/.test(cue);
    const goal={x:attack?(attackEvents.length%3===2?1.8:0):0,z:attack?(attackEvents.length%3===1?3.8:5.8):5.8};
    const p=await page.evaluate(g=>{const app=[...window.__playcanvasApps.keys()][0],c=app.root.findByName('broadcast camera'),v=c.getPosition().clone();const p=c.camera.worldToScreen(v.set(g.x,.025,g.z));return{x:p.x,y:p.y}},goal);
    if(!attack)await page.keyboard.down('Shift');
    await page.mouse.click(p.x,p.y);await page.keyboard.up('Shift');commands.push({cue,goal,attack});issued++;
   }
   was=cue.includes('HIT NOW');
   const attacks=d.shots.filter(h=>h.actor===0&&['smash','superSmash'].includes(h.shot));
   const replies=attacks.filter(h=>d.shots.some(n=>n.actor===1&&n.time>h.time&&n.time<h.time+1.5));
   if(attacks.length>=2&&(d.points.length>=1||replies.length>=1)&&d.shots.length>=8)break;
   await sleep(25);
  }
  d=await page.evaluate(()=>window.smashDiagnostics());
  const attacks=d.shots.filter(h=>h.actor===0&&['smash','superSmash'].includes(h.shot));
  const replies=attacks.flatMap(h=>{const next=d.shots.find(n=>n.time>h.time);return next?.actor===1&&next.time<h.time+1.5?[{attack:h.time,reply:next.technique,replyTime:next.time}]:[]});allReplies+=replies.length;
  const ledger=d.audioLedger;
  if(ledger.length!==d.shots.length)throw Error('Duplicate/missing impact events');
  for(const h of attacks)if(h.velocity.y>=0)throw Error('Non-descending smash');
  sessions.push({difficulty,commands,attacks,replyEvents:replies,final:d,attackEvents});
  await shot('smash-'+difficulty.toLowerCase());
  log('SMASH SESSION',JSON.stringify({difficulty,issued,attacks:attacks.map(h=>({shot:h.shot,quality:h.quality,speed:Math.hypot(h.velocity.x,h.velocity.y,h.velocity.z),vy:h.velocity.y,target:h.target})),replies,points:d.points,contacts:d.shots.length}));
 }
 await client.send('Page.stopScreencast');await Promise.all(writes);
 const concat=videoFrames.map((f,i)=>`file '${f.file}'\nduration ${Math.max(.001,(videoFrames[i+1]?.timestamp??f.timestamp+.1)-f.timestamp)}`).join('\n')+`\nfile '${videoFrames.at(-1).file}'\n`;
 await writeFile(path.join(raw,'frames.ffconcat'),concat);
 execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',path.join(raw,'frames.ffconcat'),'-vf','fps=20','-c:v','libx264','-preset','ultrafast','-crf','20','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'actual-play.mp4')]);
 const videoStart=videoFrames[0].timestamp*1000-clock.origin;
 await writeFile(path.join(out,'capture-manifest.json'),JSON.stringify({method:'CDP original JPEG frame stream encoded after play;20fps holds captured frames, no interpolation. Temporary JPEGs are represented by hashes/timestamps; full actual video and selected original PNG contact frames retained.',clock,videoStart,frames:videoFrames.map(({file,...f})=>({...f,file:path.basename(file)}))},null,2));
 const audio=await page.evaluate(async()=>{const a=window.capturedAudio;if(!a.recorder)return null;await new Promise(r=>{a.recorder.onstop=r;a.recorder.stop()});return{started:a.started,bytes:Array.from(new Uint8Array(await new Blob(a.chunks,{type:'audio/webm'}).arrayBuffer()))}});
 if(audio)await writeFile(path.join(out,'browser-audio.webm'),Buffer.from(audio.bytes));
 const captures=await page.evaluate(()=>({frames:window.smashFrames,errors:window.smashContactErrors,visible:window.smashVisibleEvents}));
 const framesDir=path.join(out,'frames');await mkdir(framesDir,{recursive:true});
 for(let i=0;i<captures.frames.length;i++){const f=captures.frames[i],name=String(i).padStart(3,'0')+'-'+f.phase+'.png';await writeFile(path.join(framesDir,name),Buffer.from(f.png.split(',')[1],'base64'));delete f.png;f.file='frames/'+name;}
 await writeFile(path.join(out,'smash-evidence.json'),JSON.stringify({method:'Actual visible UI cue mouse inputs; no state/time/contactAt injection. Browser video and actual WebAudio destination stream capture; not speaker loopback or a listening claim.',videoStart,audioStart:audio?.started,sessions,captures,allAttacks,allReplies},null,2));
 if(captures.errors.length)throw Error('Rendered physical contact mismatch');
 if(allAttacks<3)throw Error('Insufficient repeated actual smash coverage: '+allAttacks);
 log('SMASH FEEL PASS',JSON.stringify({allAttacks,allReplies,contactErrors:captures.errors.length,recordedAudio:!!audio}));
}
