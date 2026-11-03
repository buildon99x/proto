// Keep the walking view open on small screens without hiding selection or feedback.
export function bindCompactCatCard(button,panels,card,{window:win=globalThis.window}={}){
  const media=win?.matchMedia?.('(max-width:700px), (pointer:coarse), (max-height:500px) and (max-width:1000px)');
  let compactExpanded=false;
  const update=()=>{
    const compact=Boolean(media?.matches),expanded=!compact||compactExpanded;
    button.hidden=!compact;
    if(!expanded&&panels.some(panel=>panel.contains?.(win?.document?.activeElement)))button.focus({preventScroll:true});
    for(const panel of panels)panel.hidden=!expanded;
    button.setAttribute('aria-expanded',String(expanded));
    button.textContent=expanded?'놀이 접기':'놀이 열기';
  };
  const toggle=event=>{event.stopPropagation();compactExpanded=!compactExpanded;update();};
  const escape=event=>{
    if(event.key!=='Escape'||!media?.matches||!compactExpanded)return;
    event.preventDefault();event.stopPropagation();compactExpanded=false;update();button.focus({preventScroll:true});
  };
  button.addEventListener('click',toggle);card.addEventListener('keydown',escape);media?.addEventListener('change',update);update();
  return()=>{button.removeEventListener('click',toggle);card.removeEventListener('keydown',escape);media?.removeEventListener('change',update);};
}
