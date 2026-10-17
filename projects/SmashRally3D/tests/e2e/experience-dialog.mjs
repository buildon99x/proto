export const meta={viewport:{width:640,height:360}};
export async function run({page,sleep,shot,log}){
 await page.waitForFunction(()=>typeof window.smashDiagnostics==='function');await page.click('[data-action="settings"]');await page.select('#quality','LOW');await page.click('[data-action="close"]');
 const results=[];
 for(const view of [{width:640,height:360},{width:844,height:390},{width:390,height:844},{width:320,height:568}]){
  await page.setViewport(view);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.click('[data-action="help"]');
  await page.click('.dialog-content');await page.keyboard.press('End');
  await page.waitForFunction(()=>{const e=document.querySelector('.dialog-content');return e.scrollHeight<=e.clientHeight+1||e.scrollTop>0},{timeout:5000}).catch(async()=>{const detail=await page.evaluate(()=>{const e=document.querySelector('.dialog-content');return{scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,height:e.clientHeight,active:document.activeElement?.className}});throw Error('Help keyboard scroll did not complete '+JSON.stringify(detail))});await sleep(100);
  const d=await page.evaluate(()=>{const content=document.querySelector('.dialog-content'),back=document.querySelector('[data-action="close"]');return{scrollTop:content.scrollTop,scrollHeight:content.scrollHeight,height:content.clientHeight,footer:back.getBoundingClientRect().toJSON(),role:document.querySelector('.dialog').getAttribute('role')}});
  if(d.footer.y<0||d.footer.bottom>view.height||d.footer.height<44)throw Error('Footer clipped');
  if(d.scrollHeight>d.height+1&&d.scrollTop<=0)throw Error('Help cannot be scrolled with keyboard');
  await shot('readable-help-'+view.width+'x'+view.height);
  await page.keyboard.press('Tab');
  if(await page.evaluate(()=>document.activeElement?.getAttribute('data-action'))!=='close')throw Error('Keyboard cannot reach Back');
  await page.keyboard.press('Enter');
  if(await page.$('.dialog'))throw Error('Back did not close dialog');results.push({view,...d});
 }
 log('DIALOG PASS',JSON.stringify({results,method:'Actual mouse focus, keyboard End/Tab/Enter; read-only bounds. Not a complete focus-trap or screen-reader audit.'}));
}
