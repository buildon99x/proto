// Keep the walking view open on small screens without hiding selection or feedback.
export function bindCompactCatCard(button,panels,card,{window:win=globalThis.window,landscape:tools=null}={}){
  const media=win?.matchMedia?.('(max-width:700px), (pointer:coarse), (max-height:500px) and (max-width:1000px)');
  const landscapeMedia=tools&&win?.matchMedia?.('(max-height:500px) and (min-width:480px) and (max-width:1000px)');
  const homes=tools?[tools.camera,tools.actions].map(node=>({node,parent:node.parentNode,next:node.nextSibling})):[];
  let compactExpanded=false,view='play',landscapeExpanded=false,queued=false,disposed=false;
  const focus=node=>{const target=node&&!node.disabled&&!node.hidden?node:tools?.fallback;target?.focus({preventScroll:true});};
  const update=()=>{
    queued=false;if(disposed)return;
    const compact=Boolean(media?.matches),expanded=!compact||compactExpanded,activeElement=win?.document?.activeElement;
    const wasLandscape=landscapeExpanded,headerFocus=tools?.toolbar.contains(activeElement),panelFocus=panels.some(panel=>panel.contains?.(activeElement))||tools?.camera.contains(activeElement);
    let useLandscape=Boolean(tools&&compact&&expanded&&landscapeMedia?.matches);
    if(useLandscape){
      // Probe the real scroll viewport, including its scrollbar and safe-area width.
      card.dataset.landscapeExpanded='true';tools.toolbar.hidden=false;
      const body=tools.body.getBoundingClientRect(),bounds=card.getBoundingClientRect();
      useLandscape=tools.body.clientWidth>=138&&tools.body.clientHeight>=44&&body.bottom<=bounds.bottom-1;
    }
    if(tools){
      if(useLandscape&&!wasLandscape){
        if(tools.camera.contains(activeElement))view='camera';
        else if(tools.actions.contains(activeElement))view='play';
      }
      card.dataset.landscapeExpanded=String(useLandscape);tools.toolbar.hidden=!useLandscape;tools.pane.hidden=!useLandscape;
      if(useLandscape){for(const {node}of homes)if(node.parentNode!==tools.pane)tools.pane.append(node);}
      else for(const {node,parent,next}of homes)if(node.parentNode!==parent)parent.insertBefore(node,next);
      tools.playButton.setAttribute('aria-pressed',String(view==='play'));tools.cameraButton.setAttribute('aria-pressed',String(view==='camera'));
    }
    button.hidden=!compact||useLandscape;
    for(const panel of panels)panel.hidden=!expanded;
    if(tools){tools.camera.hidden=!expanded||(useLandscape&&view!=='camera');tools.actions.hidden=!expanded||(useLandscape&&view!=='play');}
    button.setAttribute('aria-expanded',String(expanded));button.textContent=expanded?'놀이 접기':'놀이 열기';
    landscapeExpanded=useLandscape;
    if(!expanded&&(panelFocus||headerFocus))focus(button);
    else if(useLandscape&&!wasLandscape){
      if(activeElement===button)focus(view==='play'?tools.playButton:tools.cameraButton);
      else if(panelFocus)focus(activeElement);
    }else if(wasLandscape&&!useLandscape){
      if(headerFocus)focus(compact?button:activeElement===tools.playButton?tools.actionTarget:activeElement===tools.cameraButton?tools.cameraTarget:view==='camera'?tools.cameraTarget:tools.actionTarget);
      else if(panelFocus)focus(activeElement);
    }
    if(useLandscape&&!wasLandscape)tools.body.scrollTop=0;
  };
  const collapse=()=>{compactExpanded=false;view='play';update();focus(button);};
  const toggle=event=>{event.stopPropagation();compactExpanded=!compactExpanded;if(!compactExpanded)view='play';update();};
  const escape=event=>{if(event.key!=='Escape'||!media?.matches||!compactExpanded)return;event.preventDefault();event.stopPropagation();collapse();};
  const selectView=next=>event=>{event.stopPropagation();if(!landscapeExpanded)return;view=next;update();tools.body.scrollTop=0;focus(next==='play'?tools.playButton:tools.cameraButton);};
  const play=selectView('play'),camera=selectView('camera'),close=event=>{event.stopPropagation();if(landscapeExpanded)collapse();};
  const schedule=()=>{if(!queued&&!disposed){queued=true;win.requestAnimationFrame(update);}};
  button.addEventListener('click',toggle);card.addEventListener('keydown',escape);media?.addEventListener('change',update);landscapeMedia?.addEventListener('change',update);
  tools?.playButton.addEventListener('click',play);tools?.cameraButton.addEventListener('click',camera);tools?.closeButton.addEventListener('click',close);win?.addEventListener?.('resize',schedule);
  const observer=tools&&win?.ResizeObserver?new win.ResizeObserver(schedule):null;observer?.observe(card);if(tools)observer?.observe(tools.body);update();
  const dispose=()=>{disposed=true;observer?.disconnect();button.removeEventListener('click',toggle);card.removeEventListener('keydown',escape);media?.removeEventListener('change',update);landscapeMedia?.removeEventListener('change',update);tools?.playButton.removeEventListener('click',play);tools?.cameraButton.removeEventListener('click',camera);tools?.closeButton.removeEventListener('click',close);win?.removeEventListener?.('resize',schedule);};
  dispose.reset=()=>{compactExpanded=false;view='play';update();};
  return dispose;
}
