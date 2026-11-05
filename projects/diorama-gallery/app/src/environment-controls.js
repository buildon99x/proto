const WEATHER = [['clear', '맑은 날'], ['cloudy', '흐린 날'], ['rain', '비오는 날'], ['sandstorm', '모래폭풍']];
const TIMES = [['day', '낮'], ['night', '밤 · 별과 달']];
const css = `.environment-controls{display:flex;align-items:center;flex-wrap:wrap;gap:10px 20px;width:100%;min-width:0;max-width:1080px;margin:10px auto 0;padding:12px 16px;background:#f2f3ed;border:1px solid #c9c6ba;border-radius:6px;color:#30372e;font:12px Arial,sans-serif;box-sizing:border-box}.environment-controls .environment-label{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0;max-width:100%;width:auto}.environment-controls select,.environment-controls input,.environment-controls button,.environment-controls summary{min-width:44px;min-height:44px;max-width:100%;padding:6px 10px;font:inherit;color:inherit;background:#fffdf7;border:1px solid #bbb5a6;border-radius:4px;box-sizing:border-box}.environment-controls :focus-visible{outline:3px solid #a65f36;outline-offset:3px}.environment-controls :disabled{cursor:default;opacity:.5}.environment-status{color:#6b6b5b;line-height:1.5}.environment-editor{width:100%;min-width:0}.environment-editor summary{display:list-item;cursor:pointer;padding:14px 10px}.environment-rows{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:8px;margin:12px 0}.environment-event{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px;border:1px solid #d0ccbe;border-radius:4px}.environment-event input{width:92px}.environment-event select{flex:1}.environment-markers{position:relative;list-style:none;height:68px;padding:0;margin:12px 14px;background:linear-gradient(transparent 20px,#bbb5a6 20px,#bbb5a6 22px,transparent 22px,transparent 46px,#bbb5a6 46px,#bbb5a6 48px,transparent 48px)}.environment-marker{position:absolute;top:8px;width:18px;height:18px;transform:translateX(-50%);border-radius:50%;background:#a65f36;border:2px solid #fffdf7;box-sizing:border-box}.environment-marker.daylight{top:34px;background:#405a7b}.environment-markers.daylight-only{height:40px;background:linear-gradient(transparent 20px,#bbb5a6 20px,#bbb5a6 22px,transparent 22px)}.environment-markers.daylight-only .environment-marker.daylight{top:8px}.environment-error{color:#963719;width:100%}.environment-actions{display:flex;flex-wrap:wrap;gap:8px}.embedded .environment-controls{display:none}`;

