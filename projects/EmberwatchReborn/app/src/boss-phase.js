// Opt-in, transient attack selection. These phase thresholds/cycles are authored
// Emberwatch content; this module owns no damage, immunity, healing or rewards.
function reachedPhase(e,phases){
 let index=0;
 for(let n=1;n<phases.length;n++)if(e.hp/e.max<=phases[n].hpRatioAtMost)index=n;
 return index;
}
export function initializePatternPhase(e,foe){
 const phases=foe.patternPhases;
 if(!phases?.length)return e;
 const index=reachedPhase(e,phases),phase=phases[index];
 // Presentation may read id/cue, but must never write selector state. The
 // pending index latches a health observation even if HP subsequently rises.
 e.patternPhase={id:phase.id,cue:phase.cue??null,index,pendingIndex:index};
 return e;
}
export function observePatternPhase(e,foe){
 if(!(e.hp>0)||!foe.patternPhases?.length)return;
 if(!e.patternPhase)initializePatternPhase(e,foe);
 const phase=e.patternPhase;
 phase.pendingIndex=Math.max(phase.pendingIndex,reachedPhase(e,foe.patternPhases));
}
export function activatePendingPatternPhase(e,foe){
 const phase=e.patternPhase;
 // The caller reaches this boundary only after stun, locked windup and the
 // existing recovery timer. Never rewrite an attackSpec or telegraph here.
 if(!(e.hp>0)||!phase||phase.pendingIndex<=phase.index||e.state==='windup'||e.timer>0||e.stun>0)return null;
 const next=foe.patternPhases[phase.pendingIndex];
 phase.index=phase.pendingIndex;phase.id=next.id;phase.cue=next.cue??null;e.patternIndex=0;
 return {type:'enemyPhaseChanged',id:e.id,phaseId:phase.id,cue:phase.cue};
}
export function selectedEnemyPattern(e,foe){
 const phase=e.patternPhase&&foe.patternPhases?.[e.patternPhase.index];
 if(phase)return foe.patterns.find(p=>p.id===phase.patternIds[(e.patternIndex??0)%phase.patternIds.length]);
 return foe.patterns?.[(e.patternIndex??0)%foe.patterns.length];
}
