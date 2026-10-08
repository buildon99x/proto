// Deterministic encounter simulation. All danger geometry is in world coordinates.
// This module has no browser dependencies and never applies damage during a tell.
const EW_TAU = Math.PI * 2;
const EW_LOCK_TIME = .15;
const EW_EPS = 1e-9;
const ewClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ewDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ewAngle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const ewDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// Durations are seconds; line widths describe the full player-center danger lane.
// Attack previews include projectile radius + the runtime player's 10px hit radius.
export const ENCOUNTER_CATALOG = Object.freeze({
  rat: {role:'skirmisher', attacks:['rat-pounce'], counter:'Sidestep the short lane; punish the landing.'},
  bandit: {role:'duelist', attacks:['bandit-cut','bandit-lunge'], counter:'Step outside the blade arc, then sidestep the thrust.'},
  archer: {role:'marksman', attacks:['archer-aim','archer-split'], counter:'Move after aim locks; close through the split-volley gap.'},
  skeleton: {role:'sentinel', attacks:['skeleton-thrust','skeleton-sweep'], counter:'Circle the long thrust; punish the slow sweep recovery.'},
  mage: {role:'controller', attacks:['mage-sigil','mage-ring'], counter:'Leave the locked sigil; close inside the hollow ring.'},
  knight: {role:'heavy', attacks:['knight-cleave','knight-slam'], counter:'Leave the broad cleave or slam; use the long recovery.'},
  imp: {role:'flanker', attacks:['imp-dash','imp-split'], counter:'Sidestep the long dash; move through the fire-fan gap.'},
  thornwarden: {role:'guardian', attacks:['thorn-sweep','thorn-thrust','thorn-bloom','thorn-split'], counter:'Circle the rooted sweep, sidestep vines, leave the bloom.'},
  bellkeeper: {role:'guardian', attacks:['bell-sigil','bell-ring','bell-split','bell-cross'], counter:'Reposition from sigils; stand inside the bell ring and fan gaps.'},
  hollowKing: {role:'guardian', attacks:['king-charge','king-cleave','king-fall','king-ring'], counter:'Bait the charge, leave its follow-up cleave, then punish the landing.'}
});

