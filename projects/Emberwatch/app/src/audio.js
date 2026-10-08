import { AUDIO_BANK } from './assets/audio-manifest.js';

// Sampled fantasy foley; War Cry attribution is in assets/audio-credits.txt.
// Nothing initializes or sounds until resume()
// or setEnabled(true) is called from an explicitly opted-in user interaction.
export const AUDIO_EVENTS = Object.freeze({
  slash:{family:'slash',gain:.65,wet:.07,group:'swing',priority:4,gap:.045},
  heavySwing:{family:'heavySwing',gain:.84,wet:.10,group:'swing',priority:5,gap:.06},
  hit:{family:'hit',gain:.86,wet:.10,group:'impact',priority:7,gap:.023},
  heavyHit:{family:'heavyHit',gain:.97,wet:.15,group:'impact',priority:9,gap:.04},
  magicCharge:{family:'magicCharge',gain:.50,wet:.21,group:'magic',priority:4,gap:.09},
  magicRelease:{family:'magicRelease',gain:.69,wet:.22,group:'magic',priority:6,gap:.07},
  magicHit:{family:'magicHit',gain:.78,wet:.21,group:'impact',priority:7,gap:.03},
  skill:{family:'magicRelease',gain:.69,wet:.22,group:'magic',priority:6,gap:.07},
  axeWhirl:{family:'axeWhirl',gain:.72,wet:.11,group:'swing',priority:6,gap:.15},
  warCry:{family:'warCry',gain:.72,wet:.055,group:'hero',priority:8,gap:.2},
  enemyTell:{family:'enemyTell',gain:.53,wet:.16,group:'enemy',priority:5,gap:.055},
  enemyRelease:{family:'enemyRelease',gain:.61,wet:.11,group:'enemy',priority:6,gap:.055},
  footstep:{family:'footstep',gain:.1105,wet:0,group:'foley',priority:1,gap:.045},
  coin:{family:'coin',gain:.27,wet:.07,group:'reward',priority:2,gap:.085},
  hurt:{family:'hurt',gain:.84,wet:.11,group:'hero',priority:10,gap:.14},
  die:{family:'die',gain:.88,wet:.22,group:'hero',priority:10,gap:.3},
  dash:{family:'dash',gain:.64,wet:.09,group:'swing',priority:5,gap:.10},
  level:{family:'level',gain:.56,wet:.30,group:'reward',priority:4,gap:.5}
});

const AUDIO_GROUP_LIMITS = {swing:3,impact:5,magic:3,hero:2,enemy:3,foley:2,reward:2};
const audioClamp = (value, low, high) => Math.max(low, Math.min(high, value));
const audioFinite = (value, fallback) => Number.isFinite(value) ? value : fallback;

