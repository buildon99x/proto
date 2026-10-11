// Optional-expedition FOUNDATION ONLY: no world registration, map, UI or battle
// routing exists yet. These are authored Emberwatch rules, not source-game facts.
import {CORE_REFERENCE} from './reference-core.js';

const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};

export const EXPEDITION_DIFFICULTIES=freeze(['easy','normal','hard','serious']);
// Use precisely the campaign's base HP/damage multipliers. XP is a separate,
// zero-valued expedition policy and must never use the campaign kill grant.
export const EXPEDITION_COMBAT_SCALING=freeze(Object.fromEntries(EXPEDITION_DIFFICULTIES.map(id=>[id,{
 enemyHealth:CORE_REFERENCE.difficulty[id].enemyHealth,
 enemyDamage:CORE_REFERENCE.difficulty[id].enemyDamage,
}])));

// Frozen v1 snapshots rather than aliases of mutable/future campaign content.
// Any future change to these definitions or the reward contract needs a new
// contentVersion and an explicit supported-version policy for existing runs.
export const EXPEDITION_FOES=freeze({
 drill_raider:{name:'순찰 쇄도병',hp:58,armor:2,speed:76,damage:9,range:48,windup:.78,recovery:.85,xp:0,gold:0,tier:'adept',style:'melee',
  patterns:[{id:'drill-raider-cut',shape:'cone',range:48,halfAngle:.75,damage:9,windup:.78,recovery:.85}]},
 drill_slinger:{name:'순찰 투석수',hp:44,armor:0,speed:44,damage:8,range:250,windup:1.05,recovery:1.2,xp:0,gold:0,tier:'adept',style:'ranged',
  patterns:[{id:'drill-slinger-shot',shape:'line',range:250,width:16,speed:220,travelRange:420,damage:8,windup:1.05,recovery:1.2}]},
 drill_guard:{name:'순찰 장갑 파수꾼',hp:92,armor:18,speed:44,damage:13,range:80,windup:1.05,recovery:1.2,xp:0,gold:0,tier:'adept',style:'cleave',
  patterns:[{id:'drill-guard-thrust',shape:'cone',range:70,halfAngle:.45,damage:14,windup:.95,recovery:1},{id:'drill-guard-sweep',shape:'cone',range:85,halfAngle:1.15,damage:11,windup:1.2,recovery:1.25}]},
});

const foes=[
 {id:'quarry-drill-raider-1',kind:'drill_raider'},
 {id:'quarry-drill-raider-2',kind:'drill_raider'},
 {id:'quarry-drill-slinger-1',kind:'drill_slinger'},
 {id:'quarry-drill-slinger-2',kind:'drill_slinger'},
 {id:'quarry-drill-guard-1',kind:'drill_guard'},
 {id:'quarry-drill-guard-2',kind:'drill_guard'},
];
export const EXPEDITION_TEMPLATES=freeze({
 quarry_drill:{templateId:'quarry_drill',contentVersion:1,regionId:'quarry_drill',foes,
  enemyIds:foes.map(foe=>foe.id),
  rewards:{kill:{xp:0,gold:0,materials:{}},complete:{xp:0,gold:12,materials:{iron:1}}},
 },
});

/** Unknown content never silently falls back to the latest template. */
export function getExpeditionTemplate(templateId,contentVersion){
 if(typeof templateId!=='string'||!Object.hasOwn(EXPEDITION_TEMPLATES,templateId))return null;
 const template=EXPEDITION_TEMPLATES[templateId];
 return contentVersion===template.contentVersion?template:null;
}