// All actions resolve through one phase machine, including every boss combo step.
const EW_ATTACKS = Object.freeze({
  'rat-pounce': {name:'Pounce', motion:'lunge', role:'melee', tell:.36, active:.18, recovery:.32, range:82, geometry:'line', length:78, width:26, travel:78, damage:.8},
  'bandit-cut': {name:'Hook cut', motion:'sweep', role:'melee', tell:.45, active:.13, recovery:.36, range:64, geometry:'cone', radius:59, halfAngle:.62, damage:1},
  'bandit-lunge': {name:'Step thrust', motion:'lunge', role:'melee', tell:.42, active:.22, recovery:.4, range:115, geometry:'line', length:119, width:28, travel:119, damage:.9},
  'archer-aim': {name:'Aimed arrow', motion:'shoot', role:'ranged', tell:.55, active:.12, recovery:.42, range:270, geometry:'volley', offsets:[0], length:300, width:28, speed:230, kind:'arrow', damage:1},
  'archer-split': {name:'Split volley', motion:'shoot', role:'ranged', tell:.65, active:.14, recovery:.46, range:270, geometry:'volley', offsets:[-.32,.32], length:300, width:28, speed:210, kind:'arrow', damage:.85},
  'skeleton-thrust': {name:'Bone spear', motion:'thrust', role:'melee', tell:.55, active:.16, recovery:.43, range:117, geometry:'line', length:122, width:28, damage:1},
  'skeleton-sweep': {name:'Bone sweep', motion:'sweep', role:'melee', tell:.62, active:.2, recovery:.48, range:82, geometry:'cone', radius:80, halfAngle:.72, damage:.95},
  'mage-sigil': {name:'Binding sigil', motion:'cast', role:'support', tell:.72, active:.4, recovery:.43, range:260, geometry:'target', radius:45, damage:1},
  'mage-ring': {name:'Hollow ward', motion:'cast', role:'support', tell:.7, active:.32, recovery:.45, range:240, geometry:'ring', radius:143, inner:105, damage:.9},
  'knight-cleave': {name:'Iron cleave', motion:'sweep', role:'heavy', tell:.82, active:.22, recovery:.58, range:100, geometry:'cone', radius:96, halfAngle:.85, damage:1.1},
  'knight-slam': {name:'Shield slam', motion:'slam', role:'heavy', tell:.8, active:.2, recovery:.6, range:83, geometry:'circle', radius:77, damage:1},
  'imp-dash': {name:'Cinder rush', motion:'lunge', role:'melee', tell:.45, active:.3, recovery:.44, range:190, geometry:'line', length:194, width:30, travel:194, damage:.95},
  'imp-split': {name:'Forked flame', motion:'shoot', role:'ranged', tell:.6, active:.14, recovery:.4, range:220, geometry:'volley', offsets:[-.42,.42], length:250, width:34, speed:180, kind:'fire', damage:.75},
  'thorn-sweep': {name:'Rooted scythe', motion:'sweep', role:'boss', tell:.88, active:.23, recovery:.55, range:115, geometry:'cone', radius:110, halfAngle:.82, damage:1},
  'thorn-thrust': {name:'Briar lance', motion:'thrust', role:'boss', tell:.7, active:.22, recovery:.5, range:265, geometry:'line', length:270, width:38, damage:1.05},
  'thorn-bloom': {name:'Briar bloom', motion:'cast', role:'boss', tell:.85, active:.34, recovery:.55, range:300, geometry:'target', radius:65, damage:.9},
  'thorn-split': {name:'Thorn fan', motion:'shoot', role:'boss', tell:.75, active:.16, recovery:.5, range:300, geometry:'volley', offsets:[-.7,-.35,.35,.7], length:330, width:28, speed:160, kind:'thorn', damage:.7},
  'bell-sigil': {name:'Funeral sigils', motion:'cast', role:'boss', tell:.8, active:.36, recovery:.52, range:300, geometry:'targets', radius:47, spacing:125, damage:.85},
  'bell-ring': {name:'Hollow toll', motion:'slam', role:'boss', tell:.75, active:.3, recovery:.55, range:300, geometry:'ring', radius:177, inner:133, damage:1},
  'bell-split': {name:'Mourning fan', motion:'shoot', role:'boss', tell:.72, active:.16, recovery:.5, range:310, geometry:'volley', offsets:[-.7,-.34,.34,.7], length:340, width:28, speed:185, kind:'orb', damage:.8},
  'bell-cross': {name:'Crossing chimes', motion:'cast', role:'boss', tell:.82, active:.28, recovery:.55, range:290, geometry:'cross', length:280, width:30, damage:.85},
  'king-charge': {name:'Crown breaker', motion:'lunge', role:'boss', tell:.8, active:.42, recovery:.45, range:275, geometry:'line', length:276, width:44, travel:276, damage:1.05},
  'king-cleave': {name:'Cinder cleave', motion:'sweep', role:'boss', tell:.9, active:.25, recovery:.6, range:117, geometry:'cone', radius:113, halfAngle:.86, damage:1.1},
  'king-fall': {name:'Falling crown', motion:'slam', role:'boss', tell:.85, active:.27, recovery:.6, range:300, geometry:'targets', radius:52, spacing:132, damage:.9},
  'king-ring': {name:'Ashen coronation', motion:'cast', role:'boss', tell:.85, active:.3, recovery:.55, range:290, geometry:'ring', radius:155, inner:109, damage:.95}
});
const EW_BOSS_FORMS = ['thornwarden','bellkeeper','hollowKing'];
const EW_COMBOS = {
  thornwarden:[['thorn-sweep','thorn-thrust','thorn-bloom'],['thorn-thrust','thorn-bloom','thorn-split','thorn-sweep']],
  bellkeeper:[['bell-sigil','bell-ring','bell-split'],['bell-sigil','bell-cross','bell-ring','bell-split']],
  hollowKing:[['king-charge','king-cleave','king-fall'],['king-charge','king-cleave','king-ring','king-fall']]
};

