/* Shared local-PvE shot damage contract. Tuning is provisional game design. */
(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const Metal=root.DFLiquidMetal||(typeof require==='function'?require('./liquid-metal.js'):null);
const LEGACY=Object.freeze([
 Object.freeze({damage:48,wallDamage:40,barrelDamage:50,headMultiplier:2.5,limbMultiplier:1,falloffStart:25,falloffEnd:70,minimumDamage:.65,maxRange:120,armorAbsorption:1,speed:350,gravity:9.81,pellets:1}),
 Object.freeze({damage:105,wallDamage:90,barrelDamage:50,headMultiplier:2.5,limbMultiplier:1,falloffStart:12,falloffEnd:35,minimumDamage:.25,maxRange:60,armorAbsorption:1,speed:350,gravity:9.81,pellets:9}),
 Object.freeze({damage:21,wallDamage:19,barrelDamage:50,headMultiplier:2.5,limbMultiplier:1,falloffStart:18,falloffEnd:55,minimumDamage:.55,maxRange:100,armorAbsorption:1,speed:450,gravity:9.81,pellets:1})
]);
function configuration(weapon,rifle){return weapon===3?{...rifle,speed:800,gravity:9.81,pellets:1}:LEGACY[weapon];}
function damageAt(distance=0,part='torso',armor=0,config,multiplier=1){
 const d=Number.isFinite(distance)?Math.max(0,distance):Infinity;
 const falloff=d>config.maxRange?0:1-clamp((d-config.falloffStart)/(config.falloffEnd-config.falloffStart),0,1)*(1-config.minimumDamage);
 const region=part==='head'?config.headMultiplier:['limb','arm','leg'].includes(part)?config.limbMultiplier:1;
 const raw=config.damage*falloff*region*multiplier,armorDamage=Math.min(Math.max(0,Number.isFinite(armor)?armor:0),raw*config.armorAbsorption),damage=Math.max(0,raw-armorDamage);
 return {raw,damage,armorDamage,falloff,part,armored:armorDamage>1e-6,stopped:raw>1e-6&&damage<=1e-6};
}
// Stable center plus eight stratified disk samples; no frame-time or global RNG input.
function pelletSpread(seed,sequence,ads=0){let n=(seed^Math.imul(sequence+1,0x9e3779b1))>>>0;n=Math.imul(n^(n>>>16),0x85ebca6b)>>>0;const angle=n/4294967296*Math.PI*2,cone=(2.6-0.6*clamp(ads,0,1))*Math.PI/180;return [{x:0,y:0},...Array.from({length:8},(_,i)=>{const r=cone*Math.sqrt((i+.5)/8),a=angle+i*Math.PI*(3-Math.sqrt(5));return {x:Math.cos(a)*r,y:Math.sin(a)*r};})];}
class ShotResolver {
 constructor(){this.records=new Map();this.sequence=0;}
 begin({weapon,config,shotId,time=0,multiplier=1}){const id=shotId||'local:'+ ++this.sequence;if(this.records.has(id))return null;const record={shotId:id,weapon,config:Object.freeze({...config,balanceVersion:'ballistics-v1-provisional'}),time,multiplier,claimed:new Set(),contacts:new Set(),hitCounted:false,results:[],contactResults:[],presented:new Set()};this.records.set(id,record);while(this.records.size>4096)this.records.delete(this.records.keys().next().value);return record;}
 claimPresentation(shotId,pelletId,channel,contactId){const r=this.records.get(shotId),key=(contactId??pelletId)+':'+channel;if(!r||r.presented.has(key))return false;r.presented.add(key);return true;}
 resolve(world,record,hit,pelletId=0,contactContext){
  if(!record||this.records.get(record.shotId)!==record||!Number.isInteger(pelletId)||pelletId<0||pelletId>=record.config.pellets||record.claimed.has(pelletId))return null;if(!hit){record.claimed.add(pelletId);return null;}
  const contactId=pelletId+':'+hit.kind+':'+hit.id;if(record.contacts.has(contactId))return null;record.contacts.add(contactId);
  const {weapon,config,shotId}=record,part=hit.part||(hit.head?'head':'torso'),head=part==='head';let target,armor=0,armorKey=head?'helmet':'armor',base=config;
  if(hit.kind==='enemy'){target=world.enemies[hit.id];if(target?.alive&&hit.armored!==false)armor=Number.isFinite(target[armorKey])?target[armorKey]:0;}
  else if(hit.kind==='wall'){target=world.walls[hit.id];base={...config,damage:config.wallDamage??config.damage};}
  else if(hit.kind==='barrel'){target=world.pickups[hit.id];base={...config,damage:config.barrelDamage??config.damage};}else return null;
  const metal=hit.kind==='enemy'&&Metal.isMetal(target);if(!metal||part==='core')record.claimed.add(pelletId);if(!target?.alive)return null;
  if(metal){armor=0;base={...base,headMultiplier:1,limbMultiplier:1};}
  const result=damageAt(hit.distance,hit.kind==='enemy'?part:'torso',armor,base,(hit.kind==='enemy'?record.multiplier:1)*(hit.damageScale??1)/config.pellets);if(result.raw<=0)return null;
  const event={weapon,shotId,pelletId,contactId,direction:hit.direction,kind:hit.kind,id:target.id??hit.id,x:target.x,z:target.z,head,distance:hit.distance??0,point:hit.point,flightTime:hit.flightTime,impactTime:hit.impactTime,armorBefore:armor,armorAfter:Math.max(0,armor-result.armorDamage),...result};
  if(hit.kind==='enemy'){
   if(!record.hitCounted){world.hits++;record.hitCounted=true;}if(metal){
    const response=Metal.impact(world,target,{source:'bullet',damage:result.raw,part,point:hit.point,direction:hit.direction,time:hit.impactTime??world.time,coreExposedAtContact:hit.coreExposedAtContact});
    Object.assign(event,response,{head:false,armored:false,armorDamage:0,stopped:!response.transmit});world.emit('impact',event);
   }else{if(result.armorDamage>0)target[armorKey]=Math.max(0,armor-result.armorDamage);target.hp-=result.damage;target.hit=.16;target.alert=true;world.emit('impact',event);
   if(result.armorDamage>0)world.emit('armorhit',{...event,damage:result.armorDamage});if(result.damage>0)world.emit('blood',event);if(target.hp<=0)world.kill(target,head?150:80);}
  }else {world.emit('impact',event);if(Number.isFinite(target.hp)){target.hp-=result.damage;if(target.hp<=0){if(hit.kind==='barrel')world.explode(target,{time:hit.impactTime??world.time,metalExposure:contactContext?.metalExposure});else{target.alive=false;world.destroyed++;world.emit('break',{id:target.id,x:target.x,z:target.z,y:target.y||0});}}}}
  record.results[pelletId]=event;record.contactResults.push(event);return event;
 }
}
const api={pelletSpread,LEGACY,configuration,damageAt,ShotResolver};root.DFShotResolver=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
