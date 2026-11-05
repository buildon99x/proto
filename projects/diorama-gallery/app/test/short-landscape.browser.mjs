/** Optional real-browser DOM/layout audit. Requires an ordinary browser, no security/GPU bypass. */
import {chromium} from '../../.agents/skills/diorama-worlds/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const input=process.argv[2];if(!input)throw new Error('Usage: node test/short-landscape.browser.mjs <gallery index URL> [output directory]');
const output=resolve(process.argv[3]??'../assets/short-landscape-qa');await mkdir(output,{recursive:true});
const report={checks:[],errors:[],scope:'DOM/layout and synthetic browser input only. Physical mobile touch and GPU appearance are not established.'};let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 for(const surface of ['gallery','standalone'])for(const [width,height]of [[844,390],[390,844],[1440,900]]){
  await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'no-preference'});const url=new URL(surface==='gallery'?input:'desert.html',input);url.searchParams.set('inspect','');if(surface==='gallery')url.searchParams.set('world','desert');await page.goto(url.href);
  await page.waitForFunction(()=>window.__gallery?.stats()||window.__world?.runtime?.stats());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${surface} has no horizontal overflow at ${width}x${height}`);
  const short=width===844,nav=page.locator('.short-landscape-nav');assert.equal(await nav.isVisible(),short);
  if(short){
   const stage=await page.locator('#stage').boundingBox();assert.ok(stage.height>=180&&stage.height<=242,'compact stage is bounded');
   await nav.locator('a').click();assert.equal(await page.evaluate(()=>document.activeElement?.id),'scene-controls','native link moves keyboard focus to controls');
   const controls=surface==='gallery'?page.locator('.world-view button,.world-view select,.toolbar a,.short-landscape-nav a'):page.locator('button,select,header a,.short-landscape-nav a');
   for(let i=0;i<await controls.count();i++){const control=controls.nth(i);if(!await control.isVisible())continue;await control.scrollIntoViewIfNeeded();const box=await control.boundingBox();assert.ok(box.width>=43.5&&box.height>=43.5,'interactive target is at least 44px');assert.ok(box.y>=-.5&&box.y+box.height<=height+.5,'every control is reachable by vertical scrolling');}
   await page.locator('#zoom-in').click();await page.locator('#zoom-reset').click();
   const mode=surface==='gallery'?page.locator('#camera-mode'):page.getByRole('combobox',{name:'시점',exact:true});await mode.selectOption('reference');await mode.selectOption('full');
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>{const s=window.__gallery?.stats()??window.__world?.runtime?.stats();return s?.reduced&&!s.running;});const state=await page.evaluate(()=>window.__gallery?.stats()??window.__world?.runtime?.stats());assert.equal(state.running,false);assert.equal(state.reduced,true);
   if(surface==='gallery'){assert.equal(await page.locator('#pause').isDisabled(),true);assert.equal(await page.locator('#pause').getAttribute('aria-pressed'),'true');}
  }
  report.checks.push({surface,width,height,pass:true});await page.screenshot({path:resolve(output,`${surface}-${width}x${height}.png`),fullPage:true});
 }
 assert.deepEqual(report.errors,[]);
}catch(error){report.blocker=String(error);process.exitCode=1;}finally{await browser?.close();await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
