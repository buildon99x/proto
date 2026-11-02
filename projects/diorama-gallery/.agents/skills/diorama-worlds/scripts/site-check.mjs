#!/usr/bin/env node
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {openBrowser} from './browser.mjs';

const base=process.env.WORLDS_SITE_URL??'http://localhost:4180';
const output=resolve(process.argv[2]??'work/worlds-site');await mkdir(output,{recursive:true});
const browser=await openBrowser(),checks=[],errors=[],failedAssets=[];
const check=(label,condition,details)=>{checks.push({label,pass:Boolean(condition),details});assert.ok(condition,`${label}: ${JSON.stringify(details)}`);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(page){await page.waitForSelector('.world-live iframe:not(.world-frame-pending)',{timeout:20000});}
async function ask(page){return page.evaluate(()=>new Promise((resolve,reject)=>{
  const f=document.querySelector('.world-live iframe');
  const timer=setTimeout(()=>{removeEventListener('message',receive);reject(new Error('No world state response'));},3000);
  function receive(e){if(e.source!==f.contentWindow||e.origin!==location.origin||e.data?.type!=='diorama-world')return;clearTimeout(timer);removeEventListener('message',receive);resolve({...e.data,wall:performance.now()});}
  addEventListener('message',receive);f.contentWindow.postMessage({type:'diorama-world',hello:true},location.origin);
}));}
try{
  const context=await browser.newContext({viewport:{width:1440,height:1100},permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failedAssets.push({url:r.url(),status:r.status()});});
  await page.goto(base+'/worlds');await ready(page);check('Worlds production route responds',await page.title().then(t=>t.includes('Worlds')));
  for(let i=0;i<2;i++){await page.reload();await ready(page);}
  check('cached iframe handshake survives warm reloads',true);
  const first=await ask(page);check('initial scene runs at natural speed',first.name==='florist'&&first.speed===1&&first.running,first);
  const iframe=page.locator('.world-live iframe');await iframe.evaluate(el=>el.dataset.testIdentity='same-frame');
  await page.getByRole('button',{name:'Pixel',exact:true}).click();const pixel=await ask(page);
  check('finish changes without reloading frame',pixel.finish==='pixel'&&await iframe.getAttribute('data-test-identity')==='same-frame',pixel);
  await page.getByRole('button',{name:'Pause scene',exact:true}).click();const before=await ask(page);await pause(250);const after=await ask(page);
  check('pause preserves exact clock',before.paused&&!after.running&&before.time===after.time,{before,after});
  await page.getByRole('button',{name:'Miniature',exact:true}).focus();await page.keyboard.press('Enter');const keyboardState=await ask(page);check('keyboard activates finish controls',keyboardState.finish==='miniature');
  check('finish switch preserves paused pose',keyboardState.time===after.time,{before:after.time,after:keyboardState.time});
  for(const finish of ['Halftone','Blueprint']){
    await page.getByRole('button',{name:finish,exact:true}).click();const state=await ask(page);
    check(`${finish} preserves time and frame`,state.finish===finish.toLowerCase()&&state.time===after.time&&await iframe.getAttribute('data-test-identity')==='same-frame',state);
    await page.screenshot({path:join(output,`worlds-${finish.toLowerCase()}.png`)});
  }
  for(const name of ['bakery','observatory']){
    await page.getByRole('combobox',{name:'Scene',exact:true}).selectOption(name);await ready(page);const state=await ask(page);
    check(`${name} mounts with selected finish and pause`,state.name===name&&state.finish==='blueprint'&&state.paused,state);
  }
  await page.getByRole('combobox',{name:'Scene',exact:true}).selectOption('florist');await ready(page);
  await page.getByRole('button',{name:'Miniature',exact:true}).click();
  await page.getByRole('combobox',{name:'Playback speed'}).selectOption('1.5');await page.getByRole('button',{name:'Play scene',exact:true}).click();await pause(200);
  const rateStart=await ask(page);await pause(600);const rateEnd=await ask(page);const measured=(rateEnd.time-rateStart.time+first.duration)%first.duration/((rateEnd.wall-rateStart.wall)/1000);
  check('1.5x control changes real playback rate',Math.abs(measured-1.5)<.25,{measured,rateStart,rateEnd});
  await page.getByRole('button',{name:'Pause scene',exact:true}).click();await page.getByRole('combobox',{name:'Playback speed'}).selectOption('1');
  await page.getByRole('combobox',{name:'Scene',exact:true}).selectOption('pottery-studio');await ready(page);check('scene selector mounts original pottery studio',(await ask(page)).name==='pottery-studio');
  await page.getByRole('button',{name:/The flower stall/}).click();await ready(page);check('poster gallery mounts original flower stall',(await ask(page)).name==='florist');
  await page.getByRole('button',{name:/The flower stall/}).click();await ready(page);
  await page.evaluate(()=>window.postMessage({type:'diorama-world',name:'florist',state:'unavailable'},location.origin));await pause(120);
  check('viewer rejects forged parent-window status',await page.locator('.world-fallback').count()===0);
  await page.locator('.world-gallery').scrollIntoViewIfNeeded();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.world-gallery img')).every(i=>i.complete&&i.naturalWidth>0));
  check('all real gallery posters load',await page.locator('.world-gallery img').count()===4);
  await page.evaluate(()=>scrollTo(0,0));await pause(150);await page.screenshot({path:join(output,'worlds-landing-desktop.png'),fullPage:true});await page.screenshot({path:join(output,'worlds-landing-hero.png')});
  await page.setViewportSize({width:390,height:844});await pause(150);check('mobile has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const controls=await page.locator('.world-toolbar button,.world-toolbar select').evaluateAll(es=>es.map(e=>({name:e.getAttribute('aria-label')??e.textContent,height:e.getBoundingClientRect().height})));
  check('new controls meet 44px touch height',controls.every(c=>c.height>=44),controls);
  await page.screenshot({path:join(output,'worlds-landing-mobile.png'),fullPage:true});
  for(const route of ['/','/svg','/docs','/docs/worlds','/pixel','/docs/pixel']){
    const requests=[];const handler=r=>requests.push(r.url());page.on('request',handler);
    const response=await page.goto(base+route);check(`${route} still responds`,response.status()===200);
    check(`${route} does not load Worlds HTML`,!requests.some(u=>/\/worlds\/.*\.html/.test(u)),requests.filter(u=>/worlds/.test(u)));
    check(`${route} mobile navigation fits`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(route==='/'){
      const expected={SVG:'npx skills add educlopez/diorama --skill diorama -g',Worlds:'npx skills add educlopez/diorama --skill diorama-worlds -g',Pixel:'npx skills add educlopez/diorama --skill diorama-pixel -g'};
      check('home presents all three skill paths',await page.getByRole('heading',{name:'Diorama SVG',exact:true}).count()===1&&await page.getByRole('heading',{name:'Diorama Worlds',exact:true}).count()===1&&await page.getByRole('heading',{name:'Diorama Pixel',exact:true}).count()===1);
      for(const [name,command] of Object.entries(expected)){
        await page.getByRole('button',{name:`Copy Diorama ${name} install command`,exact:true}).click();
        check(`${name} command copies exactly`,await page.evaluate(()=>navigator.clipboard.readText())===command);
      }
      await page.screenshot({path:join(output,'release-home-mobile.png'),fullPage:true});
      for(const width of [320,768,1024,1440]){await page.setViewportSize({width,height:1100});check(`home fits ${width}px`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:join(output,'release-home-desktop.png'),fullPage:true});await page.screenshot({path:join(output,'release-home-hero.png')});await page.setViewportSize({width:390,height:844});
    }
    if(route==='/docs/worlds'){
      check('Worlds guide includes definitive command and invocation',await page.locator('.code-row code').innerText()==='npx skills add educlopez/diorama --skill diorama-worlds -g'&&(await page.locator('main').innerText()).includes('/diorama-worlds'));
      await page.screenshot({path:join(output,'release-worlds-guide-mobile.png'),fullPage:true});
    }
    if(route==='/pixel'){
      check('Pixel page shows every scene live',await page.locator('.pixel-live iframe').count()===3);
      await page.getByRole('button',{name:'Copy Diorama Pixel install command',exact:true}).click();
      check('Pixel page command copies exactly',await page.evaluate(()=>navigator.clipboard.readText())==='npx skills add educlopez/diorama --skill diorama-pixel -g');
      await page.screenshot({path:join(output,'release-pixel-mobile.png'),fullPage:true});
    }
    if(route==='/docs/pixel'){
      check('Pixel guide includes definitive command and invocation',await page.locator('.code-row code').innerText()==='npx skills add educlopez/diorama --skill diorama-pixel -g'&&(await page.locator('main').innerText()).includes('/diorama-pixel'));
    }
    page.off('request',handler);
  }
  const sitemap=await context.request.get(base+'/sitemap.xml');const map=await sitemap.text();check('sitemap covers the guides, worlds and pixel',map.includes('/docs/worlds')&&map.includes('/docs/pixel')&&map.includes('/pixel<')&&sitemap.status()===200);
  const robots=await context.request.get(base+'/robots.txt');check('robots publishes sitemap',robots.status()===200&&(await robots.text()).includes('/sitemap.xml'));
  const llms=await context.request.get(base+'/llms.txt');check('agent docs route includes separate skill',(await llms.text()).includes('/worlds:'));
  await context.close();
  const reducedContext=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});const reducedPage=await reducedContext.newPage();await reducedPage.goto(base+'/worlds');await ready(reducedPage);
  const reduced=await ask(reducedPage);check('landing honors reduced motion',reduced.reduced&&!reduced.running&&await reducedPage.getByRole('button',{name:'Pause scene',exact:true}).isDisabled(),reduced);await reducedContext.close();
  const fallbackContext=await browser.newContext();await fallbackContext.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});const fallback=await fallbackContext.newPage();await fallback.goto(base+'/worlds');await fallback.waitForSelector('.world-fallback');
  await fallback.waitForFunction(()=>{const i=document.querySelector('.world-poster');return i?.complete&&i.naturalWidth>0;});
  check('WebGL failure shows real poster and fallback link',await fallback.getByRole('link',{name:'Open the standalone scene'}).count()===1);await fallbackContext.close();
  check('no unexpected page errors',errors.length===0,errors);check('no failed local assets',failedAssets.length===0,failedAssets);
}catch(error){checks.push({label:'site check completed',pass:false,details:error.stack});}
finally{await browser.close();await writeFile(join(output,'worlds-site-report.json'),JSON.stringify({passed:checks.every(c=>c.pass),checks,errors,failedAssets},null,2)+'\n');}
for(const c of checks)console.log(`${c.pass?'PASS':'FAIL'} ${c.label}${c.pass?'':': '+JSON.stringify(c.details)}`);
if(checks.some(c=>!c.pass))process.exitCode=1;
