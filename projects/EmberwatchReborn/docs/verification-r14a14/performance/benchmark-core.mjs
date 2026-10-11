export async function runBench({roots,createCanvas,loadImage,now=()=>performance.now(),samples=60,afterFrame=()=>{},progress=()=>{}}){
 const summary=values=>{const a=[...values].sort((a,b)=>a-b),n=a.length;return {n,p50:n?a[Math.ceil(n*.5)-1]:null,p95:n?a[Math.ceil(n*.95)-1]:null,max:n?a[n-1]:null,over500:a.filter(x=>x>500).length}};
 const report={measurement:'Isolated production draw-call cost on synthetic, identical scene fixtures. No main loop, input, saves, audio, compositor/display or physical latency acceptance.',samples,rig:{},scenes:[]};
 for(const version of ['a13','a12']){
  const root=roots[version],{ART}=await import(root+'art.js'),{MOTION_ASSETS}=await import(root+'motion.js'),{createVisualRenderer}=await import(root+'visual.js'),{createState}=await import(root+'state.js'),{createBattle}=await import(root+'combat.js'),{getRegion}=await import(root+'world.js');
  const images={motion:{}};
  for(const k of ['environment','hero','enemy'])images[k]=await loadImage(root+ART[k].file);
  images.motion.hero=await loadImage(root+MOTION_ASSETS.hero.file);images.axe=await loadImage(root+'assets/motion-warrior-axe.png');
  if(version==='a13'){
   const {createWarriorRig}=await import(root+'warrior-rig.js'),{createWarriorPresentationRenderer,resolveWarriorPresentation}=await import(root+'warrior-presentation.js');
   let created=0;const factory=(w,h)=>{created++;return createCanvas(w,h)},rig=createWarriorRig(images.hero,{createCanvas:factory}),actor={hp:100,moving:true,walk:3,action:{id:'righteous_hammer',name:'cast',duration:.52,contact:.2288,phase:.4,elapsed:.208}};
   const cold=[];for(let direction=0;direction<4;direction++){const p=resolveWarriorPresentation(actor,0,direction),t=now();rig.render(p.pose,p);cold.push(now()-t);}
   const warm=[];for(let i=0;i<2000;i++){actor.walk=i/60;actor.action.phase=(i%24)/24;const t=now(),p=resolveWarriorPresentation(actor,0,i%4);rig.render(p.pose,p);warm.push(now()-t);}
   let walkingCreated=0;const walking=createWarriorPresentationRenderer(createCanvas(128,128).getContext('2d'),images,{createCanvas:(w,h)=>{walkingCreated++;return createCanvas(w,h)}});let drawn=0;
   for(let i=0;i<2000;i++)if(walking.draw({actor:{hp:100,moving:true,walk:i/60,action:null,block:false},player:true,direction:i%4}))drawn++;
   report.rig={coldByDirectionMs:cold,warm2000:summary(warm),metrics:rig.metrics(),canvasesCreated:created,plainWalking:{drawn,canvasesCreated:walkingCreated,metrics:walking.metrics()}};
   progress({rig:report.rig});
  }
  for(const regionId of ['ash_hamlet','signal_wilderness'])for(const mode of ['walking','guard','hammer-stationary','hammer-moving']){
   const state=createState();state.world.region=regionId;const b=createBattle(state),region=getRegion(regionId),p={...b.p},origin={x:p.x,y:p.y};
   let actorSurfaces=0,floorSurfaces=0;const canvas=createCanvas(1180,757),renderer=createVisualRenderer(canvas.getContext('2d'),ART,images,{createCanvas:(w,h)=>{floorSurfaces++;return createCanvas(w,h)},createActorCanvas:(w,h)=>{actorSurfaces++;return createCanvas(w,h)},createActorCueCanvas:createCanvas});
   const renderState={width:1180,height:757,regionId,map:b.map,p,entities:b.enemies,objects:region.objects.map(o=>({...o,type:o.visualType??o.type})),time:0,cleanView:true,stats:b.stats,classId:'warrior',flashScale:.5};
   const durations=[],rebuilt=[],regular=[];let first=null,metrics;
   for(let i=0;i<samples+8;i++){
    const moving=mode==='walking'||mode==='hammer-moving';p.moving=moving;p.walk=i/6;p.walkPhase=i/24;p.x=origin.x+(moving?i*2:0);p.y=origin.y;p.angle=Math.floor(i/25)%4*Math.PI/2;p.block=mode==='guard';
    p.action=mode.startsWith('hammer')?{id:'righteous_hammer',name:'cast',duration:.52,contact:.2288,phase:(i%24)/24,elapsed:(i%24)/24*.52}:null;
    renderState.time=i/60;const t=now();metrics=renderer.render(renderState);const ms=now()-t;afterFrame(canvas);if(first===null)first=ms;if(i>=8){durations.push(ms);(metrics.floorCache.rebuilt?rebuilt:regular).push(ms);}
   }
   const row={version,regionId,mode,firstMs:first,all:summary(durations),floorRebuild:summary(rebuilt),steadyFloor:summary(regular),actorSurfaces,floorSurfaces,finalMetrics:metrics};report.scenes.push(row);progress(row);
  }
 }
 return report;
}
