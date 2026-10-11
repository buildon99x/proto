// Focus ownership is presentation state only. It never reads or writes game,
// binding or save state, and nested panels retain their original return target.
const returnTargets=new WeakMap(),resumedTriggers=new WeakMap();
const focusableSelector='button:not([disabled]),a[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
function usable(element){
 if(!element||typeof element.focus!=='function'||['BODY','HTML'].includes(element.tagName)||element.disabled||element.hidden||element.isConnected===false||element.matches?.(':disabled'))return false;
 if(element.closest?.('[hidden],[inert],[aria-hidden="true"]'))return false;
 // A closed details exposes only its first summary, even if a DOM boundary
 // probe or a browser quirk reports rectangles for the collapsed descendants.
 for(let parent=element.parentElement;parent;parent=parent.parentElement){
  if(parent.tagName==='DETAILS'&&!parent.open){
   const summary=Array.from(parent.children??[]).find(child=>child.tagName==='SUMMARY');
   if(!summary||summary!==element&&!summary.contains?.(element))return false;
  }
 }
 if(element.getClientRects&&element.getClientRects().length===0)return false;
 const style=element.ownerDocument?.defaultView?.getComputedStyle?.(element);
 return style?.visibility!=='hidden'&&style?.visibility!=='collapse'&&style?.display!=='none';
}
function controls(modal){
 return Array.from(modal.querySelectorAll?.(focusableSelector)??[])
  .filter(element=>usable(element)&&(element.tabIndex??0)>=0)
  .map((element,index)=>({element,index,order:element.tabIndex>0?element.tabIndex:Infinity}))
  .sort((a,b)=>a.order-b.order||a.index-b.index).map(row=>row.element);
}
function focusVisible(element){
 if(!usable(element))return false;
 try{element.focus({preventScroll:false});}catch{return false;}
 if(element.ownerDocument&&'activeElement' in element.ownerDocument&&element.ownerDocument.activeElement!==element)return false;
 element.scrollIntoView?.({block:'nearest',inline:'nearest'});
 return true;
}
export function rememberDialogTrigger(modal,trigger){
 if(modal.hidden){resumedTriggers.delete(modal);returnTargets.set(modal,usable(trigger)&&!modal.contains?.(trigger)?trigger:null);}
}
export function focusDialog(modal){
 const preferred=modal.querySelector?.('[data-action="close"]');
 const first=controls(modal)[0]??modal.querySelector?.(focusableSelector);
 const panel=modal.querySelector?.('.panel');
 return focusVisible(preferred)||focusVisible(first)||focusVisible(panel);
}
export function restoreDialogFocus(modal,fallback){
 const trigger=returnTargets.get(modal);returnTargets.delete(modal);resumedTriggers.delete(modal);
 const target=focusVisible(trigger)?trigger:focusVisible(fallback)?fallback:null;
 if(target!==fallback&&target?.tagName==='BUTTON'&&target.closest?.('#hud'))resumedTriggers.set(modal,target);
 return !!target;
}
// Restoring the opener must not strand movement on a UI button. Only that exact
// restored HUD button may hand one fresh configured game key to the canvas.
// Native button/navigation keys and browser shortcuts keep their usual meaning.
export function handoffDialogGameFocus(modal,event,canvas,{active=false,configured=()=>false}={}){
 const trigger=resumedTriggers.get(modal);
 if(!active||!modal.hidden||!trigger||event.target!==trigger||modal.ownerDocument?.activeElement!==trigger||!usable(trigger)||event.repeat||event.ctrlKey||event.altKey||event.metaKey||['Enter','NumpadEnter','Space','Tab','Escape'].includes(event.code)||!configured())return false;
 resumedTriggers.delete(modal);return focusVisible(canvas);
}
export function trapDialogTab(modal,event){
 if(modal.hidden||event.code!=='Tab'||event.ctrlKey||event.altKey||event.metaKey)return false;
 const items=controls(modal),active=modal.ownerDocument?.activeElement??event.target;
 if(!items.length){event.preventDefault();focusVisible(modal.querySelector?.('.panel'));return true;}
 const index=items.indexOf(active);
 if(index<0||event.shiftKey&&index===0||!event.shiftKey&&index===items.length-1){
  event.preventDefault();focusVisible(event.shiftKey?items.at(-1):items[0]);return true;
 }
 return false;
}
export function containDialogFocus(modal,event){
 if(modal.hidden){if(event.target!==resumedTriggers.get(modal))resumedTriggers.delete(modal);return false;}
 if(!modal.contains||modal.contains(event.target))return false;
 return focusDialog(modal);
}
