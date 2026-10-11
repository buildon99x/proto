// DESIGN-ONLY calculator. No campaign/save fixtures, registration or writes.
// It deliberately seeds arithmetic from documented cumulative-XP envelopes;
// this is not a command-earned route or ordinary-input gameplay evidence.
import assert from 'node:assert/strict';
import {createCharacter, grantExperience, experienceMultiplier, xpForLevel} from '../app/src/progression.js';
import {trainingGoldBalances} from '../app/src/training-economy.js';

export const REGIONS = [
  {id:'W', killXp:110, killGold:10, bossXp:280, bossGold:40,
    objectives:[200,250,300,300,150,200], gold:[30,20,35,35,20,60],
    materials:[6,4,4,2], optionalKills:4, optionalXp:200, optionalGold:60, optionalMaterials:[0,2,2,0]},
  {id:'R', killXp:120, killGold:11, bossXp:300, bossGold:45,
    objectives:[250,300,350,300,150,200], gold:[25,30,35,40,23,70],
    materials:[8,2,2,3], optionalKills:2, optionalXp:220, optionalGold:65, optionalMaterials:[2,0,0,1]},
  {id:'A', killXp:130, killGold:12, bossXp:320, bossGold:50,
    objectives:[250,350,400,350,200,200], gold:[30,35,45,45,26,75],
    materials:[4,2,6,4], optionalKills:3, optionalXp:240, optionalGold:70, optionalMaterials:[0,0,2,1]},
  {id:'F', killXp:140, killGold:13, bossXp:340, bossGold:60,
    objectives:[300,400,400,350,200,200], gold:[35,40,50,50,29,80],
    materials:[10,2,2,5], optionalKills:4, optionalXp:260, optionalGold:75, optionalMaterials:[3,0,0,2]},
  {id:'S', killXp:150, killGold:14, bossXp:360, bossGold:70,
    objectives:[350,400,450,350,200,200], gold:[25,30,40,40,27,300],
    materials:[6,4,4,6], optionalKills:2, optionalXp:280, optionalGold:80, optionalMaterials:[0,1,2,1]},
];
const sum = values => values.reduce((a,b)=>a+b,0);
const rounded = value => Math.round(value*1e6)/1e6;
const COMBAT_WEIGHTED_OBJECTIVES=[
  [100,150,150,150,100,150], [100,150,175,175,100,150],
  [150,150,200,200,100,150], [150,200,225,225,100,150],
  [200,200,250,250,100,150],
];
const COMBAT_WEIGHTED_KILL_GOLD=[6,7,7,8,8];
const plannedRegion=(index,combatWeighted)=>combatWeighted
  ?{...REGIONS[index],objectives:COMBAT_WEIGHTED_OBJECTIVES[index],killGold:COMBAT_WEIGHTED_KILL_GOLD[index]}
  :REGIONS[index];
const eventsFor = (region, optional, combatWeighted=false) => {
  const events=[];
  const objective=index=>events.push({id:`${region.id}:o${index+1}`,xp:region.objectives[index],gold:region.gold[index],kind:index===5?'report':'objective'});
  const kills=(group,count=4)=>{for(let i=1;i<=count;i++)events.push({id:`${region.id}:${group}:${i}`,xp:region.killXp,gold:region.killGold,kind:'kill',tier:'expert'});};
  if(combatWeighted){
    kills('a',3); objective(0); kills('b',4); objective(1);
    kills('c',5); objective(2); kills('d',4); objective(3); kills('e',4);
  }else{
    kills('a'); objective(0); objective(1);
    kills('b'); objective(2); kills('c'); objective(3);
  }
  events.push({id:`${region.id}:boss`,xp:region.bossXp,gold:region.bossGold,kind:'kill',tier:'expert'});
  objective(4);
  if(optional){kills('optional',region.optionalKills);events.push({id:`${region.id}:optional:reward`,xp:region.optionalXp,gold:region.optionalGold,kind:'objective'});}
  objective(5);
  return events;
};