/** Pure attack selection: no randomness or mutation, suitable for previews/tests. */
export function planEncounterAttack(enemy, {floor=0}={}) {
  const form = enemy.type==='boss' ? EW_BOSS_FORMS[ewClamp(Math.floor(floor/2),0,2)] : enemy.type;
  const pattern = ENCOUNTER_CATALOG[form];
  if (!pattern) return null;
  const phase = enemy.phase>=2 ? 2 : 1;
  const sequence = enemy.type==='boss' ? EW_COMBOS[form][phase-1] : pattern.attacks;
  const index = Math.max(0,enemy.phaseAttackCount ?? enemy.attackCount ?? 0)%sequence.length;
  const id = sequence[index];
  return {...EW_ATTACKS[id], id, form, encounterPhase:phase, comboStep:index+1, comboLength:sequence.length, lockTime:EW_LOCK_TIME};
}

/** One shared player-center hit test for the renderer's serialized footprints. */
export function encounterContains(shape, point) {
  if (!shape || !point) return false;
  if (Array.isArray(shape)) return shape.some(s=>encounterContains(s,point));
  const dx=point.x-shape.x, dy=point.y-shape.y, distance=Math.hypot(dx,dy);
  if (shape.type==='circle') return distance<=shape.r+EW_EPS;
  if (shape.type==='ring') return distance>=shape.inner-EW_EPS && distance<=shape.r+EW_EPS;
  if (shape.type==='cone') return distance<=shape.r+EW_EPS && (distance<EW_EPS || Math.abs(ewDelta(Math.atan2(dy,dx),shape.angle))<=shape.halfAngle+EW_EPS);
  if (shape.type==='line') {
    const vx=shape.x2-shape.x, vy=shape.y2-shape.y, length2=vx*vx+vy*vy;
    const t=length2 ? ewClamp((dx*vx+dy*vy)/length2,0,1) : 0;
    return Math.hypot(dx-vx*t,dy-vy*t)<=shape.width/2+EW_EPS;
  }
  return false;
}

function ewLine(x,y,angle,length,width,context) {
  let stop=length;
  // Lanes end at walls. Hit tests also use lineClear, so corners never damage through walls.
  if (context.solid) for(let d=0;d<=length;d+=4) {
    if(context.solid(x+Math.cos(angle)*d,y+Math.sin(angle)*d,2)){stop=Math.max(0,d-4);break;}
  }
  return {type:'line',x,y,x2:x+Math.cos(angle)*stop,y2:y+Math.sin(angle)*stop,width};
}

function ewShapes(enemy, attack, context) {
  const {plan,origin,target,aim}=attack, {x,y}=origin;
  if(plan.geometry==='line') return [ewLine(x,y,aim,plan.length,plan.width,context)];
  if(plan.geometry==='cone') return [{type:'cone',x,y,angle:aim,r:plan.radius,halfAngle:plan.halfAngle}];
  if(plan.geometry==='circle') return [{type:'circle',x,y,r:plan.radius}];
  if(plan.geometry==='ring') return [{type:'ring',x,y,inner:plan.inner,r:plan.radius}];
  if(plan.geometry==='target') return [{type:'circle',x:target.x,y:target.y,r:plan.radius}];
  if(plan.geometry==='targets') return [-1,0,1].map(offset=>({type:'circle',x:target.x+Math.cos(aim+Math.PI/2)*plan.spacing*offset,y:target.y+Math.sin(aim+Math.PI/2)*plan.spacing*offset,r:plan.radius}));
  if(plan.geometry==='cross') return [aim,aim+Math.PI/2].map(a=>ewLine(target.x-Math.cos(a)*plan.length/2,target.y-Math.sin(a)*plan.length/2,a,plan.length,plan.width,context));
  return plan.offsets.map(offset=>ewLine(x,y,aim+offset,plan.length,plan.width,context));
}

