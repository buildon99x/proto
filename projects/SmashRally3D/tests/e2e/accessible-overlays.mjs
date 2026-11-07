import { writeFile } from 'node:fs/promises';
import path from 'node:path';
export const meta = { viewport: { width: 640, height: 360 } };
export async function run({ page, shot, log }) {
 const results=[];
 for (const view of [{width:640,height:360},{width:844,height:390},{width:390,height:844},{width:320,height:568}]) {
  await page.setViewport(view);await page.reload();await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');
  for(const action of ['help','settings']) {
   await page.click(`[data-action="${action}"]`);
   const first=await page.evaluate(()=>{const e=document.activeElement;return e===document.querySelector('.dialog-content')});
   if(!first)throw Error('Dialog has no initial scroll-body focus');
   await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
   if(await page.evaluate(()=>document.activeElement?.dataset.action)!=='close')throw Error('Reverse Tab escaped dialog');
   await page.keyboard.press('Tab');if(!(await page.evaluate(()=>document.activeElement===document.querySelector('.dialog-content'))))throw Error('Tab escaped dialog');
   const metrics=await page.evaluate(()=>({backgroundInert:[...document.querySelector('#ui').children].filter(e=>!e.classList.contains('overlay')).every(e=>e.inert),targets:[...document.querySelectorAll('.dialog button,.settings label,.settings select')].map(e=>({tag:e.tagName,label:e.textContent.trim(),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))}));
   if(!metrics.backgroundInert||metrics.targets.some(t=>t.height<44||t.width<44))throw Error('Small or active background target '+JSON.stringify(metrics));
   await page.keyboard.press('End');await shot(`${action}-${view.width}x${view.height}`);
   if(action==='settings') {await page.focus('#quality');const q=await page.$eval('#quality',e=>e.getBoundingClientRect().toJSON());if(q.y<0||q.bottom>view.height)throw Error('Quality cannot scroll into view');await shot(`settings-quality-${view.width}x${view.height}`);}
   await page.keyboard.press('Escape');if(await page.$('.dialog'))throw Error('Escape failed to close dialog');
   if(await page.evaluate(()=>document.activeElement?.dataset.action)!==action)throw Error('Dialog did not restore opener focus');
   results.push({view,action,...metrics});
  }
  await page.click('[data-action="start"]');await page.waitForFunction(()=>window.smashDiagnostics().phase==='SERVE_READY');await page.keyboard.press('Escape');
  await page.waitForSelector('[data-action="resume"]');
  if(await page.evaluate(()=>document.activeElement?.dataset.action)!=='resume')throw Error('Pause lacks initial Continue focus');
  await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');
  if(await page.evaluate(()=>document.activeElement?.id)!=='quality')throw Error('Pause reverse Tab escaped');
  await shot(`pause-quality-${view.width}x${view.height}`);await page.keyboard.press('Tab');
  if(await page.evaluate(()=>document.activeElement?.dataset.action)!=='resume')throw Error('Pause Tab escaped');
  await page.keyboard.press('Enter');if(await page.evaluate(()=>window.smashDiagnostics().paused))throw Error('Continue failed');
  if(await page.evaluate(()=>document.activeElement?.dataset.action)!=='pause')throw Error('Pause focus not restored');
  const pause=await page.$eval('[data-action="pause"]',e=>e.getBoundingClientRect().toJSON());if(pause.height<44||pause.width<44)throw Error('Small Pause target');
 }
 await writeFile(path.resolve(process.env.SMASH_EVIDENCE_DIR,'accessibility.json'),JSON.stringify({results,method:'Real browser keyboard Tab/Shift+Tab/End/Escape/Enter, native inert, four viewports; label click targets measured, not18px checkbox artwork. No screen-reader or real-device claim.'},null,2));
 log('ACCESSIBLE OVERLAYS PASS',JSON.stringify({views:4,dialogs:8,pause:4}));
}
