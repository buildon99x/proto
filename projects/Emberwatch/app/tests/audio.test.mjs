// Sample data and mocked Web Audio contract checks. These do not prove sound quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createFantasyAudio,AUDIO_EVENTS} from '../src/audio.js';
import {AUDIO_BANK} from '../src/assets/audio-manifest.js';

const wav=fs.readFileSync(new URL('../src/assets/audio-fantasy.wav',import.meta.url));
const pcm=wav.subarray(44),sr=AUDIO_BANK.sampleRate;
const samples=clip=>{const result=[];for(let i=Math.round(clip.offset*sr);i<Math.round((clip.offset+clip.duration)*sr);i++)result.push(pcm.readInt16LE(i*2)/32768);return result;};
const param=(value=0)=>({value,cancelScheduledValues(){},setTargetAtTime(v){this.value=v;}});
class MockNode {
  constructor(context,kind){this.context=context;this.kind=kind;this.connections=[];this.gain=param(1);this.frequency=param();this.Q=param();this.pan=param();this.playbackRate=param(1);}
  connect(node){this.connections.push(node);return node;}
  disconnect(){this.disconnected=true;}
  start(...args){this.started=args;}
  stop(time){this.stopped=time??this.context.currentTime;this.onended?.();}
}
class MockContext {
  constructor(){this.currentTime=1;this.sampleRate=32000;this.state='suspended';this.sources=[];this.panners=[];this.nodes=[];this.destination={};this.resumes=0;}
  node(kind){const n=new MockNode(this,kind);this.nodes.push(n);return n;}
  createGain(){return this.node('gain');}
  createBiquadFilter(){return this.node('filter');}
  createConvolver(){return this.node('convolver');}
  createWaveShaper(){return this.node('limiter');}
  createDynamicsCompressor(){const n=this.node('compressor');for(const k of ['threshold','knee','ratio','attack','release'])n[k]=param();return n;}
  createStereoPanner(){const n=this.node('panner');this.panners.push(n);return n;}
  createBufferSource(){const n=this.node('source');this.sources.push(n);return n;}
  createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));return {duration:length/sampleRate,getChannelData:i=>data[i]};}
  async decodeAudioData(){return {duration:AUDIO_BANK.duration};}
  async resume(){this.resumes++;this.state='running';}
  close(){this.state='closed';return Promise.resolve();}
  advance(dt=.2){this.currentTime+=dt;}
}
function harness(options={}){
  const context=new MockContext();let initializations=0,fetches=0;
  const audio=createFantasyAudio({enabled:true,contextFactory:()=>{initializations++;return context;},fetcher:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>wav.buffer.slice(wav.byteOffset,wav.byteOffset+wav.byteLength)};},random:()=>.5,...options});
  return {audio,context,counts:()=>({initializations,fetches})};
}

test('55 original PCM samples have valid bounds, non-silent content, unclipped peaks, fades and distinct variants',()=>{
  assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
  assert.equal(wav.readUInt16LE(22),1);assert.equal(wav.readUInt32LE(24),32000);assert.equal(wav.readUInt16LE(34),16);
  assert.equal(pcm.length/2/sr,AUDIO_BANK.duration);
  let count=0,previousEnd=0;
  for(const [family,clips] of Object.entries(AUDIO_BANK.clips)){
    const hashes=new Set();
    for(const clip of clips){
      assert(clip.offset>=previousEnd-1/sr,family+' non-overlapping');
      assert(clip.offset+clip.duration<=AUDIO_BANK.duration,family+' in bounds');
      assert(clip.peakTime>=0&&clip.peakTime<clip.duration);
      const x=samples(clip);let peak=0,power=0,mean=0;
      for(const value of x){assert(Number.isFinite(value));peak=Math.max(peak,Math.abs(value));power+=value*value;mean+=value;}
      assert(peak>.2&&peak<.84,`${family} peak ${peak}`);assert(Math.sqrt(power/x.length)>.012,`${family} not silent`);
      assert(Math.abs(mean/x.length)<.003,`${family} DC offset`);
      if(!family.startsWith('ambience')){assert.equal(x[0],0);assert.equal(x.at(-1),0);}
      const raw=Buffer.alloc(x.length*2);x.forEach((v,i)=>raw.writeInt16LE(Math.round(v*32768),i*2));hashes.add(createHash('sha256').update(raw).digest('hex'));
      previousEnd=clip.offset+clip.duration;count++;
    }
    assert.equal(hashes.size,clips.length,family+' variants are unique');
  }
  assert.equal(count,55);
  for(const event of Object.values(AUDIO_EVENTS))assert(AUDIO_BANK.clips[event.family]);
  for(const family of ['hit','heavyHit','hurt','magicHit'])for(const clip of AUDIO_BANK.clips[family]){
    const x=samples(clip);let total=0,early=0;for(let i=0;i<x.length;i++){total+=x[i]**2;if(i<sr*.03)early+=x[i]**2;}
    assert(early/total>.15,family+' has an early contact transient');
  }
});

