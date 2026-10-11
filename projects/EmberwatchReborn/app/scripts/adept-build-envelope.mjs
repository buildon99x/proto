// Analytical earned-route loadouts. No claim of normal-input completion/TTK.
import {pathToFileURL} from 'node:url';
import {earnedQuarryRoute} from '../tests/support/earned-quarry-route.mjs';
import {run} from '../tests/support/earned-route.mjs';
import {deriveStats} from '../src/warrior-growth.js';
import {CORE_REFERENCE} from '../src/reference-core.js';
import {QUARRY_FOES} from '../src/quarry-content.js';
import {PASS_FOES} from '../src/pass-content.js';
import {physicalDamage} from '../src/combat.js';
const trainer={x:260,y:325};
export const LOADOUTS=Object.freeze({
 strength:{attributes:{strength:35,dexterity:0,intelligence:0},branch:'hammer_of_sundering',extra:['mace_swing','mace_swing','mace_swing','towering_strength','towering_strength','shining_knight']},
 intelligence:{attributes:{strength:2,dexterity:0,intelligence:33},branch:'hammer_of_wrath',extra:['righteous_hammer','righteous_hammer','shining_knight','armor_of_faith','armor_of_faith']},
 mixed:{attributes:{strength:18,dexterity:5,intelligence:12},branch:'hammer_of_sundering',extra:['mace_swing','mace_swing','righteous_hammer','shining_knight','towering_strength','superb_constitution','armor_of_faith']},
});
export function buildEnvelopeLoadout(id){
 const spec=LOADOUTS[id];if(!spec)throw new Error('Unknown envelope build');
 let s=earnedQuarryRoute('normal'),seq=0;const cmd=c=>{s=run(s,c).state;};
 for(const [attribute,amount]of Object.entries(spec.attributes))if(amount)cmd({type:'allocateAttribute',attribute,amount});
 for(const skillId of ['mace_swing','righteous_hammer','righteous_hammer',spec.branch,'lay_on_hands','judgement',...spec.extra])cmd({type:'purchaseSkill',skillId,position:trainer});
 const gear=(op,position={x:250,y:470})=>cmd({type:'equipment',position,operation:{...op,commandId:`envelope-${++seq}`}});
 gear({type:'receiveEquipmentAward',awardId:'workshop_supplies',station:'blacksmith'});
 for(const baseId of ['iron_mace','oak_shield']){gear({type:'buyEquipment',baseId,station:'blacksmith'});const itemId=s.inventory.equipmentInstances.find(i=>i.baseId===baseId).id;gear({type:'equipItem',itemId});gear({type:'upgradeItem',itemId,expectedRank:0,station:'workshop'},{x:430,y:480});}
 return {state:s,stats:deriveStats(s.character,s).stats};
}
const round=x=>Math.round(x*1000)/1000;
export function envelope(){const builds=[];
 for(const id of Object.keys(LOADOUTS)){const {state:s,stats:st}=buildEnvelopeLoadout(id),a=st.actions.mace_swing,q=st.actions.righteous_hammer,rows=[];
 for(const [difficulty,scale]of Object.entries(CORE_REFERENCE.difficulty))for(const [kind,f]of Object.entries({...QUARRY_FOES,...PASS_FOES})){
  const hp=f.hp*scale.enemyHealth,hit=physicalDamage(a.damage,f.armor,a.armorPenetration),count=Math.ceil(hp/hit),incoming=physicalDamage(Math.max(...f.patterns.map(p=>p.damage))*scale.enemyDamage,st.armor);
  rows.push({difficulty,kind,hp:round(hp),maceHit:round(hit),maceHits:count,maceTtkFloor:round(a.contact+(count-1)*Math.max(a.duration,a.cooldown)),incomingWorst:round(incoming),fullHealthHitCount:Math.ceil(st.hpMax/incoming)});
 }
 builds.push({id,level:s.character.level,earnedXp:s.stats.earnedXp,attributes:s.character.attributes,remainingAttributes:s.character.attributePoints,skills:s.character.skills,remainingSkillPoints:s.character.skillPoints,stats:{hp:st.hpMax,mana:st.manaMax,armor:st.armor,physicalDamage:st.physicalDamage,manaRegen:st.manaRegen},hammer:{physicalDamage:q.damage,manaCost:q.manaCost,fullPoolCastCount:Math.floor(st.manaMax/q.manaCost),repeatManaRecovery:round(st.manaRegenDelay+q.manaCost/st.manaRegen)},healManaRecovery:round(st.manaRegenDelay+30/st.manaRegen),rows});
 }
 return {kind:'actual reducer earned-route analytic builds; not normal-input or simulated AI play',assumptions:'L8 full Normal route fixture (1865.5XP), all35 attribute/25 skill points legally spent; +1 mace/shield. Static hits exclude crit, blocking, armor-break followups, lightning ticks, other attackers, movement and hitstop. Never treat stationary TTK floor or hit count as real fight duration/survival.',builds};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(envelope(),null,2));
