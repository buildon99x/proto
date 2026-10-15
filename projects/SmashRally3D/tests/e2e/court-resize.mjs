import { readFile } from 'node:fs/promises';
export const meta={viewport:{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}};
export async function run({page,sleep,shot,log}) {
  await page.evaluateOnNewDocument(await readFile('projects/SmashRally3D/app/.agents/skills/inspect-runtime/scripts/devtools-hook.js','utf8'));
  await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
  await page.click('[data-action="settings"]');await page.select('#quality','MEDIUM');await page.click('[data-action="close"]');
  await page.select('#difficulty','EASY');await page.click('[data-action="start"]');await page.click('[data-shot="clear"]');
  await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');
  let d=await page.evaluate(()=>window.smashDiagnostics());let p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.touchscreen.tap(p.x,p.y);
  const results=[];
  for(const [width,height,x] of [[844,390,-1.8],[390,844,1.8]]) {
    await page.setViewport({width,height,deviceScaleFactor:2,isMobile:true,hasTouch:true});await sleep(150);
    const bounds=await page.evaluate(()=>{
      const app=[...window.__playcanvasApps.keys()][0],cam=app.root.findByName('broadcast camera'),v=cam.getPosition().clone();
      const project=(x,y,z)=>{const p=cam.camera.worldToScreen(v.set(x,y,z));return{x:p.x,y:p.y}};
      const court=[-2.59,2.59].flatMap(x=>[-6.7,6.7].map(z=>project(x,.025,z)));
      return{court,width:innerWidth,height:innerHeight,canvas:[app.graphicsDevice.width,app.graphicsDevice.height],quality:window.smashDiagnostics().settings.quality};
    });
    if(bounds.court.some(p=>p.x<0||p.x>width||p.y<0||p.y>height)) throw Error('court clipped after live rotation');
    await page.waitForFunction(()=>window.smashDiagnostics().receiver===0&&document.querySelector('#timing')?.textContent.includes('HIT NOW'),{timeout:60000});
    d=await page.evaluate(()=>window.smashDiagnostics());const before=d.shots.filter(h=>h.actor===0).length;p=d.projectedTargets.find(t=>t.world.x===x&&t.world.z===5.8).screen;
    await page.touchscreen.tap(p.x,p.y);const input=await page.evaluate(()=>window.smashDiagnostics().lastInput);
    if(!input?.accepted||Math.abs(input.target.x-x)>.06||Math.abs(input.target.z-5.8)>.08)throw Error('native aim drift after rotation');
    await page.waitForFunction(n=>window.smashDiagnostics().shots.filter(h=>h.actor===0).length>n,{timeout:60000},before);
    d=await page.evaluate(()=>window.smashDiagnostics());const h=d.shots.filter(h=>h.actor===0).at(-1);
    await shot('court-live-rotation-'+(height>width?'portrait':'landscape'));
    results.push({bounds,input,actual:{shot:h.shot,target:h.target,technique:h.technique,time:h.time}});
    await page.waitForFunction(()=>!document.querySelector('#timing')?.textContent.includes('HIT NOW'));
  }
  log('LIVE ROTATION PASS',JSON.stringify({method:'One continuing native-touch EASY clear rally, portrait→landscape→portrait, DPR2 MEDIUM; no reload, pause, actor/ball/time injection.',results}));
}
