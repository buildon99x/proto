// Functional reference facts only. Cached community rows are not game captures.
const wiki=(page,section)=>({kind:'wiki_cached',url:`https://wiki.hammerwatch2.com/${page}`,section,accessedAt:'2026-10-08',cacheAge:'approximately 2.3 years',liveFetch:'502',measured:false});
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const CORE_REFERENCE=freeze({
 game:{title:'Hammerwatch II',year:2023,steamAppId:1538970,source:{kind:'official',url:'https://store.steampowered.com/app/1538970/Hammerwatch_II/',accessedAt:'2026-10-08'}},
 classes:{
  warrior:{referenceClassId:'paladin',displayName:'전사',basePools:{health:55,mana:40,stamina:45},poolGrowth:{health:4,mana:2,stamina:3},baseAttributes:{strength:18,dexterity:12,intelligence:10}},
  mage:{referenceClassId:'wizard',displayName:'마법사',basePools:{health:40,mana:60,stamina:40},poolGrowth:{health:2,mana:5,stamina:2},baseAttributes:{strength:10,dexterity:10,intelligence:20}},
  archer:{referenceClassId:'ranger',displayName:'궁사',basePools:{health:45,mana:40,stamina:55},poolGrowth:{health:3,mana:3,stamina:3},baseAttributes:{strength:12,dexterity:16,intelligence:12}}
 },
 classSource:wiki('Classes','Class starting traits'),
 levelPoints:{attributePoints:5,skillRanges:[{from:2,to:4,points:3},{from:5,to:14,points:4},{from:15,to:29,points:5},{from:30,to:50,points:6}],source:wiki('Classes','Levelup results')},
 tiers:[{id:'apprentice',label:'입문',minimumLevel:1},{id:'adept',label:'숙련',minimumLevel:5},{id:'expert',label:'전문',minimumLevel:15},{id:'master',label:'달인',minimumLevel:30}],
 tierSource:wiki('Difficulty_Level','Experience tier thresholds; trainer promotion remains a separate condition'),
 difficulty:{
  easy:{enemyHealth:.66,enemyDamage:.66,trapDamage:.5,xp:1,reviveSeconds:1},
  normal:{enemyHealth:1,enemyDamage:1,trapDamage:1,xp:1,reviveSeconds:3},
  hard:{enemyHealth:1.25,enemyDamage:1.25,trapDamage:1.25,xp:.75,reviveSeconds:3},
  serious:{enemyHealth:1.5,enemyDamage:2,trapDamage:1.5,xp:.75,reviveSeconds:6}
 },
 difficultySource:wiki('Difficulty_Level','Difficulty Scaling'),
 lowerTierExperience:[[1,1,1,1],[.5,1,1,1],[.2,.5,1,1],[.1,.2,.5,1]],
 armorSamples:[{value:5,reductionPercent:4.76},{value:10,reductionPercent:9.09},{value:20,reductionPercent:16.67},{value:30,reductionPercent:23.08},{value:49,reductionPercent:32.89},{value:95,reductionPercent:48.72}],
 armorSource:wiki('Combat_Mechanics','Armor / Resistance'),
 unknown:{
  experienceCurve:{value:null,status:'UNKNOWN',blocking:'level thresholds in gameplay'},
  attributeDerivedStats:{value:null,status:'UNKNOWN',blocking:'general STR/DEX/INT conversion outside explicit equipment/skill scaling'},
  resourceRegeneration:{value:null,status:'UNKNOWN',blocking:'base regen values and delay/cancel behavior'},
  damageRounding:{value:null,status:'UNKNOWN',blocking:'final rounding, penetration ordering and negative resistance'},
  shieldActivation:{value:null,status:'UNKNOWN',blocking:'equipped shield active block cost and duration'},
  deathGoldFraction:{value:null,status:'UNKNOWN',blocking:'destination/difficulty gold and elapsed-time tradeoff; not a verified universal fraction'},
  respawnRules:{value:null,status:'UNKNOWN',blocking:'exact original checkpoint and enemy reset rules'},
  promotionRequirements:{value:null,status:'UNKNOWN',blocking:'trainer/NPC/quest prerequisites beyond observed level thresholds'},
  respecPrice:{value:null,status:'UNKNOWN',blocking:'skill respec gold charge'},
  weatherCombatEffects:{value:null,status:'UNKNOWN',blocking:'no weather damage or movement modifiers may be invented'}
 }
});
