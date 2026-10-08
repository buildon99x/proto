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
 function reloadPose(t){t=clamp(Number.isFinite(t)?t:0,0,1);let a=stages[0],b=stages[1];for(let i=1;i<stages.length;i++){b=stages[i];if(t<=b[0]){a=stages[i-1];break;}}let v=ease((t-a[0])/Math.max(.001,b[0]-a[0]));const p=Array.from({length:8},(_,i)=>lerp(a[i+1],b[i+1],v));return {pitch:p[0],yaw:p[1],roll:p[2],x:p[3],y:p[4],magazine:p[5],supportY:p[6],supportZ:p[7],supportX:-.055*Math.sin(t*Math.PI),slide:t>.81&&t<.95?.055*Math.sin((t-.81)/.14*Math.PI):0,index:t>.10&&t<.84?ease(Math.min((t-.10)/.12,(.84-t)/.1)):0};}
 function create(){
  const s={};axes.forEach(k=>s[k]={x:0,v:0});let slide=0,ads=0,sprint=0,dash=0,locomotion=0,phase=0,shots=0,swap=0;
  function reset(){axes.forEach(k=>s[k]={x:0,v:0});slide=ads=sprint=dash=locomotion=phase=swap=shots=0;}
  function fire(weapon=0,aim=ads){weapon=clamp(weapon|0,0,2);const scale=[1,1.45,.57][weapon]*(1-.32*clamp(aim,0,1)),side=(++shots%3===0?-1:1);s.pitch.v+=3.8*scale;s.yaw.v+=side*.23*scale;s.roll.v+=side*.52*scale;s.back.v+=1.8*scale;s.drop.v+=.45*scale;s.camera.v+=.60*scale;s.cameraYaw.v+=side*.065*scale;}
  function impulse(kind){if(kind==='dash'){s.drop.v+=.7;s.roll.v-=1.2;}if(kind==='hurt'){s.camera.v-=.65;s.roll.v+=.6;}if(kind==='cycle')s.back.v+=.25;if(kind==='jump'){s.drop.v-=.26;s.pitch.v+=.22;}if(kind==='land'){s.drop.v+=.48;s.pitch.v-=.28;}if(kind==='slide'){s.roll.v-=.45;s.drop.v+=.3;}if(kind==='swap')swap=1;}
  function step(dt,input={}){dt=clamp(Number.isFinite(dt)?dt:0,0,.1);axes.forEach(k=>spring(s[k],dt,k==='camera'||k==='cameraYaw'?19:24));
   slide=lerp(slide,input.slide?1:0,1-Math.exp(-dt*12));ads=lerp(ads,input.aim?1:0,1-Math.exp(-dt*15));sprint=lerp(sprint,input.sprint&&!input.aim?1:0,1-Math.exp(-dt*9));dash=lerp(dash,input.dash?1:0,1-Math.exp(-dt*16));locomotion=lerp(locomotion,clamp(input.speed||0,0,1),1-Math.exp(-dt*10));swap=Math.max(0,swap-dt*3.5);phase+=dt*(7.7+2.8*sprint)*locomotion;
   const breathe=Math.sin((input.time||0)*1.45)*.0012*(1-ads*.8),bob=locomotion*(1-ads*.88),r=input.reload>0?reloadPose(input.reload):reloadPose(0);
   return {ads,pitch:s.pitch.x,yaw:s.yaw.x,roll:s.roll.x,back:s.back.x,drop:s.drop.x,camera:s.camera.x,cameraYaw:s.cameraYaw.x,
    x:Math.sin(phase)*.008*bob+r.x+sprint*.045,
    y:Math.abs(Math.cos(phase))*.011*bob+breathe+r.y-sprint*.045-dash*.035-swap*.13-slide*.045,
    z:Math.sin(phase*2)*.004*bob+sprint*.025+swap*.04,
    rotX:sprint*-.10-dash*.045+swap*-.25,rotY:sprint*.12,rotZ:Math.sin(phase)*.009*bob+sprint*-.13-dash*-.07+swap*-.18-slide*.07,reload:r};
  }
  return {fire,impulse,step,reset};
 }
 root.DFMotion={create,reloadPose};
})(globalThis);
