import { writeFile } from 'node:fs/promises';
import path from 'node:path';
export const meta = { viewport: { width: 640, height: 360 } };
export async function run({page,shot,log}) {
  const results=[];
  for(const view of [{width:640,height:360},{width:390,height:844}]) {
    await page.setViewport(view); await page.reload();
    await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
    await page.click('[data-action="start"]');
    await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-action="resume"]');
    await shot('paused-'+view.width+'x'+view.height);
    const before=await page.evaluate(()=>{const card=document.querySelector('.overlay .card'),q=document.querySelector('#quality');return{card:card.getBoundingClientRect().toJSON(),quality:q.getBoundingClientRect().toJSON(),overflow:getComputedStyle(card).overflowY,scrollHeight:card.scrollHeight,clientHeight:card.clientHeight}});
    await page.focus('#quality');
    const after=await page.$eval('#quality',e=>e.getBoundingClientRect().toJSON());
    if(after.y<0||after.bottom>view.height) throw Error('Pause quality control cannot scroll into view');
    await shot('paused-quality-'+view.width+'x'+view.height);
    await page.click('[data-action="resume"]');
    if(await page.$('[data-action="resume"]')) throw Error('Pause cannot resume');
    results.push({view,before,focusedQuality:after});
  }
  await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'pause.json'),JSON.stringify(results,null,2));
  log('BENCHMARK PAUSE PASS',JSON.stringify({results,limits:'Focus scroll and ordinary resume, not full keyboard traversal or focus trapping.'}));
}
