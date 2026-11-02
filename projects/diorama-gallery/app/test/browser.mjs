/** Optional ordinary-browser QA. No GPU/security bypass and no browser download. */
import {chromium} from '../../.agents/skills/diorama-worlds/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const output=resolve('../assets/screenshots');await mkdir(output,{recursive:true});
const report={checks:[],errors:[],visualReview:'Pending actual pixel inspection; screenshots alone do not prove quality.'};
let browser;
try {
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,chromiumSandbox:true,ignoreDefaultArgs:['--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route(/^https?:/,r=>r.abort());
 await page.goto(pathToFileURL(resolve('dist/index.html')).href+'?inspect');

 await page.screenshot({path:resolve(output,'gallery-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Explore Harbor in a box'}).click();
 const webgl=await page.evaluate(()=>!!window.__gallery.stats());
 report.checks.push({name:'WebGL world mounted',pass:webgl});
 if(webgl){
  await page.getByRole('button',{name:'Pause harbor',exact:true}).click();
  const a=await page.evaluate(()=>window.__gallery.stats());await page.waitForTimeout(250);const b=await page.evaluate(()=>window.__gallery.stats());assert.equal(a.frames,b.frames);
  report.checks.push({name:'pause stops frames',pass:true});
  await page.screenshot({path:resolve(output,'harbor-desktop.png'),fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>window.__gallery.stats().running),false);
  report.checks.push({name:'reduced motion stops playback',pass:true});
 }
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'Collection'}).click();await page.getByRole('button',{name:'Explore Harbor in a box'}).click();assert.ok(await page.locator('canvas').count()<=1);}
 report.checks.push({name:'repeated launch/back at most one canvas',pass:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(output,'harbor-mobile.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 report.checks.push({name:'mobile no horizontal overflow',pass:true});
 assert.deepEqual(report.errors,[]);
} catch(error){report.blocker=String(error);process.exitCode=1;} finally {await browser?.close();await writeFile(resolve(output,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
