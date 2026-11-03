import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const source=await readFile(new URL('src/main.js',root),'utf8'),css=await readFile(new URL('src/style.css',root),'utf8');
function worldDOM(id){const template=source.slice(source.indexOf('function showWorld(')).match(/app\.innerHTML = (`[^\n]+`);/)[1];return Function('world','FINISHES',`return ${template}`)({id,number:'04',title:'테스트 세계',label:'WORLD',caption:'Test',description:'Description',file:`${id}.html`,definition:{rendering:{zoom:true,cinematicView:{},detailView:{},referenceView:{}}}},['miniature','pixel']);}

test('desert DOM provides a keyboard-focusable native route to all scene controls',()=>{
 const html=worldDOM('desert');assert.match(html,/<nav class="short-landscape-nav" aria-label="[^\"]+">/);assert.match(html,/<a href="#scene-controls">/);assert.match(html,/id="scene-controls" tabindex="-1"/);
 const controls=html.slice(html.indexOf('id="scene-controls"'));for(const id of ['camera-mode','pause','reset','moment','finish'])assert.match(controls,new RegExp(`id="${id}"`));assert.match(controls,/href="\.\/desert.html"/);
 for(const id of ['harbor','singapore','dubai'])assert.doesNotMatch(worldDOM(id),/short-landscape-nav|id="scene-controls"/,'other worlds retain their DOM');
});

test('short-landscape CSS is desert-only and excluded from desktop and tall phones',()=>{
 const marker=css.indexOf('/* Desert short-landscape accessibility');assert.ok(marker>=0,'scoped rule exists');const scoped=css.slice(marker);
 assert.match(scoped,/@media\s*\(min-width:641px\) and \(max-width:1000px\) and \(max-height:500px\) and \(orientation:landscape\)/);
 assert.match(scoped,/height:clamp\(180px,52dvh,240px\);min-height:180px/);
 assert.match(scoped,/\.toolbar button[^}]*min-width:44px;min-height:44px/);assert.match(scoped,/\.toolbar a[^}]*min-width:44px;min-height:44px/);
 assert.match(scoped,/flex-wrap:wrap/);assert.match(scoped,/min-width:0/);assert.doesNotMatch(scoped,/overflow(?:-y)?:hidden|position:fixed|scroll-behavior:smooth/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.match(source,/button\.disabled = !active \|\| reduced\.matches/);
 const matches=(w,h)=>w>=641&&w<=1000&&h<=500&&w>h;
 assert.equal(matches(844,390),true);assert.equal(matches(390,844),false);assert.equal(matches(1440,900),false);
});

test('standalone short-landscape rules and scroll link also opt in only to desert',async()=>{
 const builder=await readFile(new URL('../.agents/skills/diorama-worlds/scripts/build-world.mjs',root),'utf8');
 assert.match(builder,/definition\.name==='desert-river-city'&&!params\.has\('embed'\)/,'embedded viewport remains unchanged');assert.match(builder,/document\.body\.dataset\.worldId='desert'/);
 assert.match(builder,/zoomBox\.id='scene-controls'/);assert.match(builder,/zoomBox\.tabIndex=-1/);assert.match(builder,/<a href="#scene-controls">/);
 assert.match(builder,/body\[data-world-id=desert\] #stage\{height:clamp\(180px,52dvh,240px\);min-height:180px;aspect-ratio:auto/);
 assert.match(builder,/body\[data-world-id=desert\] \.controls (?:button|a)[^}]*min-width:44px;min-height:44px/);
});
