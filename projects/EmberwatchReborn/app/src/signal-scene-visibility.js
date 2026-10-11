// S-only adapter of the established W presentation policy. No simulation state
// or interaction candidate is filtered here; full F hints/modal names survive.
import {SIGNAL_REGION,SIGNAL_REGIONS} from './signal-content.js';
import {connectedSceneVisibility} from './scene-visibility.js';
export const SIGNAL_LANDMARK_RANGE=160;
const names=Object.freeze({
 'signal-code':'해독판', 'signal-route-transmitter':'송신 레버',
 'signal-route-receiver':'수신 레버', 'signal-transmitter':'송신기',
 'signal-receiver':'북쪽 수신기', 'signal-shortcut':'중계 승강기',
 'signal-town-return':'마을 귀환', 'signal-town-shortcut':'승강기 귀환',
});
export function signalSceneVisibility(battle,{objectives={},objectView=()=>null}={}){
 if(battle?.region!==SIGNAL_REGION)return null;
 return connectedSceneVisibility(battle,{region:SIGNAL_REGIONS[SIGNAL_REGION],names,range:SIGNAL_LANDMARK_RANGE,objectives,retainThreats:true,
  objectView:o=>{const view=objectView(o);return view?{...view,completed:view.actions?.length===0}:null;},
  portalView:o=>({allowed:!o.gate||o.gate==='signal_shortcut'&&objectives.signal_shortcut_open>=1})});
}
