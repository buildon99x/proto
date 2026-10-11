// requestAnimationFrame timestamps may precede a just-resumed performance.now().
// Pauses, clock anomalies and background stalls never produce negative/runaway dt.
export function frameDelta(now,last){
  if(!Number.isFinite(now)||!Number.isFinite(last))return 0;
  return Math.max(0,Math.min(.05,(now-last)/1000));
}
// A long rendering gap (background throttling, suspended tab or a stall) asks
// for an explicit resume instead of applying an unseen combat tick.
export function frameWasSuspended(now,last){return Number.isFinite(now)&&Number.isFinite(last)&&now-last>500;}