export function calculate(startXp,difficulty,optionalMask=0,combatWeighted=false){
  const seeded=grantExperience(createCharacter(),startXp);
  assert.equal(seeded.ok,true);
  let character=seeded.character, cumulative=startXp, gold=0;
  const startingSP=character.skillPoints, stages=[], events=[];
  for(let i=0;i<REGIONS.length;i++){
    const r=plannedRegion(i,combatWeighted), beforeXp=cumulative;
    for(const event of eventsFor(r,Boolean(optionalMask&(1<<i)),combatWeighted)){
      const multiplier=event.kind==='kill'?experienceMultiplier(character.level,event.tier,difficulty):1;
      const xp=rounded(event.xp*multiplier), beforeLevel=character.level;
      const grant=grantExperience(character,xp);
      assert.equal(grant.ok,true);
      assert.ok(grant.gainedLevels<=1,`${event.id} jumped ${grant.gainedLevels} levels`);
      character=grant.character; cumulative=rounded(cumulative+grant.appliedXp); gold+=event.gold;
      events.push({...event,multiplier,appliedXp:xp,beforeLevel,level:character.level,cumulative});
    }
    stages.push({region:r.id,deltaXp:rounded(cumulative-beforeXp),cumulative,level:character.level,residual:character.xp,gold});
  }
  return {stages,events,cumulative,level:character.level,residual:character.xp,gold,newSkillPoints:character.skillPoints-startingSP};
}

// Future Master accounting is a proposal. The existing wallet rejects a
// `master` key; do NOT disguise a Master reserve as an Expert reserve fixture.
// Before the proposed commission, production balances validate unreserved gold.
export function walletStress(startingGold,combatWeighted=false){
  let gold=startingGold,reserve=0,spent=0,earned=0,deaths=0;
  const purchases=[120,120,160,180,120], stages=[];
  for(let i=0;i<REGIONS.length;i++){
    const r=plannedRegion(i,combatWeighted), income=(combatWeighted?20:12)*r.killGold+r.bossGold+sum(r.gold);
    gold+=income;earned+=income;
    if(i===4)reserve=300; // included in income, never added to gold again
    for(let d=0;d<2;d++){
      const balance=reserve?{ok:true,spendableGold:gold-reserve}:trainingGoldBalances({gold});
      assert.equal(balance.ok,true);
      const loss=Math.floor(balance.spendableGold*.05);gold-=loss;spent+=loss;deaths+=loss;
    }
    assert.ok(gold-reserve>=purchases[i]);
    gold-=purchases[i];spent+=purchases[i];
    assert.equal(startingGold+earned-spent,gold);
    stages.push({region:r.id,gold,reserved:reserve,spendable:gold-reserve,spent});
  }
  assert.equal(reserve,300); gold-=300;spent+=300;reserve=0;
  assert.equal(startingGold+earned-spent,gold);
  return {startingGold,earned,purchases:sum(purchases),deathLoss:deaths,masterFee:300,endingGold:gold,stages};
}