/** Read the existing clock. Editing this track never seeks, pauses or changes speed. */
export function attachEnvironmentControls({container, runtime, definition, document = globalThis.document, requestFrame = callback => globalThis.requestAnimationFrame?.(callback), cancelFrame = id => globalThis.cancelAnimationFrame?.(id)}) {
 if (!definition.environment) return null;
 const weatherTimeline=definition.weatherTimeline!==false;
 const weatherOptions=definition.weatherOptions??WEATHER, TYPES=weatherTimeline?[...weatherOptions,...TIMES]:TIMES;
 const root = document.createElement('section'); root.className = 'environment-controls'; root.setAttribute('aria-label', '날씨와 낮과 밤');
 const style = document.createElement('style'); style.textContent = css; root.append(style);
 const listeners=[], rowByID=new Map(), selectCaptions=new WeakMap(); let rowListeners=[], rows=[], disposed=false, frame=null, signature=null, nextID=1;
 function listen(element,event,handler,collection=listeners) { element.addEventListener(event,handler); collection.push(()=>element.removeEventListener(event,handler)); }
 function choice(labelText, options, parent=root) {
  const label=document.createElement('label'); label.className='environment-label'; const caption=document.createElement('span'); caption.textContent=labelText;
  const select=document.createElement('select'); select.setAttribute('aria-label',labelText);
  for (const [value,text] of options) { const option=document.createElement('option'); option.value=value; option.textContent=text; select.append(option); }
  label.append(caption,select); selectCaptions.set(select,caption); parent.append(label); return select;
 }
 function button(text,parent) { const result=document.createElement('button');result.type='button';result.textContent=text;parent.append(result);return result; }
 const mode=choice(weatherTimeline?'환경 재생':'낮과 밤 재생',[['automatic','자동 타임라인'],['manual','직접 선택']]);
 const weather=choice('날씨',weatherOptions), timeOfDay=choice('낮과 밤',TIMES);
 const status=document.createElement('span'); status.className='environment-status'; status.setAttribute('role','status');root.append(status);
 const editor=document.createElement('details');editor.className='environment-editor';root.append(editor);
 const summary=document.createElement('summary');summary.textContent=weatherTimeline?'날씨 · 낮과 밤 타임라인 편집':'낮과 밤 타임라인 편집';editor.append(summary);
 const help=document.createElement('p');help.textContent='이벤트 시간에 선택한 상태가 됩니다. 사이 구간과 반복 끝은 부드럽게 연결돼요. 같은 종류의 같은 시간 이벤트는 마지막 행이 우선합니다. 직접 선택해도 편집 내용은 유지돼요.';editor.append(help);
 if (!weatherTimeline) help.textContent='날씨는 직접 선택한 상태로 유지돼요. 이 타임라인은 낮과 밤만 바꾸며, 이벤트 사이와 반복 끝은 부드럽게 연결돼요. 낮과 밤을 직접 선택해도 편집 내용은 유지돼요.';
 const markers=document.createElement('ol');markers.className=`environment-markers${weatherTimeline?'':' daylight-only'}`;markers.setAttribute('aria-label',weatherTimeline?'환경 타임라인 위치 · 위: 날씨, 아래: 낮과 밤':'낮과 밤 타임라인 위치');editor.append(markers);
 const rowContainer=document.createElement('div');rowContainer.className='environment-rows';editor.append(rowContainer);
 const actions=document.createElement('div');actions.className='environment-actions';editor.append(actions);
 const add=button('이벤트 추가',actions), reset=button('기본 세트 복원',actions);
 const error=document.createElement('span');error.className='environment-error';error.setAttribute('role','alert');editor.append(error);container.append(root);
 const canEdit=()=>Boolean(runtime?.setEnvironmentTrack && runtime?.getEnvironmentTrack && runtime?.stats().environment && runtime.getEnvironmentTrack() !== null);
 function edit(action) {
  if (disposed || !canEdit()) return;
  try { action(); error.textContent=''; } catch { error.textContent=`이벤트 시간은 0초 이상 ${definition.duration}초 미만이어야 하며, 알려진 종류와 고유 ID가 필요해요.`; }
  refresh();
 }
 function renderRows(track) {
  // Retain controls by event ID. Rebuilding a focused input discards focus, caret and drafts.
  const focused=document.activeElement, focusedIndex=rows.findIndex(row=>[row.time,row.type,row.remove].includes(focused));
  const focusedRow=rows[focusedIndex], focusedField=focusedRow&&['time','type','remove'].find(field=>focusedRow[field]===focused);
  const ids=new Set(track.map(event=>event.id));
  for (const row of rows) if (!ids.has(row.id)) {
   for (const remove of row.listeners) remove();row.element.remove();rowByID.delete(row.id);
  }
  const nextRows=[], nextMarkers=[];
  track.forEach((event,index)=>{
   let row=rowByID.get(event.id);
   if (!row) {
    const element=document.createElement('div');element.className='environment-event';
    const label=document.createElement('label'), caption=document.createElement('span'), time=document.createElement('input');
    time.type='number';time.min='0';time.max=String(definition.duration-.001);time.step='any';label.append(caption,time);element.append(label);
    const type=choice('',TYPES,element), remove=button('제거',element), marker=document.createElement('li');
    row={id:event.id,element,caption,time,type,remove,marker,listeners:[],event:null};
    listen(time,'change',()=>edit(()=>{if (!time.value.trim()) throw new Error('Missing time'); runtime.updateEnvironmentEvent(event.id,{time:Number(time.value)});}),row.listeners);
    listen(type,'change',()=>edit(()=>runtime.updateEnvironmentEvent(event.id,{type:type.value})),row.listeners);
    listen(remove,'click',()=>edit(()=>runtime.removeEnvironmentEvent(event.id)),row.listeners);
    rowByID.set(event.id,row);
   }
   const {time,type,remove,marker}=row;
   row.caption.textContent=`${index+1}. 초`;time.setAttribute('aria-label',`환경 이벤트 ${index+1} 시간 (초)`);
   type.setAttribute('aria-label',`환경 이벤트 ${index+1} 종류`);selectCaptions.get(type).textContent=`환경 이벤트 ${index+1} 종류`;remove.setAttribute('aria-label',`환경 이벤트 ${index+1} 제거`);
   // Do not overwrite a draft when a different event changes or while polling.
   if (!row.event || (row.event.time!==event.time && Number(time.value)!==event.time)) time.value=String(Number(event.time.toFixed(3)));
   if (!row.event || row.event.type!==event.type) { if(type.value!==event.type)type.value=event.type; }
   row.event={...event};
   if (rowContainer.children[index]!==row.element) rowContainer.insertBefore(row.element,rowContainer.children[index]??null);
   nextRows.push(row);
   marker.className=`environment-marker${TIMES.some(([value])=>value===event.type)?' daylight':''}`;
   marker.style ??= {};marker.style.left=`${event.time/definition.duration*100}%`;
   const name=TYPES.find(([value])=>value===event.type)?.[1]??event.type;marker.title=`${Number(event.time.toFixed(3))}초 · ${name}`;marker.setAttribute('aria-label',marker.title);nextMarkers.push(marker);
  });
  rows=nextRows;rowListeners=rows.flatMap(row=>row.listeners);markers.replaceChildren(...nextMarkers);
  if (focusedRow && document.activeElement!==focused) {
   // A removed row chooses its next neighbor, then the previous row, then Add.
   const survivor=rowByID.get(focusedRow.id), target=survivor?.[focusedField]??rows[Math.min(focusedIndex,rows.length-1)]?.time??add;
   target.focus();
  }
 }
 function refresh() {
  if (disposed) return;
  const snapshot=runtime?.stats(), state=snapshot?.environment, available=Boolean(state && runtime?.setEnvironment);
  weather.disabled=timeOfDay.disabled=!available; mode.disabled=add.disabled=reset.disabled=!canEdit();
  weather.value=state?.weather??'clear';timeOfDay.value=state?.timeOfDay??'day';mode.value=snapshot?.environmentMode??'manual';
  const name=weatherOptions.find(([value])=>value===state?.weather)?.[1], daylight=TIMES.find(([value])=>value===state?.timeOfDay)?.[1];
  const text=available?`${weatherTimeline?'':'날씨 직접 선택 · 낮과 밤 '}${mode.value==='automatic'?'자동 타임라인':'직접 선택'} · 현재 ${name} · ${daylight}`:'3D 사용 불가 · 날씨와 낮과 밤을 바꿀 수 없어요.';
  if(status.textContent!==text)status.textContent=text;
  const track=canEdit()?runtime.getEnvironmentTrack():[], nextSignature=JSON.stringify(track);
  if(signature!==nextSignature){signature=nextSignature;renderRows(track);}
 }
 listen(weather,'change',()=>{if(disposed||weather.disabled)return;if(weatherOptions.some(([value])=>value===weather.value))runtime.setEnvironment({weather:weather.value});refresh();});
 listen(timeOfDay,'change',()=>{if(disposed||timeOfDay.disabled)return;if(TIMES.some(([value])=>value===timeOfDay.value))runtime.setEnvironment({timeOfDay:timeOfDay.value});refresh();});
 listen(mode,'change',()=>edit(()=>runtime.setEnvironmentMode(mode.value)));
 listen(add,'click',()=>edit(()=>{const track=runtime.getEnvironmentTrack();let id;do{id=`environment-custom-${nextID++}`;}while(track.some(event=>event.id===id));runtime.addEnvironmentEvent({id,time:Math.max(0,Math.min(definition.duration-.001,runtime.stats().time)),type:weatherTimeline?'clear':'day'});}));
 listen(reset,'click',()=>edit(()=>runtime.resetEnvironmentTrack()));
 function poll(){if(disposed)return;refresh();frame=requestFrame(poll);}
 refresh();if(canEdit())frame=requestFrame(poll);
 return {weather,timeOfDay,mode,status,markers,add,reset,error,get rows(){return rows;},refresh,dispose(){
  if(disposed)return;disposed=true;if(frame!==null&&frame!==undefined)cancelFrame(frame);
  for(const remove of [...listeners,...rowListeners])remove();root.remove();
 }};
}
