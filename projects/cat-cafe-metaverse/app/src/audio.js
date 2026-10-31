// Original procedural tones, not sampled recordings or third-party assets.
export function soundPlan(action){return ({pet:[{frequency:92,endFrequency:75,duration:.8,gain:.08,type:'sine',delay:0},{frequency:620,endFrequency:360,duration:.42,gain:.055,type:'sine',delay:.12}],feather:[{frequency:1200,endFrequency:1700,duration:.16,gain:.035,type:'triangle',delay:0},{frequency:1450,endFrequency:1100,duration:.18,gain:.03,type:'triangle',delay:.18}],ball:[{frequency:340,endFrequency:130,duration:.18,gain:.09,type:'sine',delay:0},{frequency:260,endFrequency:110,duration:.14,gain:.05,type:'sine',delay:.24}]})[action]||[];}
export function actionMood(action){return {pet:'기분 좋은 골골송 ♡ 고양이가 편안해해요.',feather:'호기심 가득! 깃털을 따라 폴짝 놀아요.',ball:'신났어요! 데굴데굴 공을 따라가요.'}[action]||'고양이가 잠깐 쉬고 있어요.';}
export class ActionFeedback {
 constructor(clock=Date.now){this.clock=clock;this.pending=new Map();}
 track(id,action){this.pending.set(id,{action,at:this.clock()});if(this.pending.size>32)this.pending.delete(this.pending.keys().next().value);}
 consume(event){if(event.type!=='actionResult')return null;const item=this.pending.get(event.requestId);this.pending.delete(event.requestId);return item&&event.ok&&this.clock()-item.at<=5000?item.action:null;}
 clear(){this.pending.clear();}
}
export class CafeAudio {
 constructor({createContext=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),storage=null,maxVoices=6}={}){this.createContext=createContext;this.storage=storage;this.maxVoices=Number.isFinite(maxVoices)?Math.max(1,Math.min(24,Math.floor(maxVoices))):6;this.voices=new Set();this.context=null;this.unlocked=false;this.muted=true;this.volume=.2;try{const saved=JSON.parse(storage?.getItem('cat-cafe-audio')||'null');if(saved&&typeof saved.muted==='boolean')this.muted=saved.muted;if(saved&&Number.isFinite(saved.volume))this.volume=Math.max(0,Math.min(1,saved.volume));}catch{}}
 get enabled(){return this.unlocked&&!this.muted&&this.context?.state==='running';}
 async toggle(trusted){if(!trusted)return false;if(this.enabled){this.setMuted(true);return true;}if(await this.unlock(trusted)){this.setMuted(false);return true;}return false;}
 save(){try{this.storage?.setItem('cat-cafe-audio',JSON.stringify({muted:this.muted,volume:this.volume}));}catch{}}
 async unlock(trusted){if(!trusted)return false;try{this.context??=this.createContext();await this.context.resume();this.unlocked=this.context.state==='running';return this.unlocked;}catch{this.unlocked=false;return false;}}
 setMuted(value){this.muted=!!value;if(this.muted)this.cleanup();this.save();}
 setVolume(value){this.volume=Number.isFinite(value)?Math.max(0,Math.min(1,value)):.2;if(this.volume===0)this.cleanup();this.save();}
 release(voice){if(!this.voices.delete(voice))return;try{voice.osc.stop();}catch{}try{voice.osc.disconnect();voice.gain.disconnect();}catch{}}
 cleanup(){for(const v of [...this.voices])this.release(v);}
 play(action){if(this.muted||!this.unlocked||!this.context||this.context.state!=='running'||this.volume<=0)return false;const plan=soundPlan(action);try{for(const note of plan){while(this.voices.size>=this.maxVoices)this.release(this.voices.values().next().value);const osc=this.context.createOscillator(),gain=this.context.createGain(),at=this.context.currentTime+note.delay,voice={osc,gain};this.voices.add(voice);osc.type=note.type;osc.frequency.setValueAtTime(note.frequency,at);osc.frequency.exponentialRampToValueAtTime(note.endFrequency,at+note.duration);gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(note.gain*this.volume,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+note.duration);osc.connect(gain);gain.connect(this.context.destination);osc.onended=()=>this.release(voice);osc.start(at);osc.stop(at+note.duration+.02);}return plan.length>0;}catch{this.cleanup();return false;}}
}