export function createFantasyAudio({enabled=false,contextFactory,fetcher,random=Math.random,masterVolume=.78}={}) {
  const enabledGetter = typeof enabled==='function' ? enabled : null;
  let enabledState = enabledGetter ? true : !!enabled;
  let context=null,master=null,compressor=null,reverb=null,reverbGain=null,ambientBus=null,bank=null;
  let loading=null,disposed=false,paused=false,scene='town',combat=0,loadError=null,resumePending=null;
  let generation=0,clock=0,duckUntil=0,lastScene=null;
  const voices=new Set(),ambience=new Map(),lastPlay=new Map(),lastVariant=new Map();
  const isEnabled=()=>!disposed&&enabledState&&(!enabledGetter||!!enabledGetter());
  const ramp=(param,value,duration=.03)=>{
    if(!param||!context)return;
    param.cancelScheduledValues(context.currentTime);
    param.setTargetAtTime(value,context.currentTime,Math.max(.001,duration));
  };
  function releaseVoice(voice,fade=.012) {
    if(!voices.delete(voice))return;
    ramp(voice.gain.gain,0,fade/3);
    try{voice.source.stop(context.currentTime+fade);}catch{/* already finished */}
  }
  function clearVoices(){for(const voice of [...voices])releaseVoice(voice);lastPlay.clear();}
  function stopAmbience(){
    for(const value of ambience.values()){
      try{value.source.stop();}catch{/* already stopped */}
      value.source.disconnect();value.gain.disconnect();
    }
    ambience.clear();lastScene=null;
  }
  function buildRoom() {
    // Short diffuse chamber response with three quiet early reflections.
    // Procedurally created on first opt-in, independent of sample variation.
    const length=Math.floor(context.sampleRate*1.05),buffer=context.createBuffer(2,length,context.sampleRate);
    let seed=0x4e42;
    const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
    for(let ch=0;ch<2;ch++){
      const samples=buffer.getChannelData(ch);let low=0;
      for(let i=0;i<length;i++){
        const t=i/context.sampleRate;low+=.32*(rng()-low);
        samples[i]=low*Math.exp(-t*7.5)*Math.min(1,t/.009)*.13;
      }
      for(const [delay,level] of [[.028,.16],[.047,.09],[.081,.045]])samples[Math.floor((delay+ch*.004)*context.sampleRate)]+=level;
    }
    return buffer;
  }
  function initialize() {
    if(context||!isEnabled())return !!context;
    const Native=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!contextFactory&&!Native){loadError='Web Audio is unavailable';return false;}
    try{
      context=contextFactory?contextFactory():new Native({latencyHint:'interactive'});
      master=context.createGain();master.gain.value=paused?0:audioClamp(masterVolume,0,1);
      compressor=context.createDynamicsCompressor();
      compressor.threshold.value=-14;compressor.knee.value=12;compressor.ratio.value=5;
      compressor.attack.value=.003;compressor.release.value=.16;
      // Bounded sample sums -> soft saturation -> conservative output ceiling.
      const limiter=context.createWaveShaper(),curve=new Float32Array(4096);
      for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=Math.tanh(x*1.15)*.89;}
      limiter.curve=curve;limiter.oversample='2x';
      const highpass=context.createBiquadFilter();highpass.type='highpass';highpass.frequency.value=42;highpass.Q.value=.65;
      const lowpass=context.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=11000;lowpass.Q.value=.5;
      master.connect(highpass);highpass.connect(lowpass);lowpass.connect(compressor);compressor.connect(limiter);limiter.connect(context.destination);
      reverb=context.createConvolver();reverb.buffer=buildRoom();reverbGain=context.createGain();reverbGain.gain.value=.47;
      reverb.connect(reverbGain);reverbGain.connect(master);
      ambientBus=context.createGain();ambientBus.gain.value=0;ambientBus.connect(master);
      return true;
    }catch(error){loadError=String(error?.message||error);try{context?.close();}catch{}context=null;return false;}
  }
  async function load() {
    if(bank)return true;
    if(loading)return loading;
    const currentGeneration=generation;
    loading=(async()=>{
      try{
        const read=fetcher||globalThis.fetch;
        if(!read)throw new Error('Sample loading is unavailable');
        const url=AUDIO_BANK.file.startsWith('data:')?AUDIO_BANK.file:new URL(AUDIO_BANK.file,import.meta.url).href;
        const response=await read(url);
        if(!response.ok)throw new Error(`Audio atlas returned HTTP ${response.status}`);
        const decoded=await context.decodeAudioData(await response.arrayBuffer());
        if(disposed||generation!==currentGeneration)return false;
        if(decoded.duration+.01<AUDIO_BANK.duration)throw new Error('Audio atlas is truncated');
        bank=decoded;loadError=null;return true;
      }catch(error){loadError=String(error?.message||error);return false;}
      finally{loading=null;}
    })();
    return loading;
  }
  async function resume() {
    if(!isEnabled())return false;
    if(!initialize())return false;
    // Browser resume must be requested synchronously inside the user's gesture.
    if(!resumePending&&context.state!=='running'){
      try{resumePending=Promise.resolve(context.resume()).catch(error=>{loadError=String(error?.message||error);}).finally(()=>{resumePending=null;});}
      catch(error){loadError=String(error?.message||error);return false;}
    }
    const ready=load();if(resumePending)await resumePending;
    return (await ready)&&isEnabled()&&context.state==='running';
  }
  function setEnabled(value) {
    enabledState=!!value;
    if(!enabledState){clearVoices();stopAmbience();ramp(master?.gain,0,.012);}
    else if(isEnabled()){
      ramp(master?.gain,paused?0:audioClamp(masterVolume,0,1),.03);
      return resume();
    }
    return Promise.resolve(false);
  }
  function play(type,options={}) {
    if(!isEnabled()||paused||!bank||!context||context.state!=='running')return false;
    const event=AUDIO_EVENTS[type];if(!event)return false;
    const now=context.currentTime;
    if(now-(lastPlay.get(type)??-Infinity)<event.gap)return false;
    let family=event.family;
    if(type==='hit'&&(options.material==='metal'||options.material==='armor'))family='metalHit';
    const variants=AUDIO_BANK.clips[family];if(!variants?.length)return false;
    let index=Math.floor(audioClamp(random(),0,.999999)*variants.length);
    if(type==='footstep'&&options.foot){
      const parity=options.foot==='left'?0:1;index=parity+2*Math.floor(audioClamp(random(),0,.999999)*Math.ceil((variants.length-parity)/2));
    }else if(type.startsWith('enemy')&&options.enemy){
      const role=options.enemy;
      index=/brute|boss|guardian|heavy/.test(role)?2:/archer|caster|ranged/.test(role)?1:0;
    }else if(variants.length>1&&index===lastVariant.get(family))index=(index+1)%variants.length;
    const same=[...voices].filter(voice=>voice.group===event.group);
    if(same.length>=AUDIO_GROUP_LIMITS[event.group]){
      const weakest=same.sort((a,b)=>a.priority-b.priority||a.started-b.started)[0];
      if(weakest.priority>event.priority)return false;
      releaseVoice(weakest);
    }
    if(voices.size>=16){
      const weakest=[...voices].sort((a,b)=>a.priority-b.priority||a.started-b.started)[0];
      if(weakest.priority>event.priority)return false;
      releaseVoice(weakest);
    }
    const clip=variants[index];lastVariant.set(family,index);lastPlay.set(type,now);
    const source=context.createBufferSource(),gain=context.createGain(),wet=context.createGain();
    source.buffer=bank;
    let rate=(.97+audioClamp(random(),0,1)*.06)*audioClamp(audioFinite(options.pitch,1),.8,1.2);
    let when=now,offset=clip.offset,duration=clip.duration;
    // Align the measured 12 ms energy peak, not just the clip's first sample.
    // Only swishes are anticipatory. Contact impacts can never be scheduled early.
    if((type==='slash'||type==='heavySwing')&&Number.isFinite(options.contactIn)){
      const contactIn=audioClamp(options.contactIn,0,1.5),peak=clip.peakTime||0;
      if(contactIn>0&&contactIn<peak/rate)rate=audioClamp(peak/contactIn,rate,1.6);
      const lead=peak/rate;when=now+Math.max(0,contactIn-lead);
      const trim=Math.max(0,lead-contactIn)*rate;offset+=trim;duration-=trim;
    }
    source.playbackRate.value=rate;
    const intensity=audioClamp(audioFinite(options.intensity,1),.35,1.35);
    const volume=audioClamp(audioFinite(options.volume,1),0,1.5);
    const variation=.92+audioClamp(random(),0,1)*.13;
    gain.gain.value=event.gain*intensity*volume*variation;
    wet.gain.value=event.wet;
    source.connect(gain);
    let panNode=null;
    if(context.createStereoPanner){
      panNode=context.createStereoPanner();
      panNode.pan.value=audioClamp(audioFinite(options.pan,0),-.78,.78);
      gain.connect(panNode);panNode.connect(master);panNode.connect(wet);
    }else{gain.connect(master);gain.connect(wet);}
    wet.connect(reverb);
    const voice={source,gain,wet,panNode,group:event.group,priority:event.priority,started:when,tag:options.tag};
    voices.add(voice);
    source.onended=()=>{voices.delete(voice);source.disconnect();gain.disconnect();wet.disconnect();panNode?.disconnect();};
    source.start(when,offset,duration);
    if(event.priority>=7)duckUntil=now+.18;
    return true;
  }
  function cancel(tag) {
    if(tag==null)return 0;let count=0;
    for(const voice of [...voices])if(voice.tag===tag){releaseVoice(voice);count++;}
    return count;
  }
  function updateAmbience() {
    if(!bank||!context||!isEnabled()||paused||context.state!=='running')return;
    // Two bounded, phase-independent stems. Change of scene crossfades quietly.
    if(lastScene!==scene){
      for(const [key,value] of ambience)ramp(value.gain.gain,key===scene?1:0,.35);
      if(!ambience.has(scene)){
        const family=scene==='dungeon'?'ambienceDungeon':'ambienceTown',clip=AUDIO_BANK.clips[family][0];
        const source=context.createBufferSource(),gain=context.createGain();
        source.buffer=bank;source.loop=true;source.loopStart=clip.offset;source.loopEnd=clip.offset+clip.duration;
        gain.gain.value=0;source.connect(gain);gain.connect(ambientBus);source.start(context.currentTime,clip.offset);
        ambience.set(scene,{source,gain});ramp(gain.gain,1,.45);
      }
      lastScene=scene;
    }
    const base=scene==='dungeon'?.075:.055;
    const duck=context.currentTime<duckUntil?.4:1;
    ramp(ambientBus.gain,base*(1-combat*.34)*duck,.075);
  }
  function tick(dt,{scene:nextScene=scene,paused:nextPaused=paused,combat:nextCombat=0}={}) {
    clock+=Math.max(0,audioFinite(dt,0));
    if(nextPaused!==paused)pause(nextPaused);
    scene=nextScene==='dungeon'?'dungeon':'town';combat=audioClamp(audioFinite(nextCombat,0),0,1);
    if(!isEnabled()){
      if(voices.size||ambience.size){clearVoices();stopAmbience();}
      ramp(master?.gain,0,.012);return;
    }
    if(paused)return;
    ramp(master?.gain,audioClamp(masterVolume,0,1),.025);
    updateAmbience();
  }
  function pause(value=true) {
    paused=!!value;
    if(paused){clearVoices();stopAmbience();ramp(master?.gain,0,.012);}
    else if(isEnabled())ramp(master?.gain,audioClamp(masterVolume,0,1),.03);
  }
  function dispose() {
    if(disposed)return;
    clearVoices();stopAmbience();disposed=true;generation++;
    try{context?.close();}catch{/* optional browser cleanup */}
    bank=null;
  }
  return Object.freeze({play,resume,setEnabled,tick,pause,cancel,dispose,
    status:()=>({enabled:isEnabled(),ready:!!bank,state:context?.state||'uninitialized',paused,
      voices:voices.size,ambience:ambience.size,error:loadError,clock})});
}
