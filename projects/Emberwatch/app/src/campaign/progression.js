import {CORE_REFERENCE} from './reference-core.js';
const attributes=['strength','dexterity','intelligence'];
const clone=x=>JSON.parse(JSON.stringify(x));
const tierIndex=id=>CORE_REFERENCE.tiers.findIndex(x=>x.id===id);
export function levelPointGrant(level){
 if(!Number.isInteger(level)||level<2||level>50)return null;
 const row=CORE_REFERENCE.levelPoints.skillRanges.find(x=>level>=x.from&&level<=x.to);
 return {attributePoints:CORE_REFERENCE.levelPoints.attributePoints,skillPoints:row.points};
}
export function experienceTier(level){return CORE_REFERENCE.tiers.reduce((a,t)=>level>=t.minimumLevel?t.id:a,'apprentice');}
export function experienceMultiplier(level,enemyTier,difficulty='normal'){
 if(!Number.isSafeInteger(level)||level<1||level>50)throw new Error('Invalid campaign level');
 const player=tierIndex(experienceTier(level)),enemy=tierIndex(enemyTier),mode=CORE_REFERENCE.difficulty[difficulty];
 if(enemy<0||!mode)throw new Error('Unknown tier or difficulty');
 return CORE_REFERENCE.lowerTierExperience[player][enemy]*mode.xp;
}
export function allocateCampaignAttribute(character,key,amount=1){
 if(!attributes.includes(key)||!Number.isSafeInteger(amount)||amount<1)return {ok:false,reason:'잘못된 능력치 배분입니다.'};
 if(character.attributePoints<amount)return {ok:false,reason:'능력치 포인트가 부족합니다.'};
 const next=clone(character);next.attributePoints-=amount;next.attributes[key]+=amount;return {ok:true,character:next};
}
// Takes an externally verified level transition; does not invent an XP curve.
export function applyCampaignLevel(character,nextLevel){
 if(!Number.isInteger(nextLevel)||nextLevel!==character.level+1)return {ok:false,reason:'레벨은 한 단계씩 증가해야 합니다.'};
 const grant=levelPointGrant(nextLevel);if(!grant)return {ok:false,reason:'성장 범위를 벗어났습니다.'};
 const next=clone(character);next.level=nextLevel;next.attributePoints+=grant.attributePoints;next.skillPoints+=grant.skillPoints;
 return {ok:true,character:next,grant,promotionEligible:experienceTier(nextLevel)!==next.tier};
}
export function tierGate(character,tier,{promotionVerified=false}={}){
 const target=CORE_REFERENCE.tiers.find(t=>t.id===tier);if(!target)return {ok:false,code:'UNKNOWN_TIER'};
 if(character.level<target.minimumLevel)return {ok:false,code:'LEVEL',requiredLevel:target.minimumLevel};
 if(tier!=='apprentice'&&!promotionVerified)return {ok:false,code:'PROMOTION_REQUIRED',referenceStatus:CORE_REFERENCE.unknown.promotionRequirements.status};
 return {ok:true};
}
// These are class/level components, not a claim that the unresolved general
// attribute-to-derived-stat formulas have been measured or implemented.
export function classLevelComponents(character){
 const c=CORE_REFERENCE.classes[character.classId];if(!c)throw new Error('Unknown campaign class');
 return {attributes:Object.fromEntries(attributes.map(k=>[k,c.baseAttributes[k]+character.attributes[k]])),
  pools:Object.fromEntries(Object.keys(c.basePools).map(k=>[k,c.basePools[k]+c.poolGrowth[k]*(character.level-1)])),
  unresolved:['attributeDerivedStats','resourceRegeneration']};
}
export function skillRankValue(skill,key,rank){
 if(!Number.isSafeInteger(rank)||rank<1||Array.isArray(skill.upgradeCosts)&&rank>skill.upgradeCosts.length)return {known:false,reason:'rank'};
 const value=skill.rankValues?.[key],selected=Array.isArray(value)?value[rank-1]:value;
 return selected===null||selected===undefined||selected==='UNKNOWN'?{known:false,reason:'reference'}:{known:true,value:selected};
}
export function skillPurchaseQuote(character,catalog,id){
 const skills=catalog.skills??catalog,skill=skills.find(s=>s.id===id);if(!skill)return {ok:false,code:'UNKNOWN_SKILL'};
 if(catalog.classId&&catalog.classId!==character.classId)return {ok:false,code:'CLASS'};
 if(tierIndex(skill.tier)<0||tierIndex(character.tier)<0)return {ok:false,code:'UNKNOWN_TIER'};
 if(skill.implementationStatus==='reference_only'||skill.purchaseRequirements===null||skill.tierEvidence==='section_only')return {ok:false,code:'REFERENCE_REQUIRED'};
 const rank=character.skills[id]||0,cost=skill.upgradeCosts?.[rank];
 if(tierIndex(skill.tier)>tierIndex(character.tier))return {ok:false,code:'TIER_LOCKED',tier:skill.tier};
 if(cost===undefined)return {ok:false,code:'MAX_RANK'};
 if(cost===null||!Number.isSafeInteger(cost)||cost<0)return {ok:false,code:'REFERENCE_REQUIRED'};
 if(skill.exclusiveGroup){const selected=character.exclusiveBranches[skill.exclusiveGroup];if(selected&&selected!==id)return {ok:false,code:'EXCLUSIVE',selected};}
 if(skill.baseId&&!character.skills[skill.baseId])return {ok:false,code:'BASE_SKILL',baseId:skill.baseId};
 for(const req of skill.requires||[]){
  if(typeof req==='string'){if(!character.skills[req])return {ok:false,code:'PREREQUISITE',skillId:req};continue;}
  if(req.rank===null)return {ok:false,code:'REFERENCE_REQUIRED',requirement:req};
  if(req.skillId&&!(character.skills[req.skillId]>=req.rank))return {ok:false,code:'PREREQUISITE',requirement:req};
 }
 if(character.skillPoints<cost)return {ok:false,code:'POINTS',cost};
 return {ok:true,skillId:id,rank:rank+1,cost,exclusiveGroup:skill.exclusiveGroup??null};
}
export function purchaseCampaignSkill(character,catalog,id){
 const quote=skillPurchaseQuote(character,catalog,id);if(!quote.ok)return quote;
 const next=clone(character);next.skillPoints-=quote.cost;next.skills[id]=quote.rank;if(quote.exclusiveGroup)next.exclusiveBranches[quote.exclusiveGroup]=id;
 return {ok:true,character:next,quote};
}
