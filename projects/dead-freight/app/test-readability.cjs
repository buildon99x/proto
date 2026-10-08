/* Rendererless UI/source and numeric grading checks. These do not verify
 * browser CSS layout, GPU pixels, ordinary input, audio, or visual acceptance.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const style=require('./render-style.js');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const game=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const tag=id=>{const match=html.match(new RegExp('<[a-z]+\\b[^>]*\\bid="'+id+'"[^>]*>','i'));assert(match,'missing '+id);return match[0];};
const near=(a,b,epsilon=1e-7)=>assert(Math.abs(a-b)<epsilon,`${a} differs from ${b}`);
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS',name);}
check('all DOM IDs are unique and gameplay compatibility controls exist',()=>{
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['game','hud','damage','overlay','description','stats','difficulty','manual','crtsetting','suppressor','laser','sound','start','restart','fullscreen','hp','armor','ammo','reserve','weapon','rounds','healthfill','staminafill','style','reloadmeter','reloadzone','reloadcursor','hint','message'])tag(id);
});
check('auto-cycle is the default and manual pump/CRT controls stay hidden',()=>{
 for(const id of ['manual','crtsetting']){const node=tag(id);assert(/\bhidden\b/.test(node));assert(!/\bchecked\b/.test(node));assert(/tabindex="-1"/.test(node));}
 assert(!html.includes('수동 무기 조작'));assert(!html.includes('<b>Q</b>'));assert.match(css,/#crt\{display:none!important\}/);
});
check('persistent aiming dot and separated arms have their own outlined layer',()=>{
 const reticle=html.match(/<div id="crosshair"[^>]*>([\s\S]*?)<\/div>/)[1];
 assert.equal((reticle.match(/class="aim-dot"/g)||[]).length,1);
 for(const side of ['n','e','s','w'])assert(reticle.includes(`class="aim-arm ${side}"`));
 const rule=css.match(/#crosshair\{([^}]+)\}/)[1];assert.match(rule,/opacity:1/);assert.match(rule,/left:50%/);assert.match(rule,/top:50%/);
 assert.match(css,/#crosshair \.aim-dot,#crosshair \.aim-arm\{[^}]*border:1px solid/);
 assert(!/#crosshair\.(?:confirmed|ads)\s*\{/.test(css),'feedback and ADS must not replace the aim geometry');
});
check('independent hit marker does not replace or obscure the central aim point',()=>{
 assert.match(html,/<\/div>\s*<div id="hitmarker"/);
 const marker=html.match(/<div id="hitmarker"[^>]*>([\s\S]*?)<\/div>/)[1];assert.equal((marker.match(/<i>/g)||[]).length,4);
 assert.match(css,/#hitmarker\{[^}]*opacity:0/);assert.match(css,/#hitmarker\.confirmed/);
 assert.match(css,/#hitmarker\[data-hit="head"\]/);assert.match(css,/#hitmarker\[data-hit="kill"\]/);
 assert.match(css,/#crosshair\.confirmed \+ #hitmarker/,'legacy feedback remains visible during integration');
});
check('HUD, reticle and damage vignette share the centered 16:9 gameplay frame',()=>{
 assert.match(css,/#hud,#damage\{[^}]*width:var\(--frame-w\);height:var\(--frame-h\)/);
 assert.match(css,/#hud,#damage\{[^}]*transform:translate\(-50%,-50%\)/);
 const windows=[[1280,720],[1920,1080],[1024,768],[2560,1080],[768,1024],[430,932],[640,360],[320,180]];
 for(const [w,h] of windows){const f=style.fitViewport(w,h);near(f.width/f.height,16/9);near(f.left+f.width/2,w/2);near(f.top+f.height/2,h/2);assert(f.left>=12-1e-7&&f.top>=12-1e-7);assert(f.width<=w&&f.height<=h);
  const cssWidth=Math.min(w-24,1.77777778*h-42.666667),cssHeight=Math.min(.5625*w-13.5,h-24);near(cssWidth,f.width,1e-4);near(cssHeight,f.height,1e-4);
 }
});
check('viewport sizing is finite and bounded even for tiny or invalid windows',()=>{
 for(const [w,h] of [[1,1],[0,0],[-1,7],[Infinity,NaN],[12,400]]){const f=style.fitViewport(w,h);for(const n of Object.values(f))assert(Number.isFinite(n));assert(f.width>0&&f.height>0);assert(f.left>=0&&f.top>=0);near(f.width/f.height,16/9);}
});
check('map, route, cargo and extraction progress have dedicated readable nodes',()=>{
 for(const id of ['region','objective','route','loot','map-panel','minimap','maplegend','extraction','extractionstatus','extractiontime','extractiontrack','extractionfill'])tag(id);
 assert.match(tag('minimap'),/width="200" height="200"/);assert.match(tag('extraction'),/\bhidden\b/);
 assert.match(css,/#maplegend\{display:none/);assert.match(css,/#minimap\[style\*="block"\] \+ #maplegend\{display:flex/);
 assert(!/filter:grayscale/.test(css),'map legend and objective colors must remain differentiated');
});
check('menu describes current movement bindings and bounded extraction scope',()=>{
 for(const text of ['<b>SPACE</b> 점프','<b>CTRL / C</b> 슬라이드','<b>X</b> 회피','<b>SHIFT</b> 달리기','펌프/슬라이드 자동 작동','탈출 중 구역 유지','0.6 EXTRACTION REGION','단일 연결 지역'])assert(html.includes(text),text);
 assert(!html.includes('<b>SPACE</b> 회피'));assert(!html.includes('디더링을 적용'));
});
check('shader module loads before the game and exposes usable immutable source',()=>{
 const scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m=>m[1]);
 assert(scripts.indexOf('render-style.js')>scripts.indexOf('vendor/three.min.js'));
 assert(scripts.indexOf('render-style.js')<scripts.indexOf('game.js'));
 for(const script of ['world.js','world-view.js']){assert(scripts.includes(script));assert(scripts.indexOf(script)<scripts.indexOf('core.js'));}
 assert(Object.isFrozen(style));assert(Object.isFrozen(style.palette));
 assert.match(style.vertexShader,/gl_Position/);assert.match(style.fragmentShader,/texture2D\(frame,vUv\)/);assert.match(style.fragmentShader,/gl_FragColor/);
});
check('screen grade has no stochastic, periodic, ordered or animated texture',()=>{
 assert(!/bayer|fract\s*\(|sin\s*\(|cos\s*\(|mod\s*\(|gl_FragCoord|\btime\b|random|noise|dither/i.test(style.fragmentShader));
 assert(!/repeating-(?:linear|radial)-gradient|url\(/.test(css),'HUD must not add a full-screen texture');
 assert.equal((style.fragmentShader.match(/texture2D/g)||[]).length,1,'grade samples only the live frame');
});
check('CPU grade is deterministic and monotonic across neutral luminance',()=>{
 let previous=[-1,-1,-1];
 for(let i=0;i<=1000;i++){const gray=i/1000,col=style.toneColor([gray,gray,gray]);assert.deepEqual(col,style.toneColor([gray,gray,gray]));col.forEach((v,k)=>{assert(v>=previous[k]-1e-12);assert(v>=0&&v<=1);});assert(col[2]>=col[0],'neutral scene keeps a cool cast');previous=col;}
 style.toneColor([0,0,0]).forEach((v,k)=>near(v,style.palette.shadow[k]));style.toneColor([1,1,1]).forEach((v,k)=>near(v,style.palette.light[k]));
});
check('smooth grade preserves distinct nearby surfaces without quantization jumps',()=>{
 for(let i=1;i<1000;i++){const a=style.toneColor([i/1000,i/1000,i/1000]),b=style.toneColor([(i+1)/1000,(i+1)/1000,(i+1)/1000]);assert(a.some((v,k)=>Math.abs(v-b[k])>1e-7));a.forEach((v,k)=>assert(Math.abs(v-b[k])<.006));}
});
check('muted red weapon and hit accents survive the cool grade',()=>{
 for(const source of [[.42,.13,.18],[.65,.28,.33],[.8,.45,.49]]){const out=style.toneColor(source);assert(out[0]>out[1]*1.3);assert(out[0]>out[2]);out.forEach(v=>assert(v>=0&&v<=1));}
});
check('invalid CPU diagnostic inputs cannot produce NaN or out-of-range color',()=>{
 for(const source of [[-1,2,4],[NaN,Infinity,-Infinity],[0,0,0]])style.toneColor(source).forEach(v=>assert(Number.isFinite(v)&&v>=0&&v<=1));
});
check('runtime preserves ADS aim and routes feedback to the separate hit layer',()=>{
 assert(!/\$\('crosshair'\)\.style\.opacity\s*=/.test(game),'ADS must not make the reticle invisible');
 assert.match(game,/\$\('hitmarker'\)\.classList\.toggle\('confirmed',hitMarker>0\)/);
 assert.match(game,/\$\('hitmarker'\)\.dataset\.hit/);
 assert.match(game,/fragmentShader:DFRenderStyle\.fragmentShader/);
 assert(!/float bayer\(|float grit=|fract\(sin/.test(game),'legacy full-screen texture must be removed');
});
console.log(`${checks} rendererless readability checks passed. Browser layout, GPU pixels and input remain separate acceptance checks.`);
