import {mkdtemp,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
export async function prepareLiveCapture(page){
 await page.evaluateOnNewDocument(()=>{
  const Original=window.AudioContext,connect=AudioNode.prototype.connect,destinations=new WeakMap();
  window.liveAudio={chunks:[],recorder:null};
  AudioNode.prototype.connect=function(destination,...rest){const d=destinations.get(this.context);if(d&&destination===this.context.destination)connect.call(this,d,...rest);return connect.call(this,destination,...rest)};
  window.AudioContext=class extends Original{constructor(...args){super(...args);const d=this.createMediaStreamDestination();destinations.set(this,d);const r=new MediaRecorder(d.stream,{mimeType:'audio/webm;codecs=opus'});r.ondataavailable=e=>{if(e.data.size)window.liveAudio.chunks.push(e.data)};window.liveAudio.recorder=r;r.start(100)}};
 });
}
export async function startLiveCapture(page,out){
 await mkdir(out,{recursive:true});const raw=await mkdtemp('/tmp/smash-experience-'),frames=[],writes=[],origin=await page.evaluate(()=>performance.timeOrigin),client=await page.createCDPSession();
 client.on('Page.screencastFrame',e=>{const file=path.join(raw,String(frames.length).padStart(6,'0')+'.jpg');frames.push({file,timestamp:e.metadata.timestamp});writes.push(writeFile(file,Buffer.from(e.data,'base64')));void client.send('Page.screencastFrameAck',{sessionId:e.sessionId})});
 await client.send('Page.startScreencast',{format:'jpeg',quality:85,maxWidth:640,maxHeight:360,everyNthFrame:1});
 return async function finish(firstSoundPerf){
  await client.send('Page.stopScreencast');await Promise.all(writes);
  const audio=await page.evaluate(async()=>{const a=window.liveAudio;await new Promise(r=>{a.recorder.onstop=r;a.recorder.stop()});return Array.from(new Uint8Array(await new Blob(a.chunks).arrayBuffer()))});await writeFile(path.join(out,'actual-audio.webm'),Buffer.from(audio));
  const concat=frames.map((f,i)=>`file '${f.file}'\nduration ${Math.max(.001,(frames[i+1]?.timestamp??f.timestamp+.1)-f.timestamp)}`).join('\n')+`\nfile '${frames.at(-1).file}'\n`;
  await writeFile(path.join(raw,'frames.ffconcat'),concat);
  const start=frames[0].timestamp*1000-origin,duration=frames.at(-1).timestamp-frames[0].timestamp+.1,delay=Math.round(firstSoundPerf-start);
  await writeFile(path.join(out,'capture-source.json'),JSON.stringify({origin,videoStartPerf:start,duration,audioDelayMs:delay,rawDirectory:raw,frames:frames.map(f=>({timestamp:f.timestamp}))},null,2));
  execFileSync('ffmpeg',['-y','-loglevel','error','-f','concat','-safe','0','-i',path.join(raw,'frames.ffconcat'),'-i',path.join(out,'actual-audio.webm'),'-filter_complex',`[1:a]aresample=async=1:first_pts=0,adelay=${delay}|${delay},apad[a]`,'-map','0:v','-map','[a]','-vf','scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=20','-c:v','libx264','-preset','veryfast','-crf','24','-threads','1','-pix_fmt','yuv420p','-c:a','aac','-t',String(duration),'-movflags','+faststart',path.join(out,'full-play.mp4')]);
  const metadata={method:'Actual CDP browser JPEG frames, encoded after play;20fps holds source frames without interpolation. Actual WebAudio destination stream; one first-audible-packet origin calibration, no per-event audio replacement. No human listening/device AV-latency certification.',videoStartPerf:start,duration,audioDelayMs:delay,frames:frames.map(f=>({timestamp:f.timestamp}))};
  await writeFile(path.join(out,'capture.json'),JSON.stringify(metadata,null,2));return metadata;
 }
}
