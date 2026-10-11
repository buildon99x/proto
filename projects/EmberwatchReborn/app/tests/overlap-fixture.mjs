import {SIGNAL_REGION,SIGNAL_REGIONS,SIGNAL_FOES} from '../src/signal-content.js';
import {mapFromRegion} from '../src/world-geometry.js';
import {signalSceneVisibility} from '../src/signal-scene-visibility.js';
import {ART} from '../src/art.js';
import {recordingContext,recordingCanvases} from './recording-context.mjs';

// Explicit renderer-only fixture approximating the photographed relative
// anchors. It is not a recovered save, pixel replay, or normal-input gameplay.
export function overlapFixture(extra={}){
 const objectives={signal_accepted:1,signal_route_ready:1,signal_east_open:1,signal_transmitter_restored:1};
 const p={x:404,y:116,hp:100,angle:0};
 const enemy={id:'signal-keeper-4',kind:'signal_keeper',type:'guardian',x:427,y:139,hp:SIGNAL_FOES.signal_keeper.hp,max:SIGNAL_FOES.signal_keeper.hp,active:true,state:'windup',angle:1,
  telegraph:{phase:'windup',color:'#f29187',locked:true,progress:.4,shapes:[{type:'cone',x:427,y:139,angle:-2.35,r:68,halfAngle:1.3}]}};
 const battle={region:SIGNAL_REGION,map:mapFromRegion(SIGNAL_REGIONS[SIGNAL_REGION],objectives),p,enemies:[enemy],shots:[],effects:[]};
 const v=signalSceneVisibility(battle,{objectives});
 return {width:1180,height:757,regionId:SIGNAL_REGION,map:battle.map,p,entities:battle.enemies,objects:[{...SIGNAL_REGIONS[SIGNAL_REGION].objects.find(o=>o.id==='signal-receiver'),type:'shrine'}],sceneVisibility:v,seen:v.seen,cleanView:true,time:0,reduced:true,flashScale:0,...extra};
}
export function record(renderer,state,options={}){
 const main=recordingContext(),aux=recordingCanvases(),images={environment:{id:'environment'},hero:{id:'hero'},enemy:{id:'enemy'},motion:{}};
 const r=renderer(main.ctx,ART,images,{createCanvas:null,createActorCueCanvas:aux.createCanvas,...options});
 r.render(state);return {...main,...aux,renderer:r};
}
export const bodies=calls=>calls.filter(c=>c.op==='image'&&c.args[0].id==='enemy');
export const heroes=calls=>calls.filter(c=>c.op==='image'&&c.args[0].id==='hero');
export const statues=calls=>calls.filter(c=>c.op==='image'&&c.args[0].id==='environment'&&c.args[1]===ART.environment.sprites.statue.x&&c.args[2]===ART.environment.sprites.statue.y);
