import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const touch=!!process.env.SMASH_SIDELINE_TOUCH;
export const meta={viewport:touch?{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}:{width:1065,height:606}};
export async function run({page,sleep,shot,log}){
 await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
 await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','EASY');
 await page.evaluate(()=>{
  const app=[...window.__playcanvasApps.keys()][0],cam=app.root.findByName('broadcast camera');window.sidelineFrames=[];
  app.on('frameend',()=>{const d=window.smashDiagnostics();window.sidelineFrames.push({time:d.time,phase:d.phase,score:d.scores,server:d.server,position:d.position,actors:d.actors.map(a=>({p:a.p,v:a.v})),contacts:d.shots.length,renderedContact:d.renderedContact,pointMarker:d.pointMarker??null,framing:{width:innerWidth,height:innerHeight,players:d.motions.map(m=>{const v=cam.getPosition().clone();const p=Object.values(m.skinPose.joints).map(j=>cam.camera.worldToScreen(v.set(j.x,j.y,j.z)));return{minX:Math.min(...p.map(p=>p.x)),maxX:Math.max(...p.map(p=>p.x)),minY:Math.min(...p.map(p=>p.y)),maxY:Math.max(...p.map(p=>p.y))};}),cork:d.shuttleScreen}});});
 });
 const project=async(x,z)=>page.evaluate(({x,z})=>{const app=[...window.__playcanvasApps.keys()][0],cam=app.root.findByName('broadcast camera'),v=cam.getPosition().clone();const p=cam.camera.worldToScreen(v.set(x,.025,z));return{x:p.x,y:p.y};},{x,z});
 const touchClient=touch?await page.createCDPSession():null;
 const click=async p=>{if(touchClient){await touchClient.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y,id:1}]});await touchClient.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await page.mouse.click(p.x,p.y,{button:'right'});};
 await page.click('[data-action="start"]');await page.click('[data-shot="drop"]');
 const mode=process.env.SMASH_SIDELINE_MODE||'weak',requestedX=Number(process.env.SMASH_SIDELINE_X||2.5),commands=[];let previous=false,point=null,lastCount=0,flightCaptured=false,defenceCaptured=false;const end=Date.now()+420000;
 while(Date.now()<end){
  const {d,cue,sweet,screen,serve}=await page.evaluate(requestedX=>{const app=[...window.__playcanvasApps.keys()][0],cam=app.root.findByName('broadcast camera'),v=cam.getPosition().clone(),p=cam.camera.worldToScreen(v.set(requestedX,.025,1.2)),serve=cam.camera.worldToScreen(v.set(0,.025,5.8));return{d:window.smashDiagnostics(),cue:document.querySelector('#timing').textContent||'',sweet:app.root.findByName('timing ring').getLocalScale().x<1,screen:{x:p.x,y:p.y},serve:{x:serve.x,y:serve.y}};},requestedX);
  if(d.phase==='SERVE_READY'&&d.server===0)await click(serve);
  const active=cue.includes('HIT NOW')&&(mode==='weak'?!sweet:sweet);
  if(active&&!previous&&d.receiver===0){const p=screen;await click(p);const after=await page.evaluate(()=>window.smashDiagnostics());commands.push({cue,requested:{x:requestedX,z:1.2},screen:p,input:after.lastInput,time:after.time});log('SIDELINE INPUT',JSON.stringify(commands.at(-1)));if(commands.length===1)await shot('edge-input-state');}
  previous=active;
  if(d.shots.length>lastCount){log('SIDELINE HITS',JSON.stringify(d.shots.slice(lastCount).map(h=>({actor:h.actor,quality:h.quality,target:h.target,technique:h.technique,contact:h.contact,time:h.time}))));if(!flightCaptured&&d.shots.length>=3&&d.shots.slice(lastCount).some(h=>h.actor===0)){await shot('after-player-hit');flightCaptured=true;}if(!defenceCaptured&&d.shots.length>3&&d.shots.slice(lastCount).some(h=>h.actor===1&&Math.abs(h.contact.ball.x)>2.3)){await shot('actual-edge-defence');defenceCaptured=true;}lastCount=d.shots.length;}
  if(d.phase==='POINT_RESOLVED'){point=d;await shot('point-'+d.points.at(-1).reason.toLowerCase());await page.waitForFunction(t=>{const d=window.smashDiagnostics();return d.time>=t+.15||d.phase!=='POINT_RESOLVED';},{timeout:30000},d.time);await shot('point-settled');break;}
  await sleep(20);
 }
 if(!point||!commands.length)throw Error('No actual edge return and point');
 const mark=await page.evaluate(()=>window.smashDiagnostics().pointMarker??null);const beforeShots=point.shots.length;let next=null;
 const nextEnd=Date.now()+120000;
 while(Date.now()<nextEnd){const d=await page.evaluate(()=>window.smashDiagnostics());if(d.phase==='SERVE_READY'&&d.server===0)await click(await project(0,5.8));if(d.shots.length>beforeShots){next=d;await shot('next-serve');break;}await sleep(20);}
 if(!next)throw Error('Next actual serve not reached');
 const frames=await page.evaluate(()=>window.sidelineFrames);
 const result={method:'Actual court projection/click or native tap at broad/tight visible timing ring; no command/state/time injection. Read-only frameend actual contact/landing/score/server observer. Software browser, not physical latency/normal-speed watching.',mode,touch,requestedX,commands,point,marker:mark,nextServe:next.shots[beforeShots],nextState:{phase:next.phase,score:next.scores,server:next.server},frames};
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'sideline-play.json'),JSON.stringify(result,null,2));
 log('SIDELINE POINT',JSON.stringify({mode,touch,point:point.points.at(-1),at:point.position,marker:mark,nextServer:next.server,nextHitter:next.shots[beforeShots].actor}));
 if(next.shots[beforeShots].actor!==point.server)throw Error('Point winner did not actually serve');
 if(!process.env.SMASH_SIDELINE_BASELINE){
  const call=point.points.at(-1),legal=call.reason==='IN'&&call.winner===point.shots.at(-1).actor;
  if(!mark?.visible||mark.reason!==call.reason||mark.winner!==call.winner||Math.hypot(mark.at.x-point.position.x,mark.at.z-point.position.z)>1e-7||Math.hypot(mark.rendered.x-point.position.x,mark.rendered.z-point.position.z)>1e-5||mark.inRing!==legal||mark.outArms!==(legal?0:4))throw Error('Actual point/landing annotation mismatch');
  if(frames.some(f=>f.phase==='RALLY'&&f.pointMarker?.visible))throw Error('Ground call shown before point');
  const clips=frames.filter(f=>['RALLY','POINT_RESOLVED'].includes(f.phase)&&f.framing.players.some(p=>p.minX<0||p.maxX>f.framing.width||p.minY<0||p.maxY>f.framing.height));
  if(clips.length)throw Error('Actual edge athlete clipped: '+clips.length);
 }
 if(process.env.SMASH_SIDELINE_BASELINE){if(!commands.some(c=>Math.abs(c.input?.target.x-2.25)<1e-5))throw Error('Baseline clamp not reproduced');}
}