function ewSync(enemy) {
  const attack=enemy.encounterAttack;
  if(!attack) {enemy.actionPhase='idle';enemy.actionProgress=0;enemy.phaseProgress=0;enemy.motionAction='idle';enemy.actionName='idle';enemy.telegraph=null;return;}
  const {plan,stage,elapsed}=attack;
  const duration=stage==='anticipation'?plan.tell:stage==='active'?plan.active:plan.recovery;
  const before=stage==='anticipation'?0:stage==='active'?plan.tell:plan.tell+plan.active;
  enemy.actionPhase=stage;
  enemy.actionName=plan.motion;
  enemy.motionAction=plan.motion;
  enemy.actionProgress=ewClamp((before+elapsed)/(plan.tell+plan.active+plan.recovery),0,1);
  enemy.phaseProgress=ewClamp(elapsed/duration,0,1);
  enemy.actionDuration=plan.tell+plan.active+plan.recovery;
  enemy.timer=Math.max(0,duration-elapsed);
  enemy.state=stage==='anticipation'?'windup':stage==='active'?(plan.travel?'charge':'strike'):'recover';
  enemy.aim=attack.aim;
  enemy.angle=attack.aim;
  enemy.telegraph=stage==='recovery'?null:{shapes:attack.shapes,locked:attack.locked,progress:enemy.phaseProgress,phase:stage,color:enemy.type==='boss'?'#ffab79':plan.role==='support'?'#bb9ce5':'#ef986e',name:plan.name,attackId:plan.id};
}

/** Discard an obsolete save's attack: resuming cannot create an unseen contact frame. */
export function resetEncounterEnemy(enemy) {
  enemy.encounterVersion=1;
  enemy.encounterAttack=null;
  enemy.state='idle';
  enemy.timer=Math.max(.25,Math.min(1.5,Number(enemy.timer)||.25));
  enemy.phaseAttackCount=Number(enemy.phaseAttackCount)||0;
  enemy.attackCount=Number(enemy.attackCount)||0;
  enemy.phase=enemy.phase>=2?2:1;
  ewSync(enemy);
  return enemy;
}

function ewBudget(enemy,plan,context) {
  let count=0,cost=0,projectileAttacker=false;
  for(const other of context.entities||[]) {
    if(other===enemy || other.hp<=0 || !other.encounterAttack || ewDistance(other,context.player)>700) continue;
    const attack=other.encounterAttack.plan;
    count++;
    cost+=attack.role==='boss'||attack.role==='heavy'?2:1;
    projectileAttacker ||= attack.geometry==='volley';
  }
  const required=plan.role==='boss'||plan.role==='heavy'?2:1;
  return count<2 && cost+required<=3 && !(plan.geometry==='volley'&&projectileAttacker);
}

function ewStart(enemy,plan,context) {
  const player=context.player;
  // Ground markers stay fixed from their first cue, leaving their full exit time.
  const attack={plan,stage:'anticipation',elapsed:0,origin:{x:enemy.x,y:enemy.y},target:{x:player.x,y:player.y},aim:ewAngle(enemy,player),locked:['target','targets','cross','circle','ring'].includes(plan.geometry),hit:false,released:false,shapes:[]};
  attack.shapes=ewShapes(enemy,attack,context);
  enemy.encounterAttack=attack;
  enemy.moving=false;
  ewSync(enemy);
  context.onAttack?.(plan,enemy,{type:'windup',phase:'anticipation'});
}

function ewRelease(enemy,context) {
  const attack=enemy.encounterAttack, {plan}=attack;
  if(attack.released) return;
  attack.released=true;
  if(plan.geometry==='volley') {
    for(let i=0;i<attack.shapes.length;i++) {
      const lane=attack.shapes[i], length=Math.hypot(lane.x2-lane.x,lane.y2-lane.y);
      if(length<=2)continue;
      context.projectile?.(lane.x,lane.y,attack.aim+plan.offsets[i],plan.speed,enemy.damage*plan.damage,plan.kind,true,{life:length/plan.speed,r:plan.width/2-10,encounterAttack:plan.id});
    }
  }
  context.onAttack?.(plan,enemy,{type:'contact',phase:'active'});
}

