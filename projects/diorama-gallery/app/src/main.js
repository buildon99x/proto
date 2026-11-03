import { mountWorld, FINISHES } from '@diorama/worlds';
import {worlds} from './worlds.js';
import {attachZoom} from './zoom.js';
import {resetScene} from './view-controls.js';
import { createSession, captureThumbnail } from './session.js';
import './style.css';
import {showUnavailable} from './availability.js';

// Add authored worlds here. Each card uses that world's actual still render.

const app = document.querySelector('#app');
const session = createSession((definition, el, paused) => mountWorld(definition, { el, paused }));
let active = null;
let zoomControls = null;
let paused = false;
let screen = 'gallery';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = () => {
  const button = document.querySelector('#pause');
  if (!button) return;
  button.textContent = reduced.matches ? '정지 · 동작 줄이기' : paused ? '재생' : '일시정지';
  button.setAttribute('aria-pressed', String(paused || reduced.matches));
  button.disabled = !active || reduced.matches;
};
function showGallery({focus = false} = {}) {
  zoomControls?.dispose(); zoomControls=null; session.close(); active = null; screen = 'gallery';
  app.innerHTML = `<main class="gallery"><header class="masthead"><a class="wordmark" href="#" aria-label="Small Worlds home">SMALL<span>WORLDS</span><i>®</i></a><span class="edition">INTERACTIVE DIORAMAS<br>COLLECTION / 001</span></header><section class="intro"><div class="eyebrow"><span></span> A LITTLE PLACE, ALIVE</div><h1>작은 세계,<br><em>살아 있는 이야기.</em></h1><p>한 걸음 더 가까이.<br>작은 움직임과 디테일로 채운 세계를 만나 보세요.</p></section><section aria-label="디오라마 모음" class="collection"><div class="section-heading"><span>THE COLLECTION</span><span>${String(worlds.length).padStart(2,'0')} WORLD${worlds.length===1?'':'S'} TO EXPLORE</span></div>${worlds.map((world,index)=>`<button data-world="${index}" class="world-card" type="button" aria-label="${world.title} 열기"><div class="preview" id="preview-${index}"><span class="loading">3D 장면을 준비하고 있어요…</span></div><span class="card-corner">${world.number} / LIVE 3D</span><span class="open-arrow" aria-hidden="true">↗</span><span class="card-caption"><span><small>${world.category}</small><strong>${world.title}</strong><span>${world.subtitle}</span></span><span class="explore">세계 열기 <b>↗</b></span></span></button>`).join('')}</section><footer><span>BUILT SMALL. MADE TO EXPLORE.</span><span>실시간 3D · 설치 없이 · 소리 없음</span></footer></main>`;
  document.querySelector('.wordmark').onclick = e => e.preventDefault();
  for (const [index, world] of worlds.entries()) {
    const preview = document.querySelector(`#preview-${index}`);
    try {
      const runtime = mountWorld(world.definition, {el:preview, paused:true});
      if (!runtime) { showUnavailable(preview, true); continue; }
      const imageURL = captureThumbnail(runtime, world.definition.still, () => preview.querySelector('canvas').toDataURL('image/png'));
      const image = new Image(); image.src = imageURL; image.alt = ''; image.className = 'thumbnail-image';
      preview.replaceChildren(image); preview.dataset.state = 'thumbnail';
    } catch (error) {
      showUnavailable(preview, true); console.error(error);
    }
  }
  for (const button of document.querySelectorAll('[data-world]')) button.onclick = () => showWorld(worlds[Number(button.dataset.world)]);
  if (focus) document.querySelector('[data-world]')?.focus();
}
function showWorld(world) {
  zoomControls?.dispose(); zoomControls=null; session.close(); active = null; screen = 'world'; paused = false;
  app.innerHTML = `<main class="world-view" data-world-id="${world.id}"><header class="world-header"><button id="back" class="back" type="button">← <span>모음으로</span></button><div><span class="eyebrow">WORLD ${world.number} / MINIATURE</span><h1>${world.title}</h1></div><span class="live-dot">실시간 디오라마</span></header><div class="stage-wrap"><div id="stage" aria-label="${world.title} 3D 장면"></div><span class="scene-label">${world.label}<br><small>${world.caption}</small></span></div>${world.definition.rendering?.zoom?'<div class="zoom-controls" role="group" aria-label="화면 확대 축소"><button id="zoom-out" type="button" aria-label="축소">−</button><output id="zoom-value" aria-live="polite">100%</output><button id="zoom-in" type="button" aria-label="확대">+</button><button id="zoom-reset" type="button">기본 보기</button></div>':''}<div class="toolbar" role="group" aria-label="장면 조작"><div class="play-controls"><button id="pause" type="button">일시정지</button><button id="reset" type="button">장면 초기화</button></div><label for="moment">장면 <select id="moment"><option value="">시간 선택</option><option value="0">시작</option><option value="12">12초</option><option value="30">30초</option><option value="60">60초</option><option value="90">90초</option></select></label><label for="finish">표현 <select id="finish">${FINISHES.map(f=>`<option value="${f}">${f[0].toUpperCase()+f.slice(1)}</option>`).join('')}</select></label><a href="./${world.file}" target="_blank" rel="noopener">단독 화면 ↗</a></div><p class="scene-description">${world.description}</p><p class="motion-note">${world.definition.rendering?.zoom?'휠·두 손가락으로 확대/축소 · 한 손가락으로 페이지 스크롤':'고정 시점'} · 화면을 벗어나면 자동 정지 · 시스템 동작 줄이기 설정 반영</p></main>`;
  const stage = document.querySelector('#stage');
  try { active = session.open(world.definition, stage, false); }
  catch (error) { showUnavailable(stage); console.error(error); }
  if (!active) { showUnavailable(stage); document.querySelector('.live-dot').textContent = '3D 사용 불가'; }
  document.querySelector('#back').onclick = () => showGallery({focus:true});
  document.querySelector('#pause').onclick = () => { paused = !paused; active?.setPaused(paused); if(!paused)document.querySelector('#moment').value=''; state(); };
  document.querySelector('#reset').onclick = () => resetScene(active,world.definition.still,document.querySelector('#moment'),paused||reduced.matches);
  document.querySelector('#moment').onchange = e => {if(e.target.value!==''){active?.seek(Number(e.target.value));paused=true;active?.setPaused(true);state();}};
  document.querySelector('#finish').onchange = e => active?.setFinish(e.target.value);
  for (const selector of ['#reset','#finish','#moment']) document.querySelector(selector).disabled = !active;
  if(world.definition.rendering?.zoom){
    const plus=document.querySelector('#zoom-in'),minus=document.querySelector('#zoom-out'),reset=document.querySelector('#zoom-reset');
    if(active)zoomControls=attachZoom({stage,plus,minus,reset,label:document.querySelector('#zoom-value'),runtime:active});else for(const button of [plus,minus,reset])button.disabled=true;
  }
  state(); document.querySelector('#back').focus();
}
reduced.addEventListener('change', state);
addEventListener('pagehide', () => { zoomControls?.dispose(); zoomControls=null; session.close(); active = null; });
addEventListener('pageshow', event => { if(event.persisted) showGallery(); });
addEventListener('keydown', event => { if(event.key === 'Escape' && screen === 'world') showGallery({focus:true}); });
if (new URLSearchParams(location.search).has('inspect')) {
  window.__gallery = { open:(id='harbor')=>showWorld(worlds.find(w=>w.id===id)??worlds[0]), back:()=>showGallery(), stats:()=>active?.stats() ?? null, seek:t=>active?.seek(t), snapshot:()=>active?.snapshot(), contacts:()=>active?.contacts(), definitions:worlds.map(w=>w.definition) };
}
const requested=new URLSearchParams(location.search).get('world');
const selected=worlds.find(world=>world.id===requested);
if(selected)showWorld(selected);else showGallery();
