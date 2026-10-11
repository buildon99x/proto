import {DUNGEON_REGIONS,DUNGEON_FOES,DUNGEON_LINKS} from './dungeon-content.js';
import {QUARRY_REGIONS,QUARRY_FOES,QUARRY_LINKS} from './quarry-content.js';
import {PASS_REGIONS,PASS_FOES,PASS_LINKS} from './pass-content.js';
import {mapFromRegion} from './world-geometry.js';
export {inMap,lineOfSight,traceSegment,findPathStep} from './world-geometry.js';
// R2 authored Emberwatch first-entry slice. These maps, foes and rewards are not
// original Hammerwatch 2 measurements and do not establish campaign duration.
const frozen = x => { if (x && typeof x === 'object') { Object.values(x).forEach(frozen); Object.freeze(x); } return x; };
export const FOES = frozen({...DUNGEON_FOES,...QUARRY_FOES,...PASS_FOES,
  scout: {name: '잿불 척후', hp: 28, damage: 7, speed: 68, xp: 9, gold: 3, range: 42, windup: 0.72, recovery: 0.8, armor: 0, tier: 'apprentice', style: 'melee'},
  archer: {name: '재의 추적자', hp: 23, damage: 6, speed: 47, xp: 12, gold: 4, range: 230, windup: 0.9, recovery: 1.2, armor: 0, tier: 'apprentice', style: 'ranged'},
  bruiser: {name: '그을린 방패병', hp: 64, damage: 13, speed: 49, xp: 22, gold: 7, range: 66, windup: 1.0, recovery: 1.05, armor: 10, tier: 'apprentice', style: 'cleave'},
  warden: {name: '잿문 감시자', hp: 260, damage: 17, speed: 52, xp: 90, gold: 28, range: 104, windup: 1.15, recovery: 1.0, armor: 12, tier: 'apprentice', style: 'boss'},
});
const encounters = [];
const groups = [{x:280,y:570,count:7},{x:510,y:455,count:8},{x:710,y:265,count:9}];
for (const [g, group] of groups.entries()) for (let n = 0; n < group.count; n++) encounters.push({id:`road-${g}-${n}`,kind:n===group.count-1?'bruiser':n%4===3?'archer':'scout',x:group.x+Math.cos(n*2.4)*65,y:group.y+Math.sin(n*2.4)*52});
encounters.push({id:'road-warden',kind:'warden',x:866,y:155});
export const REGIONS = frozen({...DUNGEON_REGIONS,...QUARRY_REGIONS,...PASS_REGIONS,
  ash_hamlet: {id:'ash_hamlet',name:'잿불 마을',w:23,h:20,spawn:{x:350,y:420},foes:[],npcs:[
    {id:'trainer',name:'훈련관 브란',x:260,y:325}, {id:'elder',name:'촌장 에다',x:450,y:325}, {id:'healer',name:'치유사 리아',x:350,y:250}, {id:'blacksmith',name:'대장장이 오린',x:250,y:470}, {id:'workshop',name:'제작 작업대',x:430,y:480},
  ],portals:[...DUNGEON_LINKS.ash_hamlet,...QUARRY_LINKS.ash_hamlet,...PASS_LINKS.ash_hamlet,{id:'road',name:'잿길로',x:590,y:375,to:'ash_road'}],objects:[{id:'townfire',type:'torch',x:360,y:345}]},
  ash_road: {id:'ash_road',name:'재가 내려앉은 길',w:32,h:26,spawn:{x:100,y:690},foes:encounters,npcs:[],portals:[...DUNGEON_LINKS.ash_road,{id:'home',name:'마을로',x:92,y:728,to:'ash_hamlet'}],objects:[{id:'road-cache',type:'chest',x:588,y:604},{id:'warden-cache',type:'chest',x:868,y:112},{id:'roadfire',type:'torch',x:630,y:240}]},
});
export function getRegion(id) { return typeof id === 'string' && Object.hasOwn(REGIONS,id) ? REGIONS[id] : null; }
export function createMap(id,state=null) {const r=getRegion(id);return r?mapFromRegion(r,state?.world?.objectives??{}):null;}
export function near(a,b,distance=76) {return Number.isFinite(a?.x)&&Number.isFinite(a?.y)&&Math.hypot(a.x-b.x,a.y-b.y)<=distance;}
export function findEnemy(regionId,id) {return getRegion(regionId)?.foes.find(x=>x.id===id)??null;}