function ewContact(enemy,dt,context) {
  const attack=enemy.encounterAttack, {plan}=attack, player=context.player;
  if(!player || plan.geometry==='volley')return;
  let shapes=attack.shapes;
  if(plan.travel) {
    const from={x:enemy.x,y:enemy.y};
    const lane=attack.shapes[0];
    const length=Math.min(plan.travel,Math.hypot(lane.x2-lane.x,lane.y2-lane.y));
    const distance=length*dt/plan.active;
    const dx=Math.cos(attack.aim)*distance,dy=Math.sin(attack.aim)*distance;
    context.move?.(enemy,dx,dy,Math.min(11,enemy.r*.6));
    // Contact sweeps only the body's path during its advertised active window.
    shapes=[{type:'line',x:from.x,y:from.y,x2:enemy.x,y2:enemy.y,width:plan.width}];
    enemy.walk=(enemy.walk||0)+Math.hypot(enemy.x-from.x,enemy.y-from.y)/20;
    enemy.moving=ewDistance(from,enemy)>EW_EPS;
  }
  if(!attack.hit && encounterContains(shapes,player) && encounterContains(attack.shapes,player) && (!context.lineClear || context.lineClear(enemy,player))) {
    attack.hit=true;
    context.damagePlayer?.(enemy.damage*plan.damage,enemy);
  }
}

function ewFinish(enemy,context) {
  enemy.attackCount=(enemy.attackCount||0)+1;
  enemy.phaseAttackCount=(enemy.phaseAttackCount||0)+1;
  enemy.encounterAttack=null;
  enemy.timer=enemy.type==='boss'?.12:.16;
  enemy.state='idle';
  enemy.moving=false;
  ewSync(enemy);
  if(enemy.type==='boss'&&enemy.phase<2&&(enemy.hp<=enemy.max*.5||enemy.attackCount>=3)) {
    enemy.phase=2;
    enemy.phaseAttackCount=0;
    enemy.timer=.5;
    context.onPhase?.(enemy,2);
  }
}

function ewInterrupt(enemy,context) {
  const attack=enemy.encounterAttack;
  if(!attack || attack.stage==='recovery')return;
  // Stagger cancels the entire committed attack, including unsent projectiles.
  attack.stage='recovery';attack.elapsed=0;attack.plan={...attack.plan,recovery:Math.max(.3,attack.plan.recovery)};
  enemy.moving=false;
  ewSync(enemy);
  context.onAttack?.(attack.plan,enemy,{type:'interrupted',phase:'recovery'});
}

function ewTravel(enemy,dt,context,plan,distance) {
  const player=context.player,angle=ewAngle(enemy,player),speed=(enemy.speed||50)*(enemy.slow>0?.45:1);
  let dx=0,dy=0;
  const ranged=['archer','mage'].includes(enemy.type);
  const desired=ranged?(enemy.type==='mage'&&plan.geometry==='ring'?114:170):enemy.type==='imp'?135:0;
  if(ranged && distance<95) {dx=-Math.cos(angle)*speed*dt;dy=-Math.sin(angle)*speed*dt;}
  else if((ranged && distance<desired+35 && context.lineClear?.(enemy,player)) || (enemy.type==='bandit'&&distance<100&&enemy.timer>0)) {
    const side=(enemy.attackCount||0)%2?-1:1;
    dx=Math.cos(angle+side*Math.PI/2)*speed*.52*dt;dy=Math.sin(angle+side*Math.PI/2)*speed*.52*dt;
  } else if(distance>Math.min(plan.range*.83,desired||plan.range*.83)) {
    const before={x:enemy.x,y:enemy.y};
    if(context.chase)context.chase(enemy,dt,enemy.type==='boss'&&enemy.phase>=2?1.12:1);
    else context.move?.(enemy,Math.cos(angle)*speed*dt,Math.sin(angle)*speed*dt,Math.min(11,enemy.r*.6));
    enemy.moving=ewDistance(before,enemy)>EW_EPS;
    enemy.angle=angle;
    return;
  }
  if(dx||dy) {
    const before={x:enemy.x,y:enemy.y};
    context.move?.(enemy,dx,dy,Math.min(11,enemy.r*.6));
    enemy.moving=ewDistance(before,enemy)>EW_EPS;
    enemy.walk=(enemy.walk||0)+ewDistance(before,enemy)/20;
    enemy.angle=angle;
  } else enemy.moving=false;
}

