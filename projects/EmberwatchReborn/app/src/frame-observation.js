// Optional, bounded, in-memory observer. It never steps the game or schedules work.
// rAF intervals and synchronous JS elapsed time are different observations:
// neither is GPU cost, display scanout, or physical key-to-photon latency.
export const FRAME_OBSERVATION_LIMIT=240;
export const FRAME_SUSPENSION_MS=500;
export const FRAME_OBSERVATION_PHASES=Object.freeze(['step','render','ui']);
export const FRAME_OBSERVATION_MODES=Object.freeze(['combat','combat-moving','moving','idle','menu','entry-wait','save-wait','inactive','unavailable']);
const ACTIVE_MODES=new Set(['combat','combat-moving','moving','idle']);
const emptyPhases=()=>({step:null,render:null,ui:null});
const emptyStatus=()=>({step:'not-observed',render:'not-observed',ui:'not-observed'});
const validTime=value=>Number.isFinite(value)&&value>=0;
const clockStatus=value=>value==null?'missing':!Number.isFinite(value)?'nonfinite':value<0?'negative':'ok';

export function classifyFrameContext(context){
 const c=context??{};
 if(c.hidden===true||c.focused===false)return 'inactive';
 if(c.hasBattle!==true)return 'unavailable';
 if(c.busy===true)return 'save-wait';
 if(c.paused===true)return 'menu';
 if(c.awaitingAdvance===true)return 'entry-wait';
 if(c.combat===true)return c.moving===true?'combat-moving':'combat';
 return c.moving===true?'moving':'idle';
}

// Nearest-rank percentiles. Rates are fractions (0..1), with a separate n for
// every metric. Empty samples stay null rather than claiming a zero-cost pass.
function summarize(values){
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b),n=sorted.length;
 const over16_7=sorted.filter(x=>x>16.7).length,over33_3=sorted.filter(x=>x>33.3).length;
 return {n,p50Ms:n?sorted[Math.ceil(n*.5)-1]:null,p95Ms:n?sorted[Math.ceil(n*.95)-1]:null,maxMs:n?sorted[n-1]:null,over16_7Count:over16_7,over16_7Ratio:n?over16_7/n:null,over33_3Count:over33_3,over33_3Ratio:n?over33_3/n:null};
}
function groupSummary(rows){
 const regular=rows.filter(row=>!row.suspended),work=regular.filter(row=>row.workStatus==='ok');
 return {frames:rows.length,suspendedFrames:rows.length-regular.length,
  rafInterval:summarize(regular.filter(row=>row.rafStatus==='ok').map(row=>row.rafIntervalMs)),
  total:summarize(work.map(row=>row.totalMs)),
  step:summarize(work.filter(row=>row.phaseStatus.step==='ok').map(row=>row.phaseMs.step)),
  render:summarize(work.filter(row=>row.phaseStatus.render==='ok').map(row=>row.phaseMs.render)),
  ui:summarize(work.filter(row=>row.phaseStatus.ui==='ok').map(row=>row.phaseMs.ui))};
}
const copySamples=rows=>rows.map(row=>({...row,phaseMs:{...row.phaseMs},phaseStatus:{...row.phaseStatus}}));
const summarizeModes=rows=>Object.fromEntries(FRAME_OBSERVATION_MODES.map(mode=>[mode,groupSummary(rows.filter(row=>row.mode===mode))]));
const summarizeSuspensions=rows=>({frames:rows.filter(row=>row.suspended).length,rafInterval:summarize(rows.filter(row=>row.suspended).map(row=>row.rafIntervalMs))});

