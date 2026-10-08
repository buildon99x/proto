/* Original camera/viewmodel response. Pure deterministic math; no DOM or render dependencies. */
(function(root){
 'use strict';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
 function spring(s,dt,w){const e=Math.exp(-w*dt),a=s.v+w*s.x;s.x=(s.x+a*dt)*e;s.v=(s.v-w*a*dt)*e;}
 const axes=['pitch','yaw','roll','back','drop','camera','cameraYaw'];
 // Values are authored stages, not one sine arc: present, magazine out, insert, seat, return.
 const stages=[
  [0,0,0,0,0,0,0,0,0],
  [.16,-.17,-.07,-.25,-.035,-.075,0,0,0],
  [.36,-.19,-.08,-.29,-.055,-.11,-.25,-.30,.12],
  [.60,-.16,-.065,-.27,-.048,-.09,-.31,-.36,.14],
  [.76,-.12,-.045,-.19,-.025,-.055,-.03,-.08,.04],
  [.86,-.09,-.02,-.10,-.015,-.035,0,.08,-.065],
  [1,0,0,0,0,0,0,0,0]
 ];
 function reloadPose(t,options={}){if(options.weapon===3||options===3)return rifleReloadPose(t,options.kind||options.reloadKind||'tactical');t=clamp(Number.isFinite(t)?t:0,0,1);let a=stages[0],b=stages[1];for(let i=1;i<stages.length;i++){b=stages[i];if(t<=b[0]){a=stages[i-1];break;}}let v=ease((t-a[0])/Math.max(.001,b[0]-a[0]));const p=Array.from({length:8},(_,i)=>lerp(a[i+1],b[i+1],v));return {pitch:p[0],yaw:p[1],roll:p[2],x:p[3],y:p[4],magazine:p[5],supportY:p[6],supportZ:p[7],supportX:-.055*Math.sin(t*Math.PI),slide:t>.81&&t<.95?.055*Math.sin((t-.81)/.14*Math.PI):0,index:t>.10&&t<.84?ease(Math.min((t-.10)/.12,(.84-t)/.1)):0};}
 // Fractions match the core's magazine/bolt events, not arbitrary animation beats.
 const rifleStages={
  tactical:[
   [0,0,0,0,0,0,0,0],
   [.10,-.043,-.13,.31,0,0,-.12,1],
   [.22/1.70,-.043,-.13,.31,0,0,-.12,1],
   [.29,-.043,-.36,.38,-.23,.07,-.12,1],
   [.40,-.09,-.43,.43,-.30,.12,-.12,1],
   [.49,-.043,-.36,.38,-.23,.07,-.12,1],
   [1.02/1.70,-.043,-.13,.31,0,0,-.12,1],
   [1.27/1.70,-.043,-.118,.31,.012,0,-.10,1],
   [.81,-.043,-.13,.31,0,0,-.08,1],
   [.94,-.014,-.06,.09,0,0,-.02,.3],
   [1,0,0,0,0,0,0,0]
  ],
  empty:[
   [0,0,0,0,0,0,0,0],
   [.075,-.043,-.13,.31,0,0,-.12,1],
   [.22/2.20,-.043,-.13,.31,0,0,-.12,1],
   [.23,-.043,-.36,.38,-.23,.07,-.12,1],
   [.32,-.09,-.43,.43,-.30,.12,-.12,1],
   [.39,-.043,-.36,.38,-.23,.07,-.12,1],
   [1.05/2.20,-.043,-.13,.31,0,0,-.12,1],
   [1.28/2.20,-.043,-.118,.31,.012,0,-.10,1],
   [.68,-.082,.058,.447,0,0,.27,1],
   [1.78/2.20,-.049,.066,.447,0,0,.27,1],
   [.90,-.028,-.04,.20,0,0,.08,.7],
   [1,0,0,0,0,0,0,0]
  ],
  chamber:[
   [0,0,0,0,0,0,0,0],
   [.30,-.052,.073,.61,0,0,.29,1],
   [.36/.64,-.052,.073,.66,0,0,.29,1],
   [.75,-.04,.015,.30,0,0,.11,.7],
   [1,0,0,0,0,0,0,0]
  ]
 };
 function rifleReloadPose(t,kind='tactical'){
  t=clamp(Number.isFinite(t)?t:0,0,1);const points=rifleStages[kind]||rifleStages.tactical;
  let a=points[0],b=points[1];for(let i=1;i<points.length;i++){b=points[i];if(t<=b[0]){a=points[i-1];break;}}
  const u=ease((t-a[0])/Math.max(.001,b[0]-a[0])),p=Array.from({length:7},(_,i)=>lerp(a[i+1],b[i+1],u));
  const hold=ease(t/.12)*(1-ease((t-.84)/.16)),r={pitch:-.105*hold,yaw:-.065*hold,roll:-.25*hold,x:-.016*hold,y:-.054*hold,magazine:p[3],magazineZ:p[4],supportX:p[0],supportY:p[1],supportZ:p[2],supportRotX:p[5],supportRotY:0,supportRotZ:.16*hold,index:p[6],slide:0,magazineVisible:true};
  if(kind==='tactical')r.magazineVisible=!(t>=.31&&t<.43);
  if(kind==='empty'){r.magazineVisible=!(t>=.245&&t<.345);r.boltOverride=.056*(1-ease((t-1.78/2.20)/.045));}
  if(kind==='chamber')r.boltOverride=.056*ease((t-.30)/(.36/.64-.30))*(1-ease((t-.36/.64)/.13));
  return r;
 }
 function rifleBolt(t){return t<.045?.056*ease(t/.045):t<.090?.056*(1-ease((t-.045)/.045)):0;}
 function create(){
  const s={};axes.forEach(k=>s[k]={x:0,v:0});let slide=0,ads=0,sprint=0,dash=0,locomotion=0,phase=0,shots=0,swap=0,rifleHeat=0,rifleAge=Infinity,boltAge=Infinity,lastWeapon=0;
  function reset(){axes.forEach(k=>s[k]={x:0,v:0});slide=ads=sprint=dash=locomotion=phase=swap=shots=rifleHeat=0;rifleAge=boltAge=Infinity;lastWeapon=0;}
  function fire(weapon=0,aim=ads){lastWeapon=weapon;if(weapon===3){const scale=.76*(1-.43*clamp(aim,0,1)),pattern=[.4,.7,-.35,.15,-.6,.25],side=pattern[shots++%pattern.length];rifleHeat=Math.min(1,rifleHeat+.18);rifleAge=boltAge=0;s.pitch.v+=3.4*scale;s.yaw.v+=side*.26*scale;s.roll.v+=side*.42*scale;s.back.v+=1.55*scale;s.drop.v+=.28*scale;s.camera.v+=.39*scale;s.cameraYaw.v+=side*.048*scale;return;}weapon=clamp(weapon|0,0,2);const scale=[1,1.45,.57][weapon]*(1-.32*clamp(aim,0,1)),side=(++shots%3===0?-1:1);s.pitch.v+=3.8*scale;s.yaw.v+=side*.23*scale;s.roll.v+=side*.52*scale;s.back.v+=1.8*scale;s.drop.v+=.45*scale;s.camera.v+=.60*scale;s.cameraYaw.v+=side*.065*scale;}
  function impulse(kind){if(kind==='dash'){s.drop.v+=.7;s.roll.v-=1.2;}if(kind==='hurt'){s.camera.v-=.65;s.roll.v+=.6;}if(kind==='cycle')s.back.v+=.25;if(kind==='jump'){s.drop.v-=.26;s.pitch.v+=.22;}if(kind==='land'){s.drop.v+=.48;s.pitch.v-=.28;}if(kind==='slide'){s.roll.v-=.45;s.drop.v+=.3;}if(kind==='swap')swap=1;if(kind==='riflecycle'||kind==='rifle-cycle')boltAge=Math.max(.045,boltAge===Infinity?.045:boltAge);}
  function step(dt,input={}){dt=clamp(Number.isFinite(dt)?dt:0,0,.1);axes.forEach(k=>spring(s[k],dt,k==='camera'||k==='cameraYaw'?19:24));
   const previousAge=rifleAge;rifleAge+=dt;boltAge+=dt;if(Number.isFinite(previousAge)){const decay=Math.max(0,rifleAge-.14)-Math.max(0,previousAge-.14);rifleHeat*=Math.exp(-8*decay);}
   slide=lerp(slide,input.slide?1:0,1-Math.exp(-dt*12));ads=(input.weapon===3&&Number.isFinite(input.aimProgress))?clamp(input.aimProgress,0,1):lerp(ads,input.aim?1:0,1-Math.exp(-dt*15));sprint=lerp(sprint,input.sprint&&!input.aim?1:0,1-Math.exp(-dt*9));dash=lerp(dash,input.dash?1:0,1-Math.exp(-dt*16));locomotion=lerp(locomotion,clamp(input.speed||0,0,1),1-Math.exp(-dt*10));swap=Math.max(0,swap-dt*3.5);phase+=dt*(7.7+2.8*sprint)*locomotion;
   const breathe=Math.sin((input.time||0)*1.45)*.0012*(1-ads*.8),bob=locomotion*(1-ads*.88),isRifle=(input.weapon??lastWeapon)===3,r=input.reload>0?reloadPose(input.reload,{weapon:input.weapon??lastWeapon,kind:input.reloadKind||'tactical'}):reloadPose(0),load=isRifle?rifleHeat*(1-.45*ads):0;
   return {ads,pitch:s.pitch.x+load*.024,yaw:s.yaw.x,roll:s.roll.x,back:s.back.x+load*.016,drop:s.drop.x,camera:s.camera.x+load*.0075,cameraYaw:s.cameraYaw.x,rifleHeat:isRifle?rifleHeat:0,bolt:isRifle?(input.boltLocked&&boltAge>=.045?.056:rifleBolt(boltAge)):0,
    x:Math.sin(phase)*.008*bob+r.x+sprint*.045,
    y:Math.abs(Math.cos(phase))*.011*bob+breathe+r.y-sprint*.045-dash*.035-swap*.13-slide*.045,
    z:Math.sin(phase*2)*.004*bob+sprint*.025+swap*.04,
    rotX:sprint*-.10-dash*.045+swap*-.25,rotY:sprint*.12,rotZ:Math.sin(phase)*.009*bob+sprint*-.13-dash*-.07+swap*-.18-slide*.07,reload:r};
  }
  return {fire,impulse,step,reset};
 }
 root.DFMotion={create,reloadPose,rifleReloadPose,rifleStages,rifleBolt};
})(globalThis);
