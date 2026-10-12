import {drawStormBells,drawStormEffect} from './storm-presentation.js';
import {drawCrusherPrimed} from './crusher-presentation.js';
import {createWarriorPresentationRenderer} from './warrior-presentation.js';
import {drawWarriorHammer} from './warrior-projectile-presentation.js';
import {enemyReactionPose,drawEnemyReaction,drawEnemyDeathFeedback} from './enemy-reaction.js';
import {drawTownPortal} from './town-portal-presentation.js';
import {drawPoeGroundFeedback,mobilityMotion} from './poe-presentation.js';
import {createSignalBodyContourCache,signalBodyContourAllowed,SIGNAL_CONTOUR_STYLE} from './signal-body-contour.js';
import {isWildernessScene,wildernessCoverSegments,wildernessOpenFloor,WILDERNESS_SCENE_STYLE,wildernessRolePresentation,drawWildernessRoleLabel} from './wilderness-readability.js';
import {isBattlefieldScene,battlefieldCoverSegments,battlefieldOpenFloor,BATTLEFIELD_SCENE_STYLE,battlefieldRolePresentation,drawBattlefieldRoleLabel} from './battlefield-readability.js';
import {createOnslaughtPresentationTracker,expertFootprint,expertStatusHints,drawExpertFloor,drawExpertHints} from './expert-presentation.js';
import {isTombScene,tombCoverSegments,tombOpenFloor,TOMB_SCENE_STYLE,tombRolePresentation,tombGlyphLines,TOMB_MARK_STYLE,WARD_LINES} from './tomb-readability.js';
import {fireAreaOutline,FIRE_AREA_STYLE} from './fire-area-presentation.js';
import {combatActorOpacity,localPassageBounds,nearbyFloorEdges} from './combat-readability.js';
import {createMotionRenderer} from './motion.js';
import {isFurnaceScene,furnaceCoverSegments,furnaceOpenFloor,furnaceFloorBand,FURNACE_SCENE_STYLE} from './furnace-readability.js';
import {signalRolePresentation,signalOpenPassages,signalPassageTickLines,SIGNAL_MARK_STYLE,signalWallFootings,signalWallFootingLines,SIGNAL_WALL_STYLE} from './signal-readability.js';
import {SIGNAL_REGION} from './signal-content.js';
const actorRole=(actor,region)=>wildernessRolePresentation(actor,region)??battlefieldRolePresentation(actor,region)??tombRolePresentation(actor,region)??signalRolePresentation(actor,region);
// Original generated-art renderer. Shared by the browser and explicitly labeled
// offscreen art checks; it does not alter simulation state or save data.
export const ISO={x:1,y:.53,tile:32,zoom:1.26};
export function projectWorld(x,y){return {x:(x-y)*ISO.x,y:(x+y)*ISO.y};}
export function screenMovement(dx,dy){return {x:dx/(2*ISO.x)+dy/(2*ISO.y),y:-dx/(2*ISO.x)+dy/(2*ISO.y)};}
export function screenToWorld(x,y,p,w,h,zoom=ISO.zoom){let v=screenMovement((x-w*.5)/zoom,(y-h*.55)/zoom);return {x:p.x+v.x,y:p.y+v.y};}
export function spriteDirection(angle){let v=projectWorld(Math.cos(angle),Math.sin(angle));if(Math.abs(v.x)>Math.abs(v.y)*1.2)return v.x<0?1:2;return v.y<0?3:0;}
export function animationFrame(actor,time,player=false){if(!player&&(actor.dead||actor.hp<=0||actor.stun>0))return 0;if(actor.dashTime>0)return 1;if(player&&actor.attack>.16||!player&&['windup','charge'].includes(actor.state))return 3;if(actor.moving||!player&&actor.active&&actor.state==='idle')return 1+(Math.floor((actor.walk||time*7)*.75)%2);return 0;}

