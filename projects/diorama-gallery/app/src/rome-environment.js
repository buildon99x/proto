import {createTimelapseEnvironment} from './timelapse-environment.js';
export const ROME_WEATHER=Object.freeze([['clear','맑은 날'],['cloudy','흐린 날'],['rain','비오는 날'],['snow','눈오는 날']]);
export function createRomeEnvironment(args){
 const {W,scene,lights:{sky,sun}}=args,T=W.THREE,base=createTimelapseEnvironment(args),state={weather:'clear',timeOfDay:'night'};
 const materials=new Set();scene.traverse(o=>{for(const m of [].concat(o.material??[]))if(m.userData?.romeLight)materials.add(m);});
 const lamps=[];for(const [x,y,z,power] of [[3.8,2.5,.9,5],[-4.9,1,-5.7,7],[-5,1,4.4,5],[-5.6,.7,-1,4],[3.7,2.6,3.4,4],[.5,.5,6.0,3]]){const l=new T.PointLight('#ffbc68',power,5,2);l.position.set(x,y,z);scene.add(l);lamps.push({l,power});}
 const count=480,positions=new T.BufferAttribute(new Float32Array(count*3),3);positions.setUsage(T.DynamicDrawUsage);const geometry=W.own(new T.BufferGeometry());geometry.setAttribute('position',positions);
 const material=W.own(new T.PointsMaterial({color:'#eef5ff',size:.045,transparent:true,opacity:.88,depthWrite:false,toneMapped:false}));const snow=new T.Points(geometry,material);snow.name='rome-snow';snow.frustumCulled=false;scene.add(snow);
 const seeds=new Float32Array(count*4);let seed=749;for(let i=0;i<seeds.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;seeds[i]=seed/4294967296;}
 let disposed=false;
 function apply(){base.setState({weather:state.weather==='snow'?'cloudy':state.weather,timeOfDay:state.timeOfDay});if(state.timeOfDay==='night'){sun.color.set('#e4c8a3');sun.intensity=state.weather==='rain'?.62:.96;sky.color.set('#91accb');sky.groundColor.set('#716858');sky.intensity=.95;}snow.visible=state.weather==='snow';for(const m of materials)m.emissiveIntensity=state.timeOfDay==='night'?m.userData.romeLight:0;for(const {l,power} of lamps)l.intensity=state.timeOfDay==='night'?power:0;}
 function setState(p){if(!p||typeof p!=='object'||Array.isArray(p))throw TypeError('Rome atmosphere state must be an object');for(const k of Reflect.ownKeys(p))if(k!=='weather'&&k!=='timeOfDay')throw Error('Unknown atmosphere state key');if(Object.hasOwn(p,'weather')&&!ROME_WEATHER.some(([v])=>v===p.weather))throw Error('Unknown Rome weather');if(Object.hasOwn(p,'timeOfDay')&&!['day','night'].includes(p.timeOfDay))throw Error('Unknown timeOfDay');if(disposed)return;Object.assign(state,p);apply();}
 function tick(t,camera){if(disposed||!Number.isFinite(t))return;base.tick(t,camera);if(!snow.visible)return;const a=positions.array;for(let i=0;i<count;i++){const j=i*4,k=i*3;a[k]=seeds[j]*21-10.5+Math.sin(t*.6+seeds[j+1]*17)*.25;a[k+1]=.2+(((seeds[j+1]*14-t*(.5+seeds[j+3]*.6))%14)+14)%14;a[k+2]=seeds[j+2]*22-10+Math.cos(t*.4+seeds[j]*13)*.18;}positions.needsUpdate=true;}
 W.own({dispose(){if(disposed)return;disposed=true;snow.removeFromParent();for(const {l} of lamps)l.removeFromParent();}});apply();return{getState:()=>({...state}),setState,tick};
}
