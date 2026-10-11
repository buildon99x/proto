// Reproducible analytical loadout fixture, NOT normal-input or AI play.
// All growth/equipment setup uses actual reducers on earned settlement fixtures.
import {route,report,run} from '../tests/support/earned-route.mjs';
import {deriveStats} from '../src/warrior-growth.js';
import {CORE_REFERENCE} from '../src/reference-core.js';
import {QUARRY_FOES} from '../src/quarry-content.js';
import {physicalDamage} from '../src/combat.js';
let s=route('normal',true,true).state;
const command=c=>{s=run(s,c).state;};
command({type:'promoteAdept',...report(s,{x:260,y:325})});
for(const attribute of ['strength','intelligence'])command({type:'allocateAttribute',attribute,amount:2});
for(const skillId of ['mace_swing','righteous_hammer','righteous_hammer','hammer_of_sundering','lay_on_hands','judgement'])command({type:'purchaseSkill',skillId,position:{x:260,y:325}});
let seq=0;const gear=(op,position={x:250,y:470})=>command({type:'equipment',position,operation:{...op,commandId:'balance-'+(++seq)}});
gear({type:'receiveEquipmentAward',awardId:'workshop_supplies',station:'blacksmith'});
for(const baseId of ['iron_mace','oak_shield']){gear({type:'buyEquipment',baseId,station:'blacksmith'});const id=s.inventory.equipmentInstances.find(i=>i.baseId===baseId).id;gear({type:'equipItem',itemId:id});gear({type:'upgradeItem',itemId:id,expectedRank:0,station:'workshop'},{x:430,y:480});}
const st=deriveStats(s.character,s).stats,a=st.actions.mace_swing,heal=st.actions.lay_on_hands,hammer=st.actions.righteous_hammer;
const round=x=>Math.round(x*1000)/1000,rows=[];
for(const[d,scale]of Object.entries(CORE_REFERENCE.difficulty))for(const[k,f]of Object.entries(QUARRY_FOES)){
 const hp=f.hp*scale.enemyHealth,hit=physicalDamage(a.damage,f.armor,a.armorPenetration),count=Math.ceil(hp/hit),raw=Math.max(...f.patterns.map(p=>p.damage)),received=physicalDamage(raw*scale.enemyDamage,st.armor);
 rows.push({difficulty:d,foe:k,hp:round(hp),maceHit:round(hit),maceHits:count,stationaryMaceTtkSeconds:round(a.contact+(count-1)*Math.max(a.duration,a.cooldown)),maxUnblockedHit:round(received),fullHpHitsToDeath:Math.ceil(st.hpMax/received),healHitEquivalent:round(heal.heal/received)});
}
console.log(JSON.stringify({kind:'analytic earned-route fixture; not AI/normal-input QA',loadout:{level:s.character.level,attributes:s.character.attributes,skills:s.character.skills,stats:{hp:st.hpMax,mana:st.manaMax,armor:st.armor,damage:st.physicalDamage,manaRegen:st.manaRegen},mace:a,heal,hammer},assumptions:'Stationary attack contact; no crit, passive block, healing, movement, hitstop or multiple attackers. Kill TTK is a lower bound, survival hit count is single-hit worst-pattern arithmetic, not actual survival time.',manaRecovery30Seconds:round(st.manaRegenDelay+30/st.manaRegen),guardMaceAfterBreak:round(physicalDamage(a.damage,QUARRY_FOES.quarry_guard.armor-hammer.armorBreak.amount,a.armorPenetration)),rows},null,2));
