#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { buildWorld } from './build-world.mjs';
import { FINISHES } from '../kit/world.js';
import { openBrowser } from './browser.mjs';

const delay = (page, ms = 220) => page.waitForTimeout(ms);
function occupancy(buffer) {
  const png = PNG.sync.read(buffer); let count = 0, minX = png.width, maxX = 0, minY = png.height, maxY = 0;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    const n = (y * png.width + x) * 4;
    if (Math.min(png.data[n], png.data[n + 1], png.data[n + 2]) < 235) {
      count++; minX = Math.min(minX,x); maxX = Math.max(maxX,x); minY = Math.min(minY,y); maxY = Math.max(maxY,y);
    }
  }
  return { fraction: count / (png.width * png.height), bounds: [minX,minY,maxX,maxY], width: png.width, height: png.height };
}
const matrixDelta = (a,b) => Math.max(...a.map((n,i)=>Math.abs(n-b[i])));
export async function inspectWorld(input, outputDirectory) {
  const name = basename(input, '.js'); outputDirectory = resolve(outputDirectory);
  await mkdir(outputDirectory,{recursive:true});
  const built = await buildWorld(input,join(outputDirectory,`world-${name}.html`));
  const browser = await openBrowser();
  const report = { scene:name, bytes:built.bytes, checks:[], errors:[], network:[], images:[], visualReview:'Pending: open saved images and record findings; metrics do not prove visual quality.' };
  const check = (name,pass,details) => { report.checks.push({name,pass:Boolean(pass),details}); };
  const url = pathToFileURL(built.output).href+'?inspect&still';
  try {
    const context = await browser.newContext({viewport:{width:1100,height:1040}});
    await context.route(/^https?:/, route=>{report.network.push(route.request().url());return route.abort();});
    await context.addInitScript(()=>{
      const Native=window.IntersectionObserver;window.__worldTestIntersections=[];
      window.IntersectionObserver=class extends Native{constructor(callback,options){super(callback,options);window.__worldTestIntersections.push(callback);}};
    });
    const page = await context.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('console',msg=>{if(msg.type()==='error')report.errors.push(msg.text());});
    await page.goto(url); await page.waitForFunction(()=>window.__world?.runtime,{},{timeout:20000});
    const getStats=()=>page.evaluate(()=>window.__world.runtime.stats());
    const seek=seconds=>page.evaluate(t=>{window.__world.runtime.seek(t);return window.__world.runtime.snapshot();},seconds);
    const metadata=await page.evaluate(()=>({duration:window.__world.definition.duration,still:window.__world.definition.still}));
    check('offline HTML',report.network.length===0,report.network);
    const still = await seek(metadata.still);
    await seek(metadata.duration*.8); const again = await seek(metadata.still);
    check('seek is independent of frame history',matrixDelta(still,again)<1e-9,matrixDelta(still,again));
    const start = await seek(0), end = await seek(metadata.duration-1e-6);
    check('loop transform seam',matrixDelta(start,end)<.001,{maxDelta:matrixDelta(start,end),epsilonSeconds:1e-6});
    const quarter=await seek(metadata.duration*.25), half=await seek(metadata.duration*.5);
    const contactTimes=await page.evaluate(()=>window.__world.definition.contactTimes??[]);
    for(const contactTime of contactTimes){
      await seek(contactTime);const contacts=await page.evaluate(()=>window.__world.runtime.contacts());
      check(`contact at ${contactTime.toFixed(3)}s`,contacts.length>0&&contacts.every(c=>Math.hypot(...c.a.map((v,i)=>v-c.b[i]))<.025),contacts);
    }
    check('scene actually moves',matrixDelta(quarter,half)>.03,matrixDelta(quarter,half));
    const stats=await getStats();
    check('draw budget (250 including shadows and post)',stats.draws<=250,stats);
    check('triangle budget (100k)',stats.triangles<100000,stats.triangles);
    const finishImages=[];
    for(const finish of FINISHES) {
      const poseBefore=await seek(metadata.still);const beforeFinish=await getStats();
      await page.selectOption('#finish',finish);const afterFinish=await getStats();
      check(`${finish}: switch preserves time`,afterFinish.time===beforeFinish.time&&afterFinish.finish===finish&&matrixDelta(poseBefore,await page.evaluate(()=>window.__world.runtime.snapshot()))<1e-9);
      for(const [label,t] of [['still',metadata.still],['start',0],['quarter',metadata.duration*.25],['half',metadata.duration*.5],['late',metadata.duration*.85]]) {
        await seek(t);const imageName=`${name}-${finish}-${label}.png`;
        const pixels=await page.locator('#stage').screenshot({path:join(outputDirectory,imageName)});report.images.push(imageName);
        if(label==='still'){
          finishImages.push({finish,pixels:PNG.sync.read(pixels).data});
          const image=PNG.sync.read(pixels);
          const cornerOffsets=[0,(image.width-1)*4,((image.height-1)*image.width)*4,(image.width*image.height-1)*4];
          check(`${finish}: white negative space`,cornerOffsets.every(n=>image.data[n]>=254&&image.data[n+1]>=254&&image.data[n+2]>=254));
          check(`${finish}: resolution policy`,finish==='pixel'?afterFinish.buffer[0]<afterFinish.width:afterFinish.buffer[0]>=afterFinish.width,afterFinish.buffer);
          const fill=occupancy(pixels),[x0,y0,x1,y1]=fill.bounds;
          check(`${finish}: visible scene`,fill.fraction>.08,fill);
          check(`${finish}: no edge clipping`,x0>3&&y0>3&&x1<fill.width-4&&y1<fill.height-4,fill);
        }
      }
    }
    check('four visually distinct finishes',finishImages.every((a,i)=>finishImages.slice(i+1).every(b=>!a.pixels.equals(b.pixels))));
    await seek(metadata.still); await page.selectOption('#finish','miniature');
    check('unknown finish rejected without state change',await page.evaluate(()=>{try{window.__world.runtime.setFinish('unknown');return false;}catch{return window.__world.runtime.stats().finish==='miniature';}}));
    const baseline=await getStats();
    for(let i=0;i<60;i++)await seek(i/59*metadata.duration);
    const after=await getStats();check('no frame-dependent GPU allocations',after.geometries===baseline.geometries&&after.textures===baseline.textures,{before:baseline,after});
    await page.getByRole('button',{name:'Play scene',exact:true}).click();await delay(page,400);
    const realStart=await page.evaluate(()=>({time:window.__world.runtime.stats().time,wall:performance.now()}));await delay(page,650);
    const realEnd=await page.evaluate(()=>({time:window.__world.runtime.stats().time,wall:performance.now()}));
    const simulated=(realEnd.time-realStart.time+metadata.duration)%metadata.duration,wallSeconds=(realEnd.wall-realStart.wall)/1000;
    check('wall-clock speed independent of FPS',Math.abs(simulated-wallSeconds)<.25,{simulated,wallSeconds});
    const playing=await getStats();check('play advances clock',playing.running&&Math.abs(playing.time-after.time)>.01,playing);
    await page.getByRole('button',{name:'Pause scene',exact:true}).click(); const paused=await getStats();await delay(page);const idle=await getStats();
    check('pause stops rendering',!idle.running&&idle.frames===paused.frames,{paused,idle});
    await page.emulateMedia({reducedMotion:'reduce'});await delay(page);const reduced=await getStats();
    await page.getByRole('button',{name:'Play scene',exact:true}).click();await delay(page);const reducedAgain=await getStats();
    check('reduced motion stays at declared still',reducedAgain.reduced&&!reducedAgain.running&&reducedAgain.frames===reduced.frames&&Math.abs(reducedAgain.time-metadata.still)<1e-9,reducedAgain);
    await page.emulateMedia({reducedMotion:'no-preference'});await delay(page);
    await page.evaluate(()=>{window.__world.stage.style.marginTop='2400px';window.scrollTo(0,0);});await delay(page,350);const off=await getStats();await delay(page);const offAgain=await getStats();
    check('offscreen suspends rendering',!offAgain.running&&off.frames===offAgain.frames,{off,offAgain});
    await page.evaluate(()=>{window.__world.stage.style.marginTop='';window.scrollTo(0,0);});await delay(page,350);const on=await getStats();check('onscreen resumes rendering',on.running&&on.frames>offAgain.frames,on);
    await page.evaluate(()=>window.__worldTestIntersections[0]([{isIntersecting:true},{isIntersecting:false}]));
    check('batched intersections stop on newest offscreen state',!(await getStats()).running);
    await page.evaluate(()=>window.__worldTestIntersections[0]([{isIntersecting:false},{isIntersecting:true}]));
    check('batched intersections resume on newest onscreen state',(await getStats()).running);
    // Exercise the visibility listener explicitly; not a physical background-tab benchmark.
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    check('hidden-document handler stops loop',!(await getStats()).running);
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await delay(page);check('visible-document handler resumes loop',(await getStats()).running);
    await page.getByRole('button',{name:'Pause scene',exact:true}).click();
    for(const finish of FINISHES) {
      await page.selectOption('#finish',finish);await seek(metadata.still);await page.setViewportSize({width:390,height:844});await delay(page);
      const imageName=`${name}-${finish}-mobile.png`;await page.screenshot({path:join(outputDirectory,imageName),fullPage:true});report.images.push(imageName);
      check(`${finish}: mobile layout`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),await getStats());
      const fill=occupancy(await page.locator('#stage').screenshot());const[x0,y0,x1,y1]=fill.bounds;
      check(`${finish}: mobile framing`,fill.fraction>.06&&x0>1&&y0>1&&x1<fill.width-2&&y1<fill.height-2,fill);
    }
    const beforeDispose=await getStats();await page.evaluate(()=>window.__world.runtime.dispose());await delay(page);const disposed=await getStats();
    check('dispose detaches canvas and stops rendering',await page.locator('#stage canvas').count()===0&&!disposed.running&&disposed.frames===beforeDispose.frames,disposed);
    const remount=await context.newPage();await remount.goto(url);await remount.waitForFunction(()=>window.__world?.runtime);await remount.evaluate(()=>window.__world.runtime.dispose());await remount.close();
    await context.close();
    const reducedContext=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});await reducedContext.setOffline(true);
    const r=await reducedContext.newPage();await r.goto(pathToFileURL(built.output).href+'?inspect');await r.waitForFunction(()=>window.__world?.runtime);const rs=await r.evaluate(()=>window.__world.runtime.stats());
    check('initial reduced-motion mount offline',rs.reduced&&!rs.running&&rs.time===metadata.still,rs);await reducedContext.close();
    const fallbackContext=await browser.newContext();await fallbackContext.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=function(){return null;};});
    const fallback=await fallbackContext.newPage();await fallback.goto(pathToFileURL(built.output).href);await fallback.waitForFunction(()=>document.querySelector('#stage')?.dataset.state==='unavailable');
    check('missing WebGL has readable fallback',/needs WebGL 2/.test(await fallback.locator('#stage').innerText())&&await fallback.locator('#pause').isDisabled());await fallbackContext.close();
    check('no browser errors',report.errors.length===0,report.errors);
  } catch(e) { check('inspection completed',false,e.stack); }
  finally {await browser.close();}
  report.passed=report.checks.every(c=>c.pass);await writeFile(join(outputDirectory,`${name}-report.json`),JSON.stringify(report,null,2)+'\n');
  return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(!process.argv[2]||!process.argv[3]){console.error('Usage: node look-world.mjs <scene.js> <output-directory>');process.exitCode=1;}
  else {const r=await inspectWorld(process.argv[2],process.argv[3]);for(const c of r.checks)console.log(`${c.pass?'PASS':'FAIL'} ${c.name}${c.pass?'':': '+JSON.stringify(c.details)}`);console.log(`Screenshots and report: ${resolve(process.argv[3])}`);if(!r.passed)process.exitCode=1;}
}