export function createFrameObservation({enabled=false,limit=FRAME_OBSERVATION_LIMIT,now=()=>globalThis.performance?.now?.()}={}){
 const capacity=Number.isFinite(limit)?Math.max(1,Math.min(600,Math.floor(limit))):FRAME_OBSERVATION_LIMIT;
 const activeCapacity=Math.min(capacity,FRAME_OBSERVATION_LIMIT);
 let recording=enabled===true,rows=[],current=null,previous=null,sequence=0,totalFrames=0,abandonedFrames=0,lastClearReason='initial';
 let lastActiveRows=[],activeSegmentOpen=false,activeSegment=0,activeFrames=0,activeEndedBy=null;
 const clear=(reason='manual')=>{rows=[];lastActiveRows=[];activeSegmentOpen=false;activeSegment=0;activeFrames=0;activeEndedBy=null;current=null;previous=null;sequence=0;totalFrames=0;abandonedFrames=0;lastClearReason=typeof reason==='string'?reason.slice(0,80):'manual';};
 const readClock=()=>{try{return typeof now==='function'?now():undefined;}catch{return undefined;}};
 const sampleClock=()=>{
  const value=readClock(),status=clockStatus(value);
  if(status!=='ok'){current.clockIssue??=status;return null;}
  if(current.lastClock!==null&&value<current.lastClock)current.clockIssue??='backwards';
  current.lastClock=value;return value;
 };
 const rejectPhase=name=>{if(FRAME_OBSERVATION_PHASES.includes(name)){current.phaseMs[name]=null;current.phaseStatus[name]='invalid-bracket';}};
 return {
  get enabled(){return recording;},
  setEnabled(value){const next=value===true;if(next!==recording){recording=next;clear(next?'enabled':'disabled');}return recording;},
  clear,
  beginFrame(rafTimestamp,context){
   // Keep this before context reads, clock reads and allocations. Callers can
   // also guard on enabled to avoid constructing their own context while OFF.
   if(!recording)return false;
   if(current)abandonedFrames++;
   const mode=classifyFrameContext(context),inputStatus=clockStatus(rafTimestamp);
   // Keep the current active segment independently of the all-context ring.
   // Non-active frames freeze this tail; the next active segment replaces it.
   if(ACTIVE_MODES.has(mode)){
    if(!activeSegmentOpen){lastActiveRows=[];activeFrames=0;activeSegment++;activeEndedBy=null;activeSegmentOpen=true;}
   }else if(activeSegmentOpen){activeSegmentOpen=false;activeEndedBy=mode;}
   let rafStatus=inputStatus,rafIntervalMs=null;
   if(inputStatus==='ok'){
    if(!previous)rafStatus='warmup';
    else {
     const delta=rafTimestamp-previous.timestamp;
     if(!Number.isFinite(delta))rafStatus='nonfinite';
     else if(delta<=0)rafStatus=delta===0?'frozen':'backwards';
     else {rafIntervalMs=delta;rafStatus=delta>=FRAME_SUSPENSION_MS?'suspension':previous.mode!==mode?'transition':'ok';}
    }
   }
   const previousMode=previous?.mode??null;
   // A bad timestamp breaks continuity. The next valid timestamp is warm-up.
   previous=inputStatus==='ok'&&rafStatus!=='backwards'&&rafStatus!=='frozen'?{timestamp:rafTimestamp,mode}:null;
   current={sequence:++sequence,mode,previousMode,rafTimestampMs:validTime(rafTimestamp)?rafTimestamp:null,rafIntervalMs,rafStatus,suspended:rafStatus==='suspension',phaseMs:emptyPhases(),phaseStatus:emptyStatus(),openPhase:null,clockIssue:null,lastClock:null,startedAt:null};
   current.startedAt=sampleClock();return true;
  },
  beginPhase(name){
   if(!recording||!current)return false;
   if(!FRAME_OBSERVATION_PHASES.includes(name))return false;
   if(current.openPhase){rejectPhase(current.openPhase.name);rejectPhase(name);current.openPhase=null;return false;}
   current.openPhase={name,at:sampleClock()};return true;
  },
  endPhase(name){
   if(!recording||!current)return false;
   if(!FRAME_OBSERVATION_PHASES.includes(name))return false;
   const open=current.openPhase;
   if(!open||open.name!==name){rejectPhase(name);if(open)rejectPhase(open.name);current.openPhase=null;return false;}
   current.openPhase=null;
   const end=sampleClock();
   if(open.at===null||end===null||end<open.at||!Number.isFinite(end-open.at)){current.phaseStatus[name]='invalid-clock';current.phaseMs[name]=null;return false;}
   if(!['not-observed','ok'].includes(current.phaseStatus[name]))return false;
   current.phaseMs[name]=(current.phaseMs[name]??0)+end-open.at;
   current.phaseStatus[name]='ok';return true;
  },
  endFrame(options){
   if(!recording||!current)return false;
   const end=sampleClock(),frame=current;current=null;
   if(frame.openPhase){frame.phaseStatus[frame.openPhase.name]='incomplete';frame.phaseMs[frame.openPhase.name]=null;}
   const duration=end===null||frame.startedAt===null?null:end-frame.startedAt;
   const workStatus=options?.failed===true?'failed':frame.clockIssue??(duration===0?'frozen-or-below-resolution':!Number.isFinite(duration)||duration<0?'invalid-clock':'ok');
   if(workStatus!=='ok')for(const name of FRAME_OBSERVATION_PHASES){if(frame.phaseStatus[name]==='ok')frame.phaseStatus[name]='invalid-frame-clock';frame.phaseMs[name]=null;}
   const row={sequence:frame.sequence,mode:frame.mode,previousMode:frame.previousMode,rafTimestampMs:frame.rafTimestampMs,rafIntervalMs:frame.rafIntervalMs,rafStatus:frame.rafStatus,suspended:frame.suspended,workStatus,totalMs:workStatus==='ok'?duration:null,phaseMs:frame.phaseMs,phaseStatus:frame.phaseStatus};
   rows.push(row);
   if(ACTIVE_MODES.has(frame.mode)){lastActiveRows.push(row);if(lastActiveRows.length>activeCapacity)lastActiveRows.shift();activeFrames++;}
   if(rows.length>capacity)rows.shift();totalFrames++;return true;
  },
  snapshot(){
   const samples=copySamples(rows),activeSamples=copySamples(lastActiveRows),byMode=summarizeModes(samples);
   return {enabled:recording,capacity,totalFrames,evictedFrames:Math.max(0,totalFrames-samples.length),abandonedFrames,lastClearReason,sampleCount:samples.length,
    units:'ms',percentileMethod:'nearest-rank',thresholdsMs:[16.7,33.3],suspensionThresholdMs:FRAME_SUSPENSION_MS,
    measurement:'Browser rAF scheduling intervals and synchronous JS elapsed time only; not GPU, display, audio, or physical input latency.',
    active:groupSummary(samples.filter(row=>ACTIVE_MODES.has(row.mode))),byMode,
    lastActive:{status:activeSegmentOpen?'recording':activeSamples.length?'retained':'empty',segment:activeSegment,capacity:activeCapacity,sampleCount:activeSamples.length,totalFrames:activeFrames,evictedFrames:Math.max(0,activeFrames-activeSamples.length),endedBy:activeEndedBy,firstSequence:activeSamples[0]?.sequence??null,lastSequence:activeSamples.at(-1)?.sequence??null,active:groupSummary(activeSamples),byMode:summarizeModes(activeSamples),suspensions:summarizeSuspensions(activeSamples),samples:activeSamples},
    suspensions:summarizeSuspensions(samples),
    transitions:{frames:samples.filter(row=>row.rafStatus==='transition').length},samples};
  }
 };
}
