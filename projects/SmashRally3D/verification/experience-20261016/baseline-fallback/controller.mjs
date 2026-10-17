export const meta={viewport:{width:640,height:360}};
export async function run({page,shot,log,sleep}){
 await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');await page.select('#difficulty','EASY');await page.click('[data-action="start"]');
 let was=false,lastCount=0,issued=0;const deadline=Date.now()+160000,commands=[];
 while(Date.now()<deadline){
 const d=await page.evaluate(()=>window.smashDiagnostics());
 if(d.phase==='SERVE_READY'&&d.server===0){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===5.8).screen;await page.mouse.click(p.x,p.y)}
 const cue=await page.$eval('#timing',e=>e.textContent||'');
 if(cue.includes('HIT NOW')&&!was&&d.receiver===0&&issued<2){const p=d.projectedTargets.find(t=>t.world.x===0&&t.world.z===1.2).screen;await page.mouse.click(p.x,p.y);commands.push({cue,goal:'front1.2',time:d.time});issued++;}
 if(d.shots.length>lastCount){for(const h of d.shots.slice(lastCount))if(h.actor===0&&h.fallbackReason){await shot('fallback');log('FALLBACK',{commands,hit:h,message:d.message});return}lastCount=d.shots.length;}
 was=cue.includes('HIT NOW');await sleep(25)
 }
 log('NO FALLBACK',{commands});
}
