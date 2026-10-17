import {writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';
import {prepareLiveCapture,startLiveCapture} from './live-capture.mjs';
export const meta={viewport:{width:640,height:360}};
export async function run({page,sleep,shot,log}){
 const out=path.resolve(process.env.SMASH_EVIDENCE_DIR);await mkdir(out,{recursive:true});
 await prepareLiveCapture(page);await page.goto('http://127.0.0.1:4330/?audio-review');await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 const read=()=>page.evaluate(()=>window.smashDiagnostics());
 await shot('01-menu');await page.click('[data-action="help"]');await shot('02-help');await page.click('[data-action="close"]');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');
 const dialogBounds=[];
 for(const view of [{width:640,height:360},{width:844,height:390},{width:390,height:844},{width:320,height:568}]){
  await page.setViewport(view);await page.click('[data-action="help"]');
  const bounds=await page.$eval('[data-action="close"]',e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,bottom:e.getBoundingClientRect().bottom,height:e.getBoundingClientRect().height,view:[innerWidth,innerHeight]}));
  if(bounds.y<0||bounds.bottom>view.height||bounds.height<44)throw Error('Clipped dialog footer '+JSON.stringify(bounds));
  dialogBounds.push(bounds);await shot('help-'+view.width+'x'+view.height);await page.click('[data-action="close"]');
 }
 await page.setViewport({width:640,height:360});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));

 const audio=await page.evaluate(()=>window.smashPointAudioReview());const audioMetrics=audio.map(x=>({winner:x.winner,peak:Math.max(...x.pcm.map(Math.abs)),tailPeak:Math.max(...x.pcm.slice(7500).map(Math.abs))}));
 if(audioMetrics.some(m=>m.peak>.057||m.peak<.04||m.tailPeak>.001))throw Error('Unbounded score cue');
 const finish=await startLiveCapture(page,out);await page.select('#difficulty','EASY');await page.click('[data-action="start"]');
 const commands=[],events=[],renderedContacts=[];let was=false,count=0,points=0,attacks=0,inputs=0,fallback=false,normal=false,superCaptured=false,maxReturns=0,d,firstSoundPerf=null;
 const deadline=Date.now()+480000;
 while(Date.now()<deadline){
  d=await read();maxReturns=Math.max(maxReturns,d.returns);
  if(d.shots.length>count){for(const h of d.shots.slice(count)){
   const e=d.audioLedger.find(e=>e.physicsTime===h.time);firstSoundPerf??=e?.audioPerf;
   const c=d.renderedContact;
   if(c?.time===h.time){const centreErrorM=Math.hypot(c.racket.x-c.contact.x,c.racket.y-c.contact.y,c.racket.z-c.contact.z);if(centreErrorM>.002)throw Error('Rendered/physical contact mismatch');renderedContacts.push({actor:h.actor,shot:h.shot,time:h.time,centreErrorM,rendered:c});}
   if(h===d.shots.at(-1)&&!d.message.startsWith(h.actor===0?'YOU':'AI'))throw Error('Unowned hit feedback '+d.message);
   events.push({kind:'hit',hit:h,feedback:d.message,perf:e?.audioPerf??await page.evaluate(()=>performance.now())});
   if(h.actor===0&&h.fallbackReason&&!fallback){fallback=true;await shot('03-safe-return');if(!d.message.includes('SAFE RETURN')&&!d.message.includes('ANGLE TOO TIGHT'))throw Error('Unexplained fallback')}
   if(h.actor===0&&h.shot==='superSmash'&&!superCaptured){superCaptured=true;await shot('04b-super-smash')}
   if(h.actor===0&&h.shot==='smash'&&!normal){normal=true;await shot('04-normal-smash')}
  }count=d.shots.length;}
  if(d.points.length>points){points=d.points.length;events.push({kind:'point',point:d.points.at(-1),perf:await page.evaluate(()=>performance.now())});
   if(await page.$eval('#basic-label',e=>e.textContent)!=='RETURN')throw Error('Stale attack on dead ball');
   if(!d.points.at(-1).detail||d.pointAudioEvents!==points)throw Error('Missing point detail/single score cue '+JSON.stringify({points,played:d.pointAudioEvents}));
   if(d.scores.some(s=>s>=5)){if(!(await page.$eval('#timing',e=>e.textContent)).includes('RESULTS NEXT'))throw Error('Terminal point promised another serve');await shot('05-match-point');}
   if(points<=2)await shot('05-point-'+points);
  }
  if(d.phase==='RESULTS')break;
  if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y)}
  const cue=await page.$eval('#timing',e=>e.textContent||'');
  if(cue.includes('HIT NOW')&&!was&&d.receiver===0&&inputs<10){
   const attack=/SMASH|NET FINISH/.test(cue);const front=attack&&attacks===0;
   const p=d.projectedTargets.find(t=>t.world.x===(inputs%2?1.8:0)&&t.world.z===(front?1.2:5.8)).screen;
   if(!attack)await page.keyboard.down('Shift');await page.mouse.click(p.x,p.y);await page.keyboard.up('Shift');
   commands.push({cue,front,attack,issued:await page.evaluate(()=>window.smashDiagnostics().lastInput)});if(attack)attacks++;inputs++;
  }
  was=cue.includes('HIT NOW');await sleep(25);
 }
 if(d.phase!=='RESULTS'||!fallback||!normal||maxReturns<3)throw Error('Incomplete match/shot coverage '+JSON.stringify({phase:d.phase,fallback,normal,maxReturns,inputs}));
 const match=d;
 const strong=d.shots.filter(h=>h.actor===0&&h.shot==='superSmash');
 if(!strong.length)throw Error('No natural player Super Smash observed');
 if(!renderedContacts.some(c=>c.actor===0&&c.shot==='superSmash')||!renderedContacts.some(c=>c.actor===0&&c.shot==='smash'))throw Error('Missing normal/super contact render coverage');
 await shot('06-results');const resultsPerf=await page.evaluate(()=>performance.now());
 if(d.audioEvents!==d.shots.length||d.pointAudioEvents!==d.points.length)throw Error('Missing/duplicate voices');
 await page.click('[data-action="start"]');const countdown=await read();
 if(countdown.scores.some(Boolean)||countdown.shots.length||countdown.pointAudioEvents||countdown.audioEvents||countdown.impactVisible||countdown.rallyMiss)throw Error('Stale rematch state');
 await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');await shot('07-rematch');const rematchPerf=await page.evaluate(()=>performance.now());
 await page.click('[data-shot="drop"]');await sleep(150);if((await read()).phase!=='SERVE_READY')throw Error('Shot selection accidentally served');
 await page.keyboard.press('Escape');await page.click('[data-setting="sound"]');await page.click('[data-action="resume"]');
 const p=(await read()).projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y);
 await page.waitForFunction(()=>window.smashDiagnostics().points.length>=1,{timeout:90000});await sleep(100);const muted=await read();
 if(muted.audioEvents||muted.pointAudioEvents)throw Error('Sound off ignored');await shot('08-muted-point');
 await writeFile(path.join(out,'experience-before-encoding.json'),JSON.stringify({commands,events,renderedContacts,match,maxReturns,dialogBounds,audioMetrics,countdown,resultsPerf,rematchPerf,muted},null,2));
 const capture=await finish(firstSoundPerf);
 await writeFile(path.join(out,'experience.json'),JSON.stringify({method:'Actual visible-cue mouse UI match, deliberately stop returns after10 commands to reach results; no state/time injection. Read-only diagnostics separate from offline point-audio synthesis checks.',commands,events,renderedContacts,match,maxReturns,dialogBounds,audioMetrics,countdown,resultsPerf,rematchPerf,muted,capture},null,2));
 log('EXPERIENCE PASS',JSON.stringify({scores:match.scores,points:match.points,maxReturns,fallback,normal,naturalSuperSmashes:strong.length,physicalContacts:match.shots.length,hitAudio:match.audioEvents,pointAudio:match.pointAudioEvents,mutedPointAudio:muted.pointAudioEvents,audioMetrics}));
}
