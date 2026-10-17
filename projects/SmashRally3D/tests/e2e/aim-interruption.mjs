import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
export const meta={viewport:{width:1065,height:606}};
export async function run({page,sleep,shot,log}){
 await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
 const results=[];
 for(const view of [{width:1065,height:606},{width:844,height:390,isMobile:true,hasTouch:true},{width:390,height:844,isMobile:true,hasTouch:true}]){
  await page.setViewport(view);await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
  await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','EASY');await page.click('[data-action="start"]');await page.click('[data-shot="clear"]');
  await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');
  const read=()=>page.evaluate(()=>{
   const app=[...window.__playcanvasApps.keys()][0],d=window.smashDiagnostics(),ring=app.root.findByName('shot target ring'),dot=app.root.findByName('shot target dot');
   return {time:d.time,phase:d.phase,paused:d.paused,returns:d.returns,shots:d.shots,guide:d.aimGuide,window:d.contactVisibility,ring:{enabled:ring.enabled,p:{...ring.getPosition()}},dot:dot.enabled,aimEnabled:app.root.findByName('aim ring').enabled};
  });
  const ready=await read();if(ready.ring.enabled||ready.dot||ready.guide)throw Error('Stale shot guide at new match');
  let d=await page.evaluate(()=>window.smashDiagnostics()),p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;
  const press=async at=>view.hasTouch?page.touchscreen.tap(at.x,at.y):page.mouse.click(at.x,at.y);
  await press(p);await page.waitForFunction(()=>window.smashDiagnostics().receiver===0&&document.querySelector('#timing')?.textContent.includes('HIT NOW'),{timeout:60000});
  d=await page.evaluate(()=>window.smashDiagnostics());const before=d.shots.filter(h=>h.actor===0).length;p=d.projectedTargets.find(t=>t.world.x===1.8&&t.world.z===1.2).screen;
  for(let i=0;i<3;i++)await press(p);
  await page.waitForFunction(n=>window.smashDiagnostics().shots.filter(h=>h.actor===0).length>n,{timeout:60000},before);
  await page.keyboard.press('Escape');await page.waitForSelector('[data-action="resume"]');
  const paused=await read();await sleep(250);const still=await read();
  if(still.time!==paused.time||!still.paused||still.shots.filter(h=>h.actor===0).length-before!==1)throw Error('Pause/repeated input changed clock or duplicated physical contact');
  // Render a normal paused frame before reading shader and target transforms.
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const frame=await read(),h=frame.shots.filter(h=>h.actor===0).at(-1);
  if(!frame.aimEnabled||Math.hypot(frame.guide.aim.x-h.target.x,frame.guide.aim.z-h.target.z)<.4)throw Error('Accepted aim and resolved clear target were not visually distinguished');
  if(frame.window.strength!==0||!frame.guide||!frame.ring.enabled||!frame.dot||JSON.stringify(frame.guide.target)!==JSON.stringify(h.target)||Math.hypot(frame.ring.p.x-h.target.x,frame.ring.p.z-h.target.z)>.0001)throw Error('Pause lost actual target or retained occlusion aperture');
  await shot('repeated-input-paused-'+view.width+'x'+view.height);
  await page.click('[data-action="resume"]');await page.waitForFunction(t=>window.smashDiagnostics().time>t,{timeout:30000},paused.time);
  await page.keyboard.press('Escape');await page.click('[data-action="start"]');await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const restarted=await read();
  if(restarted.guide||restarted.ring.enabled||restarted.dot||restarted.returns!==0)throw Error('Restart retained previous result guide');
  await page.keyboard.press('Escape');await page.click('[data-action="menu"]');await page.waitForFunction(()=>window.smashDiagnostics().phase==='MENU');
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const menu=await read();if(menu.ring.enabled||menu.dot)throw Error('Menu retained target geometry');
  results.push({view,presses:3,physicalReturns:1,pausedTime:paused.time,resumed:true,actualTarget:h.target,pausedGuide:frame.guide,restarted:{phase:restarted.phase,guide:restarted.guide,returns:restarted.returns},menu:{phase:menu.phase,targetVisible:menu.ring.enabled||menu.dot}});
 }
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'interruption.json'),JSON.stringify({method:'Actual three repeated mouse/native touch presses at visible HIT NOW, physical hit counted; ordinary UI pause/resume/restart/menu in PC and mobile landscape/portrait. Read-only diagnostics and post-render target checks, no injected state/time or contactAt scheduling. Software touch emulation only.',results},null,2));log('AIM INTERRUPTION PASS',JSON.stringify({views:results.length}));
}
