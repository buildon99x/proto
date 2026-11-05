import {createTimelapseEnvironment} from './timelapse-environment.js';
import {cityTime,progress} from './istanbul-timeline.js';
/** Night is this world's reference default. The inherited weather UI remains independent. */
export function createIstanbulEnvironment(context){
 const {scene}=context,base=createTimelapseEnvironment(context),materials=new Set(),warmLights=[];
 scene.traverse(o=>{if(o.material?.userData?.istanbulLuminous)materials.add(o.material);if(o.userData.istanbulLight)warmLights.push(o);});
 base.setState({timeOfDay:'night'});let currentTime=0;
 function illuminate(){const state=base.getState(),on=state.timeOfDay==='night'?progress(cityTime(currentTime),49,57):0;
  for(const mat of materials)mat.emissiveIntensity=.025+on*mat.userData.istanbulLuminous;
  for(const light of warmLights)light.intensity=on*light.userData.nightPower;
  if(state.timeOfDay==='night'&&state.weather==='clear'){
   const sky=scene.getObjectByName('atmosphere-sky');if(sky){sky.material.uniforms.horizon.value.set('#2c4264');sky.material.uniforms.zenith.value.set('#263b5b');}
   context.lights.sky.color.set('#b3c4e2');context.lights.sky.groundColor.set('#63718a');context.lights.sky.intensity=.98;context.lights.sun.color.set('#b4c7ee');context.lights.sun.intensity=1.15;
   const stars=scene.getObjectByName('night-stars'),moon=scene.getObjectByName('night-moon');if(stars)stars.material.opacity=.22;if(moon)moon.material.uniforms.opacity.value=.28;
  }
 }
 illuminate();return{getState:base.getState,setState(state){base.setState(state);illuminate();},tick(t,camera){currentTime=t;base.tick(t,camera);illuminate();}};
}
