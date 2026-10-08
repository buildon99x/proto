/* Active wall time is separate from bounded fixed-step simulation. */
(function(root){
'use strict';
class RunClock {
 constructor(){this.step=1/60;this.maxSteps=15;this.reset(0);}
 reset(now){this.elapsed=0;this.dropped=0;this.remainder=0;this.active=false;this.previous=Number.isFinite(now)?now:0;}
 setActive(active,now){this.sample(now);this.active=!!active;this.remainder=0;}
 sample(now){if(!Number.isFinite(now)||now<this.previous)return 0;const dt=(now-this.previous)/1000;this.previous=now;if(this.active)this.elapsed+=dt;return dt;}
 advance(now){
  const delta=this.sample(now);let steps=0;
  if(this.active){const available=this.remainder+delta,budget=this.step*this.maxSteps;this.dropped+=Math.max(0,available-budget);const bounded=Math.min(available,budget);steps=Math.min(this.maxSteps,Math.floor((bounded+1e-9)/this.step));this.remainder=Math.max(0,bounded-steps*this.step);}
  return {steps,step:this.step,elapsed:this.elapsed,renderDelta:Math.min(.05,delta),dropped:this.dropped};
 }
}
const api={RunClock};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.DFRunClock=api;
})(typeof globalThis!=='undefined'?globalThis:this);
