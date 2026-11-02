#!/usr/bin/env node
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const kit = fileURLToPath(new URL('../kit/world.js', import.meta.url));

export async function buildWorld(input, output, { bundler, nodePaths = [] } = {}) {
  const { build } = bundler ?? await import('esbuild');
  input = resolve(input);
  output = resolve(output ?? `world-${basename(input, '.js')}.html`);
  const entry = `import definition from ${JSON.stringify(input)};
import {mountWorld,FINISHES} from '@diorama/worlds';
const params=new URLSearchParams(location.search);
const stage=document.querySelector('#stage');
if(params.has('embed'))document.documentElement.classList.add('embedded');
document.querySelector('h1').textContent=definition.title;
document.querySelector('#description').textContent=definition.description;
document.title=definition.title+' · Diorama Worlds';
const requested=params.get('finish');
const finish=FINISHES.includes(requested)?requested:'miniature';
const runtime=mountWorld(definition,{el:stage,finish,paused:params.has('still')});
const select=document.querySelector('#finish');select.value=finish;
const pause=document.querySelector('#pause');
const rate=document.querySelector('#rate');
if(runtime){
  let paused=params.has('still');
  const update=()=>{pause.textContent=paused?'Play scene':'Pause scene';pause.setAttribute('aria-pressed',String(paused));};update();
  const tell=()=>{if(parent!==window&&location.origin!=='null')parent.postMessage({type:'diorama-world',name:definition.name,state:'ready',...runtime.stats()},location.origin);};
  select.addEventListener('change',()=>{runtime.setFinish(select.value);tell();});
  rate.addEventListener('change',()=>{runtime.setSpeed(Number(rate.value));tell();});
  addEventListener('message',event=>{
    if(parent===window||event.source!==parent||event.origin!==location.origin||!event.data||event.data.type!=='diorama-world')return;
    const d=event.data;
    if(FINISHES.includes(d.finish)){runtime.setFinish(d.finish);select.value=d.finish;}
    if(typeof d.paused==='boolean'){paused=d.paused;runtime.setPaused(paused);update();}
    if([.75,1,1.5].includes(d.speed)){runtime.setSpeed(d.speed);rate.value=String(d.speed);}
    tell();
  });
  tell();
  pause.addEventListener('click',()=>{paused=!paused;runtime.setPaused(paused);update();});
  document.querySelector('#reset').addEventListener('click',()=>runtime.seek(definition.still));
  if(params.has('inspect'))window.__world={runtime,definition,stage};
  addEventListener('pagehide',event=>{if(!event.persisted)runtime.dispose();});
}else{select.disabled=true;pause.disabled=true;rate.disabled=true;document.querySelector('#reset').disabled=true;if(parent!==window&&location.origin!=='null')parent.postMessage({type:'diorama-world',name:definition.name,state:'unavailable'},location.origin);}
`;
  const result = await build({ nodePaths, stdin: { contents: entry, resolveDir: dirname(input), sourcefile: 'world-entry.js' }, alias: { '@diorama/worlds': kit }, bundle: true, write: false, format: 'iife', platform: 'browser', target: ['es2022'], minify: true, legalComments: 'inline' });
  // A source string must never terminate the embedding script element.
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const notices = await readFile(new URL('../THIRD_PARTY_NOTICES.txt', import.meta.url), 'utf8');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#ffffff"><link rel="icon" href="data:,"><title>Diorama Worlds</title><style>
:root{color-scheme:light;--ink:#0d0d0d;--muted:#60605b;--stroke:#deded8;--space:16px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:#fff}*{box-sizing:border-box}body{margin:0}main{max-width:1120px;margin:auto;padding:32px 24px 48px}header{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap}header a{color:var(--muted);font-size:13px;text-decoration:none}h1{font-size:clamp(24px,4vw,38px);letter-spacing:-.035em;font-weight:500;line-height:1.1;margin:8px 0 12px}p{color:var(--muted);font-size:15px;line-height:1.6;margin:0;max-width:620px}.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:24px 0 0;font-size:13px}button,select{background:#fff;color:var(--ink);font:inherit;border:1px solid var(--stroke);border-radius:6px;min-height:44px;padding:8px 14px;cursor:pointer}button:hover,select:hover{border-color:#60605b}button:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid var(--ink);outline-offset:3px}button[aria-pressed="false"]{background:#17181c;color:#fff;border-color:#17181c}button:disabled,select:disabled{cursor:default;opacity:.5}#stage{position:relative;overflow:hidden;width:100%;aspect-ratio:4/3;min-height:240px;background:#fff;margin:16px 0 24px}#stage canvas{position:absolute;inset:0}#stage[data-state="unavailable"]{display:grid;place-items:center;color:var(--muted);padding:32px}.footnote{border-top:1px solid var(--stroke);padding-top:16px;font-size:12px}noscript{display:block;padding:32px}@media(max-width:600px){main{padding:24px 16px}#stage{aspect-ratio:1/1}.controls{gap:8px}.controls label{width:100%}}
.embedded body,.embedded main{width:100%;height:100dvh;max-width:none;padding:0;margin:0}.embedded header,.embedded .controls,.embedded .footnote{display:none}.embedded #stage{height:100dvh;min-height:0;aspect-ratio:auto;margin:0}</style></head><body><main><header><div><a href="https://github.com/educlopez/diorama">Diorama / Worlds</a><h1>A small world</h1><p id="description"></p></div></header><div class="controls" role="group" aria-label="Scene controls"><label for="finish">Finish</label><select id="finish"><option value="miniature">Miniature</option><option value="pixel">Pixel</option><option value="halftone">Halftone</option><option value="blueprint">Blueprint</option></select><button id="pause" type="button" aria-pressed="false">Pause scene</button><button id="reset" type="button">Reset pose</button><label for="rate">Speed</label><select id="rate"><option value="0.75">0.75×</option><option value="1" selected>1× · natural</option><option value="1.5">1.5×</option></select></div><div id="stage"></div><noscript>Enable JavaScript to see this miniature world.</noscript><p class="footnote">Fixed orthographic camera. Generated geometry and textures. Three.js bundled locally; no network needed. Reduced motion uses a still pose.</p></main><!-- ${notices.replace(/-->/g, '--&gt;')} --><script>${js}</script></body></html>`;
  await mkdir(dirname(output), { recursive: true }); await writeFile(output, html);
  return { output, bytes: Buffer.byteLength(html) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) { console.error('Usage: node build-world.mjs <scene.js> [output.html]'); process.exitCode = 1; }
  else console.log(await buildWorld(process.argv[2], process.argv[3]));
}
