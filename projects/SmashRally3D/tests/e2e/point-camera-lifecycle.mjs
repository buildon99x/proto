import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const view=process.env.SMASH_POINT_VIEW||'portrait';
export const meta={viewport:view==='pc'?{width:1065,height:606}:{width:view==='landscape'?844:390,height:view==='landscape'?390:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}};
export async function run({page,sleep,shot,log}){
 await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
 await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','EASY');
 await page.evaluate(()=>{
  const app=[...window.__playcanvasApps.keys()][0],cam=app.root.findByName('broadcast camera');window.pointFrames=[];
  app.on('frameend',()=>{
   const d=window.smashDiagnostics();if(!['RALLY','POINT_RESOLVED','RESULTS','SERVE_READY'].includes(d.phase))return;
   const v=cam.getPosition().clone(),project=p=>{const s=cam.camera.worldToScreen(v.set(p.x,p.y,p.z));return{x:s.x,y:s.y,z:s.z}};
   const actors=d.motions.map(m=>{
    const points=Object.values(m.skinPose.joints).map(project);const finite=points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.z>0);
    return {finite,minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y)),racket:project(m.racket)};
   });
   const p=cam.getPosition(),q=cam.getRotation();window.pointFrames.push({time:d.time,phase:d.phase,score:d.scores,width:innerWidth,height:innerHeight,camera:{p:{...p},q:{...q},fov:cam.camera.fov},actors,shuttle:project(d.position),positions:d.actors.map(a=>a.p)});
  });
 });
 let stopCapture=null;
 if(process.env.SMASH_POINT_RECORD){
  const raw=await mkdtemp('/tmp/smash-point-video-'),client=await page.createCDPSession(),frames=[],writes=[];
  client.on('Page.screencastFrame',e=>{const file=path.join(raw,String(frames.length).padStart(6,'0')+'.jpg');frames.push({file,timestamp:e.metadata.timestamp});writes.push(writeFile(file,Buffer.from(e.data,'base64')));void client.send('Page.screencastFrameAck',{sessionId:e.sessionId});});
  await client.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:390,maxHeight:844,everyNthFrame:4});
  stopCapture=async()=>{
   await client.send('Page.stopScreencast');await Promise.all(writes);
   const concat=frames.map((f,i)=>`file '${f.file}'\nduration ${Math.max(.001,(frames[i+1]?.timestamp??f.timestamp+.1)-f.timestamp)}`).join('\n')+`\nfile '${frames.at(-1).file}'\n`;
   await writeFile(path.join(raw,'frames.ffconcat'),concat);
   const out=path.resolve(process.env.SMASH_EVIDENCE_DIR);
   execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',path.join(raw,'frames.ffconcat'),'-vf','scale=390:844:force_original_aspect_ratio=decrease,pad=390:844:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=20','-c:v','libx264','-preset','veryfast','-crf','24','-threads','1','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'actual-lifecycle-silent.mp4')]);
   await writeFile(path.join(out,'video-source.json'),JSON.stringify({method:'Actual CDP frames at original wall-clock timestamps, source frames held at20fps without interpolation. Silent video. Not normal-speed continuous assistant watching or actual listening.',duration:frames.at(-1).timestamp-frames[0].timestamp+.1,rawDirectory:raw,frames},null,2));
  };
 }
 await page.click('[data-action="start"]');let previous=false,inputs=0,attacks=0,firstPoint=null;const captured=new Set(),end=Date.now()+900000;
 let rotated=false,lastProgress=-10;
 while(Date.now()<end){
  const d=await page.evaluate(()=>window.smashDiagnostics());
  if(d.time-lastProgress>=10){log('LIFECYCLE PROGRESS',JSON.stringify({time:d.time,phase:d.phase,scores:d.scores,shots:d.shots.length}));lastProgress=d.time;}
  if(d.phase==='SERVE_READY'&&!captured.has('ready')){await shot('ready');captured.add('ready');}
  if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y);}
  const cue=await page.$eval('#timing',e=>e.textContent||'');
  if(cue.includes('HIT NOW')&&!previous&&d.receiver===0){
   const attack=/SMASH|NET FINISH/.test(cue),front=attack&&attacks===0;
   const p=d.projectedTargets.find(t=>t.world.x===(inputs%2?1.8:0)&&t.world.z===(front?1.2:5.8)).screen;
   if(!attack)await page.keyboard.down('Shift');await page.mouse.click(p.x,p.y);await page.keyboard.up('Shift');if(attack)attacks++;inputs++;
  }
  previous=cue.includes('HIT NOW');
  if(d.phase==='RALLY'&&d.shots.length>=4&&!captured.has('rally')){await shot('rally');captured.add('rally');}
  if(d.phase==='POINT_RESOLVED'){
   firstPoint??=d.time;
   for(const [name,delay] of [['point-enter',0],['point-follow',.4],['point-late',1]])if(d.time-firstPoint>=delay&&!captured.has(name)){await shot(name);captured.add(name);}
   if(process.env.SMASH_POINT_ROTATE&&!rotated&&d.time-firstPoint>.35){
    await page.setViewport({width:844,height:390,deviceScaleFactor:2,isMobile:true,hasTouch:true});await shot('point-rotated-landscape');
    await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});await sleep(70);await shot('point-rotated-portrait');rotated=true;
   }
  }
  if(d.phase==='RESULTS'){await shot('results');captured.add('results');break;}
  await sleep(20);
 }
 if(!captured.has('results'))throw Error('Actual match did not reach results');
 await page.click('[data-action="start"]');await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');await sleep(500);await shot('restart-ready');
 let d=await page.evaluate(()=>window.smashDiagnostics());const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y);await page.waitForFunction(()=>window.smashDiagnostics().phase==='RALLY');await sleep(500);await shot('restart-rally');
 if(stopCapture)await stopCapture();
 const data=await page.evaluate(()=>({frames:window.pointFrames,state:window.smashDiagnostics()}));
 const allowed=view==='pc'?[[1065,606]]:view==='landscape'?[[844,390]]:process.env.SMASH_POINT_ROTATE?[[390,844],[844,390]]:[[390,844]];
 if(data.frames.some(f=>!allowed.some(([w,h])=>f.width===w&&f.height===h)))throw Error('Unexpected viewport mutation');
 const summaries=['RALLY','POINT_RESOLVED','RESULTS','SERVE_READY'].map(phase=>{
  const frames=data.frames.filter(f=>f.phase===phase);const clipped=frames.filter(f=>f.actors.some(a=>!a.finite||a.minX<0||a.maxX>f.width||a.minY<0||a.maxY>f.height));
  return {phase,samples:frames.length,clipped:clipped.length,worst:clipped[0]??null};
 });
 const result={method:'Actual visible-cue mouse/court input on real PC/mobile CSS viewport. Uninterrupted frameend read-only observer; no pose/time/physics injection or held frames. Mobile physical touch is separate.',view,inputs,attacks,rotated,captured:[...captured],summaries,...data};
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'point-camera.json'),JSON.stringify(result,null,2));log('POINT CAMERA LIFECYCLE',JSON.stringify({view,inputs,rotated,summaries}));
 if(!process.env.SMASH_POINT_BASELINE&&summaries.some(s=>['POINT_RESOLVED','RESULTS'].includes(s.phase)&&(!s.samples||s.clipped)))throw Error('Point/results athlete clipping');
}