function ewSeparate(enemy,dt,context) {
  for(const other of context.entities||[]) {
    if(other===enemy||other.hp<=0||other.type==='dummy')continue;
    const d=ewDistance(enemy,other),space=(enemy.r||12)+(other.r||12)-3;
    if(d>EW_EPS&&d<space)context.move?.(enemy,(enemy.x-other.x)/d*(space-d)*dt*2,(enemy.y-other.y)/d*(space-d)*dt*2,Math.min(11,enemy.r*.6));
  }
}

/**
 * Update a single enemy. The game owns status DOT, player invulnerability, projectiles,
 * and visual effects. Context functions use the existing game's call signatures.
 * Each phase boundary is consumed exactly, including a frame that crosses aim-lock.
 */
export function updateEncounterEnemy(enemy,dt,context) {
  if(enemy.type==='dummy')return;
  if(enemy.hp<=0){enemy.encounterAttack=null;enemy.telegraph=null;enemy.actionPhase='death';enemy.motionAction='death';return;}
  if(!context.player || !Number.isFinite(dt) || dt<0)return;
  if(enemy.encounterVersion!==1)resetEncounterEnemy(enemy);
  const player=context.player,distance=ewDistance(enemy,player);
  if(distance<340)enemy.active=true;
  if(!enemy.active)return;
  if(enemy.stagger>0) {
    enemy.stagger=Math.max(0,enemy.stagger-dt);
    ewInterrupt(enemy,context);
    return;
  }
  if(distance>700&&!enemy.encounterAttack){enemy.moving=false;return;}
  if(enemy.encounterAttack) {
    let remaining=dt;
    while(enemy.encounterAttack&&remaining>EW_EPS) {
      const attack=enemy.encounterAttack,{plan}=attack;
      let duration=attack.stage==='anticipation'?plan.tell:attack.stage==='active'?plan.active:plan.recovery;
      if(attack.stage==='anticipation'&&!attack.locked) {
        // Tracking ends at tell - 150ms. The lock boundary is a real simulation step.
        attack.target={x:player.x,y:player.y};attack.aim=ewAngle(attack.origin,player);
        attack.shapes=ewShapes(enemy,attack,context);
        duration=Math.min(duration,plan.tell-EW_LOCK_TIME);
      }
      const slice=Math.max(0,Math.min(remaining,duration-attack.elapsed));
      if(attack.stage==='active')ewContact(enemy,slice,context);
      attack.elapsed+=slice;remaining-=slice;
      if(attack.elapsed>=duration-EW_EPS) {
        if(attack.stage==='anticipation'&&!attack.locked) {attack.locked=true;}
        else if(attack.stage==='anticipation') {
          attack.stage='active';attack.elapsed=0;attack.locked=true;
          ewSync(enemy);ewRelease(enemy,context);
          // An instant release does not skip a contact window at exact phase boundaries.
          ewContact(enemy,0,context);
        } else if(attack.stage==='active') {attack.stage='recovery';attack.elapsed=0;enemy.moving=false;}
        else {ewFinish(enemy,context);break;}
      }
      ewSync(enemy);
    }
    return;
  }
  enemy.timer=Math.max(0,(enemy.timer||0)-dt);
  enemy.actionPhase='idle';enemy.motionAction='idle';
  if(enemy.type==='boss')enemy.bossForm=EW_BOSS_FORMS[ewClamp(Math.floor((context.floor||0)/2),0,2)];
  const plan=planEncounterAttack(enemy,context);
  if(!plan)return;
  const closeEnough=distance<=plan.range;
  if(enemy.timer<=EW_EPS && closeEnough && (!context.canAttack||context.canAttack(enemy,plan)) && (!context.lineClear||context.lineClear(enemy,player)) && ewBudget(enemy,plan,context)) {
    ewStart(enemy,plan,context);return;
  }
  ewTravel(enemy,dt,context,plan,distance);
  ewSeparate(enemy,dt,context);
}