test('disabled audio and ordinary play/tick never create a context or fetch samples',async()=>{
  let enabled=false;const h=harness({enabled:()=>enabled});
  assert.equal(h.audio.play('hit'),false);h.audio.tick(.1,{scene:'dungeon'});assert.equal(await h.audio.resume(),false);
  assert.deepEqual(h.counts(),{initializations:0,fetches:0});
  enabled=true;assert.equal(h.audio.play('hit'),false);h.audio.tick(.1);assert.equal(h.counts().initializations,0);
  assert.equal(await h.audio.resume(),true);assert.deepEqual(h.counts(),{initializations:1,fetches:1});
  assert.equal(h.audio.play('hit'),true);assert.equal(h.context.sources.length,1);
  enabled=false;h.audio.tick(.1);assert.equal(h.audio.status().voices,0);assert.equal(h.audio.play('hit'),false);
});

test('no stale impact is queued while the atlas loads',async()=>{
  let release;const h=harness({fetcher:()=>new Promise(resolve=>{release=()=>resolve({ok:true,arrayBuffer:async()=>wav.buffer});})});
  const loading=h.audio.resume();assert.equal(h.audio.play('heavyHit'),false);assert.equal(h.context.sources.length,0);
  release();assert.equal(await loading,true);assert.equal(h.context.sources.length,0);
  assert.equal(h.audio.play('heavyHit'),true);
});

test('repeat suppression, no immediate repeated variant, material and directional variants',async()=>{
  const h=harness({random:()=>0});await h.audio.resume();
  assert.equal(h.audio.play('hit',{pan:3}),true);const first=h.context.sources.at(-1).started[1];
  assert.equal(h.audio.play('hit'),false);h.context.advance(.024);
  assert.equal(h.audio.play('hit'),true);assert.notEqual(h.context.sources.at(-1).started[1],first);
  h.context.advance();h.audio.play('hit',{material:'armor'});assert.equal(h.context.sources.at(-1).started[1],AUDIO_BANK.clips.metalHit[0].offset);
  h.audio.play('enemyTell',{enemy:'brute'});assert.equal(h.context.sources.at(-1).started[1],AUDIO_BANK.clips.enemyTell[2].offset);
  assert.equal(h.context.panners[0].pan.value,.78);assert.equal(h.audio.play('typo'),false);
});

