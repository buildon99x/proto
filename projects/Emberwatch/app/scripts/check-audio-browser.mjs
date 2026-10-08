// Real Chromium OfflineAudioContext render. This is signal verification, not listening or playtesting.
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const src=fileURLToPath(new URL('../src/',import.meta.url));
const events=[[0,'footstep'],[.28,'footstep'],[.50,'enemyTell',{enemy:'brute'}],[.62,'slash',{contactIn:.20}],[.82,'hit'],[.98,'slash',{contactIn:.22}],[1.20,'hit',{material:'armor'}],[1.42,'heavySwing',{contactIn:.34}],[1.76,'heavyHit'],[2.2,'enemyRelease',{enemy:'brute'}],[2.25,'dash'],[2.70,'axeWhirl'],[2.89,'hit'],[3.11,'hit'],[3.40,'hit',{material:'armor'}],[4.2,'warCry'],[5.35,'enemyTell'],[5.72,'enemyRelease'],[5.79,'hurt'],[6.34,'heavySwing',{contactIn:.34}],[6.68,'heavyHit'],[6.71,'die'],[7.65,'coin'],[7.83,'coin'],[8.25,'level']];
const page=`<!doctype html><title>Emberwatch offline audio check</title><pre id="result">Rendering</pre><script type="module">
import {createFantasyAudio} from '/audio.js';
try {
 const native=new OfflineAudioContext(2,48000*11,48000);
 const context=new Proxy(native,{get(target,key){if(key==='state')return 'running';const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 const engine=createFantasyAudio({enabled:true,contextFactory:()=>context,random:()=>.41});
 if(!await engine.resume())throw new Error(engine.status().error||'Audio not ready');
 const events=${JSON.stringify(events)},timeline=new Map();
 for(let t=0;t<10.8;t+=.1)timeline.set(Math.round(t*1e5)/1e5,[]);
 for(const [time,type,options] of events){if(!timeline.has(time))timeline.set(time,[]);timeline.get(time).push([type,options||{}]);}
 const times=[...timeline.keys()].sort((a,b)=>a-b);let maxVoices=0,played=0;
 const apply=time=>{engine.tick(.1,{scene:'dungeon',combat:.65});for(const [type,options] of timeline.get(time)){if(engine.play(type,options))played++;}maxVoices=Math.max(maxVoices,engine.status().voices);};
 apply(0);
 const suspensions=times.filter(t=>t>0).map(t=>native.suspend(t).then(()=>{apply(t);return native.resume();}));
 const rendered=await native.startRendering();await Promise.all(suspensions);
 let peak=0,sum=0,invalid=0,clipped=0,stereoDifference=0;
 const left=rendered.getChannelData(0),right=rendered.getChannelData(1);
 for(let i=0;i<left.length;i++){stereoDifference+=Math.abs(left[i]-right[i]);for(const x of [left[i],right[i]]){if(!Number.isFinite(x))invalid++;peak=Math.max(peak,Math.abs(x));sum+=x*x;if(Math.abs(x)>=.999)clipped++;}}
 const data=new ArrayBuffer(44+rendered.length*4),view=new DataView(data),ascii=(at,s)=>[...s].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
 ascii(0,'RIFF');view.setUint32(4,data.byteLength-8,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,48000,true);view.setUint32(28,192000,true);view.setUint16(32,4,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,rendered.length*4,true);
 for(let i=0;i<rendered.length;i++)for(let ch=0;ch<2;ch++)view.setInt16(44+i*4+ch*2,Math.round(Math.max(-1,Math.min(1,rendered.getChannelData(ch)[i]))*32767),true);
 const report={renderer:'Chromium OfflineAudioContext',scenario:'Scripted Warrior mix; not captured gameplay or subjective listening',duration:rendered.duration,sampleRate:rendered.sampleRate,peak,rms:Math.sqrt(sum/(rendered.length*2)),invalid,clipped,stereoDifference:stereoDifference/rendered.length,maxVoices,played,expectedEvents:events.length,pass:invalid===0&&clipped===0&&peak>.05&&peak<.9&&played===events.length&&maxVoices<=16};
 await fetch('/render.wav',{method:'POST',body:data});await fetch('/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(report)});
 document.querySelector('#result').textContent=JSON.stringify(report);
} catch(error){await fetch('/report',{method:'POST',body:JSON.stringify({pass:false,error:String(error.stack||error)})});}
</script>`;
let finish;const completed=new Promise(resolve=>{finish=resolve;});
const server=createServer(async(req,res)=>{try{
 if(req.method==='POST'){
   const parts=[];for await(const data of req)parts.push(data);const bytes=Buffer.concat(parts);
   if(req.url==='/render.wav')await writeFile(path.join(src,'assets/audio-runtime-render.wav'),bytes);
   if(req.url==='/report'){const report=JSON.parse(bytes.toString());await writeFile(path.join(src,'assets/audio-runtime-report.json'),JSON.stringify(report,null,2)+'\n');finish(report);}
   res.writeHead(200);res.end('ok');return;
 }
 if(req.url==='/audio-check'){res.setHeader('content-type','text/html');res.end(page);return;}
 const clean=path.resolve(src,'.'+decodeURIComponent(req.url.split('?')[0]));
 if(!clean.startsWith(src)){res.writeHead(403);res.end();return;}
 res.setHeader('content-type',clean.endsWith('.js')?'text/javascript':clean.endsWith('.wav')?'audio/wav':'application/octet-stream');res.end(await readFile(clean));
}catch(error){res.writeHead(404);res.end(String(error));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=spawn(process.env.CHROMIUM||'/usr/bin/chromium',['--headless','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-background-networking','--no-first-run',`--user-data-dir=/tmp/emberwatch-audio-check-${process.pid}`,`http://127.0.0.1:${server.address().port}/audio-check`],{stdio:['ignore','ignore','pipe']});
let errors='';browser.stderr.on('data',data=>{errors+=data.toString();});
browser.once('error',error=>finish({pass:false,error:'Chromium launch failed: '+error.message}));
browser.once('exit',(code,signal)=>{if(code!==null&&code!==0)finish({pass:false,error:'Chromium exited before rendering',exitCode:code,signal,stderr:errors.slice(-2000)});});
let timer;const result=await Promise.race([completed,new Promise(resolve=>{timer=setTimeout(()=>resolve({pass:false,error:'Chromium offline render timed out',stderr:errors.slice(-2000)}),30000);})]);
clearTimeout(timer);browser.kill('SIGTERM');server.close();await writeFile(path.join(src,'assets/audio-runtime-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
