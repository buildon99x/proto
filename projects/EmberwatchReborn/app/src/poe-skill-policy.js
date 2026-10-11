// Authored Emberwatch R14 locomotion/retarget/cancel timelines. These values
// are NOT POE2 frame measurements. Contact/duration/cost/CD remain in skill spec.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
// A boundary is [clock, fraction]. Each interval is half-open [start,end).
const start=['duration',0],contact=['contact',1],end=['duration',1];
const precontact=['contact',.8];
const policy=(movement,windupSpeed,recoverySpeed,retargetWindows,dodgeCancelWindows,repeat='press')=>({movement,movementWindows:[{window:[start,contact],factor:windupSpeed},{window:[contact,end],factor:recoverySpeed}],retargetWindows,dodgeCancelWindows,repeat});
export const POE_SKILL_POLICIES=freeze({
 mace_swing:policy('recovery',0,1,[[start,contact]],[[start,precontact],[contact,end]],'held'),
 righteous_hammer:policy('slowed',.55,.8,[[start,contact]],[[start,precontact],[contact,end]],'held'),
 lay_on_hands:policy('slowed',.5,1,[],[[start,precontact],[contact,end]]),
 judgement:policy('recovery',0,.6,[[start,contact]],[[start,precontact],[contact,end]]),
 battle_banner:policy('free',1,1,[],[[start,precontact],[contact,end]]),
 zealous_onslaught:policy('authored',0,0,[[start,end]],[[start,end]]),
 shield_charge:policy('authored',0,0,[],[]),
});
// Every new mobility number has an explicit name and provenance. Speeds are
// world units/s; durations are world seconds. Sprint follows derived walk speed.
export const REBORN_POE_MOBILITY_TUNING=freeze({rollDuration:.42,rollSpeed:310,sprintSpeedMultiplier:1.5,sprintGrace:.12,knockdownDuration:.65,evadeStart:0,evadeEnd:.18});
const time=(action,[clock,fraction])=>(action[clock]??action.spec?.[clock]??(clock==='contact'?1:2))*fraction;
export function skillTimeline(action){
 const p=POE_SKILL_POLICIES[action?.id];if(!p)return null;
 const window=w=>w.map(v=>time(action,v));
 return {movement:p.movement,repeat:p.repeat,movementWindows:p.movementWindows.map(v=>({window:window(v.window),factor:v.factor})),retargetWindows:p.retargetWindows.map(window),dodgeCancelWindows:p.dodgeCancelWindows.map(window)};
}
// fired fallback supports older presentation/test callers lacking a timeline.
// Production actions always carry finite elapsed/contact/duration and therefore
// all runtime permissions use numeric intervals, never a fired boolean gate.
const elapsed=a=>Number.isFinite(a?.elapsed)?a.elapsed:a?.fired?(a.contact??1):0;
const inside=(value,[begin,end])=>value>=begin-1e-9&&value<end-1e-9;
export function skillMovementFactor(action){if(!action)return 1;return skillTimeline(action)?.movementWindows.find(row=>inside(elapsed(action),row.window))?.factor??0;}
export function skillCanRetarget(action){return skillTimeline(action)?.retargetWindows.some(window=>inside(elapsed(action),window))??false;}
export function skillCanDodgeCancel(action){return !action||!!skillTimeline(action)?.dodgeCancelWindows.some(window=>inside(elapsed(action),window));}
export function skillPolicyDeadlines(action){const p=skillTimeline(action);return p?[...p.movementWindows.map(v=>v.window),...p.retargetWindows,...p.dodgeCancelWindows].flat().map(time=>time-action.elapsed).filter(v=>v>1e-9):[];}
