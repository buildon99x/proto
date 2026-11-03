import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

class Element extends EventTarget {
  constructor(){super();this.hidden=false;this.attrs={};this.textContent='';this.focused=0;this.children=[];}
  setAttribute(name,value){this.attrs[name]=value;}
  getAttribute(name){return this.attrs[name];}
  focus(){this.focused++;}
  contains(element){return this===element||this.children.includes(element);}
  click(){this.dispatchEvent(new Event('click'));}
}
class Media extends EventTarget {
  constructor(matches){super();this.matches=matches;}
  change(matches){this.matches=matches;this.dispatchEvent(new Event('change'));}
}
async function fixture(compact=true){
  const module=await import('./mobile-hud.js').catch(()=>({}));
  assert.equal(typeof module.bindCompactCatCard,'function','compact cat card binding must exist');
  const button=new Element(),card=new Element(),position=new Element(),actions=new Element(),media=new Media(compact),document={activeElement:null};
  button.focus=()=>{button.focused++;document.activeElement=button;};
  const dispose=module.bindCompactCatCard(button,[position,actions],card,{window:{matchMedia:()=>media,document}});
  return{button,card,position,actions,media,document,dispose};
}
test('compact card starts collapsed, with an explicit synchronized action toggle',async()=>{
  const f=await fixture();
  assert.equal(f.button.hidden,false);assert.equal(f.position.hidden,true);assert.equal(f.actions.hidden,true);
  assert.equal(f.button.getAttribute('aria-expanded'),'false');assert.equal(f.button.textContent,'놀이 열기');
  f.button.click();assert.equal(f.position.hidden,false);assert.equal(f.actions.hidden,false);
  assert.equal(f.button.getAttribute('aria-expanded'),'true');assert.equal(f.button.textContent,'놀이 접기');
  f.button.click();assert.equal(f.actions.hidden,true);assert.equal(f.button.getAttribute('aria-expanded'),'false');
});
test('desktop remains expanded and resizing restores the chosen compact state',async()=>{
  const f=await fixture(false);assert.equal(f.button.hidden,true);assert.equal(f.position.hidden,false);assert.equal(f.actions.hidden,false);
  f.media.change(true);assert.equal(f.button.hidden,false);assert.equal(f.actions.hidden,true);
  f.button.click();f.media.change(false);assert.equal(f.actions.hidden,false);f.media.change(true);assert.equal(f.actions.hidden,false);
  f.button.click();f.media.change(false);f.media.change(true);assert.equal(f.actions.hidden,true);
});
test('collapsing on resize or Escape never strands focus inside hidden actions',async()=>{
  const f=await fixture(false),action=new Element();f.actions.children.push(action);f.document.activeElement=action;
  f.media.change(true);assert.equal(f.button.focused,1);
  f.button.click();const event=new Event('keydown',{cancelable:true});Object.defineProperty(event,'key',{value:'Escape'});f.card.dispatchEvent(event);
  assert.equal(f.actions.hidden,true);assert.equal(f.button.focused,2);assert.equal(event.defaultPrevented,true);
  f.dispose();f.button.click();assert.equal(f.actions.hidden,true);
});
test('collapsed markup keeps discovery and live feedback outside hidden regions',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<button id="cat-card-toggle"[^>]*aria-controls="cat-position-tools cat-actions"/);
  const card=html.slice(html.indexOf('<section id="cat-card"'),html.indexOf('<div id="joystick"'));
  assert.match(card,/<div id="cat-position-tools" class="position">/);
  assert.match(card,/<div id="cat-actions" class="actions">/);
  assert.ok(card.indexOf('id="cat-activity"')<card.indexOf('id="cat-position-tools"'));
  assert.ok(card.indexOf('id="nearest"')>card.indexOf('id="position" hidden></span></div></div>'));
  assert.ok(card.indexOf('id="nearest"')<card.indexOf('id="cat-actions"'));
});
