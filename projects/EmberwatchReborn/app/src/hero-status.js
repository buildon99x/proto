// R11 authored affliction rules. Durations and tick damage are Emberwatch
// choices, not inferred reference nulls. Content must explicitly opt in via a
// statusRuleIds attack field; current pre-Expert foes produce none of these.
const rule=(id,duration,extra={})=>Object.freeze({id,duration,cleansable:true,...extra});
export const HERO_STATUS_RULES=Object.freeze({
 r11_slow:rule('slow',2,{moveMultiplier:.6}),
 r11_stun:rule('stun',.6),r11_disarm:rule('disarm',2),r11_silence:rule('silence',2),
 r11_burn:rule('burn',3,{interval:1,damage:4,damageType:'fire'}),
 r11_poison:rule('poison',4,{interval:1,damage:3,damageType:'poison'})
});
export const HERO_STATUS_IDS=Object.freeze(['slow','stun','disarm','silence','burn','poison']);
export const hasStatus=(actor,id)=>actor?.negativeStatuses?.[id]?.remaining>1e-9;
export function validateNegativeStatuses(statuses){
 if(!statuses||Object.getPrototypeOf(statuses)!==Object.prototype)return false;
 return Object.entries(statuses).every(([id,s])=>{
  const r=HERO_STATUS_RULES[s?.ruleId];if(!HERO_STATUS_IDS.includes(id)||!s||Object.getPrototypeOf(s)!==Object.prototype||!r||r.id!==id)return false;
  const keys=['ruleId','remaining','sourceId',...(r.interval?['nextTick']:[])];
  return Object.keys(s).length===keys.length&&Object.keys(s).every(k=>keys.includes(k))&&Number.isFinite(s.remaining)&&s.remaining>0&&s.remaining<=r.duration&&
   (s.sourceId===null||(typeof s.sourceId==='string'&&/^[a-zA-Z0-9:_-]{1,96}$/.test(s.sourceId)))&&(!r.interval||(Number.isFinite(s.nextTick)&&s.nextTick>0&&s.nextTick<=r.interval));
 });
}
