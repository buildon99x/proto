export const meta={viewport:{width:844,height:390,isMobile:true,hasTouch:true}};
export async function run({page,shot,log,sleep}){
 await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
 const bounds=()=>page.evaluate(()=>({view:[innerWidth,innerHeight],controls:[...document.querySelectorAll('.overlay button,.overlay select')].map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON()}))}));
 await shot('01-first-menu');log('MENU',await bounds());
 await page.click('[data-action="help"]');await shot('02-help');log('HELP',await bounds());
 await page.click('[data-action="close"]');
 await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');
 await page.select('#difficulty','EASY');await page.click('[data-action="start"]');
 await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');await shot('03-ready');
 const p=await page.evaluate(()=>window.smashDiagnostics().projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen);await page.touchscreen.tap(p.x,p.y);
 let last=false,captured=false,inputs=0,points=0;
 const deadline=Date.now()+240000;
 while(Date.now()<deadline){
  const d=await page.evaluate(()=>window.smashDiagnostics());
  if(d.points.length>points){points=d.points.length;await shot('point-'+points);log('POINT',{phase:d.phase,message:d.message,points:d.points,shots:d.shots.map(h=>({actor:h.actor,shot:h.shot,quality:h.quality}))});if(points>=2)break;}
  if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.touchscreen.tap(p.x,p.y)}
  const cue=await page.$eval('#timing',e=>e.textContent||'');
  if(d.receiver===0&&cue.includes('HIT NOW')&&!last&&inputs<3){await shot('cue-'+inputs);const p=d.projectedTargets.find(t=>t.world.x===(inputs%2?1.8:-1.8)&&t.world.z===5.8).screen;await page.touchscreen.tap(p.x,p.y);inputs++;}
  if(d.returns>=3&&!captured){captured=true;await shot('04-rally');}
  last=cue.includes('HIT NOW');await sleep(30);
 }
 log('AUDIT',{inputs,points,captured});
}
