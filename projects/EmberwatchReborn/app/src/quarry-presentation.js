// Presentation reads durable progress only. No reward or unlocking side effects.
import {QUARRY_GROUPS} from './quarry-content.js';
const eligible=state=>['adept','expert'].includes(state.character?.tier)&&state.world.objectives.adept_commission===1&&state.world.claimedRewards.includes('r4:report')&&state.world.claimedRewards.includes('r5:promote:adept');
const result=(id,title,detail)=>({id,title,detail});
const left=(state,group)=>QUARRY_GROUPS[group].filter(id=>!(state.world.defeated?.ember_quarry??[]).includes(id)).length;
export function quarryObjectView(state,object){
 const o=state.world.objectives,view=(name,detail,label,done)=>({name,detail,actions:done?[]:[{label}]});
 const next=()=>{
  if(o.quarry_reported)return '채석장 조사 보고까지 마쳤습니다. 현재 목표에서 다음 조사와 이동 경로를 확인하세요.';
  if(!o.quarry_winch_repaired&&(o.quarry_anchor_a||o.quarry_anchor_b)){
   const remaining=[!o.quarry_anchor_a?'서쪽':null,!o.quarry_anchor_b?'동쪽':null].filter(Boolean).join(' · ');
   return remaining?`다음 목표: 남은 운반 닻 고정. 남은 닻: ${remaining}. 아직 고정하지 않은 닻만 곡괭이로 고정하세요.`:'다음 목표: 상부 북동쪽 광석 운반기 수리. 두 닻이 고정되었습니다. 북동쪽 운반기를 직접 수리해 일회성 보급을 회수하세요.';
  }
  const guide=quarryGuidance(state);return guide?`다음 목표: ${guide.title}. ${guide.detail}`:'';
 };
 switch(object.actionKind){
  case 'tool':return view(o.quarry_tool_found?'채석 곡괭이 · 회수 완료':'걸린 채석 곡괭이 회수',o.quarry_tool_found?`채석 곡괭이를 회수해 보유하고 있습니다. 경험치 60은 이미 받았으며 다시 지급되지 않습니다. 곡괭이는 구조·닻 고정·귀환 승강기에 계속 쓰는 비소모 도구입니다. ${next()}`:'입구의 적 네 명을 처치하면 곡괭이를 회수합니다. 경험치60을 한 번 받으며, 곡괭이는 구조·닻 고정·귀환 승강기에 쓰는 비소모 도구입니다.','곡괭이 회수',o.quarry_tool_found);
  case 'rescue':return view(o.quarry_rescue_complete?'광부 · 구조 완료':'매몰 광부 구조',o.quarry_rescue_complete?`광부 구조를 마쳤고 상부 운반장 길이 열렸습니다. 구조 보상은 이미 받았으며 다시 지급되지 않습니다. ${next()}`:'구조 구역의 적 네 명을 처치하고 곡괭이로 잔해를 걷어내세요. 경험치90·금화20을 한 번 받고 상부 운반장 길이 열립니다. 남쪽 귀환 승강기도 무료로 고칠 수 있습니다.','광부 구조',o.quarry_rescue_complete);
  case 'anchor':{
   const done=o['quarry_anchor_'+object.anchor];return view(`${object.anchor==='a'?'서쪽':'동쪽'} 운반 닻 · ${done?'고정 완료':'미고정'}`,done?`이 운반 닻은 이미 고정했습니다. 다시 고정할 필요가 없으며 닻 고정에는 별도 보상과 재료·금화 비용이 없습니다. ${next()}`:'상부 운반장 적 네 명을 처치한 뒤 두 닻을 각각 곡괭이로 고정하세요. 순서는 자유이며 재료·금화 비용과 별도 보상은 없습니다.','운반 닻 고정',done);
  }
  case 'winch':return view(o.quarry_winch_repaired?'광석 운반기 · 수리 완료':'광석 운반기 수리',o.quarry_winch_repaired?`광석 운반기 수리를 마쳤습니다. 수리 보상과 보급품은 이미 받았으며 다시 지급되지 않습니다. ${next()}`:'상부 적을 모두 처치하고 서쪽·동쪽 닻을 고정하면 무료로 수리합니다. 경험치120·금화40·철4·목재2·실2·물약1을 한 번 받고 촌장 에다에게 보고할 수 있습니다.','운반기 수리',o.quarry_winch_repaired);
  case 'shortcut':return view(o.quarry_shortcut_open?'귀환 승강기 · 연결 완료':'귀환 승강기 체인 연결',o.quarry_shortcut_open?`귀환 승강기가 연결되어 마을과 구조 구역을 바로 왕복할 수 있습니다. 연결 보상은 없으며 지역 전환 자체는 자원을 회복시키지 않습니다. 쉬려면 승강기로 마을에 돌아가세요. ${next()}`:'광부를 구조한 뒤 곡괭이로 체인을 연결하면 마을과 구조 구역을 바로 왕복합니다. 상부 전투 전에 쉬러 갈 수 있습니다. 연결 비용·보상은 없으며 지역 전환 자체는 자원을 회복시키지 않습니다.','귀환 승강기 연결',o.quarry_shortcut_open);
  default:return {name:object.name,detail:'사용할 수 없는 대상입니다.',actions:[]};
 }
}
export function quarryGuidance(state){
 if(!eligible(state))return null;
 const o=state.world.objectives;
 if(!o.quarry_accepted)return result('quarry-accept','촌장 에다에게 채석장 조사 받기','숙련 승급을 마쳤습니다. 에다에게 다음 조사를 받은 뒤 마을 북동쪽 채석장 입구로 이동하세요. 특정 기술·장비 구매와 입장료는 필요하지 않습니다.');
 if(!o.quarry_tool_found)return result('quarry-tool','채석장 입구 정리 · 곡괭이 회수',`마을 북동쪽 입구로 진입해 입구 적 ${left(state,'entry')}명을 처치하고 동쪽의 곡괭이를 회수하세요. 장갑 파수꾼의 좁은 찌르기와 넓은 쓸기는 옆으로 피하세요.`);
 if(!o.quarry_rescue_complete)return result('quarry-rescue','동쪽 구조 구역 돌파 · 광부 구조',`열린 동쪽 길을 따라 구조 구역 적 ${left(state,'rescue')}명을 처치하고 북동쪽 광부를 구하세요. 투석수의 직선 예고와 가까이 오는 쇄도병을 함께 살피세요.`);
 if(!o.quarry_winch_repaired&&!o.quarry_shortcut_open)return result('quarry-shortcut','구조 구역 남쪽의 귀환 승강기 연결','광부 아래쪽 승강기를 곡괭이로 연결하면 마을과 바로 왕복합니다. 연결 비용·보상은 없으며 지역 전환 자체는 자원을 회복시키지 않습니다. 상부 운반장에 가기 전 무료 재정비 경로입니다.');
 if(left(state,'winch'))return result('quarry-guards','북쪽 상부 운반장 정리',`북쪽 통로를 올라 상부 적 ${left(state,'winch')}명을 처치하세요. 장갑 적의 두 예고를 구분하고 반격 틈에 단죄·망치·기본 공격을 선택하세요.`);
 if(!o.quarry_anchor_a||!o.quarry_anchor_b)return result('quarry-anchors','상부 서쪽·동쪽 운반 닻 고정',`남은 닻: ${[!o.quarry_anchor_a?'서쪽':null,!o.quarry_anchor_b?'동쪽':null].filter(Boolean).join(' · ')}. 곡괭이로 둘 다 고정하세요. 순서는 자유이며 재료를 쓰지 않습니다.`);
 if(!o.quarry_winch_repaired)return result('quarry-winch','상부 북동쪽 광석 운반기 수리','두 닻이 고정되었습니다. 북동쪽 운반기를 직접 수리해 일회성 보급을 회수하세요.');
 if(!o.quarry_reported)return result('quarry-report','마을 촌장 에다에게 채석장 조사 보고','운반기를 수리했습니다. 귀환 승강기 또는 입구로 마을에 돌아가 에다에게 보고하면 경험치90·금화60을 한 번 받습니다.');
 return result('quarry-complete','채석장 조사 완료 · 고갯길 조사로','채석장 전투와 보고를 마쳤습니다. 에다에게 고갯길 조사를 받으세요. 이후 신호 복원·용광로·신호 묘실·전문가 승급·봉화 전장으로 이어집니다. 반복 원정, 달인 승급과 전체 캠페인 결말은 아직 구현되지 않았습니다.');
}
export function quarryElderView(state){
 if(!eligible(state))return null;
 const o=state.world.objectives;
 if(!o.quarry_accepted)return {title:'새 조사 · 잿불 채석장',detail:'채석장 광부가 고립되고 운반기가 멈췄습니다. 마을 북동쪽 입구에서 곡괭이를 찾아 광부를 구조하고 운반기를 고쳐 주세요. 수락·입장·필수 수리는 무료입니다.',action:'accept',label:'채석장 조사 수락'};
 if(o.quarry_reported)return {title:'채석장 조사 · 보고 완료',detail:'광부 구조와 운반기 복구를 마쳤습니다. 이번 조사 보상은 이미 받았습니다. 에다에게 새 조사 의뢰가 있는지 확인하세요.',action:null,label:''};
 if(o.quarry_winch_repaired)return {title:'채석장 조사 결과 보고',detail:'운반기 복구를 보고하면 경험치90·금화60을 한 번 받습니다. 다음 지역이나 상위 승급을 자동으로 열지는 않습니다.',action:'report',label:'채석장 조사 보고'};
 return {title:'채석장 조사 진행 중',detail:quarryGuidance(state).detail,action:null,label:''};
}
