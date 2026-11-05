import {createTimelapseEnvironment} from './timelapse-environment.js';
const weatherSet=new Set(['clear','cloudy','rain','snow']),timeSet=new Set(['day','night']);
const wrap=(v,n)=>((v%n)+n)%n;
/** Paris owns snowfall and city-light materials; the existing atmosphere owns sky/rain. */
export function createParisEnvironment(context){
 const {W,scene}=context,T=W.THREE,base=createTimelapseEnvironment(context),state={weather:'clear',timeOfDay:'night'};
 const lit=new Set(),snowSurfaces=new Map();scene.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const m=o.material;if(m.userData.nightIntensity)lit.add(m);if(m.userData.snowSurface)snowSurfaces.set(m,m.color.clone());});
 const count=1250,positions=new T.BufferAttribute(new Float32Array(count*3),3),seeds=new Float32Array(count*4);positions.setUsage(T.DynamicDrawUsage);
 let seed=271828;for(let i=0;i<seeds.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;seeds[i]=seed/4294967296;}
 const geometry=W.own(new T.BufferGeometry());geometry.setAttribute('position',positions);
 const snow=new T.Points(geometry,W.own(new T.PointsMaterial({color:'#f5f7ff',size:.055,transparent:true,opacity:.85,depthWrite:false,fog:true})));
 snow.name='paris-snowfall';snow.frustumCulled=false;scene.add(snow);let disposed=false;
 function apply(){base.setState({weather:state.weather==='snow'?'cloudy':state.weather,timeOfDay:state.timeOfDay});snow.visible=state.weather==='snow';for(const m of lit)m.emissiveIntensity=state.timeOfDay==='night'?m.userData.nightIntensity:0;for(const [m,color]of snowSurfaces)m.color.copy(color).lerp(new T.Color('#eef4f6'),state.weather==='snow'?.78:0);}
 function setState(partial){if(!partial||typeof partial!=='object'||Array.isArray(partial))throw TypeError('Atmosphere state must be an object.');for(const k of Reflect.ownKeys(partial))if(k!=='weather'&&k!=='timeOfDay')throw Error(`Unknown atmosphere state key: ${String(k)}`);if(Object.hasOwn(partial,'weather')&&!weatherSet.has(partial.weather))throw Error('Unknown weather.');if(Object.hasOwn(partial,'timeOfDay')&&!timeSet.has(partial.timeOfDay))throw Error('Unknown timeOfDay.');if(disposed)return;Object.assign(state,partial);apply();}
 function tick(t,camera){if(disposed||!Number.isFinite(t))return;base.tick(t,camera);if(!snow.visible)return;for(let i=0;i<count;i++){const k=i*3,j=i*4;positions.array[k]=wrap(seeds[j]*24+t*.22+Math.sin(t*.55+seeds[j+3]*12)*.35,24)-12;positions.array[k+1]=.15+wrap(seeds[j+1]*17-t*(.7+seeds[j+3]*.8),17);positions.array[k+2]=seeds[j+2]*24-12+Math.sin(t*.4+seeds[j]*9)*.22;}positions.needsUpdate=true;}
 W.own({dispose(){disposed=true;snow.removeFromParent();for(const m of lit)m.emissiveIntensity=0;for(const[m,color]of snowSurfaces)m.color.copy(color);}});apply();
 return{setState,getState:()=>({...state}),tick};
}