test('scheduled swipe energy peaks align to contact and can be canceled without a ghost swing',async()=>{
  const h=harness();await h.audio.resume();
  for(const [type,contactIn] of [['slash',.21],['heavySwing',.34],['slash',.04],['heavySwing',0]]){
    h.context.advance();assert(h.audio.play(type,{contactIn,tag:'heroAttack'}));
    const source=h.context.sources.at(-1),[when,offset]=source.started;
    const clip=AUDIO_BANK.clips[type].find(c=>offset>=c.offset&&offset<c.offset+c.duration);
    const peakAt=when+(clip.peakTime-(offset-clip.offset))/source.playbackRate.value;
    assert(Math.abs(peakAt-(h.context.currentTime+contactIn))<.00001,`${type} peak aligned`);
    assert.equal(h.audio.cancel('heroAttack'),1);assert.notEqual(source.stopped,undefined);
  }
  assert.equal(h.audio.cancel(undefined),0);
  h.audio.play('hit',{contactIn:.4});assert.equal(h.context.sources.at(-1).started[0],h.context.currentTime,'impact cannot move before or after contact');
});

test('polyphony is bounded and low-priority contact floods cannot replace heavy impacts',async()=>{
  const h=harness();await h.audio.resume();
  for(let i=0;i<5;i++){h.context.advance(.05);assert(h.audio.play('heavyHit'));}
  h.context.advance(.05);assert.equal(h.audio.play('hit'),false);assert.equal(h.audio.status().voices,5);
  for(let round=0;round<8;round++)for(const type of Object.keys(AUDIO_EVENTS)){h.context.advance(.2);h.audio.play(type);assert(h.audio.status().voices<=16);}
  h.context.advance(.2);assert(h.audio.play('hurt'),'player hurt has priority');assert(h.audio.status().voices<=16);
});

test('pause/disable remove voices and loops; user can unlock silently while paused',async()=>{
  const h=harness();h.audio.pause(true);assert(await h.audio.resume());assert.equal(h.audio.play('hit'),false);
  h.audio.pause(false);h.audio.tick(.1,{scene:'town',paused:false});assert.equal(h.audio.status().ambience,1);
  h.audio.tick(.1,{scene:'dungeon'});assert.equal(h.audio.status().ambience,2);h.audio.tick(.1,{scene:'town'});assert.equal(h.audio.status().ambience,2);
  h.audio.play('hit');h.audio.pause(true);assert.equal(h.audio.status().voices,0);assert.equal(h.audio.status().ambience,0);
  h.audio.pause(false);h.audio.tick(.1);assert.equal(h.audio.status().ambience,1);
  await h.audio.setEnabled(false);assert.equal(h.audio.status().ambience,0);assert.equal(h.audio.play('hit'),false);
  assert(await h.audio.setEnabled(true));h.audio.dispose();assert.equal(h.context.state,'closed');assert.equal(h.audio.status().ready,false);assert.equal(await h.audio.resume(),false);
});

test('short stereo reverb, low/high cuts and bounded nonlinear output form the runtime mix',async()=>{
  const h=harness();await h.audio.resume();const limiter=h.context.nodes.find(n=>n.kind==='limiter');
  assert.equal(limiter.curve.length,4096);assert.equal(limiter.oversample,'2x');
  for(const value of limiter.curve)assert(Number.isFinite(value)&&Math.abs(value)<.9);
  const filters=h.context.nodes.filter(n=>n.kind==='filter');assert(filters.some(n=>n.type==='highpass'&&n.frequency.value===42));
  assert(filters.some(n=>n.type==='lowpass'&&n.frequency.value===11000));
  const room=h.context.nodes.find(n=>n.kind==='convolver').buffer;assert(room.duration<=1.1);
  assert.notDeepEqual(room.getChannelData(0),room.getChannelData(1));
});

test('sample read failure is reported, is retryable and never falls back to oscillator beeps',async()=>{
  let attempts=0;const h=harness({fetcher:async()=>{if(++attempts===1)return {ok:false,status:404};return {ok:true,arrayBuffer:async()=>wav.buffer};}});
  assert.equal(await h.audio.resume(),false);assert.match(h.audio.status().error,/404/);assert.equal(h.audio.play('hit'),false);
  assert.equal(await h.audio.resume(),true);assert.equal(h.audio.status().error,null);
  const source=fs.readFileSync(new URL('../src/audio.js',import.meta.url),'utf8');assert(!source.includes('createOscillator'));
});
