import { mountWorld, FINISHES } from '@diorama/worlds';
import harbor from './harbor.js';
import { createSession, captureThumbnail } from './session.js';
import './style.css';

// Add authored worlds here. Each card uses that world's actual still render.
const worlds = [{ definition: harbor, number: '01', category: 'MARITIME / MINIATURE', title: 'Harbor in a box', subtitle: 'A working port. A world within reach.' }];
const app = document.querySelector('#app');
const session = createSession((definition, el, paused) => mountWorld(definition, { el, paused }));
let active = null;
let paused = false;
let screen = 'gallery';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const state = () => {
  const button = document.querySelector('#pause');
  if (!button) return;
  button.textContent = reduced.matches ? 'Still · reduced motion' : paused ? 'Play harbor' : 'Pause harbor';
  button.setAttribute('aria-pressed', String(paused || reduced.matches));
  button.disabled = !active || reduced.matches;
};
function showGallery({focus = false} = {}) {
  session.close(); active = null; screen = 'gallery';
  app.innerHTML = `<main class="gallery"><header class="masthead"><a class="wordmark" href="#" aria-label="Small Worlds home">SMALL<span>WORLDS</span><i>®</i></a><span class="edition">INTERACTIVE DIORAMAS<br>COLLECTION / 001</span></header><section class="intro"><div class="eyebrow"><span></span> A LITTLE PLACE, ALIVE</div><h1>Great stories.<br><em>Small worlds.</em></h1><p>Step closer. Discover tiny places filled with<br class="desktop"> movement, character, and quiet detail.</p></section><section aria-label="Diorama collection" class="collection"><div class="section-heading"><span>THE COLLECTION</span><span>${String(worlds.length).padStart(2,'0')} WORLD${worlds.length===1?'':'S'} TO EXPLORE</span></div>${worlds.map((world,index)=>`<button data-world="${index}" class="world-card" type="button" aria-label="Explore ${world.title}"><div class="preview" id="preview-${index}"><span class="loading">Preparing the miniature…</span></div><span class="card-corner">${world.number} / LIVE 3D</span><span class="open-arrow" aria-hidden="true">↗</span><span class="card-caption"><span><small>${world.category}</small><strong>${world.title}</strong><span>${world.subtitle}</span></span><span class="explore">EXPLORE WORLD <b>↗</b></span></span></button>`).join('')}</section><footer><span>BUILT SMALL. MADE TO EXPLORE.</span><span>Real-time 3D · No downloads · Sound off</span></footer></main>`;
  document.querySelector('.wordmark').onclick = e => e.preventDefault();
  for (const [index, world] of worlds.entries()) {
    const preview = document.querySelector(`#preview-${index}`);
    try {
      const runtime = mountWorld(world.definition, {el:preview, paused:true});
      if (!runtime) continue;
      const imageURL = captureThumbnail(runtime, world.definition.still, () => preview.querySelector('canvas').toDataURL('image/png'));
      const image = new Image(); image.src = imageURL; image.alt = ''; image.className = 'thumbnail-image';
      preview.replaceChildren(image); preview.dataset.state = 'thumbnail';
    } catch (error) {
      preview.textContent = 'Preview unavailable. Open the world to try again.';
      preview.dataset.state = 'unavailable'; console.error(error);
    }
  }
  for (const button of document.querySelectorAll('[data-world]')) button.onclick = () => showWorld(worlds[Number(button.dataset.world)]);
  if (focus) document.querySelector('[data-world]')?.focus();
}
function showWorld(world) {
  session.close(); active = null; screen = 'world'; paused = false;
  app.innerHTML = `<main class="world-view"><header class="world-header"><button id="back" class="back" type="button">← <span>Collection</span></button><div><span class="eyebrow">WORLD ${world.number} / MINIATURE</span><h1>${world.title}</h1></div><span class="live-dot">LIVE DIORAMA</span></header><div class="stage-wrap"><div id="stage" aria-label="Interactive harbor scene"></div><span class="scene-label">THE GOLDEN SHIFT<br><small>CONTAINER TERMINAL / 01</small></span></div><div class="toolbar" role="group" aria-label="Scene controls"><div class="play-controls"><button id="pause" type="button">Pause harbor</button><button id="reset" type="button">Reset moment</button></div><label for="finish">LOOK <select id="finish">${FINISHES.map(f=>`<option value="${f}">${f[0].toUpperCase()+f.slice(1)}</option>`).join('')}</select></label><a href="./harbor.html" target="_blank" rel="noopener">Open standalone ↗</a></div><p class="scene-description">${world.definition.description}</p><p class="motion-note">Fixed miniature view · Motion pauses when hidden · Reduced-motion settings respected</p></main>`;
  const stage = document.querySelector('#stage');
  try { active = session.open(world.definition, stage, false); }
  catch (error) { stage.textContent = 'The harbor could not be started. Return to the collection and try again.'; stage.dataset.state = 'unavailable'; console.error(error); }
  document.querySelector('#back').onclick = () => showGallery({focus:true});
  document.querySelector('#pause').onclick = () => { paused = !paused; active?.setPaused(paused); state(); };
  document.querySelector('#reset').onclick = () => active?.seek(world.definition.still);
  document.querySelector('#finish').onchange = e => active?.setFinish(e.target.value);
  for (const selector of ['#reset','#finish']) document.querySelector(selector).disabled = !active;
  state(); document.querySelector('#back').focus();
}
reduced.addEventListener('change', state);
addEventListener('pagehide', () => { session.close(); active = null; });
addEventListener('pageshow', event => { if(event.persisted) showGallery(); });
addEventListener('keydown', event => { if(event.key === 'Escape' && screen === 'world') showGallery({focus:true}); });
if (new URLSearchParams(location.search).has('inspect')) {
  window.__gallery = { open:()=>showWorld(worlds[0]), back:()=>showGallery(), stats:()=>active?.stats() ?? null, seek:t=>active?.seek(t), snapshot:()=>active?.snapshot(), contacts:()=>active?.contacts(), definition:harbor };
}
showGallery();
