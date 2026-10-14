import {writeFileSync} from 'node:fs';
import {solve,advance,clone,sweep} from '../app/src/physics';
import type {Shot} from '../app/src/physics';
const records=[];let maxError=0,maxPredictionError=0;const netCounts:Record<string,number>={};
for(let i=0;i<1000;i++){
 const shot=['clear','drive','drop','smash','superSmash'][i%5] as Shot,start={x:Math.sin(i)*1.5,y:i%5>=3?2.7:1.7,z:-1.5-i%6*.7},target={x:Math.cos(i*7)*2,y:.025,z:shot==='drop'?1.2:3+i%4*.9},s=solve(start,target,shot),p=clone(start),v=clone(s.velocity);let actual=null;
 for(let k=0;k<720;k++){const old=clone(p);advance(p,v);actual=sweep(old,p);if(actual)break;}
 const error=actual?Math.hypot(actual.p.x-s.prediction.end.x,actual.p.z-s.prediction.end.z):Infinity;maxPredictionError=Math.max(maxPredictionError,error);if(actual?.reason==='NET')netCounts[shot]=(netCounts[shot]||0)+1;else maxError=Math.max(maxError,s.error);
 records.push({case:i,shot,start,target,launch:s.velocity,result:actual?.reason,landing:actual?.p,landingError:s.error,predictionError:error,apex:s.prediction.apex,netHeight:Number.isFinite(s.prediction.netHeight)?s.prediction.netHeight:null,flightSeconds:s.prediction.time});
}
const result={method:'120Hz numeric solver and swept actual integrator; NET candidates explicitly counted, not passed as successful landings',count:1000,maxValidLandingError:maxError,maxPredictionError,netCounts,records};writeFileSync('projects/SmashRally3D/assets/reports/physics-1000.json',JSON.stringify(result));console.log(JSON.stringify({...result,records:undefined}));
