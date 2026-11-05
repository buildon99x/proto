import {VISUAL_PRESETS} from '../../.agents/skills/diorama-worlds/kit/visual-settings.js';

const QUALITY = [['auto','자동'],['low','낮음'],['balanced','균형'],['high','높음']];
const RANGES = [
 ['exposure','노출',.25,2,.01], ['bloomStrength','블룸 강도',0,.8,.01],
 ['bloomThreshold','블룸 밝기 기준',.5,3,.01], ['bloomRadius','블룸 반경',0,1,.01],
 ['saturation','채도',0,1.5,.01], ['contrast','대비',.5,1.5,.01], ['warmth','따뜻함',-.2,.2,.01],
];
const css = `.visual-controls{display:block;width:100%;min-width:0;max-width:1080px;margin:12px auto 0;padding:0 14px;background:#f2f3ed;border:1px solid #c9c6ba;border-radius:6px;color:#30372e;font:13px Arial,sans-serif;box-sizing:border-box}.visual-controls summary{min-height:44px;box-sizing:border-box;padding:14px 0;cursor:pointer;font-weight:600}.visual-controls .visual-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:10px 20px;padding:8px 0 16px;min-width:0}.visual-controls .visual-label{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;width:auto;min-width:0;max-width:100%;margin:0}.visual-controls .visual-label span{flex:1;min-width:100px}.visual-controls select,.visual-controls input{min-width:44px;min-height:44px;max-width:100%;box-sizing:border-box;font:inherit;color:inherit}.visual-controls select{padding:8px;background:#fffdf7;border:1px solid #bbb5a6;border-radius:4px}.visual-controls input[type=range]{width:100%;margin:0;accent-color:#805436}.visual-controls input[type=checkbox]{margin:0;accent-color:#805436}.visual-controls output{font-variant-numeric:tabular-nums;min-width:40px;text-align:right}.visual-controls :focus-visible{outline:3px solid #a65f36;outline-offset:3px}.visual-controls :disabled{opacity:.5;cursor:default}.visual-controls .visual-status{font-size:12px;line-height:1.6;overflow-wrap:anywhere;max-width:none;margin:0 0 12px;color:#545c4e}.embedded .visual-controls{display:none}`;

/** Visual edits never seek or change playback. All controls stay stable for keyboard users. */
export function attachVisualControls({container, runtime, document=globalThis.document, viewport=globalThis.window}) {
 const root=document.createElement('details');root.className='visual-controls';
 const style=document.createElement('style');style.textContent=css;root.append(style);
 const summary=document.createElement('summary');summary.textContent='비주얼 품질';root.append(summary);
 const status=document.createElement('p');status.className='visual-status';status.setAttribute('role','status');root.append(status);
 const fields=document.createElement('div');fields.className='visual-fields';root.append(fields);
 const controls={},outputs={},listeners=[];let disposed=false;
 function listen(element,event,handler){if(!element?.addEventListener)return;element.addEventListener(event,handler);listeners.push(()=>element.removeEventListener(event,handler));}
 function label(text){const element=document.createElement('label');element.className='visual-label';const caption=document.createElement('span');caption.textContent=text;element.append(caption);fields.append(element);return element;}
 function select(text,options){const parent=label(text),element=document.createElement('select');element.setAttribute('aria-label',text);for(const [value,caption] of options){const option=document.createElement('option');option.value=value;option.textContent=caption;element.append(option);}parent.append(element);return element;}
 function toggle(key,text){const parent=label(text),input=document.createElement('input');input.type='checkbox';input.setAttribute('aria-label',text);parent.append(input);controls[key]=input;listen(input,'change',()=>edit(input,{[key]:input.checked}));}
 const preset=select('프리셋',[['original','원본'],['soft','부드럽게'],['vivid','선명하게'],['custom','직접 설정']]);
 toggle('enabled','비주얼 효과 사용');
 controls.quality=select('품질',QUALITY);controls.toneMapping=select('톤 매핑',[['neutral','Neutral'],['agx','AgX']]);
 toggle('bloomEnabled','블룸 사용');
 for(const [key,text,min,max,step] of RANGES){const parent=label(text),input=document.createElement('input'),output=document.createElement('output');input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.setAttribute('aria-label',text);parent.append(output,input);controls[key]=input;outputs[key]=output;listen(input,'input',()=>edit(input,{[key]:Number(input.value)}));}
 for(const key of ['quality','toneMapping'])listen(controls[key],'change',()=>edit(controls[key],{[key]:controls[key].value}));
 function edit(control,partial){if(disposed||control.disabled)return;runtime.setVisualSettings(partial);refresh();}
 listen(preset,'change',()=>{if(VISUAL_PRESETS[preset.value])edit(preset,VISUAL_PRESETS[preset.value]);});
 function refresh(){
  if(disposed)return;
  const available=Boolean(runtime?.getVisualSettings&&runtime?.setVisualSettings),snapshot=available?runtime.stats():null,settings=available?runtime.getVisualSettings():VISUAL_PRESETS.original;
  const miniature=!snapshot?.finish||snapshot.finish==='miniature',effective=snapshot?.visual?.effective;
  for(const [key,control] of Object.entries(controls)){control.disabled=!available||!miniature;if(control.type==='checkbox')control.checked=Boolean(settings[key]);else control.value=String(settings[key]);if(outputs[key])outputs[key].textContent=String(settings[key]);}
  preset.disabled=!available||!miniature;
  preset.value=Object.entries(VISUAL_PRESETS).find(([,candidate])=>Object.keys(candidate).every(key=>candidate[key]===settings[key]))?.[0]??'custom';
  const quality=QUALITY.find(([value])=>value===effective?.quality)?.[1]??'자동';
  let text='Miniature 표현에서만 적용돼요. ';
  if(!available)text+='3D 사용 불가 · 비주얼 설정을 바꿀 수 없어요.';
  else if(!miniature)text+='현재 표현에는 적용하지 않아요. 선택한 설정은 유지돼요.';
  else {
   text+=settings.enabled?'효과 켜짐':'원본 렌더링 · 효과 꺼짐';
   if(effective)text+=` · 실제 품질: ${quality} · HDR ${effective.hdr?'사용':'미사용'} · 블룸 ${effective.bloom?'사용':'미사용'}`;
   if(effective?.reason && effective.reason!=='original' && effective.reason!=='miniature-only')text+=' · 기기 지원 또는 렌더링 조건에 따라 효과를 제한하거나 기본 렌더링으로 대체해요.';
  }
  status.textContent=text;
 }
 // Runtime notifications arrive after its ResizeObserver/render has settled the profile.
 if(runtime?.onVisualChange){const unsubscribe=runtime.onVisualChange(refresh);if(typeof unsubscribe==='function')listeners.push(unsubscribe);}
 else listen(viewport,'resize',refresh);
 container.append(root);refresh();
 return {root,summary,status,preset,controls,refresh,dispose(){if(disposed)return;disposed=true;for(const remove of listeners)remove();root.remove();}};
}