export function telegraphOutline(shape,segments=40){let points=[];if(shape.type==='line'){let angle=Math.atan2(shape.y2-shape.y,shape.x2-shape.x),r=shape.width/2;for(let i=0;i<=segments/2;i++){let a=angle-Math.PI/2+i/(segments/2)*Math.PI;points.push({x:shape.x2+Math.cos(a)*r,y:shape.y2+Math.sin(a)*r});}for(let i=0;i<=segments/2;i++){let a=angle+Math.PI/2+i/(segments/2)*Math.PI;points.push({x:shape.x+Math.cos(a)*r,y:shape.y+Math.sin(a)*r});}}else if(shape.type==='cone'){points.push({x:shape.x,y:shape.y});for(let i=0;i<=segments;i++){let a=shape.angle-shape.halfAngle+2*shape.halfAngle*i/segments;points.push({x:shape.x+Math.cos(a)*shape.r,y:shape.y+Math.sin(a)*shape.r});}}else{for(let i=0;i<=segments;i++){let a=i/segments*Math.PI*2;points.push({x:shape.x+Math.cos(a)*shape.r,y:shape.y+Math.sin(a)*shape.r});}}return points;}
// Released projectile lanes get only a small open muzzle chevron. Real area
// attacks retain their committed outline; neither cue defines hit detection.
export function enemyReleaseOutline(shape){
 if(shape.type!=='line')return telegraphOutline(shape);
 const dx=shape.x2-shape.x,dy=shape.y2-shape.y,length=Math.min(24,Math.hypot(dx,dy)),angle=Math.atan2(dy,dx),width=Math.min(6,shape.width/2);
 const point=(forward,side)=>({x:shape.x+Math.cos(angle)*forward-Math.sin(angle)*side,y:shape.y+Math.sin(angle)*forward+Math.cos(angle)*side});
 return [point(length*.35,-width),point(length,0),point(length*.35,width)];
}
const hash=(x,y)=>{let n=Math.imul(x+313,374761393)^Math.imul(y+77,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n^(n>>>16))>>>0;};
// At most one viewport-sized floor surface; never allocate a whole-map canvas.
export const FLOOR_CACHE={guard:160,maxPixels:6_000_000};
function browserFloorCanvas(width,height){
 if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(width,height);
 if(typeof document!=='undefined'&&document.createElement){let canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas;}
 return null;
}
// Screen-space art bounds plus world-depth order, limited to tall architecture.
// Protected rectangles are living nearby combatants and their visible tells.
export function foregroundAlpha(drawable,region,protectedBounds){
 if(!region||drawable.o?.broken||!(drawable.type==='wall'||['pillar','statue','arch'].includes(drawable.key)))return 1;
 const scale=drawable.width/region.w,vertical=scale*(drawable.type==='wall'?1.25:1),left=Math.round(drawable.x-region.ax*scale),top=Math.round(drawable.y-region.ay*vertical),right=left+region.w*scale,bottom=top+region.h*vertical;
 const overlaps=protectedBounds.some(a=>drawable.depth>a.depth&&left<a.right&&right>a.left&&top<a.bottom&&bottom>a.top);
 return overlaps?(drawable.type==='wall'?.22:.3):1;
}
export function createVisualRenderer(ctx,manifest,images,options={}){
 const env=manifest.environment.sprites,motionRenderer=createMotionRenderer(ctx,manifest,images),warriorRenderer=createWarriorPresentationRenderer(ctx,images,{createCanvas:options.createActorCanvas===undefined?browserFloorCanvas:options.createActorCanvas}),onslaughtTracker=createOnslaughtPresentationTracker(),canvasFactory=options.createCanvas===undefined?browserFloorCanvas:options.createCanvas;let lastMetrics={},floorCache=null,floorBuilds=0;
 const keeperContour=createSignalBodyContourCache(options.createActorCueCanvas===undefined?browserFloorCanvas:options.createActorCueCanvas,ctx);
 function prepareFloorCache(w,h,offset,map){
  const guard=FLOOR_CACHE.guard,width=Math.ceil(w)+guard*2,height=Math.ceil(h)+guard*2;
  if(!canvasFactory||width*height>FLOOR_CACHE.maxPixels){floorCache=null;return null;}
  try{
   if(!floorCache||floorCache.width!==width||floorCache.height!==height){
    const canvas=canvasFactory(width,height),context=canvas?.getContext?.('2d');
    // Tiny mock canvases and environments without a second surface keep the
    // direct path. A failed optional cache must never hide the level floor.
    if(!context||context===ctx||typeof context.clearRect!=='function')return null;
    canvas.width=width;canvas.height=height;floorCache={canvas,context,width,height,key:null};
   }
   if(floorCache.map!==map||floorCache.image!==images.environment||floorCache.zoom!==ISO.zoom||!floorCache.offset||Math.abs(offset.x-floorCache.offset.x)>guard*.6||Math.abs(offset.y-floorCache.offset.y)>guard*.6){floorCache.map=map;floorCache.image=images.environment;floorCache.zoom=ISO.zoom;floorCache.offset={...offset};floorCache.key=null;}
   return floorCache;
  }catch{floorCache=null;return null;}
 }
 function floorTile(target,x,y,offset){
  const zoom=ISO.zoom,pos=projectWorld((x+.5)*32,(y+.5)*32),bx=Math.floor(x/2)*2,by=Math.floor(y/2)*2,block=projectWorld((bx+1)*32,(by+1)*32),r=env['floor'+hash(bx,by)%4];
  if(!r||!images.environment)return;
  pos.x=pos.x*zoom+offset.x;pos.y=pos.y*zoom+offset.y;block.x=block.x*zoom+offset.x;block.y=block.y*zoom+offset.y;
  // Keep the existing diamond, atlas sampling and 2×2 block placement exactly.
  const k=139*zoom/r.w;target.save();target.beginPath();target.moveTo(pos.x,pos.y-17.1*zoom);target.lineTo(pos.x+32.3*zoom,pos.y);target.lineTo(pos.x,pos.y+17.1*zoom);target.lineTo(pos.x-32.3*zoom,pos.y);target.closePath();target.clip();target.drawImage(images.environment,r.x,r.y,r.w,r.h,Math.round(block.x-r.ax*k),Math.round(block.y-r.ay*k),r.w*k,r.h*k);target.restore();
 }
 function sprite(key,x,y,size,options={}){let r=env[key];if(!r||!images.environment)return;let k=size/r.w,ky=k*(options.yScale||1);ctx.save();ctx.globalAlpha=options.alpha??1;if(options.filter)ctx.filter=options.filter;ctx.drawImage(images.environment,r.x,r.y,r.w,r.h,Math.round(x-r.ax*k),Math.round(y-r.ay*ky),r.w*k,r.h*ky);ctx.restore();}
 function glow(x,y,r,color,alpha=1){ctx.save();ctx.globalAlpha=alpha;let g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(.35,color+'55');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
 function label(s,x,y,size=11,color='#dfd5b9'){ctx.font=`${size}px EmberwatchKorean, sans-serif`;ctx.textAlign='center';ctx.fillStyle='#111425';ctx.fillText(s,x+1,y+2);ctx.fillStyle=color;ctx.fillText(s,x,y);}
 function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
 function render(state){const {width:w,height:h,map,p,entities:allEntities=[],objects:allObjects=[],loot=[],areas=[],banner=null,shots=[],effects=[],floaters=[],seen,time=0,shake=0,reduced=false,stats,classId='warrior',cleanView=false}=state;const entities=state.sceneVisibility?allEntities.filter(state.sceneVisibility.entityVisible):allEntities,objects=state.sceneVisibility?allObjects.filter(state.sceneVisibility.objectVisible):allObjects;const zoom=ISO.zoom,focus=projectWorld(p.x,p.y),offset={x:w*.5-focus.x*zoom,y:h*.55-focus.y*zoom},toScreen=o=>{let q=projectWorld(o.x,o.y);return {x:q.x*zoom+offset.x,y:q.y*zoom+offset.y};},visible=(x,y)=>!seen||seen[y]?.[x];ctx.save();ctx.imageSmoothingEnabled=false;ctx.fillStyle='#17192f';ctx.fillRect(0,0,w,h);ctx.translate(Math.sin(time*133)*shake*.4,Math.cos(time*117)*shake*.4);let count=0,fadedForeground=0,draw=[],lights=[];const furnaceScene=isFurnaceScene(state.regionId),tombScene=isTombScene(state.regionId),battlefieldScene=isBattlefieldScene(state.regionId),wildernessScene=isWildernessScene(state.regionId),signalScene=state.regionId===SIGNAL_REGION,lowScene=furnaceScene||tombScene||battlefieldScene||wildernessScene,onslaughtCue=onslaughtTracker(state);
 // Only static floor pixels are cached. Actors, rubble, telegraphs and light
 // remain in their existing depth/compositing order. Recompute the exact tile
 // membership each frame, so in-place fog reveals/removals cannot go stale.
 const cache=prepareFloorCache(w,h,offset,map),floorTiles=[],guard=FLOOR_CACHE.guard;let floorKey=map.w+':'+map.h+':',floorRebuilt=false;
 for(let sum=0;sum<map.w+map.h;sum++)for(let y=Math.max(0,sum-map.w+1);y<map.h&&y<=sum;y++){let x=sum-y;if(x<0||x>=map.w||!map.tiles[y][x]||!visible(x,y))continue;let pos=toScreen({x:(x+.5)*32,y:(y+.5)*32});
  if(cache){let cx=pos.x-offset.x+cache.offset.x+guard,cy=pos.y-offset.y+cache.offset.y+guard;if(cx>=-90&&cx<=cache.width+90&&cy>=-120&&cy<=cache.height+160){floorTiles.push([x,y]);floorKey+=(y*map.w+x)+',';}}
  if(pos.x<-90||pos.x>w+90||pos.y<-120||pos.y>h+160)continue;
  if(!cache)floorTile(ctx,x,y,offset);count++;
  let n=hash(x,y),edge=!map.tiles[y-1]?.[x]||!map.tiles[y]?.[x-1];if(!lowScene&&edge&&n%5===0)draw.push({depth:(x+y+1)*32,type:'decor',key:'rubble',x:pos.x,y:pos.y,width:(24+n%20)*zoom});
 }
 if(cache){
  if(cache.key!==floorKey){cache.context.fillStyle='#17192f';cache.context.fillRect(0,0,cache.width,cache.height);cache.context.imageSmoothingEnabled=false;let origin={x:cache.offset.x+guard,y:cache.offset.y+guard};for(let [x,y] of floorTiles)floorTile(cache.context,x,y,origin);cache.key=floorKey;floorBuilds++;floorRebuilt=true;}
  const padding=shake?Math.min(guard*.4,Math.ceil(Math.abs(shake)*.4)+2):0;
  ctx.drawImage(cache.canvas,guard-offset.x+cache.offset.x-padding,guard-offset.y+cache.offset.y-padding,w+padding*2,h+padding*2,-padding,-padding,w+padding*2,h+padding*2);
 }
 // Opted-in F/T/B/W low masonry stays below actors and danger. It follows
 // actual tile edges, never projected quest progression or decorative doors.
 if(lowScene){
  const style=wildernessScene?WILDERNESS_SCENE_STYLE:battlefieldScene?BATTLEFIELD_SCENE_STYLE:tombScene?TOMB_SCENE_STYLE:FURNACE_SCENE_STYLE,cover=(wildernessScene?wildernessCoverSegments:battlefieldScene?battlefieldCoverSegments:tombScene?tombCoverSegments:furnaceCoverSegments)(state.regionId,map,seen);
  for(const segment of cover){
   const pos=toScreen(segment);if(pos.x<-70||pos.x>w+70||pos.y<-50||pos.y>h+70)continue;
   ctx.save();ctx.translate(pos.x,pos.y+style.coverFootOffset*zoom);if(segment.flipX)ctx.scale(-1,1);
   sprite(style.coverKey,0,0,style.coverWidth*zoom,{yScale:style.coverYScale});ctx.restore();
  }
  ctx.save();ctx.strokeStyle=style.edgeColor;ctx.globalAlpha=style.edgeAlpha;ctx.lineWidth=style.edgeWidth;ctx.beginPath();
  for(const segment of cover){const [a,b]=segment.edge.map(toScreen);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.stroke();ctx.restore();
  for(const passage of (wildernessScene?wildernessOpenFloor:battlefieldScene?battlefieldOpenFloor:tombScene?tombOpenFloor:furnaceOpenFloor)(state.regionId,map,p,seen))for(const tile of passage.tiles){
   const band=furnaceFloorBand(tile).map(toScreen);ctx.save();ctx.beginPath();band.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();
   ctx.fillStyle=style.passageFill;ctx.globalAlpha=style.passageFillAlpha;ctx.fill();
   ctx.beginPath();for(const [a,b] of [[band[0],band[1]],[band[3],band[2]]]){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}
   ctx.strokeStyle=style.passageEdge;ctx.globalAlpha=style.passageEdgeAlpha;ctx.lineWidth=style.passageEdgeWidth;ctx.stroke();ctx.restore();
  }
 }
 // S keeps its tall architecture/cutaways, with a static capped footing on
 // only connected nearby solid edges. Ground cues precede loot, feet and tells.
 if(signalScene){
  const rails=signalWallFootingLines(signalWallFootings(state.regionId,map,p,seen));
  if(rails.length){ctx.save();ctx.beginPath();
   for(const rail of rails){rail.map(toScreen).forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();}
   ctx.strokeStyle=SIGNAL_WALL_STYLE.keyColor;ctx.globalAlpha=SIGNAL_WALL_STYLE.keyAlpha;ctx.lineWidth=SIGNAL_WALL_STYLE.keyWidth;ctx.stroke();
   ctx.strokeStyle=SIGNAL_WALL_STYLE.color;ctx.globalAlpha=SIGNAL_WALL_STYLE.alpha;ctx.lineWidth=SIGNAL_WALL_STYLE.width;ctx.stroke();ctx.restore();
  }
 }
 // Quiet S role/threshold marks are a floor layer. Loot, danger warnings and
 // actors are drawn later, so these cues cannot paint over tactical information.
 drawPoeGroundFeedback(ctx,{player:p,pose:state.presentationPose,destination:state.moveDestination,feedback:state.poeFeedback,project:toScreen,zoom,flashScale:state.flashScale,enabled:state.poeInput===true});
 const passages=signalOpenPassages(state.regionId,map,p,seen),passageBounds=[];
 ctx.save();ctx.strokeStyle=SIGNAL_MARK_STYLE.passageColor;ctx.globalAlpha=SIGNAL_MARK_STYLE.passageAlpha;ctx.lineWidth=SIGNAL_MARK_STYLE.passageWidth;
 for(const passage of passages)for(const tile of passage.tiles){
  const lines=signalPassageTickLines(tile);ctx.beginPath();
  for(const line of lines)line.map(toScreen).forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));
  ctx.stroke();
  const points=lines.flat(),screen=points.map(toScreen);
  passageBounds.push({left:Math.min(...screen.map(v=>v.x))-6,right:Math.max(...screen.map(v=>v.x))+6,top:Math.min(...screen.map(v=>v.y))-6,bottom:Math.max(...screen.map(v=>v.y))+6,depth:Math.min(...points.map(v=>v.x+v.y))-32});
 }
 for(const e of entities){
  const role=actorRole(e,state.regionId);
  if(!role||!e.active||e.hp<=0||e.dead||!(visible(Math.floor(e.x/32),Math.floor(e.y/32))||state.sceneVisibility?.threatVisible?.(e)))continue;
  const pos=toScreen(e);if(pos.x<-30||pos.x>w+30||pos.y<-30||pos.y>h+30)continue;
  // Keep the exact symbol and floor-layer order. Only a small downward offset
  // and two static strokes separate it from texture and the later foot shadow.
  ctx.beginPath();for(const line of role.lines)line.forEach(([x,y],i)=>i?ctx.lineTo(pos.x+x*zoom,pos.y+(y+SIGNAL_MARK_STYLE.roleOffsetY)*zoom):ctx.moveTo(pos.x+x*zoom,pos.y+(y+SIGNAL_MARK_STYLE.roleOffsetY)*zoom));
  ctx.strokeStyle=SIGNAL_MARK_STYLE.roleOutlineColor;ctx.globalAlpha=SIGNAL_MARK_STYLE.roleOutlineAlpha;ctx.lineWidth=SIGNAL_MARK_STYLE.roleOutlineWidth;ctx.stroke();
  ctx.strokeStyle=SIGNAL_MARK_STYLE.roleColor;ctx.globalAlpha=SIGNAL_MARK_STYLE.roleAlpha;ctx.lineWidth=SIGNAL_MARK_STYLE.roleWidth;ctx.stroke();
  if(wildernessScene)drawWildernessRoleLabel(ctx,role,pos.x,pos.y,zoom);
  if(battlefieldScene)drawBattlefieldRoleLabel(ctx,role,pos.x,pos.y,zoom);
 }
 ctx.restore();
 // Fixed shape cues distinguish the three real glyph plates and carried ward.
 // Like role marks, this ground layer stays below hostile tells and actor art.
 if(tombScene){
  const mark=(lines,pos,offsetY=TOMB_MARK_STYLE.offsetY)=>{ctx.save();ctx.beginPath();for(const line of lines)line.forEach(([x,y],i)=>i?ctx.lineTo(pos.x+x*zoom,pos.y+(y+offsetY)*zoom):ctx.moveTo(pos.x+x*zoom,pos.y+(y+offsetY)*zoom));ctx.globalAlpha=TOMB_MARK_STYLE.alpha;ctx.strokeStyle=TOMB_MARK_STYLE.outline;ctx.lineWidth=TOMB_MARK_STYLE.outlineWidth;ctx.stroke();ctx.strokeStyle=TOMB_MARK_STYLE.color;ctx.lineWidth=TOMB_MARK_STYLE.width;ctx.stroke();ctx.restore();};
  for(const o of objects){const lines=tombGlyphLines(o.glyph,state.regionId);if(lines&&visible(Math.floor(o.x/32),Math.floor(o.y/32)))mark(lines,toScreen(o));}
  if(state.wardCarried&&p.hp>0)mark(WARD_LINES,toScreen(p),8);
 }
 // Persistent friendly fire footprint: underneath loot, danger tells and actors.
 // Static dashes distinguish it from hostile solid warnings, including flash0.
 for(const area of areas){
  const points=fireAreaOutline(map,area);if(!points.length||!points.some(v=>visible(Math.floor(v.x/32),Math.floor(v.y/32))))continue;
  ctx.save();ctx.beginPath();points.map(toScreen).forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();
  ctx.fillStyle=FIRE_AREA_STYLE.fill;ctx.globalAlpha=FIRE_AREA_STYLE.fillAlpha;ctx.fill();
  ctx.setLineDash(FIRE_AREA_STYLE.edgeDash);ctx.strokeStyle=FIRE_AREA_STYLE.outline;ctx.globalAlpha=FIRE_AREA_STYLE.outlineAlpha;ctx.lineWidth=FIRE_AREA_STYLE.outlineWidth;ctx.stroke();
  ctx.strokeStyle=FIRE_AREA_STYLE.edge;ctx.globalAlpha=FIRE_AREA_STYLE.edgeAlpha;ctx.lineWidth=FIRE_AREA_STYLE.edgeWidth;ctx.stroke();ctx.restore();
 }
 // Expert friendly geometry shares the quiet floor layer below every hostile tell.
 drawExpertFloor(ctx,{map,banner,regionId:state.regionId,seen,effects,p,cue:onslaughtCue,toScreen});
 // Repeated architecture follows actual collision boundaries. Tall foreground
 // pieces fade only where they hide nearby combat; visibility never changes collision.
 if(!lowScene)for(let y=1;y<map.h-1;y++)for(let x=1;x<map.w-1;x++){if(map.tiles[y][x])continue;let east=map.tiles[y][x+1]&&visible(x+1,y),south=map.tiles[y+1][x]&&visible(x,y+1);if(!east&&!south)continue;let n=hash(x,y),pos=toScreen({x:(x+1)*32,y:(y+1)*32});if(pos.x<-240||pos.x>w+240||pos.y<-100||pos.y>h+400)continue;let key=east?'wallSW':'wallSE';if((east?y:x)%2===0){let width=101*zoom;draw.push({depth:(x+y+2)*32+.1,type:'wall',key,x:pos.x,y:pos.y,width,worldX:x*32,worldY:y*32});if(n%9===0)draw.push({depth:(x+y+2)*32+1,type:'decor',key:'pillar',x:pos.x+15*zoom,y:pos.y+9*zoom,width:48*zoom});}}
 // Hand-placed-by-seed room landmarks give the modular kit a authored rhythm.
 if(!lowScene)for(let r of map.rooms){for(let k=0;k<2;k++){let gx=r.x+(k?r.w-2:1),gy=r.y+1;if(!visible(gx,gy))continue;let pos=toScreen({x:(gx+.5)*32,y:(gy+.5)*32});if(pos.x<-150||pos.x>w+150||pos.y<-100||pos.y>h+250)continue;let key=(r.index+k)%3===0?'statue':'pillar';draw.push({type:'decor',key,x:pos.x,y:pos.y,width:(key==='statue'?44:48)*zoom,depth:(gx+gy+1)*32});}}
 for(let o of objects){let gx=Math.floor(o.x/32),gy=Math.floor(o.y/32);if(!visible(gx,gy))continue;let pos=toScreen(o);if(pos.x<-180||pos.x>w+180||pos.y<-150||pos.y>h+250)continue;let keys={torch:'brazier',chest:'chest',barrel:'barrel',bird:'skeleton',shrine:'statue',relic:'crystal',orb:'crystal',dummy:'statue',exit:'arch',return:'arch'},key=keys[o.type];if(o.type==='torch'){lights.push({...pos,r:165*zoom,color:'#ff7639'});}
  if(o.type==='relic'||o.type==='orb'){if(o.used)continue;lights.push({...pos,y:pos.y-18*zoom,r:85*zoom,color:o.type==='orb'?'#6bd6eb':'#e35dbf'});}
  if(o.type==='trap'){ellipse(pos.x,pos.y,18*zoom,9*zoom,Math.sin(time*2+o.phase)>.65?'#d3546688':'#34325399');continue;}
  if(!key)continue;let width={torch:28,chest:38,barrel:28,bird:37,shrine:44,relic:35,orb:28,dummy:38,exit:110,return:100}[o.type]*zoom;
  draw.push({type:'object',key,x:pos.x,y:pos.y,width,depth:o.x+o.y,o});
 }
 // Settled corpses and debris are ground decoration, below loot, danger and living feet.
 drawEnemyDeathFeedback(ctx,effects,toScreen,zoom,{reduced,flashScale:state.flashScale??1});
 for(const e of entities){if(!e.dead||!(e.deathTime>0)||!visible(Math.floor(e.x/32),Math.floor(e.y/32)))continue;const pos=toScreen(e);if(pos.x<-150||pos.x>w+150||pos.y<-150||pos.y>h+150)continue;actor(e,false,pos.x,pos.y,zoom,time,stats,reduced,classId,state.flashScale??1,1,state.regionId);}
 for(let l of loot){let pos=toScreen(l);if(!visible(Math.floor(l.x/32),Math.floor(l.y/32)))continue;let col={gold:'#e8c07b',wood:'#b5a58a',stone:'#88b6b7',iron:'#c1b0cc',health:'#f28c9b'}[l.type];ellipse(pos.x,pos.y+2,4,2,'#161727aa');ctx.fillStyle=col;ctx.fillRect(Math.round(pos.x)-2,Math.round(pos.y)-3+Math.sin(time*3+l.bob)*2,4,5);}
 for(let e of entities){if(e.type==='dummy'||e.dead||e.hp<=0||!(visible(Math.floor(e.x/32),Math.floor(e.y/32))||state.sceneVisibility?.threatVisible?.(e)))continue;let pos=toScreen(e);if(pos.x<-100||pos.x>w+100||pos.y<-100||pos.y>h+100)continue;draw.push({type:'actor',actor:e,player:false,x:pos.x,y:pos.y,depth:e.x+e.y});}
 let pp=toScreen(p);draw.push({type:'actor',actor:p,player:true,x:pp.x,y:pp.y,depth:p.x+p.y});
 const protectedBounds=[localPassageBounds(p,pp,zoom),...passageBounds];
 for(const d of draw){
  if(d.type!=='actor'||!d.player&&(!d.actor.active||d.actor.hp<=0||Math.hypot(d.actor.x-p.x,d.actor.y-p.y)>=250))continue;
  const role=d.player?null:actorRole(d.actor,state.regionId),height=(d.player?49:role?.height??(d.actor.type==='boss'?100:d.actor.type==='rat'?28:46))*zoom;
  protectedBounds.push({left:d.x-height*.38*(role?.widthScale??1),right:d.x+height*.38*(role?.widthScale??1),top:d.y-height,bottom:d.y+3,depth:d.depth});
  for(const shape of d.actor.telegraph?.shapes||[]){
   const points=telegraphOutline(shape),screen=points.map(toScreen);
   protectedBounds.push({left:Math.min(...screen.map(v=>v.x))-3,right:Math.max(...screen.map(v=>v.x))+3,top:Math.min(...screen.map(v=>v.y))-3,bottom:Math.max(...screen.map(v=>v.y))+3,depth:Math.min(...points.map(v=>v.x+v.y))});
  }
 }

 // Ground edges make nearby walkable tiles readable beneath local cutaway walls.
 ctx.save();ctx.strokeStyle='#9dc3bc';ctx.globalAlpha=.5;ctx.lineWidth=1.2;ctx.beginPath();for(const edge of lowScene||signalScene?[]:nearbyFloorEdges(map,p)){const a=toScreen(edge[0]),b=toScreen(edge[1]);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.stroke();ctx.restore();
 // Place small hints above head/HP positions, but before hostile warnings.
 // Danger geometry and later actors always win any screen-space overlap.
 for(const a of [p,...entities]){const player=a===p;if(!player&&(!a.active||a.hp<=0||a.dead)||!(visible(Math.floor(a.x/32),Math.floor(a.y/32))||state.sceneVisibility?.threatVisible?.(a)))continue;const pos=toScreen(a);if(pos.x<-100||pos.x>w+100||pos.y<-100||pos.y>h+100)continue;const role=player?null:actorRole(a,state.regionId),height=(player?49:role?.height??(a.type==='boss'?100:a.type==='rat'?28:46))*zoom;
  drawExpertHints(ctx,{actor:a,player,x:pos.x,y:pos.y,height,cue:player?onslaughtCue:null,hints:expertStatusHints(a,{player,banner,regionId:state.regionId,map})});
 }
 // Quiet release outlines sit below current warnings and bodies. The muzzle
 // shares the moving shot's height, never its full travel distance or lane.
 for(const f of effects)if(f.type==='enemyRelease'&&f.life>0){
  const shape=f.shape,points=enemyReleaseOutline(shape),lift=shape.type==='line'?9*zoom:0,a=Math.max(0,Math.min(1,f.life/f.max));
  ctx.save();ctx.beginPath();points.map(toScreen).forEach((v,i)=>i?ctx.lineTo(v.x,v.y-lift):ctx.moveTo(v.x,v.y-lift));if(shape.type!=='line')ctx.closePath();
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#241b26';ctx.globalAlpha=a*.72;ctx.lineWidth=4;ctx.stroke();
  ctx.strokeStyle=f.color;ctx.globalAlpha=a*.9;ctx.lineWidth=1.7;ctx.stroke();ctx.restore();
 }
 // Personal portal stays beneath danger warnings and every body. LOS is resolved by the caller.
 drawTownPortal(ctx,{portal:state.townPortal,toScreen,zoom,nowMs:state.wallTimeMs??0,reduced});
 // Ground-plane telegraphs stay underneath characters and architecture.
 const warningPath=shape=>{let points=telegraphOutline(shape).map(toScreen);ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.closePath();if(shape.type==='ring'){for(let i=0;i<=40;i++){let angle=-i/40*Math.PI*2,v=toScreen({x:shape.x+Math.cos(angle)*shape.inner,y:shape.y+Math.sin(angle)*shape.inner});if(i===0)ctx.moveTo(v.x,v.y);else ctx.lineTo(v.x,v.y);}ctx.closePath();}};

 for(let e of entities)if(e.active&&e.telegraph&&e.hp>0&&!e.dead){let warning=e.telegraph,active=warning.phase==='active';ctx.save();ctx.fillStyle=active?'#ffd9a133':warning.color+'18';ctx.strokeStyle=active?'#ffe6b5':warning.color;ctx.lineWidth=active?3:warning.locked?2.4:1.4;ctx.setLineDash(warning.locked?[]:[7,5]);for(let shape of warning.shapes){const information=shape.purpose==='information';ctx.fillStyle=information?'#8fcdd414':active?'#ffd9a133':warning.color+'18';ctx.strokeStyle=information?'#8fcdd4':active?'#ffe6b5':warning.color;ctx.setLineDash(information?[3,7]:warning.locked?[]:[7,5]);warningPath(shape);ctx.fill('evenodd');ctx.stroke();if(shape.type==='line'){let a=toScreen(shape),b=toScreen({x:shape.x2,y:shape.y2});ctx.setLineDash([3,7]);ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=1;ctx.setLineDash(warning.locked?[]:[7,5]);}}let pos=toScreen(e);if(!active){let fill=warning.progress;ctx.setLineDash([]);ctx.lineWidth=2;ctx.strokeStyle=warning.locked?'#ffe5a6':warning.color;ctx.beginPath();ctx.ellipse(pos.x,pos.y+4,18,8,0,-Math.PI/2,-Math.PI/2+Math.PI*2*fill);ctx.stroke();if(e.type==='boss')label(warning.name,pos.x,pos.y-125,11,'#ffe1b2');}ctx.restore();}
 for(let f of effects)if(['zone','hostileZone','meteor'].includes(f.type)){ctx.save();const active=f.type!=='hostileZone'||f.max-f.life>f.delay;ctx.fillStyle=f.color+(active?'22':'12');ctx.strokeStyle=f.color;ctx.globalAlpha=.7;ctx.lineWidth=active?2:1.5;ctx.setLineDash(active?[]:[5,8]);warningPath(f.shape||{type:'circle',x:f.x,y:f.y,r:f.r});ctx.fill('evenodd');ctx.stroke();ctx.restore();}
 for(let f of effects)if(f.type==='afterimage'&&classId==='warrior'){let pos=toScreen(f);motionRenderer.draw({actor:f,player:true,x:pos.x,y:pos.y,height:49*zoom,time,direction:spriteDirection(f.angle||0),alpha:Math.max(0,f.life/f.max)*.28,filter:'brightness(1.2) saturate(.35)'});}
 draw.sort((a,b)=>a.depth-b.depth);for(let d of draw){if(d.type==='actor'){actor(d.actor,d.player,d.x,d.y,zoom,time,stats,reduced,classId,state.flashScale??1,d.player?1:combatActorOpacity(d.actor,p,state.regionId),state.regionId,d.player?onslaughtCue:null);continue;}let alpha=foregroundAlpha(d,env[d.key],protectedBounds);if(alpha<1)fadedForeground++;
  if(d.o?.broken){sprite('rubble',d.x,d.y,d.width*.8,{alpha:.8});continue;}
  let filter=d.o?.type==='orb'?'hue-rotate(75deg)':d.o?.open?'brightness(.55)':null;sprite(d.key,d.x,d.y,d.width,{alpha,filter,yScale:d.type==='wall'?1.25:1});
  if(d.o?.type==='torch'){let flame={x:d.x,y:d.y-d.width*1.05};for(let k=0;k<3;k++){let n=hash(k,Math.floor(d.depth));ctx.fillStyle=k?'#ffe3a1':'#ff854d';ctx.fillRect(Math.round(flame.x+Math.sin(time*6+k+n)*3),Math.round(flame.y-((time*18+n)%22)),2,4);}}
 }
 if(p.hp>0&&entities.some(e=>combatActorOpacity(e,p,state.regionId)<1)){actor(p,true,pp.x,pp.y,zoom,time,stats,reduced,classId,state.flashScale??1,1,state.regionId,onslaughtCue);ctx.save();ctx.strokeStyle='#a4efe2';ctx.lineWidth=1.5;ctx.globalAlpha=.8;ctx.beginPath();ctx.ellipse(pp.x,pp.y+1,13*zoom,6*zoom,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 const target=entities.find(e=>e.id===state.targetId&&e.hp>0&&e.active);if(target){const q=toScreen(target);ctx.save();ctx.strokeStyle='#ffe5ac';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(q.x,q.y+2,18*zoom,8*zoom,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(q.x-5,q.y+2);ctx.lineTo(q.x+5,q.y+2);ctx.moveTo(q.x,q.y-2);ctx.lineTo(q.x,q.y+6);ctx.stroke();ctx.restore();}
 // Additive pools, deliberately localized: most of the scene remains violet/teal.
 ctx.globalCompositeOperation='screen';for(let l of lights){glow(l.x,l.y-12*zoom,l.r,l.color,.58);glow(l.x,l.y-22*zoom,48*zoom,'#ffc479',.7);}glow(pp.x,pp.y-25,55,'#85c6ba',.055);ctx.globalCompositeOperation='source-over';
 drawStormBells(ctx,state,toScreen,zoom);
 for(let b of shots){if(drawWarriorHammer(ctx,b,{project:toScreen,zoom,flashScale:state.flashScale??1,reduced}))continue;let pos=toScreen(b),angle=projectWorld(b.vx,b.vy);ctx.save();ctx.translate(pos.x,pos.y-9*zoom);ctx.rotate(b.kind==='axe'?time*19:Math.atan2(angle.y,angle.x));let color=b.enemy?'#ec796e':{ice:'#7adbe4',fire:'#ffc172',soul:'#94d5b3',spark:'#b4c6ff'}[b.kind]||'#e8c399';ctx.fillStyle=color;if(b.kind==='axe'&&images.axe){glow(0,0,18,'#bbddd0',.18);ctx.drawImage(images.axe,-14*zoom,-18*zoom,28*zoom,35*zoom);}else if(['arrow','knife','thorn','axe'].includes(b.kind))ctx.fillRect(-9,-1.5,18,3);else{ellipse(0,0,5*zoom,4*zoom,color);glow(0,0,15,color,.7);}ctx.restore();}
 for(let f of effects){if(drawStormEffect(ctx,f,toScreen,zoom))continue;if(expertFootprint(f)||f.bannerPlacement===true||f.type==='enemyRelease'||f.type==='enemyDeath'||f.deathParticle)continue;let pos=toScreen(f),a=Math.max(0,Math.min(1,f.life/f.max));ctx.save();ctx.globalAlpha=a;ctx.strokeStyle=f.color;ctx.fillStyle=f.color;if(f.type==='impact'){let direction=projectWorld(Math.cos(f.angle),Math.sin(f.angle)),angle=Math.atan2(direction.y,direction.x);ctx.translate(pos.x,pos.y-23*zoom);ctx.rotate(angle);ctx.globalAlpha=reduced?a*.45:a;ctx.lineWidth=f.heavy?3:2;ctx.beginPath();for(let k=0;k<7;k++){let ang=(k/7)*Math.PI*2,r=f.r*(.4+(1-a)*.8)*(k%2?.75:1.1);ctx.moveTo(Math.cos(ang)*r*.25,Math.sin(ang)*r*.25);ctx.lineTo(Math.cos(ang)*r,Math.sin(ang)*r*.55);}ctx.stroke();if(!reduced){ellipse(0,0,6*a,2*a,'#fff5d9');}}else if(f.type==='particle'){ctx.fillRect(Math.round(pos.x),Math.round(pos.y)-7,Math.max(1,f.size*zoom*.6),Math.max(1,f.size*zoom*.6));}else if(['ring','blast','slash'].includes(f.type)){const slash=f.type==='slash',r=f.r||40,start=slash?f.angle-1.05:0,end=slash?f.angle+1.05:Math.PI*2,lift=slash?23:3;ctx.lineCap='round';for(let layer=0;layer<(slash?3:1);layer++){ctx.globalAlpha=a*(layer===0?.34:layer===1?.74:1);ctx.strokeStyle=layer===2?'#fff1cf':f.color;ctx.lineWidth=slash?(layer===0?12:layer===1?5:1.5)*a:(f.type==='blast'?5:2)*a;ctx.beginPath();for(let k=0;k<=30;k++){let angle=start+(end-start)*k/30,rr=r*(slash?(.88+layer*.035):1),v=toScreen({x:f.x+Math.cos(angle)*rr,y:f.y+Math.sin(angle)*rr});if(k===0)ctx.moveTo(v.x,v.y-lift*zoom);else ctx.lineTo(v.x,v.y-lift*zoom);}ctx.stroke();}}else if(f.type==='bolt'){let end=toScreen({x:f.x2,y:f.y2});ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pos.x,pos.y-20);for(let k=1;k<5;k++){let t=k/5;ctx.lineTo(pos.x+(end.x-pos.x)*t+Math.sin(k*7+time*40)*6,pos.y+(end.y-pos.y)*t-20);}ctx.lineTo(end.x,end.y-20);ctx.stroke();}else if(f.type==='meteor'){ctx.lineWidth=7*(1-a);ctx.beginPath();ctx.moveTo(pos.x-50*a,pos.y-220*a);ctx.lineTo(pos.x,pos.y);ctx.stroke();}ctx.restore();}
 for(let f of floaters){let pos=toScreen(f);ctx.globalAlpha=f.life;label(f.text,pos.x,pos.y-35-(f.lift||0),12,f.color);ctx.globalAlpha=1;}
 // Sparse red embers and magenta glints echo the source without hiding combat.
 for(let i=0;i<26;i++){let n=hash(i,17),x=(n%w+Math.sin(time*.12+i)*20),y=(n%h-time*(5+i%8)+h*100)%h;ctx.fillStyle=i%6===0?'#cf49a366':'#df365a88';ctx.fillRect(Math.round(x),Math.round(y),i%2?1:2,3);}
 let vignette=ctx.createRadialGradient(w*.5,h*.53,Math.min(w,h)*.22,w*.5,h*.53,Math.max(w,h)*.65);vignette.addColorStop(0,'#15182c00');vignette.addColorStop(1,'#111329a8');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
 if(!cleanView){let near=objects.filter(o=>!['torch','barrel','trap'].includes(o.type)&&!o.open&&!o.used&&Math.hypot(o.x-p.x,o.y-p.y)<64).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(near){let pos=toScreen(near),names={chest:'상자 열기',bird:'자원 절반 보관',shrine:'회복',relic:'유물 선택',orb:'기술 강화 선택',dummy:'연습 결과',exit:near.locked?'수호자 처치 필요':'다음 층',return:'피난처로'};label('[F] '+names[near.type],pos.x,pos.y-60,12,'#f0cd9c');}let boss=entities.find(e=>e.type==='boss'&&e.active&&e.hp>0);if(boss){let bw=Math.min(380,w-70);ctx.fillStyle='#171528';ctx.fillRect(w/2-bw/2,55,bw,7);ctx.fillStyle='#d47979';ctx.fillRect(w/2-bw/2,55,bw*boss.hp/boss.max,7);label(state.bossName,w/2,47,14,'#e3bba1');}if(state.celebration){let a=Math.min(1,state.celebration.left);ctx.globalAlpha=a;label(state.celebration.title,w*.5,95,16,state.celebration.color);label(state.celebration.detail,w*.5,114,11,'#e0d1b5');ctx.globalAlpha=1;}}
 if(state.paused){ctx.fillStyle='#15142c88';ctx.fillRect(0,0,w,h);label('일시 정지',w/2,h/2,26,'#e8c5a3');}ctx.restore();lastMetrics={tiles:count,drawables:draw.length,lights:lights.length,fadedForeground,floorCache:{enabled:!!cache,width:cache?.width||0,height:cache?.height||0,pixels:cache?cache.width*cache.height:0,tiles:floorTiles.length,rebuilds:floorBuilds,rebuilt:floorRebuilt}};return lastMetrics;}
 function actor(a,player,x,y,zoom,time,stats,reduced=false,classId='warrior',flashScale=1,opacity=1,regionId,expertCue=null){let set=player?manifest.hero:manifest.enemy,img=player?images.hero:images.enemy;if(!set||!img)return;const reaction=player?null:enemyReactionPose(a);let row=spriteDirection(expertCue?.angle??reaction?.facing??a.angle??0),col=reaction?.frame??animationFrame(a,time,player),r=set.frames[row*4+col];if(!r)return;const role=player?null:actorRole(a,regionId),targetHeight=(player?49:role?.height??(a.type==='boss'?100:a.type==='rat'?28:46))*zoom,k=targetHeight/(set.bodyHeight||r.h),kx=k*(role?.widthScale??1),ax=r.ax??r.w/2,ay=r.ay??r.h;ctx.save();ctx.globalAlpha=reaction?.alpha??1;ellipse(x,y+1,(player?11:14)*(reaction?.shadowScale??1),a.type==='boss'?11:5,'#10112688');ctx.restore();
  if(reaction?.land>0){ctx.save();ctx.globalAlpha=reaction.land*.18*(reaction.alpha??1);ellipse(x+reaction.side*targetHeight*.15,y+2,targetHeight*.4,targetHeight*.065,'#b4ac96');ctx.restore();}
  if(!player&&signalBodyContourAllowed(a,regionId,opacity)){
   const cue=keeperContour(img,r,k,kx);
   if(cue){
    const left=Math.round(x-ax*kx)-cue.padding,top=Math.round(y-ay*k)-cue.padding,visibleHeight=Math.max(0,Math.min(cue.height,Math.floor(y-SIGNAL_CONTOUR_STYLE.footClearance*zoom-top)));
    // Stop above the foot plane; both edge layers precede the original body,
    // later architecture and the existing opaque hero restoration. No glow.
    if(visibleHeight>0){ctx.save();ctx.filter='none';for(const {canvas,alpha} of cue.masks){ctx.globalAlpha=alpha;ctx.drawImage(canvas,0,0,cue.width,visibleHeight,left,top,cue.width,visibleHeight);}ctx.restore();}
   }
  }
  ctx.save();ctx.globalAlpha=opacity;if(!reduced&&(a.flash>0||player&&a.invuln>0&&Math.sin(time*35)>0))ctx.filter=`brightness(${1+.6*Math.max(0,Math.min(1,flashScale))})`;else if(!player&&a.type==='mage')ctx.filter='hue-rotate(50deg)';else if(!player&&a.type==='imp')ctx.filter='hue-rotate(310deg)';const enemyDrawn=!player&&drawEnemyReaction(ctx,img,r,{x,y,k,kx,pose:reaction,height:targetHeight,direction:row,opacity,reduced,flashScale});const heroMotion=mobilityMotion(a.presentationPose,a)??expertCue?.motion??null;const drawn=enemyDrawn||player&&classId==='warrior'&&(warriorRenderer.draw({actor:a,player:true,x,y,height:targetHeight,time,direction:row,motion:heroMotion,classId})||motionRenderer.draw({actor:a,player:true,x,y,height:targetHeight,time,direction:row,...(heroMotion??{})}));if(!drawn)ctx.drawImage(img,r.x,r.y,r.w,r.h,Math.round(x-ax*kx),Math.round(y-ay*k),r.w*kx,r.h*k);ctx.restore();if(player&&a.warcry>0){ctx.strokeStyle='#efbc7588';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,17,8,0,0,Math.PI*2);ctx.stroke();}if(!player)drawCrusherPrimed(ctx,a,{x,y,height:targetHeight,zoom});if(!player&&!a.dead&&a.hp>0&&a.hp<a.max){ctx.fillStyle='#14182b';ctx.fillRect(x-13,y-targetHeight-8,26,3);ctx.fillStyle='#c47984';ctx.fillRect(x-13,y-targetHeight-8,26*a.hp/a.max,2);}}
 return {render,metrics:()=>lastMetrics};
}