const cases=[
  ['Easy minimum',8411,'easy'], ['Easy full',8585.5,'easy'],
  ['Normal minimum',8411,'normal'], ['Normal full',8585.5,'normal'],
  ['Hard minimum',7399.5,'hard'], ['Hard full',7605.125,'hard'],
  ['Serious minimum',7399.5,'serious'], ['Serious full',7605.125,'serious'],
  ['Native Normal endpoint as arithmetic input',8565.5,'normal'],
];
let assertions=0;
const results=cases.map(([label,start,difficulty])=>{
  const minimum=calculate(start,difficulty,0),full=calculate(start,difficulty,31);
  let smallest=Infinity,largest=-Infinity;
  for(let mask=0;mask<32;mask++){
    const result=calculate(start,difficulty,mask);
    assert.ok(result.cumulative>=22600,`${label} optional mask ${mask} misses L30`);
    assert.equal(result.gold,2410+REGIONS.reduce((v,r,i)=>v+((mask&(1<<i))?r.optionalKills*r.killGold+r.optionalGold:0),0));
    smallest=Math.min(smallest,result.cumulative);largest=Math.max(largest,result.cumulative);assertions++;
  }
  return {label,minimum:{...minimum,events:undefined},full:{cumulative:full.cumulative,level:full.level,residual:full.residual,gold:full.gold,newSkillPoints:full.newSkillPoints},all32SubsetRange:[smallest,largest]};
});
const combatWeightedResults=cases.map(([label,start,difficulty])=>{
  const minimum=calculate(start,difficulty,0,true),full=calculate(start,difficulty,31,true);
  let smallest=Infinity,largest=-Infinity;
  for(let mask=0;mask<32;mask++){
    const result=calculate(start,difficulty,mask,true);
    assert.ok(result.cumulative>=22600);
    assert.equal(result.gold,2410+REGIONS.reduce((v,r,i)=>v+((mask&(1<<i))?r.optionalKills*COMBAT_WEIGHTED_KILL_GOLD[i]+r.optionalGold:0),0));
    smallest=Math.min(smallest,result.cumulative);largest=Math.max(largest,result.cumulative);assertions++;
  }
  return {label,minimum:{...minimum,events:undefined},full:{cumulative:full.cumulative,level:full.level,residual:full.residual,gold:full.gold},all32SubsetRange:[smallest,largest]};
});
// In these L17/18 -> L30+ routes, L30 is the sole multiplier discontinuity.
// Check exact breakpoints and their preceding micro-XP, not just endpoints:
// an earlier L30 can halve one more kill, making endpoint XP non-monotone.
const envelopeChecks=[];
for(const combatWeighted of [false,true])for(const [difficulty,low,high] of [
  ['easy',8411,8585.5],['normal',8411,8585.5],['hard',7399.5,7605.125],['serious',7399.5,7605.125],
]){
  let tested=0,min=Infinity,max=-Infinity,skippedMin=Infinity;
  for(let mask=0;mask<32;mask++){
    const candidates=new Set([low,high]);let prefix=0;
    for(let i=0;i<REGIONS.length;i++){
      const r=plannedRegion(i,combatWeighted);
      for(const e of eventsFor(r,Boolean(mask&(1<<i)),combatWeighted)){
        prefix=rounded(prefix+e.xp*(e.kind==='kill'?experienceMultiplier(17,'expert',difficulty):1));
        for(const seed of [22600-prefix,rounded(22600-prefix-.000001)])if(seed>=low&&seed<=high)candidates.add(seed);
      }
    }
    for(const seed of candidates){
      const r=calculate(seed,difficulty,mask,combatWeighted);
      assert.ok(r.cumulative>=22600);min=Math.min(min,r.cumulative);max=Math.max(max,r.cumulative);
      if(mask===0)skippedMin=Math.min(skippedMin,r.cumulative);tested++;
    }
  }
  envelopeChecks.push({combatWeighted,difficulty,tested,min,max,allSkippedMinimumAcrossInputInterval:skippedMin});
}
assert.equal(sum(Array.from({length:29},(_,i)=>xpForLevel(i+1))),22600);
const materials=REGIONS.reduce((a,r)=>a.map((v,i)=>v+r.materials[i]),[0,0,0,0]);
assert.deepEqual(materials,[34,14,18,20]);
assert.deepEqual(materials.map((v,i)=>v-[3,0,2,1][i]-[2,2,0,0][i]-[20,8,10,12][i]),[9,4,6,7]);
const lowHard=calculate(7399.5,'hard');
console.log(JSON.stringify({
  status:'DESIGN-ONLY; production arithmetic helpers, synthetic starting inputs; no runtime/gameplay acceptance',
  baseCommit:'5192eeca1884cd28b46e3db486b334faec2b27a7',
  mandatory:{kills:65,baseKillXp:9400,objectiveXp:8500,gold:2410,materials,potions:10},
  optional:{kills:15,baseKillXp:1930,objectiveXp:1200,gold:528,materials:[5,3,6,5],potions:5},
  subsetChecks:assertions,envelopeChecks,results,lowestHardEvents:lowHard.events,
  walletStress:[walletStress(0),walletStress(1537)],
  combatWeighted:{mandatory:{kills:105,baseKillXp:14600,objectiveXp:4800,gold:2410,materials,potions:10},
    results:combatWeightedResults,lowestHardEvents:calculate(7399.5,'hard',0,true).events,
    walletStress:[walletStress(0,true),walletStress(1537,true)]},
},null,2));
