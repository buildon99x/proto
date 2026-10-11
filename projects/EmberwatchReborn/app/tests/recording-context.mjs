const addColorStop=function(...v){this.stops.push(v);};
export function recordingContext(id='main'){
 const calls=[],stack=[],data={globalAlpha:1,filter:'none',fillStyle:'#000',strokeStyle:'#000',lineWidth:1,globalCompositeOperation:'source-over'};let path=[];
 const record=(op,args=[])=>calls.push({op,args,path:structuredClone(path),...data});
 const methods={save(){stack.push({...data});},restore(){for(const k of Object.keys(data))delete data[k];Object.assign(data,stack.pop());},beginPath(){path=[];},moveTo(...v){path.push(['moveTo',...v]);},lineTo(...v){path.push(['lineTo',...v]);},ellipse(...v){path.push(['ellipse',...v]);},closePath(){path.push(['closePath']);},stroke(){record('stroke');},fill(...v){record('fill',v);},fillRect(...v){record('fillRect',v);},clearRect(...v){record('clearRect',v);},drawImage(...v){record('image',v);},fillText(...v){record('text',v);},clip(){record('clip');},translate(){},rotate(){},scale(){},setLineDash(){},createRadialGradient(...args){return {args,stops:[],addColorStop};}};
 const ctx=new Proxy(methods,{get:(t,k)=>k in t?t[k]:data[k],set:(_,k,v)=>(data[k]=v,true)});
 return {id,ctx,calls};
}
export function recordingCanvases(){
 const surfaces=[];
 const createCanvas=(width,height)=>{const r=recordingContext('cue-'+surfaces.length),canvas={id:r.id,width,height,getContext:()=>r.ctx};surfaces.push({...r,canvas});return canvas;};
 return {surfaces,createCanvas};
}
