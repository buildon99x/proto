/** Pure absolute-time environment keyframes. Times are seconds in [0, duration).
 * Each key is the target at its time. Interpolation wraps through the loop seam.
 * Same-time events in one channel: the last input event wins; IDs stay unchanged.
 */
export const ENVIRONMENT_TYPES = Object.freeze(['clear', 'cloudy', 'rain', 'sandstorm', 'day', 'night']);
const WEATHER = ENVIRONMENT_TYPES.slice(0, 4), TIMES = ENVIRONMENT_TYPES.slice(4);
const wrap = (t, d) => ((t % d) + d) % d;
function validateDuration(duration) {
 if (!Number.isFinite(duration) || duration <= 0) throw new TypeError('Environment duration must be finite and positive.');
}
export function createDefaultEnvironmentTrack(duration) {
 validateDuration(duration);
 return [[0,'clear'],[.22,'cloudy'],[.4,'rain'],[.61,'sandstorm'],[.8,'clear'],[0,'day'],[.34,'night'],[.57,'day'],[.8,'night'],[.94,'day']]
  .map(([fraction,type],i)=>({id:`environment-${i+1}`,time:fraction*duration,type}));
}
export function validateEnvironmentTrack(events, duration) {
 validateDuration(duration);
 if (!Array.isArray(events)) throw new TypeError('Environment track must be an array.');
 const ids = new Set();
 return Array.from(events, event => {
  if (!event || typeof event !== 'object' || typeof event.id !== 'string' || !event.id.trim() || ids.has(event.id)) throw new TypeError('Environment events need unique nonempty stable IDs.');
  if (!Number.isFinite(event.time) || event.time < 0 || event.time >= duration) throw new RangeError('Environment event time must be inside the loop.');
  if (!ENVIRONMENT_TYPES.includes(event.type)) throw new TypeError('Unknown environment event type.');
  ids.add(event.id); return {id:event.id,time:event.time,type:event.type};
 });
}
export function sampleEnvironmentTrack(events, t, duration) {
 validateDuration(duration);
 if (!Number.isFinite(t)) throw new TypeError('Environment sample time must be finite.');
 const time = wrap(t,duration);
 function sample(types) {
  const weights = Object.fromEntries(types.map((type,i)=>[type,i===0?1:0]));
  const atTime = new Map();
  for (const event of events) if (types.includes(event.type)) atTime.set(event.time,event);
  const keys = [...atTime.values()].sort((a,b)=>a.time-b.time);
  if (!keys.length) return weights;
  for (const type of types) weights[type]=0;
  const nextIndex=keys.findIndex(event=>event.time>time), next=keys[nextIndex<0?0:nextIndex], previous=keys[((nextIndex<0?keys.length:nextIndex)+keys.length-1)%keys.length];
  if (keys.length===1) { weights[previous.type]=1; return weights; }
  const span=wrap(next.time-previous.time,duration), fraction=wrap(time-previous.time,duration)/span;
  const eased=fraction*fraction*(3-2*fraction);
  weights[previous.type]+=1-eased; weights[next.type]+=eased;
  return weights;
 }
 return {weather:sample(WEATHER),timeOfDay:sample(TIMES)};
}
