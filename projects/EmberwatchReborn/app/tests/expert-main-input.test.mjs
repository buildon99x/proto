import {isImmutableSnapshot} from '../src/immutable-snapshot.js';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {earnedTombRoute} from './support/earned-tomb-route.mjs';import {report} from './support/earned-route.mjs';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),imports={};
for(const row of source.matchAll(/^import\s*\{([^}]+)\}\s*from\s*'([^']+)'/gm)){const module=await import(new URL('../src/'+row[2].replace('./',''),import.meta.url));for(const name of row[1].split(',').map(s=>s.trim()))imports[name]=module[name];}
const {reduceRuntime}=await import('../src/state.js');const {createStore}=await import('../src/save.js');
function fn(name){const m=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(m,name);for(let end=source.indexOf('}',m.index);end>=0;end=source.indexOf('}',end+1)){const text=source.slice(m.index,end+1);try{new vm.Script('('+text+')');return text;}catch(e){if(!(e instanceof SyntaxError))throw e;}}throw Error(name);}
const cut=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
let saved;function fixture(){if(!saved){let s=earnedTombRoute('normal',{full:true}),r=reduceRuntime(s,{type:'promoteExpert',...report(s,{x:260,y:325}),expectedRevision:1,expectedGoldCost:120},{revision:1});assert.equal(r.ok,true);s=r.state;for(const skillId of ['battle_banner','zealous_onslaught','zealous_lance']){r=reduceRuntime(s,{type:'purchaseSkill',skillId,position:{x:260,y:325}});assert.equal(r.ok,true);s=r.state;}r=reduceRuntime(s,{type:'assignActionSlot',slot:'expert1',skillId:'zealous_onslaught',expectedSkillId:null,expectedRevision:1,life:s.world.life??0},{revision:1});assert.equal(r.ok,true);s=r.state;r=reduceRuntime(s,{type:'assignActionSlot',slot:'expert2',skillId:'battle_banner',expectedSkillId:null,expectedRevision:2,life:s.world.life??0},{revision:2});assert.equal(r.ok,true);saved=r.state;}return structuredClone(saved);}
const next=()=>new Promise(r=>setImmediate(r));

for(const hz of [30,60,120])test(`real main ${hz}Hz contact-minus5ms side move keeps slash and feedback at the same contact pose`,async()=>{
 const h=await ui({poeMode:'wasd'});h.key('KeyJ');h.up('KeyJ');const action=h.app.battle.p.action;
 assert.equal(action?.id,'mace_swing');const target=action.contact-.005;
 while(action.elapsed<target-1e-10)await h.frame(Math.min(.01,target-action.elapsed));
 assert.ok(Math.abs(action.contact-action.elapsed-.005)<1e-9);
 h.key('KeyW');h.key('KeyD');await h.frame(1/hz);h.up('KeyW');h.up('KeyD');
 const slash=h.app.battle.effects.find(e=>e.type==='slash'),feedback=h.rendered.at(-1).poeFeedback.find(e=>e.castId===action.castId);
 assert.ok(slash);assert.ok(feedback);const pose={x:slash.x,y:slash.y,angle:slash.angle};
 console.log(JSON.stringify({case:'contact-pose',hz,slash:pose,feedback:{x:feedback.x,y:feedback.y,angle:feedback.angle},playerAfterFrame:{x:h.app.battle.p.x,y:h.app.battle.p.y},offset:Math.hypot(feedback.x-slash.x,feedback.y-slash.y)}));
 assert.ok(Math.hypot(h.app.battle.p.x-slash.x,h.app.battle.p.y-slash.y)>0,'frame includes real postcontact recovery walking');
 assert.deepEqual({x:feedback.x,y:feedback.y,angle:feedback.angle},pose);
});

test('empty learned Judgement timing is not presented as proof of an enemy hit',async()=>{
 const h=await ui({poeMode:'wasd',skills:['judgement']}),events=[];
 assert.equal(h.app.battle.enemies.length,0);
 h.key('KeyE');h.up('KeyE');assert.equal(h.app.battle.p.action?.id,'judgement');
 for(let i=0;i<60;i++){await h.frame();events.push(...h.app.battle.events);}
 assert.ok(events.some(e=>e.type==='actionContact'));
 assert.equal(events.some(e=>e.type==='enemyHit'||e.type==='crusherPayoff'),false);
 assert.ok(h.app.inputObservations.some(r=>r.kind==='contact'));
 const before=structuredClone(h.app.state),revision=h.app.controller.revision();
 h.app.showInputObservations();
 assert.match(h.modal.innerHTML,/타격 판정 [0-9.]+ ms/);
 assert.match(h.modal.innerHTML,/허공 공격에도 기록됩니다/);
 assert.match(h.modal.innerHTML,/적 명중·피해·파쇄 발동의 증거가 아닙니다/);
 assert.doesNotMatch(h.modal.innerHTML,/실제 접촉 이벤트/);
 assert.deepEqual(h.app.state,before);assert.equal(h.app.controller.revision(),revision);
});
// Actual production frame, browser event handlers, safety coordinator and store.
// DOM/render/audio boundaries are probes. Earned predecessor travel/defeats are
// scripted fixtures, not native key/browser gameplay or pixel/quality evidence.
async function ui({promoted=true,skills=[],poeMode=null,runMode='combined',realInteractions=false,audioResult=false,renderDuration=0,realNotice=false,candidate=true,phaseCosts={}}={}){
 let s=promoted?fixture():earnedTombRoute('normal',{full:true});
 for(const skillId of skills){const r=reduceRuntime(s,{type:'purchaseSkill',skillId,position:{x:260,y:325}});assert.equal(r.ok,true,skillId);s=r.state;}
 if(poeMode)s=reduceRuntime(s,{type:'setControls',controls:imports.poeControlPreset(s.options.controls,poeMode,runMode)}).state;
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},store=createStore(storage,{profile:'qa-r11-main-input'});assert.equal(store.save(s,{expectedRevision:0}).ok,true);let delayed=false,pending=null,failure=null;
 const controller=imports.createController({load:store.load,save:(s,o)=>{if(failure){const r=failure;failure=null;return r;}if(delayed){delayed=false;return new Promise(resolve=>pending=(result)=>resolve(result??store.save(s,o)));}return store.save(s,o);}});assert.equal((await controller.load()).ok,true);
 const wh={},dh={},ch={},buttons={},toasts=[],rendered=[],renderClocks=[],audioRequests=[],audioCancellations=[];const el=()=>{const classes=new Set();return {addEventListener(){},innerHTML:'',textContent:'',hidden:false,inert:false,style:{},attributes:{},getAttribute(name){return this.attributes[name]??null;},removeAttribute(name){delete this.attributes[name];},setAttribute(name,value){this.attributes[name]=value;},classList:{add(name){classes.add(name);},remove(name){classes.delete(name);},toggle(name){classes.has(name)?classes.delete(name):classes.add(name);},contains:name=>classes.has(name)},querySelector:()=>null};};const elements=new Map();const $=id=>{if(!elements.has(id))elements.set(id,el());return elements.get(id);};
 const modal={...el(),hidden:true,presentationEpoch:0,contains(target){return !!target?.dataset?.action&&this.innerHTML.includes('data-action="'+target.dataset.action+'"');},querySelector:selector=>selector==='[data-dialog-status]'?(modal.innerHTML.includes('data-dialog-status')?$('dialogStatus'):null):({focus(){}})},canvas={...el(),tagName:'CANVAS',width:1000,height:700,focus(){},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0}),addEventListener:(n,f)=>ch[n]=f};
 for(const action of ['attack','hammer','charge','block','heal','judgement','expert1','expert2','dodgeSprint','dodgeOnly','sprint'])buttons[action]={...el(),dataset:{combat:action},handlers:{},setPointerCapture(){},addEventListener(n,f){this.handlers[n]=f;}};
 $('hotbar').querySelector=selector=>buttons[/data-combat="([^"]+)"/.exec(selector)?.[1]]??null;
 const moves={};for(const direction of ['up','left','down','right'])moves[direction]={...el(),dataset:{move:direction},handlers:{},setPointerCapture(){},addEventListener(n,f){this.handlers[n]=f;}};
 const document={getElementById:id=>id==='world'?canvas:$(id),hidden:false,visibilityState:'visible',hasFocus:()=>true,addEventListener:(n,f)=>dh[n]=f,querySelectorAll:q=>q==='[data-combat]'?Object.values(buttons):q==='[data-move]'?Object.values(moves):[]};
 modal.ownerDocument=document;
 const router=imports.createInputRouter({captureAttackTap:true,now:()=>now}),expertCapture=imports.createExpertInputCapture(),skillCapture=imports.createSkillLoadoutInput({now:()=>now}),allSkillCapture={clear(reason){expertCapture.clear(reason);skillCapture.clear(reason);},reset(options){expertCapture.reset(options);skillCapture.reset(options);}},expertSafety=imports.createActionSafety({capture:allSkillCapture,cancel:imports.cancelBattleAction}),gate=imports.createRuntimeGate();
 const env={...imports,townPortalPreview:null,state:controller.snapshot(),battle:imports.createBattle(s),controller,router,expertCapture,skillCapture,expertSafety,gate,modal,canvas,document,window:{addEventListener:(n,f)=>wh[n]=f},$,paused:false,busy:false,captureBinding:null,suppressNextClick:false,combatSaveElapsed:0,contextClick:imports.createContextClickIntent(),contextSuppressHeld:false,releasedAimBySkill:{},locomotionIntent:imports.createLocomotionIntent(),poeFeedback:imports.createPoeFeedback(),inputFeedback:null,inputLatency:imports.createInputLatency({now:()=>now}),contactTrace:imports.createContactTrace(),frameObservation:imports.createFrameObservation({now:()=>now}),deferredImmediate:imports.createImmediateInput(),input:{pointerScreen:null},last:0,hudTimer:0,displayTime:0,combatTime:0,walkTime:0,menuTime:0,arrivalWaitTime:0,noticeUntil:0,lastObjectiveHtml:'',profile:'qa-r11-main-input',candidate,saveNamespace:'qa-r11',focusEvents:{},pauseReason:'',
 ctx:{save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},closePath(){},setLineDash(){},fillText(){}},renderer:{render:r=>{renderClocks.push({at:now,observations:env.inputLatency.snapshot()});rendered.push(r);now+=renderDuration;}},drawLabels(){},audio:{cancel(tag){audioCancellations.push(tag);},play(...args){audioRequests.push({args,at:now});return audioResult;},pause(){},tick(){}},requestAnimationFrame(){},toast:t=>toasts.push(t),interact:()=>toasts.push('INTERACT'),applyBinding(){},showControls(){},showDeath(){},performance:{now:()=>now},console:{error(error){throw error;}}};
 const observedEnd=env.frameObservation.endPhase;env.frameObservation.endPhase=name=>{if(env.frameObservation.enabled)now+=phaseCosts[name]??0;return observedEnd(name);};
 const funcs=['openTownPortal','visibleTownPortal',...(realNotice?['toast','showDeath']:[]),...(realInteractions?['interact']:[]),'wildernessView','interactionCandidates','contextSceneVisibility','contextProjection','contextIsVisible','contextHasLabel','beginContextOrGroundClick','stepContextClick','showSkillSlots','flushDeferredSkills','showInputObservations','showQaObservations','showControls','beginBinding','applyBinding','updateHud','effectText','checkpointPanel','showTraining','showActionSlots','showNpc','nearest','showInputFeedback','clearInputFeedback','clearInput','flushActionSafety','acceptCombatPress','currentPoeAim','sampledCombatInput','deliverCombatAudio','deliverCombatEvents','flushFreshCombatInput','releaseCombatToken','panel','closePanel','report','syncVitals','dispatch','immediateAction','showMenu','frame'];
 const program=[cut('const actionSkill=','const tierLabel='),cut('const esc=','function clearInput('),cut('const config=','let controller='),cut('const tierLabel=','const focusEvents='),...funcs.map(fn),cut("document.addEventListener('click',","document.addEventListener('change',"),cut("document.addEventListener('change',","$('menuButton').onclick"),cut("window.addEventListener('keydown'","function resize("),`return {frame,toast,showDeath,get noticeUntil(){return noticeUntil},deliverCombatEvents,interactionCandidates,contextProjection,get contextClick(){return contextClick},showControls,showSkillSlots,showInputObservations,closePanel,updateHud,clearInput,sampledCombatInput,flushActionSafety,dispatch,report,showTraining,showActionSlots,get inputObservations(){return inputLatency.snapshot()},get state(){return state},get battle(){return battle},get busy(){return busy},get paused(){return paused},get capture(){return expertCapture},get gate(){return gate},get controller(){return controller}};`].join('\n');
 const app=new Function(...Object.keys(env),program)(...Object.values(env));let now=0;
 const event=(code,extra={})=>({code,target:canvas,preventDefault(){},stopImmediatePropagation(){},repeat:false,ctrlKey:false,altKey:false,metaKey:false,...extra});
 return {app,moves,boundaries:env,setRenderDuration:value=>{renderDuration=value;},async frameAt(raf,enteredAt=raf){now=enteredAt;app.frame(raf);await next();},contactTrace:env.contactTrace,frameObservation:env.frameObservation,notice:$('toast'),router,expertCapture,skillCapture,expertSafety,gate,modal,document,buttons,ch,wh,dh,toasts,async click(action,fields={}){const target={dataset:{action,...fields},disabled:false};return dh.click({target:{closest:()=>target},detail:1,preventDefault(){},stopPropagation(){}});},rendered,renderClocks,audioRequests,audioCancellations,store,data,key:(code,extra)=>wh.keydown(event(code,extra)),up:code=>wh.keyup(event(code)),async frame(dt=.016){now+=dt*1000;app.frame(now);await next();},delay(){delayed=true;},fail(result={ok:false,code:'QUOTA',reason:'fixture'}){failure=result;},async finish(failed=false){pending(failed?{ok:false,code:"QUOTA",reason:"fixture"}:undefined);pending=null;await next();}};
}
test('real key press/frame/checkpoint charges Onslaught once; OS repeat/hold does not restart',async()=>{const h=await ui(),start=h.app.battle.p.stamina;h.key('Digit2');await h.frame();assert.equal(h.app.battle.p.action.id,'zealous_onslaught');assert.equal(h.app.battle.p.stamina,start-9);assert.equal(h.store.load().state.recovery.cooldowns.zealous_onslaught,10);const id=h.app.battle.p.action.castId;h.key('Digit2',{repeat:true});await h.frame();assert.equal(h.app.battle.p.action.castId,id);assert.equal(h.app.battle.p.action.paidSeconds,1);});
test('actual release after paid pulse resolves exactly one Lance and persists stop',async()=>{const h=await ui();h.key('Digit2');for(let n=0;n<38;n++)await h.frame();assert.ok(h.app.battle.p.action.pulses>=1);h.up('Digit2');await h.frame();assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.events.filter(e=>e.type==='lanceResolved').length,1);assert.ok(h.store.load().state.recovery.lock>0);h.up('Digit2');await h.frame();assert.equal(h.app.battle.events.filter(e=>e.type==='lanceResolved').length,0);});
for(const reason of ['menu','blur','visibility'])test(`actual ${reason} cancels paid channel with no Lance and waits for checkpoint`,async()=>{const h=await ui();h.key('Digit2');for(let n=0;n<38;n++)await h.frame();if(reason==='menu')h.key('Escape');if(reason==='blur')h.wh.blur();if(reason==='visibility'){h.document.hidden=true;h.document.visibilityState='hidden';h.dh.visibilitychange();}await next();await h.frame();assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.events.some(e=>e.type==='lanceResolved'),false);assert.ok(h.store.load().state.recovery.cooldowns.zealous_onslaught>0);assert.equal(h.app.paused,true);});
test('release during delayed accepted-action save is safety cancellation, never late Lance or duplicate stamina',async()=>{const h=await ui(),stam=h.app.battle.p.stamina;h.delay();h.key('Digit2');await h.frame();assert.equal(h.app.busy,true);h.up('Digit2');assert.equal(h.expertSafety.pending,true);assert.ok(h.app.battle.p.action);await h.frame(.1);assert.equal(h.app.battle.p.stamina,stam-9);await h.finish();await h.frame();assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.events.some(e=>e.type==='lanceResolved'),false);assert.equal(h.store.load().state.vitals.stamina,stam-9);assert.ok(h.store.load().state.recovery.lock>0);});
test('failed channel acceptance checkpoint closes gate and never resumes or fabricates a refund',async()=>{const h=await ui(),before=h.store.load().state;h.fail();h.key('Digit2');await h.frame();assert.equal(h.gate.blocked,true);const elapsed=h.app.battle.p.action.elapsed;await h.frame(.05);assert.equal(h.app.battle.p.action.elapsed,elapsed);assert.deepEqual(h.store.load().state,before);});
test('UI-focused Expert key and OSrepeat leak no resources or pulses; canvas press works afterward',async()=>{const h=await ui(),before=h.app.report();h.key('Digit2',{target:{tagName:'BUTTON'}});await h.frame();assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.app.report().vitals,before.vitals);h.key('Digit2',{repeat:true});await h.frame();assert.equal(h.app.battle.p.action,null);h.key('Digit2');await h.frame();assert.equal(h.app.battle.p.action.id,'zealous_onslaught');});
test('finite Banner touch press followed by normal up casts once with physical key unneeded',async()=>{const h=await ui(),b=h.buttons.expert2,e={preventDefault(){},pointerId:1};b.handlers.pointerdown(e);b.handlers.pointerup(e);await h.frame();assert.equal(h.app.battle.p.action.id,'battle_banner');assert.equal(h.app.battle.p.cooldowns.battle_banner,30);for(let n=0;n<35;n++)await h.frame();assert.ok(h.app.battle.banner);assert.equal(h.rendered.at(-1).banner,h.app.battle.banner);});
test('immediate Onslaught tap pays once at accepted press and safely stops before any pulse',async()=>{const h=await ui(),b=h.buttons.expert1,before=h.app.battle.p.stamina;b.handlers.pointerdown({preventDefault(){},pointerId:1});assert.equal(h.app.battle.p.action.id,'zealous_onslaught');assert.equal(h.app.battle.p.action.elapsed,0);assert.equal(h.app.battle.p.stamina,before-9);b.handlers.pointerup({});await h.frame();await h.frame();assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.stamina,before-9);assert.ok(h.app.battle.p.cooldowns.zealous_onslaught>9);assert.equal(h.app.battle.events.some(e=>e.type==='lanceResolved'||e.type==='channelPulse'),false);assert.equal(h.store.load().state.vitals.stamina,before-9);});
test('mouse capture loss after normal mouseup is not a second safety end',async()=>{const h=await ui();const controls=structuredClone(h.app.state.options.controls);controls.bindings.expert1=['Mouse3'];assert.equal(await h.app.dispatch({type:'setControls',controls}),true);h.ch.mousedown({button:3,preventDefault(){}});for(let n=0;n<38;n++)await h.frame();h.wh.mouseup({button:3});h.ch.lostpointercapture();await h.frame();assert.equal(h.app.battle.events.filter(e=>e.type==='lanceResolved').length,1);});

test('actual trainer UI waits for committed checkpoint and quotes one-use promotion revision/fee',async()=>{const h=await ui({promoted:false});h.app.battle.p.x=260;h.app.battle.p.y=325;const before=structuredClone(h.app.state);await h.app.showTraining();assert.match(h.modal.innerHTML,/다음 성장 · 전문가 승급/);const attrs=/data-action="promote-expert"[^>]*data-revision="(\d+)" data-gold="(\d+)"/.exec(h.modal.innerHTML);assert.ok(attrs);assert.equal(Number(attrs[1]),h.app.controller.revision());assert.equal(attrs[2],'120');await h.click('promote-expert',{revision:attrs[1],gold:attrs[2]});assert.equal(h.app.state.character.tier,'expert');assert.equal(h.app.state.gold,before.gold-120);assert.deepEqual(h.app.state.character.skills,before.character.skills);assert.deepEqual(h.app.state.vitals,before.vitals);const once=structuredClone(h.app.state);await h.click('promote-expert',{revision:attrs[1],gold:attrs[2]});assert.deepEqual(h.app.state,once);});
test('actual action-slot view carries displayed CAS and revision, keeps unbound keys, and rejects replay',async()=>{const h=await ui();const controls=structuredClone(h.app.state.options.controls);controls.bindings.expert1=[];assert.equal(await h.app.dispatch({type:'setControls',controls}),true);await h.app.showActionSlots();assert.match(h.modal.innerHTML,/미지정/);const attrs=/data-action="assign-slot" data-slot="expert1" data-skill="" data-expected="zealous_onslaught" data-revision="(\d+)"/.exec(h.modal.innerHTML);assert.ok(attrs);await h.click('assign-slot',{slot:'expert1',skill:'',expected:'zealous_onslaught',revision:attrs[1]});assert.equal(h.app.state.actionSlots.expert1,null);const once=structuredClone(h.app.state);await h.click('assign-slot',{slot:'expert1',skill:'',expected:'zealous_onslaught',revision:attrs[1]});assert.deepEqual(h.app.state,once);});
test('closing a trainer loading panel while save is delayed does not reopen its stale UI',async()=>{const h=await ui();h.delay();const pending=h.app.showTraining();await next();assert.equal(h.app.busy,true);await h.click('close');assert.equal(h.modal.hidden,true);await h.finish();await pending;assert.equal(h.modal.hidden,true);});

test('interaction during channel consumes cancellation and does not execute an old nearby interaction later',async()=>{const h=await ui();h.key('Digit2');for(let n=0;n<38;n++)await h.frame();h.key('KeyF');await next();await h.frame();assert.equal(h.app.battle.p.action,null);assert.equal(h.toasts.includes('INTERACT'),false);assert.equal(h.app.battle.events.some(e=>e.type==='lanceResolved'),false);h.up('KeyF');h.key('KeyF');assert.equal(h.toasts.filter(x=>x==='INTERACT').length,1);});
test('finite Expert input during short store busy casts exactly once after commit, even after keyup',async()=>{const h=await ui(),mp=h.app.battle.p.mana;h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.key('Digit3');h.up('Digit3');await h.frame(.05);assert.equal(h.app.battle.p.action,null);await h.finish();await pending;await h.frame(.016);assert.equal(h.app.battle.p.action.id,'battle_banner');assert.equal(h.app.battle.p.mana,mp-40);const cast=h.app.battle.p.action.castId;await h.frame();assert.equal(h.app.battle.p.action.castId,cast);assert.equal(h.app.battle.p.mana,mp-40);});
for(const action of ['Digit2','Digit3'])test(`Expert ${action} expires after 150ms with no resource or CD charge`,async()=>{const h=await ui(),before=h.app.report();h.delay();const pending=h.app.dispatch({type:'checkpoint',...before});await next();h.key(action);await h.frame(.151);await h.finish();await pending;await h.frame();assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.app.report().vitals,before.vitals);assert.equal(h.app.battle.p.cooldowns.zealous_onslaught??0,0);assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);assert.ok(h.toasts.some(x=>x.includes('저장 처리가 늦어')));});
test('held Expert input during short save starts once and OSrepeat never extends expiry',async()=>{const h=await ui(),stamina=h.app.battle.p.stamina;h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.key('Digit2');await h.frame(.05);h.key('Digit2',{repeat:true});await h.finish();await pending;await h.frame();assert.equal(h.app.battle.p.action.id,'zealous_onslaught');assert.equal(h.app.battle.p.stamina,stamina-9);const cast=h.app.battle.p.action.castId;h.key('Digit2',{repeat:true});await h.frame();assert.equal(h.app.battle.p.action.castId,cast);assert.equal(h.app.battle.p.action.paidSeconds,1);});
test('Onslaught keyup during waiting save cancels unpaid input with no Lance',async()=>{const h=await ui(),before=h.app.report();h.delay();const pending=h.app.dispatch({type:'checkpoint',...before});await next();h.key('Digit2');h.up('Digit2');await h.finish();await pending;await h.frame();assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.app.report().vitals,before.vitals);assert.equal(h.app.battle.events.some(e=>e.type==='lanceResolved'),false);});
for(const reason of ['menu','blur','visibility','focusin','pointercancel'])test(`pending unpaid Expert is cancelled by real ${reason} event`,async()=>{const h=await ui(),before=h.app.report();h.delay();const pending=h.app.dispatch({type:'checkpoint',...before});await next();h.key('Digit3');if(reason==='menu')h.key('Escape');if(reason==='blur')h.wh.blur();if(reason==='visibility'){h.document.hidden=true;h.dh.visibilitychange();}if(reason==='focusin')h.dh.focusin({target:{tagName:'BUTTON'}});if(reason==='pointercancel')h.ch.pointercancel();await h.finish();await pending;await h.frame();assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.app.report().vitals,before.vitals);});
for(const nextAction of ['KeyJ','ShiftLeft','KeyW','KeyF','KeyR'])test(`new ${nextAction} cancels previous unpaid Expert intent`,async()=>{const h=await ui();h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.key('Digit3');h.key(nextAction);await h.finish();await pending;await h.frame();assert.notEqual(h.app.battle.p.action?.id,'battle_banner');assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);if(nextAction==='KeyF')assert.equal(h.toasts.filter(x=>x==='INTERACT').length,1);});
test('new Expert skill replaces old waiting skill rather than firing both',async()=>{const h=await ui(),mp=h.app.battle.p.mana;h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.key('Digit3');h.key('Digit2');await h.finish();await pending;await h.frame();assert.equal(h.app.battle.p.action.id,'zealous_onslaught');assert.equal(h.app.battle.p.mana,mp);assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);});
test('fresh Expert press immediately after menu close drains empty safety request instead of being swallowed',async()=>{const h=await ui();h.key('Escape');await next();h.key('Escape');h.key('Digit2');await h.frame();assert.equal(h.app.paused,false);assert.equal(h.app.battle.p.action.id,'zealous_onslaught');});
test('fresh finite touch during save survives normal up and automatic capture loss once',async()=>{const h=await ui(),b=h.buttons.expert2;h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();b.handlers.pointerdown({preventDefault(){},pointerId:1});b.handlers.pointerup({});b.handlers.lostpointercapture({});await h.finish();await pending;await h.frame();assert.equal(h.app.battle.p.action.id,'battle_banner');assert.equal(h.app.battle.p.mana,h.app.battle.stats.manaMax-40);});

test('failed real delayed checkpoint cancels pending Expert without cost and retains original saved state',async()=>{const h=await ui(),before=h.store.load().state;h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()},{critical:true});await next();h.key('Digit2');await h.finish(true);assert.equal(await pending,false);await h.frame();assert.equal(h.gate.blocked,true);assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.store.load().state,before);assert.deepEqual(h.app.report().vitals,before.vitals);});
test('real queued controls commit invalidates press captured with previous binding map',async()=>{const h=await ui(),controls=structuredClone(h.app.state.options.controls);controls.bindings.expert1=['KeyX'];h.delay();const pending=h.app.dispatch({type:'setControls',controls});await next();h.key('Digit2');await h.finish();assert.equal(await pending,true);await h.frame();assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.cooldowns.zealous_onslaught??0,0);h.key('KeyX');await h.frame();assert.equal(h.app.battle.p.action.id,'zealous_onslaught');});
test('real queued slot edit cannot apply old press to a changed assignment',async()=>{const h=await ui();h.delay();const pending=h.app.dispatch({type:'assignActionSlot',slot:'expert1',skillId:null,expectedSkillId:'zealous_onslaught',expectedRevision:h.app.controller.revision(),life:h.app.battle.stateLife});await next();h.key('Digit2');await h.finish();assert.equal(await pending,true);await h.frame();assert.equal(h.app.state.actionSlots.expert1,null);assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.cooldowns.zealous_onslaught??0,0);});
test('guard toggle during pending save cancels Expert and toggles only once under OS repeat',async()=>{const h=await ui(),controls=structuredClone(h.app.state.options.controls);controls.blockMode='toggle';assert.equal(await h.app.dispatch({type:'setControls',controls}),true);h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.key('Digit3');h.key('ShiftLeft');h.key('ShiftLeft',{repeat:true});h.up('ShiftLeft');await h.finish();await pending;await h.frame();assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);assert.equal(h.app.battle.p.block,true);await h.frame();assert.equal(h.app.battle.p.block,true);h.key('ShiftLeft');h.up('ShiftLeft');await h.frame();assert.equal(h.app.battle.p.block,false);});
test('unlearned available trainer row does not misleadingly label itself selection forbidden',async()=>{const h=await ui();await h.app.showTraining();assert.match(h.modal.innerHTML,/현재 미학습/);assert.doesNotMatch(h.modal.innerHTML,/미학습 \/ 선택 불가/);assert.match(h.modal.innerHTML,/data-action="skill:banner_of_protection" class="small">강화/);});
test('real battle rebuild invalidates pending Expert even if region/life values match',async()=>{const h=await ui(),origin=h.app.battle;h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()},{rebuild:true});await next();h.key('Digit3');await h.finish();await pending;await h.frame();assert.notEqual(h.app.battle,origin);assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);});
test('real concurrent store conflict cancels pending Expert and never charges stale state',async()=>{const h=await ui(),before=h.store.load().state;h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()},{critical:true});await next();h.key('Digit3');assert.equal(h.store.save(before,{expectedRevision:h.app.controller.revision()}).ok,true);await h.finish();assert.equal(await pending,false);await h.frame();assert.equal(h.gate.blocked,true);assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.store.load().state,before);});
test('finite touch capture loss before release cancels a waiting Expert cast',async()=>{const h=await ui(),b=h.buttons.expert2;h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();b.handlers.pointerdown({preventDefault(){},pointerId:1});b.handlers.lostpointercapture({});await h.finish();await pending;await h.frame();assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);});
test('normal finite mouse release during save and automatic capture loss cast exactly once',async()=>{const h=await ui(),controls=structuredClone(h.app.state.options.controls);controls.bindings.expert2=['Mouse3'];assert.equal(await h.app.dispatch({type:'setControls',controls}),true);const mana=h.app.battle.p.mana;h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.ch.mousedown({button:3,preventDefault(){}});h.wh.mouseup({button:3});h.ch.lostpointercapture();await h.finish();await pending;await h.frame();assert.equal(h.app.battle.p.action.id,'battle_banner');assert.equal(h.app.battle.p.mana,mana-40);const cast=h.app.battle.p.action.castId;await h.frame();assert.equal(h.app.battle.p.action.castId,cast);});

for(const [rule,code,slot,label,toast] of [
 ['r11_silence','KeyT','heal','침묵 · 시전 불가','침묵 중에는 주문을 시전할 수 없습니다.'],
 ['r11_stun','KeyT','heal','기절 · 행동 불가','기절 중에는 행동할 수 없습니다.'],
 ['r11_disarm','KeyJ','attack','무장해제 · 공격 불가','무장해제 중에는 철퇴 기본 공격을 사용할 수 없습니다.']
])test(`real ${rule} key/frame has matching toast and visible/aria hotbar, no payment or cooldown, and clears on expiry`,async()=>{
 const h=await ui({skills:['lay_on_hands','cleansing_touch']}),b=h.app.battle;
 const {applyHeroStatus}=await import('../src/combat.js');assert.equal(applyHeroStatus(b,rule,'fixture-source'),true);
 h.app.updateHud();assert.ok(h.buttons[slot].innerHTML.includes(`<em>${label}</em>`));assert.ok(h.buttons[slot].attributes['aria-label'].endsWith(label));
 const mana=b.p.mana,stamina=b.p.stamina,cooldowns=structuredClone(b.p.cooldowns);
 h.key(code);await h.frame();assert.equal(h.toasts.at(-1),toast);assert.equal(b.p.action,null);assert.equal(b.skillIntent,null);assert.equal(b.p.mana,mana);assert.equal(b.p.stamina,stamina);assert.deepEqual(b.p.cooldowns,cooldowns);
 h.key(code,{repeat:true});await h.frame();assert.equal(h.toasts.filter(t=>t===toast).length,1);
 h.up(code);while(Object.keys(b.p.negativeStatuses).length)await h.frame(.05);
 h.app.updateHud();assert.ok(!h.buttons[slot].innerHTML.includes(label));assert.ok(!h.buttons[slot].attributes['aria-label'].includes(label));assert.equal(b.p.action,null,'one-shot/released basic attack does not replay');
 const before=b.p.mana;h.key(code);await h.frame();assert.equal(b.p.action?.id,slot==='heal'?'lay_on_hands':'mace_swing');assert.equal(b.p.mana,before-b.p.action.spec.manaCost);
});
test('real trainer explains successful heal contact and silence/stun restriction without removing the cleanse inventory',async()=>{
 const h=await ui({skills:['lay_on_hands','cleansing_touch']});await h.app.showTraining();
 assert.match(h.modal.innerHTML,/시전이 성공해 회복이 발동할 때 감속·기절·무장해제·침묵·화상·독 제거/);
 assert.match(h.modal.innerHTML,/침묵·기절 중에는 시전 불가/);
});
test('real hotbar uses runtime quote for resource/CD failures and does not claim another status blocks unrelated actions',async()=>{
 const h=await ui({skills:['lay_on_hands']}),b=h.app.battle,{applyHeroStatus}=await import('../src/combat.js');
 applyHeroStatus(b,'r11_silence','fixture-source');h.app.updateHud();assert.match(h.buttons.heal.innerHTML,/침묵 · 시전 불가/);assert.doesNotMatch(h.buttons.charge.innerHTML,/시전 불가|행동 불가/);assert.doesNotMatch(h.buttons.attack.innerHTML,/시전 불가|공격 불가/);
 b.p.negativeStatuses={};b.p.mana=0;b.p.manaDelay=10;h.app.updateHud();assert.match(h.buttons.heal.innerHTML,/<em>MP 부족 · 30<\/em>/);assert.match(h.buttons.heal.attributes['aria-label'],/MP 부족 · 30$/);
 h.key('KeyT');await h.frame();assert.equal(h.toasts.at(-1),'마나 부족 · 필요 30 / 현재 0');h.up('KeyT');b.p.cooldowns.lay_on_hands=2;h.app.updateHud();assert.match(h.buttons.heal.innerHTML,/<em>2.0초<\/em>/);assert.match(h.buttons.heal.attributes['aria-label'],/2.0초$/);
 h.key('KeyT');await h.frame();assert.match(h.toasts.at(-1),/^기술 재사용 대기 · /);
});

test('basic short tap starts inside key handler before frame and is durable without duplicate repeat',async()=>{const h=await ui(),t=h.app.battle.time;h.key('KeyJ');assert.equal(h.app.battle.p.action.id,'mace_swing');assert.equal(h.app.battle.p.action.elapsed,0);assert.equal(h.app.battle.time,t);h.up('KeyJ');await h.frame();assert.equal(h.app.battle.castSerial,1);for(let n=0;n<40;n++)await h.frame();assert.equal(h.app.battle.castSerial,1);});
test('basic short tap during save survives completion once without waiting another render',async()=>{const h=await ui();h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.key('KeyJ');h.up('KeyJ');assert.equal(h.app.battle.p.action,null);await h.finish();await pending;await next();assert.equal(h.app.battle.p.action.id,'mace_swing');assert.equal(h.app.battle.p.action.elapsed,0);await h.frame();assert.equal(h.app.battle.castSerial,1);});
test('old basic tap during long save expires and never attacks on menu return',async()=>{const h=await ui();h.delay();const pending=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.key('KeyJ');h.up('KeyJ');await h.frame(.2);await h.finish();await pending;assert.equal(h.app.battle.p.action,null);await h.frame();assert.equal(h.app.battle.castSerial,0);assert.ok(h.toasts.some(t=>t.includes('입력을 취소')));});

for(const mode of ['wasd','click'])test(`R14 real ${mode} handler starts free dodge at press before frame and retains saved debt`,async()=>{
 const h=await ui({poeMode:mode}),b=h.app.battle,before=h.app.report(),t=b.time;
 h.key('Space');assert.equal(b.p.presentationPose.state,'roll');assert.equal(b.time,t);assert.deepEqual(h.app.report().vitals,before.vitals);assert.ok(b.p.presentationPose.evadeWindow);
 h.up('Space');await next();assert.ok(h.store.load().state.recovery.lock>0);await h.frame();assert.ok(b.p.presentationPose.remaining<.42);assert.equal(h.app.state.options.controls.version,4);
});
test('R14 short dodge tap while saving executes once after commit without old held sprint',async()=>{
 const h=await ui({poeMode:'wasd'});h.delay();const task=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.key('Space');h.up('Space');assert.equal(h.app.battle.p.presentationPose.state,'idle');await h.finish();await task;await next();assert.equal(h.app.battle.p.presentationPose.state,'roll');for(let i=0;i<30;i++)await h.frame();assert.notEqual(h.app.battle.p.presentationPose.state,'sprint');
});
test('R14 long-save dodge expires without resource changes or delayed roll',async()=>{
 const h=await ui({poeMode:'wasd'}),before=h.app.report();h.delay();const task=h.app.dispatch({type:'checkpoint',...before});await next();h.key('Space');h.up('Space');await h.frame(.16);await h.finish();await task;await h.frame();assert.equal(h.app.battle.p.presentationPose.state,'idle');assert.deepEqual(h.app.report().vitals,before.vitals);
});
test('R14 settings commit installs live mobility and restores exact prior controls without rebuilding combat',async()=>{
 const h=await ui(),b=h.app.battle,old=structuredClone(h.app.state.options.controls),ids=b.enemies.map(e=>e.id),pools=h.app.report().vitals;
 assert.equal(await h.app.dispatch({type:'setControls',controls:imports.poeControlPreset(old,'wasd')}),true);assert.equal(h.app.battle,b);assert.ok(b.poeMobility);assert.deepEqual(b.enemies.map(e=>e.id),ids);assert.deepEqual(h.app.report().vitals,pools);await h.frame();h.key('Space');assert.equal(b.p.presentationPose.state,'roll');h.up('Space');await next();h.app.clearInput();await h.frame();await next();
 assert.equal(await h.app.dispatch({type:'setControls',controls:imports.restorePriorControls(h.app.state.options.controls)}),true);assert.deepEqual(h.store.load().state.options.controls,old);assert.equal(b.poeMobility,undefined);assert.ok(b.p.recoveryLock>0,'switch cannot erase paid/roll recovery');
});
test('failed settings save never changes live mobility, old controls or saved profile',async()=>{
 const h=await ui(),b=h.app.battle,old=structuredClone(h.app.state.options.controls),bytes=new Map(h.data);h.fail();assert.equal(await h.app.dispatch({type:'setControls',controls:imports.poeControlPreset(old,'click')}),false);assert.equal(b.poeMobility,undefined);assert.deepEqual(h.app.state.options.controls,old);assert.deepEqual(h.data,bytes);
});
for(const reason of ['blur','visibility','focusin','pointercancel'])test(`R14 ${reason} cancels held dodge/sprint and never revives on return`,async()=>{
 const h=await ui({poeMode:'wasd'});h.key('KeyW');h.key('Space');await next();await h.frame();if(reason==='blur')h.wh.blur();if(reason==='visibility'){h.document.hidden=true;h.dh.visibilitychange();}if(reason==='focusin')h.dh.focusin({target:{tagName:'BUTTON'}});if(reason==='pointercancel')h.ch.pointercancel();await h.frame();await next();assert.equal(h.app.battle.p.presentationPose.state,'idle');assert.equal(h.router.isHeld('dodgeSprint'),false);h.document.hidden=false;for(let i=0;i<40;i++)await h.frame();assert.notEqual(h.app.battle.p.presentationPose.state,'sprint');
});
test('R14 click LMB creates an independent persistent destination and never attacks',async()=>{
 const h=await ui({poeMode:'click'}),b=h.app.battle;h.ch.mousedown({button:0,clientX:580,clientY:385,preventDefault(){}});h.wh.mouseup({button:0});const first=h.app.sampledCombatInput();assert.ok(first.moveTarget);assert.ok(first.moveDistance>0);assert.equal(b.p.action,null);h.ch.pointermove({clientX:410,clientY:350});const second=h.app.sampledCombatInput();assert.deepEqual(second.moveTarget,first.moveTarget);assert.notDeepEqual(second.aim,first.aim);h.key('KeyX');assert.equal(h.app.sampledCombatInput().moveTarget,undefined);
});
test('R14 actual WASD movement and independent cursor aim remain while Shift in-place is held',async()=>{
 const h=await ui({poeMode:'wasd'});h.key('KeyW');h.key('KeyA');h.key('ShiftLeft');h.ch.pointermove({clientX:750,clientY:385});const r=h.app.sampledCombatInput();assert.ok(Math.hypot(r.move.x,r.move.y)>0);assert.equal(r.attackInPlace,true);assert.notEqual(Math.atan2(r.move.y,r.move.x),Math.atan2(r.aim.y-h.app.battle.p.y,r.aim.x-h.app.battle.p.x));
});

test('real preset UI requires explicit confirmation, retains old controls, then restores them',async()=>{const h=await ui(),old=structuredClone(h.app.state.options.controls);h.app.showControls();assert.match(h.modal.innerHTML,/POE2식 WASD · 권장 선택/);await h.click('poe-preset:wasd:combined');assert.deepEqual(h.app.state.options.controls,old);assert.match(h.modal.innerHTML,/apply-poe-preset:wasd:combined/);await h.click('apply-poe-preset:wasd:combined');assert.equal(h.app.state.options.controls.version,4);assert.deepEqual(h.app.state.options.controls.priorControls,old);assert.ok(h.app.battle.poeMobility);await h.click('restore-prior-controls');assert.deepEqual(h.app.state.options.controls,old);assert.deepEqual(h.store.load().state.options.controls,old);});
test('actual R14 rebind capture rejects conflict, accepts physical key and never leaks combat',async()=>{const h=await ui({poeMode:'wasd'});h.app.showControls();await h.click('bind:hammer:0');h.key('Space');await next();assert.match(h.modal.innerHTML,/회피|사용/);assert.deepEqual(h.app.state.options.controls.bindings.hammer,['Mouse2']);assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.presentationPose.state,'idle');await h.click('bind:hammer:0');h.key('KeyZ');await next();await next();assert.deepEqual(h.store.load().state.options.controls.bindings.hammer,['KeyZ']);assert.equal(h.app.battle.p.action,null);h.up('KeyZ');});
test('real independent aim/tracking changes preserve controls and progression after commit',async()=>{const h=await ui({poeMode:'wasd'}),character=structuredClone(h.app.state.character),keys=structuredClone(h.app.state.options.controls.bindings);h.app.showControls();await h.dh.change({target:{dataset:{poeOption:'aimingMode'},value:'ground'}});assert.equal(h.app.state.options.controls.poe.aimingMode,'ground');assert.equal(h.app.state.options.controls.poe.cursorTrackingAfterRelease,true);await h.dh.change({target:{dataset:{poeOption:'cursorTrackingAfterRelease'},value:'false'}});assert.equal(h.app.state.options.controls.poe.aimingMode,'ground');assert.equal(h.app.state.options.controls.poe.cursorTrackingAfterRelease,false);assert.deepEqual(h.app.state.options.controls.bindings,keys);assert.deepEqual(h.app.state.character,character);assert.deepEqual(h.store.load().state,h.app.state);});
test('mobility input observation separates same-turn start from later render dispatch',async()=>{const h=await ui({poeMode:'wasd'});h.key('Space');const first=h.app.inputObservations;assert.equal(first.find(e=>e.kind==='mobility-start').delayMs,0);assert.equal(first.some(e=>e.kind==='mobility-first-render-enter'),false);await h.frame();const rows=h.app.inputObservations;assert.ok(rows.find(e=>e.kind==='mobility-first-render-enter').at>rows.find(e=>e.kind==='mobility-start').at);});

// R14a2 integration regressions use the real handlers and durable store above.
// Their earned progression is a scripted settlement fixture; these are not
// native browser play, rendered-screen, audio-latency, or visual-quality proof.
async function assignV5(h,slot,skillId){
 return h.app.dispatch({type:'assignSkillSlot',slot,skillId,expectedSkillId:h.app.state.options.controls.skillSlots[slot],expectedRevision:h.app.controller.revision(),life:h.app.battle.stateLife});
}
async function v5Ui({blockMode='hold',realNotice=false}={}){
 const h=await ui({poeMode:'wasd',realNotice});
 await h.click('enable-skill-loadout');assert.equal(h.app.state.options.controls.version,5);
 for(const slot of ['attack','hammer','block','expert1'])assert.equal(await assignV5(h,slot,null),true,`clear ${slot}`);
 for(const [slot,id] of [['expert1','mace_swing'],['attack','righteous_hammer'],['hammer','shield_block'],['heal','zealous_onslaught']])assert.equal(await assignV5(h,slot,id),true,`${id} -> ${slot}`);
 if(blockMode!=='hold'){const controls=structuredClone(h.app.state.options.controls);controls.blockMode=blockMode;assert.equal(await h.app.dispatch({type:'setControls',controls}),true);}
 h.app.closePanel();await h.frame();return h;
}
const mouseDown=(h,button)=>h.ch.mousedown({button,clientX:730,clientY:365,preventDefault(){}});
const mouseUp=(h,button)=>h.wh.mouseup({button});
const touchDown=(h,slot)=>h.buttons[slot].handlers.pointerdown({pointerId:1,preventDefault(){}});
const touchUp=(h,slot)=>h.buttons[slot].handlers.pointerup({});
async function advanceUntil(h,condition,label,max=240){for(let i=0;!condition()&&i<max;i++)await h.frame();assert.ok(condition(),label);}

test('R14a2 actual explicit v5 enable preserves exact predecessor, progression, pools and legacy expert slots; restore is exact',async()=>{
 const h=await ui({poeMode:'wasd'}),before=structuredClone(h.app.state),b=h.app.battle;
 await h.app.showActionSlots();assert.equal(h.app.state.options.controls.version,4);assert.match(h.modal.innerHTML,/enable-skill-loadout/);
 await h.click('enable-skill-loadout');const c=h.app.state.options.controls;
 assert.equal(c.version,5);assert.deepEqual(c.priorControls,before.options.controls);assert.deepEqual(c.bindings,before.options.controls.bindings);assert.deepEqual(h.app.state.character,before.character);assert.deepEqual(h.app.state.vitals,before.vitals);assert.deepEqual(h.app.state.actionSlots,before.actionSlots);assert.equal(h.app.state.gold,before.gold);assert.equal(h.app.battle,b);
 assert.match(h.modal.innerHTML,/전사 기술 배치/);assert.match(h.modal.innerHTML,/같은 기술의 중복 배치/);assert.equal(c.skillSlots.expert1,'zealous_onslaught');assert.equal(c.skillSlots.expert2,'battle_banner');assert.deepEqual(h.store.load().state,h.app.state);
 await h.click('restore-prior-controls');assert.deepEqual(h.app.state.options.controls,before.options.controls);assert.deepEqual(h.store.load().state.options.controls,before.options.controls);assert.deepEqual(h.app.state.character,before.character);
});
test('R14a2 actual assignment UI uses rendered CAS/revision and cannot replay a detached selection',async()=>{
 const h=await v5Ui();await h.app.showSkillSlots();const attrs=/data-action="assign-skill-slot" data-slot="expert1" data-skill="" data-expected="mace_swing" data-revision="(\d+)"/.exec(h.modal.innerHTML);assert.ok(attrs);const fields={slot:'expert1',skill:'',expected:'mace_swing',revision:attrs[1]};
 await h.click('assign-skill-slot',fields);assert.equal(h.app.state.options.controls.skillSlots.expert1,null);const saved=structuredClone(h.store.load().state),revision=h.app.controller.revision();await h.click('assign-skill-slot',fields);assert.deepEqual(h.store.load().state,saved);assert.equal(h.app.controller.revision(),revision);
 assert.equal(await assignV5(h,'block','righteous_hammer'),false);assert.equal(h.app.state.options.controls.skillSlots.attack,'righteous_hammer');assert.equal(h.app.state.options.controls.skillSlots.block,null);
});
test('R14a2 actual HUD, aria, controls and assignment labels follow moved skills and show empty slots',async()=>{
 const h=await v5Ui();h.app.updateHud();
 for(const [slot,label,key] of [['expert1','철퇴','F'],['attack','잿불 망치','마우스 왼쪽'],['hammer','방패','마우스 오른쪽'],['heal','불굴의 진격','R']]){assert.ok(h.buttons[slot].innerHTML.includes(label),slot);assert.ok(h.buttons[slot].attributes['aria-label'].includes(label),slot);assert.ok(h.buttons[slot].title.includes(key),slot);assert.equal(h.buttons[slot].hidden,false);}
 assert.match(h.buttons.block.innerHTML,/빈 슬롯/);assert.match(h.buttons.block.attributes['aria-label'],/빈 기술 슬롯/);assert.equal(h.buttons.block.hidden,false);
 h.app.showControls();assert.match(h.modal.innerHTML,/기술 슬롯 1 · 잿불 망치/);assert.match(h.modal.innerHTML,/기술 슬롯 2 · 방패/);assert.match(h.modal.innerHTML,/기술 슬롯 7 · 철퇴/);assert.match(h.modal.innerHTML,/기술 슬롯 6 · 불굴의 진격/);
 await h.app.showSkillSlots();assert.match(h.modal.innerHTML,/철퇴 · 누름 즉시 \/ 홀드 반복/);assert.match(h.modal.innerHTML,/방패 · 누름 유지/);assert.match(h.modal.innerHTML,/불굴의 진격 · 누름 채널/);
});
test('R14a2 F short tap runs moved mace synchronously once; no legacy channel or repeat after release',async()=>{
 const h=await v5Ui(),b=h.app.battle,stamina=b.p.stamina,time=b.time;h.key('KeyF');assert.equal(b.p.action.id,'mace_swing');assert.equal(b.p.action.elapsed,0);assert.equal(b.time,time);assert.equal(b.p.stamina,stamina);h.up('KeyF');for(let i=0;i<50;i++)await h.frame();assert.equal(b.castSerial,1);assert.equal(b.p.action,null);assert.equal(b.p.cooldowns.zealous_onslaught??0,0);assert.equal(h.toasts.includes('INTERACT'),false);
});
test('R14a2 LMB short tap runs moved hammer and never the previous mace action',async()=>{
 const h=await v5Ui(),b=h.app.battle,mana=b.p.mana;mouseDown(h,0);assert.equal(b.p.action.id,'righteous_hammer');assert.equal(b.p.action.elapsed,0);assert.equal(b.p.mana,mana-b.p.action.spec.manaCost);mouseUp(h,0);h.ch.lostpointercapture();await next();assert.ok(h.store.load().state.recovery.cooldowns.righteous_hammer>0);for(let i=0;i<150;i++)await h.frame();assert.equal(b.castSerial,1);assert.equal(b.p.action,null);
});
for(const [slot,id] of [['expert1','mace_swing'],['attack','righteous_hammer']])test(`R14a2 real touch ${slot} uses its moved ${id} assignment once`,async()=>{
 const h=await v5Ui(),b=h.app.battle;touchDown(h,slot);assert.equal(b.p.action.id,id);touchUp(h,slot);h.buttons[slot].handlers.lostpointercapture({});for(let i=0;i<150;i++)await h.frame();assert.equal(b.castSerial,1);assert.equal(b.p.action,null);
});
test('R14a2 held F mace repeats through production frames; OS repeat does not create extra edges',async()=>{
 const h=await v5Ui(),b=h.app.battle;h.key('KeyF');const first=b.p.action.castId;h.key('KeyF',{repeat:true});assert.equal(b.p.action.castId,first);await advanceUntil(h,()=>b.castSerial>=3,'held mace repeats');h.up('KeyF');const count=b.castSerial;for(let i=0;i<65;i++)await h.frame();assert.equal(b.castSerial,count);
});
test('R14a2 held LMB hammer repeats after cooldown and stops on normal mouse release',async()=>{
 const h=await v5Ui(),b=h.app.battle;mouseDown(h,0);await advanceUntil(h,()=>b.castSerial>=2,'held hammer repeats after cooldown');assert.equal(b.p.action.id,'righteous_hammer');mouseUp(h,0);const count=b.castSerial;for(let i=0;i<150;i++)await h.frame();assert.equal(b.castSerial,count);
});
test('R14a2 newer explicit LMB hammer wins over held F mace at recovery boundary',async()=>{
 const h=await v5Ui(),b=h.app.battle;h.key('KeyF');await advanceUntil(h,()=>b.p.action&&b.p.action.duration-b.p.action.elapsed<=.14,'mace enters final recovery');const first=b.p.action.castId;mouseDown(h,0);assert.equal(b.skillIntent.id,'righteous_hammer');mouseUp(h,0);await advanceUntil(h,()=>b.p.action?.castId!==first&&!!b.p.action,'next action starts');assert.equal(b.p.action.id,'righteous_hammer');h.up('KeyF');
});
for(const mode of ['hold','toggle'])test(`R14a2 RMB moved guard obeys ${mode} behavior without firing old hammer`,async()=>{
 const h=await v5Ui({blockMode:mode}),b=h.app.battle,mana=b.p.mana;mouseDown(h,2);assert.equal(b.p.block,true);assert.equal(b.p.action,null);assert.equal(b.p.mana,mana);mouseUp(h,2);await h.frame();assert.equal(b.p.block,mode==='toggle');assert.equal(b.p.cooldowns.righteous_hammer??0,0);
 if(mode==='toggle'){mouseDown(h,2);mouseUp(h,2);await h.frame();assert.equal(b.p.block,false);}h.key('KeyF');assert.equal(b.p.action.id,'mace_swing');
});
test('R14a2 moved R channel owns its original physical key, pays once and normal release makes one learned Lance',async()=>{
 const h=await v5Ui(),b=h.app.battle,stamina=b.p.stamina;h.key('KeyR');assert.equal(b.p.action.id,'zealous_onslaught');assert.equal(b.p.stamina,stamina-9);h.key('KeyR',{repeat:true});h.up('KeyF');for(let i=0;i<38;i++)await h.frame();assert.ok(b.p.action.pulses>=1);h.up('KeyR');await h.frame();assert.equal(b.p.action,null);assert.equal(b.events.filter(e=>e.type==='lanceResolved').length,1);assert.ok(h.store.load().state.recovery.lock>0);h.up('KeyR');await h.frame();assert.equal(b.events.filter(e=>e.type==='lanceResolved').length,0);
});
for(const entry of ['key-mace','mouse-hammer','touch-banner'])test(`R14a2 ${entry} finite tap during save starts exactly once immediately after committed save`,async()=>{
 const h=await v5Ui(),b=h.app.battle;h.delay();const task=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();
 if(entry==='key-mace'){h.key('KeyF');h.up('KeyF');}if(entry==='mouse-hammer'){mouseDown(h,0);mouseUp(h,0);h.ch.lostpointercapture();}if(entry==='touch-banner'){touchDown(h,'expert2');touchUp(h,'expert2');h.buttons.expert2.handlers.lostpointercapture({});}
 assert.equal(b.p.action,null);await h.finish();await task;await next();assert.equal(b.p.action.id,{'key-mace':'mace_swing','mouse-hammer':'righteous_hammer','touch-banner':'battle_banner'}[entry]);assert.equal(b.p.action.elapsed,0);const cast=b.castSerial,pools=structuredClone(h.app.report().vitals);await h.frame();assert.equal(b.castSerial,cast);assert.deepEqual(h.app.report().vitals,pools);assert.deepEqual(h.store.load().state.vitals,pools);
});
test('R14a2 released moved channel waiting for save never starts or charges later',async()=>{
 const h=await v5Ui(),before=h.app.report();h.delay();const task=h.app.dispatch({type:'checkpoint',...before});await next();h.key('KeyR');h.up('KeyR');await h.finish();await task;await h.frame();assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.app.report().vitals,before.vitals);assert.equal(h.app.battle.p.cooldowns.zealous_onslaught??0,0);assert.equal(h.app.battle.events.some(e=>e.type==='lanceResolved'),false);
});
test('R14a2 release during moved channel acceptance save cancels safely with paid cost retained and no Lance',async()=>{
 const h=await v5Ui(),b=h.app.battle,stamina=b.p.stamina;h.delay();h.key('KeyR');assert.equal(h.app.busy,true);h.up('KeyR');assert.equal(h.expertSafety.pending,true);await next();await h.finish();await h.frame();assert.equal(b.p.action,null);assert.equal(b.p.stamina,stamina-9);assert.equal(b.events.some(e=>e.type==='lanceResolved'),false);assert.equal(h.store.load().state.vitals.stamina,stamina-9);assert.ok(h.store.load().state.recovery.cooldowns.zealous_onslaught>0);
});
for(const code of ['KeyF','KeyR','KeyG'])test(`R14a2 moved ${code} save-wait expires after 150ms without cost or late action`,async()=>{
 const h=await v5Ui(),before=h.app.report();h.delay();const task=h.app.dispatch({type:'checkpoint',...before});await next();h.key(code);await h.frame(.151);await h.finish();await task;await h.frame();assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.app.report().vitals,before.vitals);assert.deepEqual(h.app.battle.p.cooldowns,before.recovery.cooldowns);assert.ok(h.toasts.some(t=>/입력을 취소/.test(t)));
});
for(const reason of ['menu','blur','visibility','focusin','pointercancel'])test(`R14a2 actual ${reason} clears moved skill pending during save`,async()=>{
 const h=await v5Ui(),before=h.app.report();h.delay();const task=h.app.dispatch({type:'checkpoint',...before});await next();h.key('KeyG');
 if(reason==='menu')h.key('Escape');if(reason==='blur')h.wh.blur();if(reason==='visibility'){h.document.hidden=true;h.dh.visibilitychange();}if(reason==='focusin')h.dh.focusin({target:{tagName:'BUTTON'}});if(reason==='pointercancel')h.ch.pointercancel();
 await h.finish();await task;await h.frame();assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.app.report().vitals,before.vitals);assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);
});
for(const reason of ['menu','blur'])test(`R14a2 ${reason} cancels active moved channel without a Lance or restart`,async()=>{
 const h=await v5Ui(),b=h.app.battle;h.key('KeyR');for(let i=0;i<38;i++)await h.frame();assert.ok(b.p.action.pulses>0);if(reason==='menu')h.key('Escape');else h.wh.blur();await next();await h.frame();assert.equal(b.p.action,null);assert.equal(b.events.some(e=>e.type==='lanceResolved'),false);h.app.closePanel();for(let i=0;i<40;i++)await h.frame();assert.equal(b.p.action,null);assert.ok(h.store.load().state.recovery.cooldowns.zealous_onslaught>0);
});
for(const edit of ['rebind','assignment'])test(`R14a2 committed ${edit} clears old physical press and never retargets its queued skill`,async()=>{
 const h=await v5Ui(),before=h.app.report();h.delay();let task;
 if(edit==='rebind'){const controls=structuredClone(h.app.state.options.controls);controls.bindings.expert1=['KeyZ'];task=h.app.dispatch({type:'setControls',controls});}else task=assignV5(h,'expert1',null);
 await next();h.key('KeyF');await h.finish();assert.equal(await task,true);await h.frame();assert.equal(h.app.battle.p.action,null);assert.deepEqual(h.app.report().vitals,before.vitals);h.up('KeyF');
 if(edit==='rebind'){h.key('KeyZ');assert.equal(h.app.battle.p.action.id,'mace_swing');}else{h.key('KeyF');await h.frame();assert.equal(h.app.battle.p.action,null);assert.ok(h.toasts.some(t=>t.includes('빈 기술 슬롯')));}
});
test('R14a2 real rebind capture names the moved skill, rejects conflicts and requires fresh input',async()=>{
 const h=await v5Ui();h.app.showControls();await h.click('bind:expert1:0');assert.match(h.modal.innerHTML,/철퇴/);h.key('Space');await next();assert.deepEqual(h.app.state.options.controls.bindings.expert1,['KeyF']);assert.equal(h.app.battle.p.action,null);await h.click('bind:expert1:0');h.key('KeyZ');await next();await next();assert.deepEqual(h.store.load().state.options.controls.bindings.expert1,['KeyZ']);assert.equal(h.app.battle.p.action,null);h.up('KeyZ');h.app.closePanel();h.key('KeyZ');assert.equal(h.app.battle.p.action.id,'mace_swing');
});
for(const entry of ['key','mouse','touch'])test(`R14a2 empty old block slot ${entry} cannot invoke legacy guard or any attack`,async()=>{
 const h=await v5Ui(),b=h.app.battle,before=h.app.report();if(entry==='key'){h.key('KeyB');h.up('KeyB');}if(entry==='mouse'){mouseDown(h,1);mouseUp(h,1);}if(entry==='touch'){touchDown(h,'block');touchUp(h,'block');}await h.frame();assert.equal(b.p.block,false);assert.equal(b.p.action,null);assert.equal(b.castSerial,0);assert.deepEqual(h.app.report().vitals,before.vitals);assert.ok(h.toasts.some(t=>t.includes('빈 기술 슬롯')));
});
test('R14a2 input observations UI is read-only and distinguishes event time from render dispatch',async()=>{
 const h=await v5Ui();h.key('KeyF');const first=h.app.inputObservations;assert.equal(first.find(e=>e.kind==='action-start').delayMs,0);assert.equal(first.some(e=>e.kind==='first-render-enter'),false);await h.frame();h.up('KeyF');await next();const before=structuredClone(h.app.state),revision=h.app.controller.revision();await h.click('input-observations');assert.match(h.modal.innerHTML,/입력.*기록|입력.*관측/);assert.match(h.modal.innerHTML,/모니터 표시와 스피커 소리의 물리 지연 실측은 아닙니다/);assert.match(h.modal.innerHTML,/시작 0.00 ms · 첫 렌더 진입 16.00 ms/);assert.deepEqual(h.app.state,before);assert.equal(h.app.controller.revision(),revision);
});

test('read-only input observations start at the top of the real dialog instead of its distant Back control',async()=>{
 const h=await v5Ui();h.key('KeyF');await h.frame();h.up('KeyF');await next();
 const before=structuredClone(h.app.state),revision=h.app.controller.revision(),focused=[],pane={scrollTop:900,focus:options=>focused.push(options)},query=h.modal.querySelector;
 h.modal.querySelector=selector=>selector==='.panel'?pane:query(selector);
 h.app.showInputObservations();
 assert.deepEqual(focused,[{preventScroll:true}]);assert.equal(pane.scrollTop,0);
 assert.match(h.modal.innerHTML,/role="dialog"/);assert.match(h.modal.innerHTML,/tabindex="-1"/);assert.match(h.modal.innerHTML,/data-action="menu"/);
 assert.deepEqual(h.app.state,before);assert.equal(h.app.controller.revision(),revision);
});
test('read-only input observations never override the blocked save-error dialog focus',async()=>{
 const h=await v5Ui(),before=structuredClone(h.app.state),revision=h.app.controller.revision(),focused=[],pane={scrollTop:900,focus:options=>focused.push(options)},query=h.modal.querySelector;
 h.modal.querySelector=selector=>selector==='.panel'?pane:query(selector);h.app.gate.block('test existing runtime failure gate');
 h.app.showInputObservations();
 assert.deepEqual(focused,[]);assert.equal(pane.scrollTop,900);assert.match(h.modal.innerHTML,/저장을 확인해야 합니다/);assert.match(h.modal.innerHTML,/data-action="reload"/);
 assert.deepEqual(h.app.state,before);assert.equal(h.app.controller.revision(),revision);
});

for(const hz of [30,60,120])for(const blockedBy of ['hammer-recovery','roll'])test(`R14a2 ${hz}Hz actual ${blockedBy} rejection and held restart are both visible with separate clocks`,async()=>{
 const h=await v5Ui(),b=h.app.battle;
 if(blockedBy==='hammer-recovery'){mouseDown(h,0);await h.frame(.025);mouseUp(h,0);}else{h.key('Space');await next();}
 h.key('KeyF');await next();
 const pulse=h.app.inputObservations.filter(row=>row.kind==='input'&&row.action==='expert1').at(-1);assert.ok(pulse);assert.ok(h.app.inputObservations.some(row=>row.kind==='cancelled'&&row.sequence===pulse.sequence&&row.reason==='recovery-too-early'));
 for(let frame=0;frame<180&&!h.app.inputObservations.some(row=>row.kind==='contact'&&h.app.inputObservations.some(start=>start.kind==='action-start'&&start.heldRepeat&&start.skillId==='mace_swing'&&start.sequence===row.sequence));frame++)await h.frame(1/hz);
 const observations=h.app.inputObservations,start=observations.find(row=>row.kind==='action-start'&&row.heldRepeat&&row.skillId==='mace_swing'),render=observations.find(row=>row.kind==='first-render-enter'&&row.sequence===start?.sequence),contact=observations.find(row=>row.kind==='contact'&&row.sequence===start?.sequence);assert.ok(start);assert.ok(render);assert.ok(contact);assert.notEqual(start.sequence,pulse.sequence);assert.equal(start.receivedAt,null);assert.equal(start.delayMs,null);assert.equal(start.timingBasis,'action-start');assert.equal(observations.some(row=>row.kind==='input'&&row.sequence===start.sequence),false);assert.equal(observations.some(row=>row.kind==='action-start'&&row.sequence===pulse.sequence),false);assert.equal(b.p.action?.id,'mace_swing');
 h.up('KeyF');if(blockedBy==='roll')h.up('Space');await next();const before=structuredClone(h.app.state),revision=h.app.controller.revision();h.app.showInputObservations();const html=h.modal.innerHTML,articles=[...html.matchAll(/<article class="skill">[\s\S]*?<\/article>/g)].map(match=>match[0]),initial=articles.find(row=>row.includes(`· 입력 ${pulse.sequence}</strong>`)),held=articles.find(row=>row.includes(`홀드 반복 관측 ${start.sequence}</strong>`));assert.ok(initial);assert.ok(held);assert.match(html,/<h3>최초 입력 기준<\/h3>/);assert.match(html,/<h3>홀드 반복 시작 기준<\/h3>/);assert.match(initial,/시작 미관찰/);assert.match(initial,/입력 연결 종료: recovery-too-early/);assert.match(held,/철퇴/);assert.match(held,/입력 → 시작 지연 미측정 · 액션 시작 시점 기준/);assert.ok(held.includes(`첫 렌더 진입 ${(render.at-start.at).toFixed(2)} ms`));assert.ok(held.includes(`타격 판정 ${(contact.at-start.at).toFixed(2)} ms`));assert.doesNotMatch(held,/시작 0\.00 ms|입력 연결 종료/);assert.deepEqual(h.app.state,before);assert.equal(h.app.controller.revision(),revision);
});

async function contextUi(){const h=await ui({poeMode:'click',realInteractions:true});Object.assign(h.app.battle.p,{x:450,y:325});assert.equal(await h.app.dispatch({type:'checkpoint',...h.app.report()}),true);return h;}
const clickContextLabel=(h,object)=>{const p=h.app.contextProjection(object);h.ch.mousedown({button:0,clientX:p.x,clientY:p.y-63.5,preventDefault(){}});mouseUp(h,0);};
test('R14a2 real context mousedown selects distant trainer, walks via production frames and opens that exact NPC instead of the initially nearest elder',async()=>{
 const h=await contextUi(),b=h.app.battle,trainer=h.app.interactionCandidates().find(o=>o.id==='trainer'),start={x:b.p.x,y:b.p.y};assert.ok(Math.hypot(start.x-trainer.x,start.y-trainer.y)>76);
 clickContextLabel(h,trainer);assert.equal(h.app.contextClick.target.id,'trainer');assert.equal(h.modal.hidden,true);assert.equal(b.p.action,null);await advanceUntil(h,()=>!h.modal.hidden,'selected NPC opens on arrival',220);await next();assert.match(h.modal.innerHTML,/전사의 훈련/);assert.ok(Math.hypot(b.p.x-trainer.x,b.p.y-trainer.y)<=76);assert.ok(Math.hypot(b.p.x-start.x,b.p.y-start.y)>0);assert.equal(h.app.contextClick.active,false);assert.equal(b.castSerial,0);assert.equal(h.toasts.includes('INTERACT'),false);
});
test('R14a2 menu cancellation prevents old context destination or NPC from executing after resume',async()=>{
 const h=await contextUi(),trainer=h.app.interactionCandidates().find(o=>o.id==='trainer');clickContextLabel(h,trainer);for(let i=0;i<4;i++)await h.frame();assert.equal(h.app.contextClick.active,true);h.key('Escape');await next();assert.equal(h.app.contextClick.active,false);h.app.closePanel();const at={x:h.app.battle.p.x,y:h.app.battle.p.y};for(let i=0;i<170;i++)await h.frame();assert.equal(h.modal.hidden,true);assert.deepEqual({x:h.app.battle.p.x,y:h.app.battle.p.y},at);assert.equal(h.app.sampledCombatInput().moveTarget,undefined);
});
test('R14a2 fresh empty-ground mousedown replaces selected context approach and cannot later open the old NPC',async()=>{
 const h=await contextUi(),trainer=h.app.interactionCandidates().find(o=>o.id==='trainer');clickContextLabel(h,trainer);assert.equal(h.app.contextClick.target.id,'trainer');const old=h.app.sampledCombatInput().moveTarget;const point=h.app.contextProjection({x:520,y:400});h.ch.mousedown({button:0,clientX:point.x,clientY:point.y,preventDefault(){}});mouseUp(h,0);assert.equal(h.app.contextClick.active,false);const ground=h.app.sampledCombatInput().moveTarget;assert.ok(ground);assert.notDeepEqual(ground,old);for(let i=0;i<170;i++)await h.frame();assert.equal(h.modal.hidden,true);assert.equal(h.app.battle.castSerial,0);
});
test('R14a2 unaccepted hidden portal cannot become a context target from its projected label position',async()=>{
 const h=await contextUi(),hidden=imports.getRegion(h.app.battle.region).portals.find(o=>o.id==='town-wilderness-entry'),before=h.app.state.world.region;assert.ok(hidden);assert.equal(h.app.interactionCandidates().some(o=>o.id===hidden.id),false);clickContextLabel(h,hidden);assert.equal(h.app.contextClick.active,false);for(let i=0;i<100;i++)await h.frame();assert.equal(h.app.state.world.region,before);assert.equal(h.modal.hidden,true);assert.equal(h.app.battle.castSerial,0);
});
test('R14a2 new explicit combat input cancels selected context NPC and leaves no interaction to replay',async()=>{
 const h=await contextUi(),trainer=h.app.interactionCandidates().find(o=>o.id==='trainer');clickContextLabel(h,trainer);assert.equal(h.app.contextClick.active,true);h.key('KeyJ');h.up('KeyJ');assert.equal(h.app.contextClick.active,false);assert.equal(h.app.battle.p.action.id,'mace_swing');for(let i=0;i<120;i++)await h.frame();assert.equal(h.modal.hidden,true);assert.equal(h.app.sampledCombatInput().moveTarget,undefined);assert.equal(h.app.battle.castSerial,1);
});
test('R14a2 click-mode ground destination persists through an independently aimed RMB hammer and production movement',async()=>{
 const h=await contextUi(),b=h.app.battle,point=h.app.contextProjection({x:520,y:400});h.ch.mousedown({button:0,clientX:point.x,clientY:point.y,preventDefault(){}});mouseUp(h,0);const destination=h.app.sampledCombatInput().moveTarget;assert.ok(destination);assert.equal(h.app.contextClick.active,false);h.ch.pointermove({clientX:200,clientY:200});const before={x:b.p.x,y:b.p.y};mouseDown(h,2);assert.equal(b.p.action.id,'righteous_hammer');assert.deepEqual(h.app.sampledCombatInput().moveTarget,destination);mouseUp(h,2);for(let i=0;i<12;i++)await h.frame();assert.ok(Math.hypot(b.p.x-before.x,b.p.y-before.y)>0);assert.equal(h.modal.hidden,true);assert.equal(b.castSerial,1);
});
test('R14a2 newest explicit moved mace replaces waiting banner without charging both skills',async()=>{
 const h=await v5Ui(),b=h.app.battle,mana=b.p.mana;h.delay();const task=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();h.key('KeyG');h.up('KeyG');h.key('KeyF');h.up('KeyF');await h.finish();await task;await next();assert.equal(b.p.action.id,'mace_swing');assert.equal(b.castSerial,1);assert.equal(b.p.mana,mana);assert.equal(b.p.cooldowns.battle_banner??0,0);
});
test('R14a2 failed real save discards waiting moved skill and preserves exact last committed state',async()=>{
 const h=await v5Ui(),before=h.store.load().state;h.delay();const task=h.app.dispatch({type:'checkpoint',...h.app.report()},{critical:true});await next();h.key('KeyG');h.up('KeyG');await h.finish(true);assert.equal(await task,false);await h.frame();assert.equal(h.gate.blocked,true);assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);assert.deepEqual(h.store.load().state,before);assert.deepEqual(h.app.report().vitals,before.vitals);
});


test('R14a3 binding add/remove ARIA labels follow the moved skill, not historical action slot',async()=>{
 const h=await v5Ui();h.app.showControls();
 assert.match(h.modal.innerHTML,/aria-label="기술 슬롯 7 · 철퇴 F 제거"/);
 assert.match(h.modal.innerHTML,/aria-label="기술 슬롯 7 · 철퇴 키 추가"/);
 assert.match(h.modal.innerHTML,/aria-label="기술 슬롯 6 · 불굴의 진격 R 제거"/);
 assert.doesNotMatch(h.modal.innerHTML,/aria-label="전문 기술 슬롯 1 F 제거"/);
});
test('R14a3 v4 help names current click attack key instead of asserting LMB attack',async()=>{
 const h=await ui({poeMode:'click'});h.app.showControls();
 assert.match(h.modal.innerHTML,/현재 기본 공격: J/);
 assert.doesNotMatch(h.modal.innerHTML,/좌클릭 기본 반복/);
});

test('observation main: real render is bracketed by distinct entry and return clocks without mutating action data',async()=>{
 const h=await ui({renderDuration:5});h.key('KeyJ');const action=h.app.battle.p.action;await h.frame();const rows=h.app.inputObservations,enter=rows.find(r=>r.kind==='first-render-enter'),returned=rows.find(r=>r.kind==='first-render-return');assert.ok(enter);assert.ok(returned);assert.equal(enter.at,16);assert.equal(returned.at,21);assert.equal(h.renderClocks[0].at,enter.at);assert.ok(h.renderClocks[0].observations.some(r=>r.kind==='first-render-enter'));assert.equal(h.renderClocks[0].observations.some(r=>r.kind==='first-render-return'),false);assert.equal(Object.hasOwn(action,'presentationObserved'),false);h.up('KeyJ');await next();h.app.showInputObservations();assert.match(h.modal.innerHTML,/첫 렌더 진입 16\.00 ms · 첫 렌더 반환 21\.00 ms/);assert.doesNotMatch(h.modal.innerHTML,/첫 렌더 호출/);
});
test('observation main: guard receipt remains separate when held mace resumes after guard release',async()=>{
 const h=await v5Ui();h.key('KeyF');await next();mouseDown(h,2);const guard=h.app.inputObservations.filter(r=>r.kind==='input').at(-1);assert.equal(guard.skillId,'shield_block');for(let i=0;i<40;i++)await h.frame();assert.equal(h.app.battle.p.block,true);mouseUp(h,2);await advanceUntil(h,()=>h.app.inputObservations.some(r=>r.kind==='action-start'&&r.heldRepeat&&r.skillId==='mace_swing'),'held mace has its own observation');const start=h.app.inputObservations.filter(r=>r.kind==='action-start'&&r.skillId==='mace_swing').at(-1);assert.notEqual(start.sequence,guard.sequence);assert.equal(start.receivedAt,null);assert.equal(start.delayMs,null);assert.equal(h.app.inputObservations.some(r=>r.kind==='action-start'&&r.sequence===guard.sequence),false);h.up('KeyF');
});
test('observation main: the remapped press records its resolved skill before action start',async()=>{
 const h=await v5Ui();mouseDown(h,0);const rows=h.app.inputObservations,press=rows.find(r=>r.kind==='input'),start=rows.find(r=>r.kind==='action-start');assert.equal(press.action,'attack');assert.equal(press.skillId,'righteous_hammer');assert.equal(start.skillId,press.skillId);assert.equal(start.sequence,press.sequence);mouseUp(h,0);
});
test('observation main: start sound uses the event cast rather than an unrelated current action',async()=>{
 const h=await ui({audioResult:true});h.key('KeyJ');await next();const current=h.app.battle.p.action,foreignCast=current.castId+99;h.app.deliverCombatEvents([{type:'actionStarted',id:'righteous_hammer',castId:foreignCast},{type:'sound',name:'magicCharge'}]);const sound=h.app.inputObservations.at(-1);assert.equal(sound.kind,'audio-request-result');assert.equal(sound.castId,foreignCast);assert.equal(sound.accepted,true);assert.notEqual(sound.castId,current.castId);assert.equal(h.app.battle.p.action,current);
});
test('observation main: enemy and hit sounds never borrow a live player action identity',async()=>{
 const h=await ui({audioResult:true});h.key('KeyJ');await next();for(const name of ['enemyTell','heavyHit','footstep','magicRelease'])h.app.deliverCombatEvents([{type:'sound',name}]);const sounds=h.app.inputObservations.filter(r=>['enemyTell','heavyHit','footstep','magicRelease'].includes(r.name));assert.equal(sounds.length,4);assert.ok(sounds.every(r=>r.kind==='audio-request-result'&&r.sequence===null&&r.castId===null&&r.accepted===true));
});
test('observation main: a declined audio request is shown as declined, without claiming playback',async()=>{
 const h=await ui({audioResult:false});h.key('KeyJ');h.up('KeyJ');await h.frame();const sound=h.app.inputObservations.find(r=>r.kind==='audio-request-result');assert.equal(sound.accepted,false);assert.equal(sound.name,'slash');assert.ok(sound.sequence);h.app.showInputObservations();assert.match(h.modal.innerHTML,/소리 요청 결과 0\.00 ms \(미수락\)/);assert.match(h.modal.innerHTML,/재생 시작 시각이 아닙니다/);assert.doesNotMatch(h.modal.innerHTML,/소리 전달/);
});
test('observation main: dodge audio is linked to its exact mobility sequence and result',async()=>{
 const h=await ui({poeMode:'wasd',audioResult:true});h.key('Space');const rows=h.app.inputObservations,press=rows.find(r=>r.kind==='input'),start=rows.find(r=>r.kind==='mobility-start'),sound=rows.find(r=>r.kind==='audio-request-result');assert.ok(start);assert.ok(sound);assert.equal(start.sequence,press.sequence);assert.equal(sound.sequence,start.sequence);assert.equal(sound.castId,null);assert.equal(sound.accepted,true);assert.equal(sound.linkBasis,'mobility-start');h.up('Space');
});
test('observation main: rejected dodge observation cannot survive until later held movement',async()=>{
 const h=await ui({poeMode:'wasd'});h.key('KeyW');h.key('Space');await next();h.up('Space');await next();h.key('Space');const rows=h.app.inputObservations,press=rows.filter(r=>r.kind==='input'&&r.action==='dodgeSprint').at(-1);assert.ok(press);assert.ok(rows.some(r=>r.kind==='cancelled'&&r.sequence===press.sequence&&r.reason==='mobility-locked'));assert.equal(rows.some(r=>r.kind==='mobility-start'&&r.sequence===press.sequence),false);await advanceUntil(h,()=>h.app.inputObservations.some(r=>r.kind==='mobility-start'&&r.state==='sprint'),'held sprint transition');const sprint=h.app.inputObservations.filter(r=>r.kind==='mobility-start'&&r.state==='sprint').at(-1);assert.notEqual(sprint.sequence,press.sequence);assert.equal(sprint.heldTransition,true);assert.equal(sprint.delayMs,null);h.up('Space');h.up('KeyW');
});


// R14a6: production toast, input handlers, frames, accepted action events and
// durable save flow. DOM classes are probed; this is not browser/pixel evidence.
const recoveryCopy='후딜 중 · 동작이 끝나기 직전에 다시 누르세요.';
function recoveryVisible(h){assert.equal(h.notice.textContent,recoveryCopy);assert.equal(h.notice.classList.contains('visible'),true);assert.ok(h.app.noticeUntil>0);}
function noRecoveryNotice(h){assert.equal(h.notice.textContent,'');assert.equal(h.notice.classList.contains('visible'),false);assert.equal(h.notice.recoverySkillId,null);assert.equal(h.app.noticeUntil,0);}
for(const hz of [30,60,120])for(const mapped of [false,true])for(const blockedBy of ['roll','hammer-recovery'])test(`R14a6 ${hz}Hz ${mapped?'mapped F':'LMB'} held mace dismisses only its own ${blockedBy} notice when start is accepted`,async()=>{
 const h=mapped?await v5Ui({realNotice:true}):await ui({poeMode:'wasd',realNotice:true}),b=h.app.battle;
 if(blockedBy==='roll'){h.key('Space');await next();}else{mouseDown(h,mapped?0:2);await h.frame(.025);mouseUp(h,mapped?0:2);}
 if(mapped)h.key('KeyF');else mouseDown(h,0);await next();recoveryVisible(h,'mace_swing');
 for(let i=0;i<180&&!h.app.inputObservations.some(row=>row.kind==='action-start'&&row.heldRepeat&&row.skillId==='mace_swing');i++)await h.frame(1/hz);
 const start=h.app.inputObservations.find(row=>row.kind==='action-start'&&row.heldRepeat&&row.skillId==='mace_swing');assert.ok(start);assert.equal(b.p.action.id,'mace_swing');noRecoveryNotice(h);
 for(let i=0;i<90&&!h.app.inputObservations.some(row=>row.kind==='contact'&&row.castId===start.castId);i++)await h.frame(1/hz);
 assert.ok(h.app.inputObservations.some(row=>row.kind==='contact'&&row.castId===start.castId));assert.equal(h.notice.textContent,'');assert.equal(h.notice.classList.contains('visible'),false);
 if(mapped)h.up('KeyF');else mouseUp(h,0);if(blockedBy==='roll')h.up('Space');
});
test('R14a6 rejected single mace press remains visible, cannot repeat, then expires normally',async()=>{
 const h=await ui({poeMode:'wasd',realNotice:true});h.key('Space');await next();mouseDown(h,0);mouseUp(h,0);h.up('Space');await next();recoveryVisible(h,'mace_swing');const until=h.app.noticeUntil;
 for(let i=0;i<60;i++)await h.frame();recoveryVisible(h,'mace_swing');assert.equal(h.app.noticeUntil,until);assert.equal(h.app.battle.castSerial,0);
 for(let i=0;i<160;i++)await h.frame();assert.equal(h.notice.textContent,'');assert.equal(h.notice.classList.contains('visible'),false);assert.equal(h.notice.recoverySkillId,null);assert.equal(h.app.battle.castSerial,0);
});
test('R14a6 different accepted skill preserves the still-relevant rejected skill notice',async()=>{
 const h=await ui({poeMode:'wasd',realNotice:true});h.key('Space');await next();mouseDown(h,0);mouseUp(h,0);h.up('Space');await next();recoveryVisible(h,'mace_swing');const until=h.app.noticeUntil;
 for(let i=0;i<45;i++)await h.frame();mouseDown(h,2);assert.equal(h.app.battle.p.action.id,'righteous_hammer');recoveryVisible(h,'mace_swing');assert.equal(h.app.noticeUntil,until);mouseUp(h,2);
});
test('R14a6 same-skill new successful press resolves an earlier single-press notice',async()=>{
 const h=await ui({poeMode:'wasd',realNotice:true});h.key('Space');await next();mouseDown(h,0);mouseUp(h,0);h.up('Space');await next();recoveryVisible(h,'mace_swing');
 for(let i=0;i<45;i++)await h.frame();mouseDown(h,0);assert.equal(h.app.battle.p.action.id,'mace_swing');noRecoveryNotice(h);mouseUp(h,0);
});
for(const boundary of ['menu','blur','death'])test(`R14a6 ${boundary} ends recovery notice ownership and clears held input`,async()=>{
 const h=await ui({poeMode:'wasd',realNotice:true});h.key('Space');await next();mouseDown(h,0);await next();recoveryVisible(h,'mace_swing');
 if(boundary==='menu')h.key('Escape');else if(boundary==='blur')h.wh.blur();else{h.app.battle.p.hp=0;h.app.battle.dead=true;await h.frame();}
 await next();noRecoveryNotice(h);assert.equal(h.app.paused,true);if(boundary==='death'){assert.equal(h.app.state.world.lifeDown,true);assert.match(h.modal.innerHTML,/쓰러졌습니다/);}else{h.app.closePanel();for(let i=0;i<60;i++)await h.frame();assert.equal(h.app.battle.castSerial,0);}
});
test('R14a6 replacing recovery notice with an unrelated message preserves it on matching success',async()=>{
 const h=await ui({poeMode:'wasd',realNotice:true});h.key('Space');await next();mouseDown(h,0);await next();recoveryVisible(h,'mace_swing');
 h.app.toast('저장 대기가 길어 입력을 취소했습니다. 다시 눌러 주세요.');const until=h.app.noticeUntil;assert.equal(h.notice.recoverySkillId,null);
 await advanceUntil(h,()=>h.app.battle.p.action?.id==='mace_swing','same held skill starts');assert.equal(h.notice.textContent,'저장 대기가 길어 입력을 취소했습니다. 다시 눌러 주세요.');assert.equal(h.notice.classList.contains('visible'),true);assert.equal(h.app.noticeUntil,until);mouseUp(h,0);h.up('Space');
});
test('R14a6 later different-skill rejection is not cleared by held mace success',async()=>{
 const h=await ui({poeMode:'wasd',realNotice:true});h.key('Space');await next();mouseDown(h,0);await next();recoveryVisible(h,'mace_swing');mouseDown(h,2);mouseUp(h,2);await next();recoveryVisible(h,'righteous_hammer');
 await advanceUntil(h,()=>h.app.battle.p.action?.id==='mace_swing','held mace starts');recoveryVisible(h,'righteous_hammer');mouseUp(h,0);h.up('Space');
});
test('R14a6 actual failed accepted-action checkpoint replaces notice with save error and closes gate',async()=>{
 const h=await ui({poeMode:'wasd',realNotice:true});h.key('Space');await next();mouseDown(h,0);await next();recoveryVisible(h,'mace_swing');h.fail();
 for(let i=0;i<90&&!h.app.gate.blocked;i++)await h.frame();assert.equal(h.app.gate.blocked,true);assert.equal(h.app.paused,true);assert.equal(h.notice.recoverySkillId,null);assert.equal(h.notice.textContent,'fixture');assert.equal(h.notice.classList.contains('visible'),true);assert.ok(h.app.noticeUntil>0);assert.match(h.modal.innerHTML,/저장을 확인해야 합니다/);
});
test('R14a6 not-ready resource rejection remains after another successful action',async()=>{
 const h=await ui({poeMode:'wasd',realNotice:true});h.app.battle.p.mana=0;mouseDown(h,2);mouseUp(h,2);await next();assert.match(h.notice.textContent,/마나 부족/);assert.equal(h.notice.recoverySkillId,null);const copy=h.notice.textContent,until=h.app.noticeUntil;mouseDown(h,0);assert.equal(h.app.battle.p.action.id,'mace_swing');assert.equal(h.notice.textContent,copy);assert.equal(h.app.noticeUntil,until);mouseUp(h,0);
});
for(const first of ['LMB','Space'])test(`R14a6 ${first}-first simultaneous LMB and Space hold for 1350ms resumes mace without a stale notice`,async()=>{
 const h=await ui({poeMode:'wasd',realNotice:true});
 if(first==='LMB'){mouseDown(h,0);h.key('Space');}else{h.key('Space');mouseDown(h,0);}await next();
 for(let i=0;i<81;i++)await h.frame(1/60);
 const rows=h.app.inputObservations,roll=rows.find(r=>r.kind==='mobility-start'&&r.state==='roll'),resumed=rows.find(r=>r.kind==='action-start'&&r.skillId==='mace_swing'&&r.heldRepeat&&r.at>=roll?.at);
 assert.ok(roll);assert.ok(resumed);assert.ok(rows.some(r=>r.kind==='contact'&&r.castId===resumed.castId));assert.equal(h.notice.textContent,'');assert.equal(h.notice.classList.contains('visible'),false);
 mouseUp(h,0);h.up('Space');await next();const casts=h.app.battle.castSerial;for(let i=0;i<60;i++)await h.frame();assert.equal(h.app.battle.castSerial,casts);assert.equal(h.app.battle.p.action,null);
});

// R14a7 observability integration: actual click/frame/keyboard/store handlers.
// Render is a boundary probe. This does not measure a browser or prove pixels.
test('R14a7 QA controls are explicit, default OFF, and never persisted',async()=>{
 const h=await ui({poeMode:'wasd'}),before=structuredClone(h.store.load().state),revision=h.app.controller.revision();
 assert.equal(h.contactTrace.enabled,false);assert.equal(h.frameObservation.enabled,false);
 await h.click('observe-panel');assert.match(h.modal.innerHTML,/검증용 읽기 전용/);assert.match(h.modal.innerHTML,/미관측/);
 await h.click('observe-contact-toggle');await h.click('observe-frame-toggle');
 assert.equal(h.contactTrace.enabled,true);assert.equal(h.frameObservation.enabled,true);
 assert.deepEqual(h.store.load().state,before);assert.equal(h.app.controller.revision(),revision);
 assert.match(h.modal.innerHTML,/GPU·물리 디스플레이·소리 지연/);
});
test('R14a7 production frame fills actual contact and CPU buckets without changing progression',async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:2}),off=await ui({poeMode:'wasd',renderDuration:2});
 await h.click('observe-contact-toggle');await h.click('observe-frame-toggle');h.app.closePanel();
 h.key('KeyD');off.key('KeyD');for(let i=0;i<8;i++){await h.frame();await off.frame();}h.up('KeyD');off.up('KeyD');
 assert.deepEqual(h.app.report(),off.app.report());assert.deepEqual(h.store.load().state,off.store.load().state);
 assert.ok(h.contactTrace.snapshot().frames.length>0);const rows=h.frameObservation.snapshot();
 assert.ok(rows.active.render.n>0);assert.equal(rows.active.render.p50Ms,2);assert.equal(rows.active.total.p50Ms,2);
 assert.equal(off.contactTrace.snapshot().frames.length,0);assert.equal(off.frameObservation.snapshot().sampleCount,0);
 await h.click('observe-panel');assert.match(h.modal.innerHTML,/2.00/);
});
test('R14a7 paused and save-wait frames cannot become combat cost samples',async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:3});await h.click('observe-frame-toggle');await h.frame();
 assert.equal(h.frameObservation.snapshot().byMode.menu.frames,1);assert.equal(h.frameObservation.snapshot().active.frames,0);
 h.app.closePanel();h.delay();const saving=h.app.dispatch({type:'checkpoint',...h.app.report()});await next();await h.frame();
 assert.equal(h.frameObservation.snapshot().byMode['save-wait'].frames,1);assert.equal(h.frameObservation.snapshot().active.frames,0);await h.finish();await saving;
});
test('R14a7 QA clear and reload discard old paths/frame observations without altering stored save',async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:1});await h.click('observe-contact-toggle');await h.click('observe-frame-toggle');h.app.closePanel();await h.frame();
 assert.ok(h.frameObservation.snapshot().sampleCount>0);const before=structuredClone(h.store.load().state);
 await h.click('observe-clear');assert.equal(h.frameObservation.snapshot().sampleCount,0);assert.equal(h.contactTrace.snapshot().frames.length,0);
 assert.deepEqual(h.store.load().state,before);h.app.closePanel();await h.frame();await h.click('reload');
 assert.equal(h.frameObservation.snapshot().sampleCount,0);assert.equal(h.frameObservation.snapshot().lastClearReason,'reload');assert.equal(h.contactTrace.snapshot().frames.length,0);assert.deepEqual(h.store.load().state,before);
});
test('R14a7 release surface rejects candidate QA toggles',async()=>{
 const h=await ui({poeMode:'wasd',candidate:false}),before=structuredClone(h.store.load().state);
 for(const action of ['observe-panel','observe-contact-toggle','observe-frame-toggle','observe-clear'])await h.click(action);
 assert.equal(h.contactTrace.enabled,false);assert.equal(h.frameObservation.enabled,false);assert.deepEqual(h.store.load().state,before);assert.equal(h.modal.hidden,true);
});

test('R14a7 actual long menu keeps last playable frame observation readable',async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:4});await h.click('observe-frame-toggle');h.app.closePanel();h.key('KeyD');for(let i=0;i<4;i++)await h.frame();h.up('KeyD');
 await h.click('observe-panel');for(let i=0;i<260;i++)await h.frame();await h.click('observe-panel');
 const result=h.frameObservation.snapshot();assert.equal(result.active.frames,0);assert.equal(result.lastActive.status,'retained');assert.equal(result.lastActive.sampleCount,4);assert.equal(result.lastActive.active.render.p50Ms,4);assert.match(h.modal.innerHTML,/마지막 활성 구간/);assert.match(h.modal.innerHTML,/4.00/);
});


test('actual pointercancel drains cast cancellation to audio once without changing action debt',async()=>{
 const h=await ui();h.key('KeyJ');await next();assert.equal(h.app.battle.p.action?.id,'mace_swing');const action=h.app.battle.p.action,before=structuredClone(action),tag=`cast:${action.castId}`;
 h.ch.pointercancel();h.app.flushActionSafety();assert.ok(h.audioCancellations.includes(tag));assert.equal(h.audioCancellations.filter(x=>x===tag).length,1);assert.equal(h.app.battle.p.action,action);assert.deepEqual(action,before);assert.equal(h.app.paused,false);
 h.app.flushActionSafety();assert.equal(h.audioCancellations.filter(x=>x===tag).length,1);
});
test('actual lostpointercapture cancels paid channel voice without refund or a late pulse',async()=>{
 const h=await ui();h.buttons.expert1.handlers.pointerdown({pointerId:1,preventDefault(){}});await next();const action=h.app.battle.p.action;assert.equal(action.id,'zealous_onslaught');const tag=`cast:${action.castId}`,stamina=h.app.battle.p.stamina,cooldown=h.app.battle.p.cooldowns.zealous_onslaught;
 h.ch.lostpointercapture();h.app.flushActionSafety();assert.ok(h.audioCancellations.includes(tag));assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.stamina,stamina);assert.equal(h.app.battle.p.cooldowns.zealous_onslaught,cooldown);assert.equal(h.app.battle.events.some(e=>e.type==='channelPulse'||e.type==='lanceResolved'),false);assert.equal(h.app.paused,false);
 const count=h.audioCancellations.filter(x=>x===tag).length;h.app.flushActionSafety();assert.equal(h.audioCancellations.filter(x=>x===tag).length,count);
});
test('actual non-pausing safety drain stops mobility-owned audio on pointer cancellation',async()=>{
 const h=await ui({poeMode:'wasd'});h.key('Space');await next();assert.equal(h.app.battle.poeMobility.snapshot().state,'roll');h.ch.pointercancel();h.app.flushActionSafety();assert.ok(h.audioCancellations.includes('mobility'));assert.equal(h.app.paused,false);
});


// Safety-menu regressions execute the full production frame and event handlers
// with real stores; synthetic frame timestamps are not a reproduced render cause.
for(const gap of [.5,.501])test(`actual ${gap*1000}ms frame keeps the existing stall boundary and safety-only presentation`,async()=>{
 const h=await ui({poeMode:'wasd'});await h.frame(gap);
 assert.equal(h.app.paused,gap>.5);assert.equal(!!h.modal.safetyPause,gap>.5);
 if(gap>.5){assert.match(h.modal.innerHTML,/화면 처리가 0.5초 이상 중단됨/);assert.match(h.modal.innerHTML,/data-action="safety-menu"/);assert.doesNotMatch(h.modal.innerHTML,/data-action="(?:attribute:|action-slots|controls|save|leave)/);}
});
for(const cause of ['blur','visibility','frame-focus','stall'])test(`actual ${cause} safety stop rejects menu mutation and clears held/deferred intent through resume`,async()=>{
 const h=await ui({poeMode:'wasd'}),before=structuredClone(h.app.state),paid=h.app.report();h.delay();const saving=h.app.dispatch({type:'checkpoint',...paid});await next();h.key('KeyD');h.key(h.app.state.options.controls.bindings.expert2[0]);
 const deferred=()=>h.expertCapture.deferred.flush({now:0,battle:h.app.battle,owner:h.app.controller,slots:h.app.state.actionSlots,controls:imports.controlsFor(h.app.state),busy:true},()=>assert.fail('busy probe cannot dispatch'));assert.equal(deferred().status,'waiting');assert.equal(h.router.isHeld('right'),true);
 if(cause==='blur')h.wh.blur();else if(cause==='visibility'){h.document.hidden=true;h.dh.visibilitychange();}else if(cause==='frame-focus'){h.document.hasFocus=()=>false;await h.frame();}else await h.frame(.501);
 assert.equal(h.modal.safetyPause,true);assert.equal(h.app.paused,true);assert.equal(deferred().status,'idle');assert.equal(h.router.isHeld('right'),false);assert.equal(h.app.battle.skillIntent,null);
 for(const action of ['attribute:strength','assign-slot','assign-skill-slot','controls','save','leave','menu'])await h.click(action);
 assert.deepEqual(h.app.state,before);assert.equal(h.modal.safetyPause,true);await h.finish();await saving;await h.frame();
 assert.equal(h.app.battle.p.action,null);assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);assert.deepEqual(h.store.load().state.character,before.character);assert.deepEqual(h.store.load().state.options,before.options);
 h.document.hidden=false;h.document.hasFocus=()=>true;await h.click('close');assert.equal(h.app.paused,false);assert.equal(h.modal.safetyPause,false);await h.frame();assert.equal(h.app.battle.p.action,null);assert.equal(h.router.isHeld('right'),false);assert.equal(h.app.battle.p.cooldowns.battle_banner??0,0);
});
test('actual safety full-menu acknowledgement is presentation-only and preserves the saved revision',async()=>{
 const h=await ui({poeMode:'wasd'});await h.frame(.501);await next();await h.frame();const before=structuredClone(h.store.load()),revision=h.app.controller.revision();await h.click('safety-menu');await next();
 assert.equal(h.modal.safetyPause,false);assert.equal(h.app.paused,true);assert.match(h.modal.innerHTML,/data-action="action-slots"/);assert.equal(h.app.controller.revision(),revision);assert.deepEqual(h.store.load(),before);
});
test('actual safety checkpoint failure keeps the existing recovery gate authoritative',async()=>{
 const h=await ui({poeMode:'wasd'}),before=structuredClone(h.store.load());h.fail({ok:false,code:'COMMIT_UNCERTAIN',reason:'fixture uncertain commit'});await h.frame(.501);await next();assert.equal(h.gate.blocked,true);assert.equal(h.modal.safetyPause,false);assert.match(h.modal.innerHTML,/data-action="reload"/);assert.doesNotMatch(h.modal.innerHTML,/data-action="safety-menu"/);assert.deepEqual(h.store.load(),before);
 h.key('Escape');assert.equal(h.app.paused,true);assert.equal(h.modal.hidden,false);
});


// R14a15: synthetic costs establish attribution contracts, never browser/GPU performance.
test('R14a15 real >500ms stop retains distinct previous/current callback costs and actual pause',async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:200});h.frameObservation.setEnabled(true);h.key('KeyD');await h.frameAt(100,105);h.setRenderDuration(3);const time=h.app.battle.time;await h.frameAt(701,730);
 const i=h.frameObservation.snapshot().stallDiagnostics.incidents[0];assert.equal(i.previous.rafTimestampMs,100);assert.equal(i.previous.callbackStartedAtMs,105);assert.equal(i.previous.totalMs,200);assert.equal(i.current.rafIntervalMs,601);assert.equal(i.current.callbackStartedAtMs,730);assert.equal(i.current.totalMs,3);assert.equal(i.current.phaseMs.render,3);assert.equal(i.current.phaseMs.step,null);assert.equal(i.current.safetyStop,'frame-gap');assert.equal(i.current.context.focused,true);assert.equal(i.current.context.hidden,false);assert.equal(i.sincePreviousCallbackEndMs,425);
 assert.equal(h.app.battle.time,time);assert.equal(h.app.paused,true);assert.equal(h.modal.safetyPause,true);assert.doesNotMatch(h.modal.innerHTML,/data-action="observe-panel"/);
});
test('R14a15 real 500ms boundary neither pauses nor creates a strict-gap incident; 501ms does',async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:1});h.frameObservation.setEnabled(true);await h.frameAt(100);await h.frameAt(600);assert.equal(h.app.paused,false);assert.equal(h.frameObservation.snapshot().stallDiagnostics.incidents.length,0);await h.frameAt(1101);assert.equal(h.app.paused,true);assert.equal(h.frameObservation.snapshot().stallDiagnostics.incidents[0].current.runtimeIntervalMs,501);
});
test('R14a15 real cheap callbacks with delayed entry retain unexplained separation without assigning GPU cost',async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:2});h.frameObservation.setEnabled(true);await h.frameAt(100,103);await h.frameAt(800,920);const i=h.frameObservation.snapshot().stallDiagnostics.incidents[0];assert.equal(i.previous.totalMs,2);assert.equal(i.current.totalMs,2);assert.equal(i.sincePreviousCallbackEndMs,815);assert.equal(i.current.runtimeIntervalMs,700);
});
test('R14a15 real nonoverlapping phase brackets include scene, event/save entry, safety, audio tick and aim',async()=>{
 const phaseCosts={step:1,scene:2,render:3,audio:4,ui:5,events:6,safety:7,input:8},h=await ui({poeMode:'wasd',phaseCosts});h.frameObservation.setEnabled(true);h.key('KeyD');await h.frameAt(100);const row=h.frameObservation.snapshot().samples[0];for(const [name,value] of Object.entries(phaseCosts)){assert.equal(row.phaseMs[name],value,name);assert.equal(row.phaseStatus[name],'ok',name);}assert.equal(row.totalMs,36);assert.equal(row.otherMs,0);
});
test('R14a15 real diagnostics ON/OFF preserve movement/combat, queues, saves and long-gap cancellation',async()=>{
 const on=await ui({poeMode:'wasd',renderDuration:1}),off=await ui({poeMode:'wasd',renderDuration:1});on.frameObservation.setEnabled(true);
 for(const h of [on,off]){h.key('KeyD');mouseDown(h,2);assert.equal(h.app.battle.p.action?.id,'righteous_hammer');assert.equal(h.app.battle.castSerial,1);}await next();
 for(const raf of [100,116,132,148,164,700]){await on.frameAt(raf);await off.frameAt(raf);assert.deepEqual(on.app.report(),off.app.report());assert.deepEqual(JSON.parse(JSON.stringify(on.app.battle)),JSON.parse(JSON.stringify(off.app.battle)));assert.deepEqual(on.store.load(),off.store.load());assert.equal(on.app.controller.revision(),off.app.controller.revision());assert.equal(on.app.paused,off.app.paused);assert.equal(on.router.hasPendingCombat(),off.router.hasPendingCombat());}
 assert.equal(on.frameObservation.snapshot().stallDiagnostics.incidents.length,1);assert.equal(off.frameObservation.snapshot().sampleCount,0);
});
for(const [name,context] of [['hidden',{hidden:true,visibilityState:'hidden'}],['blur',{hasFocus:()=>false}]])test(`R14a15 real ${name} frame retains prior/current context and unchanged safety pause`,async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:1});h.frameObservation.setEnabled(true);await h.frameAt(100);Object.assign(h.document,context);await h.frameAt(701);const i=h.frameObservation.snapshot().stallDiagnostics.incidents[0];assert.equal(i.previous.context.hidden,false);assert.equal(i.previous.context.focused,true);assert.equal(i.current.safetyStop,name);assert.equal(h.app.paused,true);assert.equal(h.modal.safetyPause,true);
});
test('R14a15 real QA UI retains gap after long menu and next resume, with refresh never clearing evidence',async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:1});h.frameObservation.setEnabled(true);await h.frameAt(100);await h.frameAt(701);await h.click('safety-menu');await h.click('observe-panel');assert.match(h.modal.innerHTML,/601.00ms/);assert.match(h.modal.innerHTML,/audio.tick/);assert.match(h.modal.innerHTML,/직전 \/ 현재 콜백/);assert.match(h.modal.innerHTML,/유휴\/GPU 시간으로 해석하지/);
 for(let n=1;n<=260;n++)await h.frameAt(701+n*16);await h.click('observe-refresh');assert.equal(h.frameObservation.snapshot().stallDiagnostics.incidents.length,1);assert.match(h.modal.innerHTML,/601.00ms/);h.app.closePanel();await h.frameAt(4880);await h.click('observe-panel');assert.equal(h.frameObservation.snapshot().stallDiagnostics.incidents.length,1);await h.click('observe-clear');assert.equal(h.frameObservation.snapshot().stallDiagnostics.incidents.length,0);
});
test('R14a15 actual failed render retains incomplete frame evidence and existing recovery panel',async()=>{
 const h=await ui({poeMode:'wasd',renderDuration:1});h.frameObservation.setEnabled(true);await h.frameAt(100);h.boundaries.renderer.render=()=>{throw Error('synthetic render failure');};const errors=[];h.boundaries.console.error=e=>errors.push(e);await h.frameAt(701);const row=h.frameObservation.snapshot().stallDiagnostics.incidents[0].current;assert.equal(row.workStatus,'failed');assert.equal(row.phaseStatus.render,'incomplete');assert.equal(row.totalMs,null);assert.equal(row.otherMs,null);assert.equal(errors.length,1);assert.equal(h.gate.blocked,true);assert.match(h.modal.innerHTML,/data-action="reload"/);
});


async function a16DeadUi(){const h=await ui({poeMode:'wasd',realNotice:true,renderDuration:1});h.frameObservation.setEnabled(true);h.key('KeyD');await h.frameAt(100);h.up('KeyD');h.app.battle.p.hp=0;h.app.battle.dead=true;h.app.deliverCombatEvents([{type:'heroDead'}]);await next();await next();assert.equal(h.app.state.world.lifeDown,true);assert.match(h.modal.innerHTML,/data-action="retry"/);return h;}
test('R14a16 real saved death QA remains read-only and returns to normal retry',async()=>{
 const h=await a16DeadUi(),before=structuredClone(h.store.load()),revision=h.app.controller.revision(),rows=h.frameObservation.snapshot();await h.click('death-observations');assert.match(h.modal.innerHTML,/사망 상태.*읽기 전용/);await h.click('observe-refresh');assert.equal(h.frameObservation.snapshot().sampleCount,rows.sampleCount);h.key('Escape');assert.equal(h.app.paused,true);await h.click('death-panel');assert.match(h.modal.innerHTML,/data-action="retry"/);assert.deepEqual(h.store.load(),before);assert.equal(h.app.controller.revision(),revision);assert.equal(h.boundaries.$('hud').inert,true);assert.equal(h.boundaries.canvas.inert,true);
});
test('R14a16 real retry unblocks background, clears only established transient records and increments life once',async()=>{
 const h=await a16DeadUi(),before=structuredClone(h.app.state),revision=h.app.controller.revision();await h.click('retry');assert.equal(h.app.state.world.life,before.world.life+1);assert.equal(h.app.state.world.lifeDown,false);assert.equal(h.app.state.stats.deaths,before.stats.deaths);assert.equal(h.app.state.gold,before.gold);assert.deepEqual(h.app.state.inventory,before.inventory);assert.equal(h.app.controller.revision(),revision+1);assert.equal(h.modal.hidden,true);assert.equal(h.app.paused,false);assert.equal(h.boundaries.$('hud').inert,false);assert.equal(h.boundaries.$('hud').attributes['aria-hidden'],undefined);assert.equal(h.boundaries.canvas.inert,false);assert.equal(h.frameObservation.snapshot().sampleCount,0);const x=h.app.battle.p.x;h.key('KeyD');await h.frame();assert.notEqual(h.app.battle.p.x,x);
});
test('R14a16 real recoverable retry failure is visible in modal status and leaves save, focus ownership and retry intact',async()=>{
 const h=await a16DeadUi(),before=structuredClone(h.store.load());h.fail({ok:false,code:'QUOTA',reason:'fixture quota failure'});await h.click('retry');assert.equal(h.app.state.world.lifeDown,true);assert.deepEqual(h.store.load(),before);assert.equal(h.modal.hidden,false);assert.match(h.modal.innerHTML,/data-dialog-status role="status"/);assert.equal(h.boundaries.$('dialogStatus').textContent,'fixture quota failure');assert.match(h.modal.innerHTML,/data-action="retry"/);assert.equal(h.boundaries.$('hud').inert,true);assert.equal(h.gate.blocked,false);await h.click('retry');assert.equal(h.app.state.world.lifeDown,false);
});
test('R14a16 pending retry failure stays accessible after opening death diagnostics',async()=>{
 const h=await a16DeadUi(),before=structuredClone(h.store.load());h.delay();const retry=h.click('retry');await next();assert.equal(h.app.busy,true);await h.click('death-observations');assert.match(h.modal.innerHTML,/사망 상태.*읽기 전용/);await h.finish(true);await retry;assert.equal(h.boundaries.$('dialogStatus').textContent,'fixture');assert.deepEqual(h.store.load(),before);assert.equal(h.app.state.world.lifeDown,true);await h.click('death-panel');assert.match(h.modal.innerHTML,/data-action="retry"/);
});
test('R14a16 uncertain retry keeps Reload authoritative, reload failure accessible, and dead reload restores retry',async()=>{
 const h=await a16DeadUi(),before=structuredClone(h.store.load());h.fail({ok:false,code:'COMMIT_UNCERTAIN',reason:'fixture uncertain retry'});await h.click('retry');assert.equal(h.gate.blocked,true);assert.match(h.modal.innerHTML,/data-action="reload"/);assert.equal(h.boundaries.$('hud').inert,true);h.key('Escape');assert.equal(h.modal.hidden,false);
 const load=h.app.controller.load;h.app.controller.load=async()=>({ok:false,reason:'fixture unavailable read'});await h.click('reload');assert.equal(h.boundaries.$('dialogStatus').textContent,'fixture unavailable read');assert.equal(h.gate.blocked,true);h.app.controller.load=load;await h.click('reload');assert.equal(h.gate.blocked,false);assert.equal(h.app.state.world.lifeDown,true);assert.match(h.modal.innerHTML,/data-action="retry"/);assert.deepEqual(h.store.load(),before);assert.equal(h.boundaries.$('hud').inert,true);
});
test('R14a16 stale dead settings/menu/save actions never mutate real saved state',async()=>{
 const h=await a16DeadUi(),before=structuredClone(h.store.load()),deathHtml=h.modal.innerHTML;for(const action of ['menu','save','leave','controls','inventory','observe-panel','observe-clear','observe-frame-toggle','potion']){await h.click(action);assert.equal(h.modal.innerHTML,deathHtml,'dead dialog unchanged after '+action);}await h.dh.change({target:{dataset:{option:'masterVolume'},value:'0'}});assert.deepEqual(h.store.load(),before);assert.match(h.modal.innerHTML,/data-action="retry"/);assert.equal(h.frameObservation.enabled,true);assert.equal(h.app.paused,true);
});

test('actual committed main snapshot freezes only its owned copy across checkpoint controls rest and save failure',async()=>{
 const h=await ui(),immutable=isImmutableSnapshot;assert.equal(await h.app.dispatch({type:'checkpoint',...h.app.report()}),true);const first=h.app.state;assert.equal(immutable(first),true);const copied=h.app.controller.snapshot();assert.equal(Object.isFrozen(copied),false);copied.gold=0;assert.notEqual(h.app.state.gold,copied.gold);
 const controls=structuredClone(h.app.state.options.controls);assert.equal(await h.app.dispatch({type:'setControls',controls}),true);assert.equal(immutable(h.app.state),true);assert.notEqual(h.app.state,first);assert.equal(await h.app.dispatch({type:'rest',position:imports.getRegion('ash_hamlet').npcs.find(n=>n.id==='healer')}),true);assert.equal(immutable(h.app.state),true);const before=h.app.state;h.fail();assert.equal(await h.app.dispatch({type:'checkpoint',...h.app.report()}),false);assert.equal(h.app.state,before);assert.deepEqual(h.store.load().state,before);
});

// Independent R14a18 display-copy regression: production panel/toast handlers.
test('recovery diagnostic separates same-sequence waiting observations from rejection causes',async()=>{
 const h=await ui({poeMode:'wasd'}),trace=h.boundaries.inputLatency;
 const waiting=trace.press('charge',{skillId:'shield_charge'});trace.waiting();trace.clear('recovery-too-early');
 const rejected=trace.press('attack',{skillId:'mace_swing'});trace.clear('recovery-too-early');
 const before=structuredClone(h.app.state),revision=h.app.controller.revision(),observations=trace.snapshot();
 h.app.showInputObservations();
 const articles=[...h.modal.innerHTML.matchAll(/<article class="skill">[\s\S]*?<\/article>/g)].map(m=>m[0]);
 const row=id=>articles.find(text=>text.includes(`· 입력 ${id}</strong>`));
 assert.match(row(waiting.sequence),/저장·안전 처리 대기 상태 관측 · 대기 시간 미측정/);
 assert.doesNotMatch(row(rejected.sequence),/저장·안전 처리 대기 상태 관측|저장 대기 포함/);
 for(const id of [waiting.sequence,rejected.sequence])assert.match(row(id),/입력 연결 종료: recovery-too-early/);
 assert.match(h.modal.innerHTML,/대기 상태 관측과 입력 연결 종료 사유는 별개입니다\./);
 assert.deepEqual(trace.snapshot(),observations);assert.deepEqual(h.app.state,before);assert.equal(h.app.controller.revision(),revision);
});
test('recovery copy retains one status region and key repeat does not renew the notice',async()=>{
 const index=readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
 assert.equal([...index.matchAll(/id="toast" role="status"/g)].length,1);
 const h=await ui({poeMode:'wasd',realNotice:true});
 h.key('Space');await next();h.key('KeyQ');await next();recoveryVisible(h);
 const until=h.app.noticeUntil;
 for(let i=0;i<8;i++){h.key('KeyQ',{repeat:true});await h.frame();}
 recoveryVisible(h);assert.equal(h.app.noticeUntil,until);
 h.wh.blur();await next();noRecoveryNotice(h);
});

// Direction consistency through actual keyboard handlers; earned state is a fixture.
for(const version of [4,5])test(`queued movement charge controls${version} keeps router heading through recovery and held-mace restart`,async()=>{
 const h=version===5?await v5Ui():await ui({poeMode:'wasd'});
 const controls=structuredClone(h.app.state.options.controls);controls.chargeDirection='movement';
 assert.equal(await h.app.dispatch({type:'setControls',controls}),true);h.app.closePanel();
 h.key('KeyD');await h.frame();const direction=imports.screenMovement(1,0),expected=Math.atan2(direction.y,direction.x);
 if(version===5)h.key('KeyF');else mouseDown(h,0);
 await advanceUntil(h,()=>h.app.battle.p.action?.id==='mace_swing'&&h.app.battle.p.action.duration-h.app.battle.p.action.elapsed<=.14,'mace final recovery');
 h.key('KeyQ');h.up('KeyQ');await next();assert.equal(h.app.battle.skillIntent?.id,'shield_charge');
 await advanceUntil(h,()=>h.app.battle.p.action?.id==='shield_charge','queued charge begins');
 assert.ok(Math.abs(h.app.battle.p.action.angle-expected)<1e-8,`router ${expected}, action ${h.app.battle.p.action.angle}`);
 const chargeCast=h.app.battle.p.action.castId;h.up('KeyD');
 await advanceUntil(h,()=>h.app.battle.p.action?.id==='mace_swing','held mace resumes after charge');
 assert.equal(h.app.inputObservations.filter(row=>row.kind==='action-start'&&row.skillId==='shield_charge').length,1);
 assert.ok(h.app.inputObservations.some(row=>row.kind==='contact'&&row.castId===chargeCast));
 if(version===5)h.up('KeyF');else mouseUp(h,0);
});

// Explicit cancellation versus ordinary finite-tap release, through main handlers.
for(const version of [4,5])for(const action of ['attack','charge'])test(`lifecycle controls${version} touch ${action} pointercancel removes unpaid pending pulse`,async()=>{
 const h=version===5?await v5Ui():await ui({poeMode:'wasd'}),before=h.app.report();
 h.delay();const pending=h.app.dispatch({type:'checkpoint',...before});await next();
 h.key('KeyD');touchDown(h,action);h.buttons[action].handlers.pointercancel({});
 await h.finish();await pending;await h.frame();
 assert.equal(h.app.battle.castSerial,0);assert.equal(h.app.battle.p.action,null);assert.equal(h.router.isHeld('right'),false);
 assert.deepEqual(h.app.report().vitals,before.vitals);
 touchDown(h,action);assert.ok(h.app.battle.p.action);touchUp(h,action);
});
for(const version of [4,5])test(`lifecycle controls${version} touch pointercancel clears pending keyboard charge and held movement`,async()=>{
 const h=version===5?await v5Ui():await ui({poeMode:'wasd'}),slot=version===5?'expert1':'attack';
 h.key('KeyD');touchDown(h,slot);
 await advanceUntil(h,()=>h.app.battle.p.action?.id==='mace_swing'&&h.app.battle.p.action.duration-h.app.battle.p.action.elapsed<=.14,'mace final recovery');
 h.key('KeyQ');h.up('KeyQ');await next();assert.equal(h.app.battle.skillIntent?.id,'shield_charge');
 h.buttons[slot].handlers.pointercancel({});assert.equal(h.app.battle.skillIntent,null);assert.equal(h.router.isHeld('right'),false);
 const casts=h.app.battle.castSerial;for(let i=0;i<65;i++)await h.frame();assert.equal(h.app.battle.castSerial,casts);
 assert.equal(h.app.inputObservations.some(row=>row.kind==='action-start'&&row.skillId==='shield_charge'),false);
});

for(const version of [4,5])for(const boundary of ['blur','hidden','frame-focus','editable-focus','canvas-pointercancel','touch-pointercancel','menu'])test(`lifecycle controls${version} ${boundary} clears missing-keyup movement, held mace and queued Q without replay`,async()=>{
 const h=version===5?await v5Ui():await ui({poeMode:'wasd'}),attackKey=version===5?'KeyF':'KeyJ';
 h.key('KeyD');h.key(attackKey);
 await advanceUntil(h,()=>h.app.battle.p.action?.id==='mace_swing'&&h.app.battle.p.action.duration-h.app.battle.p.action.elapsed<=.14,'mace final recovery');
 h.key('KeyQ');h.up('KeyQ');await next();assert.equal(h.app.battle.skillIntent?.id,'shield_charge');const casts=h.app.battle.castSerial;
 if(boundary==='blur')h.wh.blur();
 if(boundary==='hidden'){h.document.hidden=true;h.document.visibilityState='hidden';h.dh.visibilitychange();}
 if(boundary==='frame-focus'){h.document.hasFocus=()=>false;await h.frame();}
 if(boundary==='editable-focus')h.dh.focusin({target:{tagName:'BUTTON'}});
 if(boundary==='canvas-pointercancel')h.ch.pointercancel();
 if(boundary==='touch-pointercancel')h.buttons[version===5?'expert1':'attack'].handlers.pointercancel({});
 if(boundary==='menu')h.key('Escape');
 assert.equal(h.router.isHeld('right'),false);assert.equal(h.router.isHeld('attack'),false);assert.equal(h.skillCapture.isHeld('mace_swing'),false);assert.equal(h.app.battle.skillIntent,null);
 h.document.hidden=false;h.document.visibilityState='visible';h.document.hasFocus=()=>true;if(boundary==='hidden')h.dh.visibilitychange();
 await h.frame();await next();if(h.app.paused)h.app.closePanel();
 h.dh.focusin({target:{tagName:'CANVAS'}});h.key(attackKey,{repeat:true});
 const at={x:h.app.battle.p.x,y:h.app.battle.p.y};for(let n=0;n<80;n++)await h.frame();
 assert.equal(h.app.battle.castSerial,casts);assert.equal(h.app.battle.p.x,at.x);assert.equal(h.app.battle.p.y,at.y);assert.equal(h.app.battle.p.cooldowns.shield_charge??0,0);
 h.key(attackKey);assert.equal(h.app.battle.p.action?.id,'mace_swing');h.up(attackKey);
});
for(const modifier of ['ctrlKey','altKey','metaKey'])test(`lifecycle keyup from UI with ${modifier} still releases movement/attack; modified Q creates no edge`,async()=>{
 const h=await ui({poeMode:'wasd'});h.key('KeyD');h.key('KeyJ');await h.frame();const casts=h.app.battle.castSerial;
 h.key('KeyQ',{[modifier]:true});assert.equal(h.app.battle.skillIntent,null);
 h.wh.keyup({code:'KeyD',target:{tagName:'BUTTON'},[modifier]:true});h.wh.keyup({code:'KeyJ',target:{tagName:'SELECT'},[modifier]:true});
 assert.equal(h.router.isHeld('right'),false);assert.equal(h.router.isHeld('attack'),false);
 const at={x:h.app.battle.p.x,y:h.app.battle.p.y};for(let i=0;i<80;i++)await h.frame();
 assert.equal(h.app.battle.castSerial,casts);assert.equal(h.app.battle.p.x,at.x);assert.equal(h.app.battle.p.y,at.y);
});
for(const version of [4,5])test(`lifecycle controls${version} ordinary touch up plus lost capture preserves one finite unpaid tap and independent keyboard movement`,async()=>{
 const h=version===5?await v5Ui():await ui({poeMode:'wasd'}),before=h.app.report();
 h.delay();const pending=h.app.dispatch({type:'checkpoint',...before});await next();h.key('KeyD');touchDown(h,'charge');touchUp(h,'charge');h.buttons.charge.handlers.lostpointercapture({});
 assert.equal(h.router.isHeld('right'),true);await h.finish();await pending;await h.frame();
 assert.equal(h.app.battle.p.action?.id,'shield_charge');assert.equal(h.app.battle.castSerial,1);h.up('KeyD');
 for(let i=0;i<80;i++)await h.frame();assert.equal(h.app.battle.castSerial,1);
 assert.equal(h.app.inputObservations.filter(row=>row.kind==='action-start'&&row.skillId==='shield_charge').length,1);
});
test('lifecycle negative control: modified Ctrl+L without keyup/focus loss retains legitimate holds; later delivered blur clears them',async()=>{
 const h=await ui({poeMode:'wasd'});h.key('KeyD');h.key('KeyJ');h.key('KeyL',{ctrlKey:true});
 for(let i=0;i<80;i++)await h.frame();assert.equal(h.router.isHeld('right'),true);assert.equal(h.router.isHeld('attack'),true);assert.ok(h.app.battle.castSerial>=2);
 assert.equal(h.boundaries.focusEvents.blurAt,undefined);assert.equal(h.boundaries.focusEvents.visibilityAt,undefined);
 h.wh.blur();assert.equal(h.router.isHeld('right'),false);assert.equal(h.router.isHeld('attack'),false);assert.ok(h.boundaries.focusEvents.blurAt);
 const casts=h.app.battle.castSerial;h.app.closePanel();h.key('KeyJ',{repeat:true});for(let i=0;i<65;i++)await h.frame();assert.equal(h.app.battle.castSerial,casts);
});

// First crusher loop is reachable through the actual candidate menu, not docs alone.
test('crusher menu selects runtime mode with current keys and no profile/revision mutation; region carry and explicit reload reset',async()=>{
 const h=await ui({poeMode:'wasd',skills:['judgement']});h.key('Escape');await h.frame();await h.click('crusher-menu');await h.frame();
 assert.match(h.modal.innerHTML,/유효 철퇴 타격 2회/);assert.match(h.modal.innerHTML,/PoE2의 피해 비례/);const epoch=h.modal.presentationEpoch;
 const before=structuredClone(h.store.load()),revision=h.app.controller.revision(),controls=structuredClone(h.app.state.options.controls);
 await h.click('crusher-mode:1',{crusherEpoch:epoch});assert.equal(h.app.battle.crusherEnabled,true);assert.deepEqual(h.store.load(),before);assert.equal(h.app.controller.revision(),revision);assert.deepEqual(h.app.state.options.controls,controls);assert.match(h.buttons.judgement.innerHTML,/파쇄 강타/);
 const portal=imports.getRegion(h.app.battle.region).portals.find(p=>p.id==='road');assert.ok(portal);Object.assign(h.app.battle.p,{x:portal.x,y:portal.y});
 assert.equal(await h.app.dispatch({type:'travel',to:portal.to,portalId:portal.id,...h.app.report()},{rebuild:true}),true);assert.equal(h.app.battle.crusherEnabled,true);assert.ok(h.app.battle.enemies.every(e=>!e.primedForStun&&!e.heavyStunned));
 assert.doesNotMatch(JSON.stringify(h.store.load().state),/crusherEnabled|stunBuildup|primedForStun|heavyStunned/);
 h.key('Escape');await h.frame();await h.click('reload');assert.equal(h.app.battle.crusherEnabled,undefined);
});
test('crusher choice rejects missing learned strike, stale epoch and field selection',async()=>{
 const h=await ui({poeMode:'wasd'});h.key('Escape');await h.frame();await h.click('crusher-menu');await h.frame();const epoch=h.modal.presentationEpoch;
 await h.click('crusher-mode:1',{crusherEpoch:epoch});assert.notEqual(h.app.battle.crusherEnabled,true);
 const trained=await ui({poeMode:'wasd',skills:['judgement']});trained.key('Escape');await trained.frame();await trained.click('crusher-menu');await trained.frame();
 await trained.click('crusher-mode:1',{crusherEpoch:trained.modal.presentationEpoch-1});assert.notEqual(trained.app.battle.crusherEnabled,true);
 trained.app.battle.region='ember_road';await trained.click('crusher-mode:1',{crusherEpoch:trained.modal.presentationEpoch});assert.notEqual(trained.app.battle.crusherEnabled,true);
});
test('crusher menu reconciles focus safety before idle snapshot; missing learning stays visible and default mode remains selectable',async()=>{
 const h=await ui();h.key('Escape');await h.frame();
 const focus=action=>h.dh.focusin({target:{tagName:'BUTTON',dataset:{action}}});
 focus('crusher-menu');assert.equal(h.expertSafety.pending,true);await h.click('crusher-menu');
 assert.doesNotMatch(h.modal.innerHTML,/진행 중인 동작과 처리가 끝난 뒤/);assert.match(h.modal.innerHTML,/단죄의 일격을 배워야/);
 assert.match(h.modal.innerHTML,/data-action="crusher-mode:1"[^>]*disabled/);assert.doesNotMatch(h.modal.innerHTML,/data-action="crusher-mode:0"[^>]*disabled/);
 const epoch=h.modal.presentationEpoch,before=structuredClone(h.store.load()),revision=h.app.controller.revision();focus('crusher-mode:0');assert.equal(h.expertSafety.pending,true);
 await h.click('crusher-mode:0',{crusherEpoch:epoch});assert.equal(h.modal.hidden,true);assert.equal(h.app.battle.crusherEnabled,false);assert.deepEqual(h.store.load(),before);assert.equal(h.app.controller.revision(),revision);
});
test('crusher selection with real focus between buttons drains only settled safety and keeps finite action, recovery and save guards',async()=>{
 const h=await ui({poeMode:'wasd',skills:['judgement']});h.key('Escape');await h.frame();h.dh.focusin({target:{tagName:'BUTTON',dataset:{action:'crusher-menu'}}});await h.click('crusher-menu');
 assert.doesNotMatch(h.modal.innerHTML,/진행 중인 동작과 처리가 끝난 뒤/);const epoch=h.modal.presentationEpoch;h.dh.focusin({target:{tagName:'BUTTON',dataset:{action:'crusher-mode:1'}}});
 await h.click('crusher-mode:1',{crusherEpoch:epoch});assert.equal(h.app.battle.crusherEnabled,true);assert.equal(h.modal.hidden,true);
 const active=await ui({poeMode:'wasd',skills:['judgement']});active.key('KeyJ');active.up('KeyJ');await next();active.key('Escape');await active.frame();
 const action=active.app.battle.p.action;assert.ok(action);await active.click('crusher-menu');assert.match(active.modal.innerHTML,/진행 중인 동작과 처리가 끝난 뒤/);await active.click('crusher-mode:1',{crusherEpoch:active.modal.presentationEpoch});assert.equal(active.app.battle.p.action,action);assert.notEqual(active.app.battle.crusherEnabled,true);
 const recovering=await ui({skills:['judgement']});recovering.key('Digit2');await recovering.frame();recovering.key('Escape');for(let i=0;i<4;i++)await recovering.frame();assert.equal(recovering.app.battle.p.action,null);const debt=recovering.app.battle.p.recoveryLock;assert.ok(debt>0);await recovering.click('crusher-menu');assert.match(recovering.modal.innerHTML,/진행 중인 동작과 처리가 끝난 뒤/);await recovering.click('crusher-mode:1',{crusherEpoch:recovering.modal.presentationEpoch});assert.equal(recovering.app.battle.p.recoveryLock,debt);assert.notEqual(recovering.app.battle.crusherEnabled,true);
 const waiting=await ui({skills:['judgement']});waiting.key('Escape');await waiting.frame();waiting.delay();const pending=waiting.app.dispatch({type:'checkpoint',...waiting.app.report()});await next();waiting.dh.focusin({target:{tagName:'BUTTON',dataset:{action:'crusher-menu'}}});await waiting.click('crusher-menu');assert.equal(waiting.app.busy,true);assert.equal(waiting.expertSafety.pending,true);await waiting.click('crusher-mode:1',{crusherEpoch:waiting.modal.presentationEpoch});assert.notEqual(waiting.app.battle.crusherEnabled,true);await waiting.finish();await pending;
});
test('crusher actual menu, cursor and J/E handlers build readiness then emit one target-centred payoff with unchanged save fields',async()=>{
 // Stationary synthetic enemies isolate real production input/frame/checkpoint
 // wiring. This is handler evidence, not normal-input native browser QA.
 const h=await ui({poeMode:'wasd',skills:['judgement']});h.key('Escape');await h.frame();await h.click('crusher-menu');await h.frame();
 await h.click('crusher-mode:1',{crusherEpoch:h.modal.presentationEpoch});await h.frame();
 const b=h.app.battle,{mapFromRegion}=await import('../src/world-geometry.js'),{projectWorld,ISO}=await import('../src/visual.js');
 b.map=mapFromRegion({w:80,h:80});b.awaitingAdvance=false;
 const target={id:'crusher-handler-target',kind:'scout',type:'guardian',x:b.p.x+50,y:b.p.y,hp:1000,max:1000,active:true,state:'idle',timer:0,stun:20,angle:Math.PI};
 const neighbor={...target,id:'crusher-handler-neighbor',x:target.x+80,y:target.y+60};b.enemies=[target,neighbor];
 const d=projectWorld(target.x-b.p.x,target.y-b.p.y);h.ch.pointermove({clientX:500+d.x*ISO.zoom,clientY:385+(d.y-23)*ISO.zoom});
 assert.equal(h.app.sampledCombatInput().aimBySkill.judgement.targetId,target.id);
 h.key('KeyJ');assert.equal(b.p.action?.id,'mace_swing',JSON.stringify({paused:h.app.paused,enabled:b.crusherEnabled,p:b.p,toasts:h.toasts}));for(let i=0;i<200&&!target.primedForStun;i++)await h.frame();h.up('KeyJ');
 assert.equal(target.stunBuildup,2,JSON.stringify({p:b.p,target,events:b.events,toasts:h.toasts,gate:h.gate.blocked,busy:h.app.busy,paused:h.app.paused}));assert.equal(target.primedForStun,true);assert.equal(neighbor.stunBuildup,undefined);
 for(let i=0;i<100&&(b.p.action||b.p.recoveryLock>0);i++)await h.frame();
 const mana=b.p.mana;h.key('KeyE');h.up('KeyE');assert.equal(b.p.action?.id,'judgement');assert.equal(b.p.mana,mana-b.p.action.spec.manaCost);
 const events=[];for(let i=0;i<120;i++){await h.frame();events.push(...b.events);if(!b.p.action&&events.some(e=>e.type==='crusherShockwave'))break;}
 const waves=events.filter(e=>e.type==='crusherShockwave');assert.equal(waves.length,1);assert.equal(waves[0].id,target.id);assert.equal(waves[0].x,target.x);assert.equal(waves[0].y,target.y);assert.deepEqual(waves[0].hitIds,[neighbor.id]);
 assert.equal(events.filter(e=>e.type==='enemyHit'&&e.id===target.id).length,1);assert.equal(target.primedForStun,false);assert.equal(target.stunBuildup,0);assert.ok(neighbor.hp<1000);
 assert.equal(h.gate.blocked,false);assert.doesNotMatch(JSON.stringify(h.store.load().state),/crusherEnabled|stunBuildup|primedForStun|heavyStunned/);
});
test('storm actual focus/menu selection preserves controls and saved fields; region carries only mode and reload resets it',async()=>{
 const h=await ui({poeMode:'wasd',skills:['judgement']});h.key('Escape');await h.frame();h.dh.focusin({target:{tagName:'BUTTON',dataset:{action:'storm-menu'}}});await h.click('storm-menu');assert.match(h.modal.innerHTML,/Combo4/);assert.match(h.modal.innerHTML,/실제 봉 아이템·양손 장착은 추가하지 않습니다/);const epoch=h.modal.presentationEpoch,before=structuredClone(h.store.load());
 h.dh.focusin({target:{tagName:'BUTTON',dataset:{action:'storm-mode:1'}}});await h.click('storm-mode:1',{stormEpoch:epoch});assert.equal(h.app.battle.stormEnabled,true);assert.equal(h.app.battle.crusherEnabled,false);assert.equal(h.modal.hidden,true);assert.deepEqual(h.store.load(),before);assert.match(h.buttons.attack.innerHTML,/봉 연격/);assert.match(h.buttons.judgement.innerHTML,/종 설치/);
 const b=h.app.battle,portal=imports.getRegion(b.region).portals.find(p=>p.id==='road');Object.assign(b.p,{x:portal.x,y:portal.y});assert.equal(await h.app.dispatch({type:'travel',to:portal.to,portalId:portal.id,...h.app.report()},{rebuild:true}),true);assert.equal(h.app.battle.stormEnabled,true);assert.equal(h.app.battle.storm.combo,0);assert.deepEqual(h.app.battle.storm.bells,[]);assert.doesNotMatch(JSON.stringify(h.store.load().state),/"(?:stormEnabled|stormPose|storm|bells|combo|powerCharges)":/);
 h.key('Escape');await h.frame();await h.click('reload');assert.equal(h.app.battle.stormEnabled,undefined);
});
test('storm menu leaves genuine learning/control prerequisites and stale/field/busy safety guards',async()=>{
 const h=await ui();h.key('Escape');await h.frame();await h.click('storm-menu');assert.match(h.modal.innerHTML,/기본 훈련과 단죄의 일격을 배워야/);await h.click('storm-mode:1',{stormEpoch:h.modal.presentationEpoch});assert.notEqual(h.app.battle.stormEnabled,true);
 const classic=await ui({skills:['judgement']});classic.key('Escape');await classic.frame();await classic.click('storm-menu');assert.match(classic.modal.innerHTML,/키 설정에서 PoE형 조작을 선택/);
 const p=await ui({poeMode:'wasd',skills:['judgement']});p.key('Escape');await p.frame();await p.click('storm-menu');await p.click('storm-mode:1',{stormEpoch:p.modal.presentationEpoch-1});assert.notEqual(p.app.battle.stormEnabled,true);p.app.battle.region='ember_road';await p.click('storm-mode:1',{stormEpoch:p.modal.presentationEpoch});assert.notEqual(p.app.battle.stormEnabled,true);
});
test('storm real cursor/J/E/Q handlers earn enemy Combo, place and strike a separate bell, then timed queued charge consumes it without saved-state leakage',async()=>{
 // Synthetic stationary enemies isolate production input/save wiring; no
 // native gameplay, visual/audio acceptance or injected progression claim.
 const h=await ui({poeMode:'wasd',skills:['judgement']});h.key('Escape');await h.frame();await h.click('storm-menu');await h.click('storm-mode:1',{stormEpoch:h.modal.presentationEpoch});await h.frame();
 const b=h.app.battle,{mapFromRegion}=await import('../src/world-geometry.js'),{projectWorld,ISO}=await import('../src/visual.js');b.map=mapFromRegion({w:80,h:80});b.awaitingAdvance=false;
 const e={id:'storm-handler-target',kind:'scout',type:'guardian',x:b.p.x+50,y:b.p.y,hp:10000,max:10000,active:true,state:'idle',timer:0,stun:100,angle:Math.PI};b.enemies=[e];
 const point=(world,height=23)=>{const d=projectWorld(world.x-b.p.x,world.y-b.p.y);h.ch.pointermove({clientX:500+d.x*ISO.zoom,clientY:385+(d.y-height)*ISO.zoom});};point(e);h.key('KeyJ');for(let i=0;i<240&&b.storm.combo<4;i++)await h.frame();h.up('KeyJ');assert.equal(b.storm.combo,4);for(let i=0;i<100&&b.p.action;i++)await h.frame();
 const loc={x:b.p.x+60,y:b.p.y+60};point(loc,0);const mana=b.p.mana;h.key('KeyE');h.up('KeyE');assert.equal(b.storm.bells.length,1);assert.equal(b.storm.combo,0);assert.equal(b.p.mana,mana-b.stats.actions.judgement.manaCost);for(let i=0;i<100&&b.p.action;i++)await h.frame();
 const bell=b.storm.bells[0];point(bell);assert.equal(h.app.sampledCombatInput().aimBySkill.mace_swing.bellId,bell.id);h.key('KeyJ');h.up('KeyJ');const events=[];for(let i=0;i<100&&b.p.action?.stormContacts<2;i++){await h.frame();events.push(...b.events);}assert.equal(b.storm.combo,0);assert.equal(events.filter(x=>x.type==='stormBellWave').length,1);assert.ok(h.rendered.at(-1).stormBells.includes(bell));
 h.key('KeyQ');h.up('KeyQ');assert.equal(b.skillIntent?.id,'shield_charge');for(let i=0;i<140;i++){await h.frame();events.push(...b.events);}assert.equal(events.filter(x=>x.type==='stormBellExploded').length,1);assert.equal(bell.active,false);assert.equal(h.gate.blocked,false);assert.doesNotMatch(JSON.stringify(h.store.load().state),/"(?:stormEnabled|stormPose|storm|bells|combo|powerCharges)":/);
});
test('magma actual focused menu selection preserves stored fields and keeps region/reload boundaries',async()=>{
 const h=await ui({poeMode:'wasd'});h.key('Escape');await h.frame();h.dh.focusin({target:{tagName:'BUTTON',dataset:{action:'magma-menu'}}});await h.click('magma-menu');assert.match(h.modal.innerHTML,/완전 무적이 아닙니다/);const before=structuredClone(h.store.load()),epoch=h.modal.presentationEpoch;
 h.dh.focusin({target:{tagName:'BUTTON',dataset:{action:'magma-mode:1'}}});await h.click('magma-mode:1',{magmaEpoch:epoch});assert.equal(h.app.battle.magmaEnabled,true);assert.deepEqual(h.store.load(),before);assert.match(h.buttons.block.innerHTML,/화염 방패/);assert.equal(h.app.battle.stormEnabled,undefined);assert.equal(h.app.battle.crusherEnabled,false);
 const b=h.app.battle,portal=imports.getRegion(b.region).portals.find(x=>x.id==='road');Object.assign(b.p,{x:portal.x,y:portal.y});assert.equal(await h.app.dispatch({type:'travel',to:portal.to,portalId:portal.id,...h.app.report()},{rebuild:true}),true);assert.equal(h.app.battle.magmaEnabled,true);assert.equal(h.app.battle.magma.charge,0);assert.equal(h.app.battle.magma.token,null);assert.doesNotMatch(JSON.stringify(h.store.load().state),/"(?:magma|magmaPose|magmaCharge|magmaEnabled|magmaImpact)":/);
 h.key('Escape');await h.frame();await h.click('reload');assert.equal(h.app.battle.magmaEnabled,undefined);
});
async function magmaUi(){const h=await ui({poeMode:'wasd'});h.key('Escape');await h.frame();await h.click('magma-menu');await h.click('magma-mode:1',{magmaEpoch:h.modal.presentationEpoch});await h.frame();const b=h.app.battle,{mapFromRegion}=await import('../src/world-geometry.js'),{projectWorld,ISO}=await import('../src/visual.js');b.map=mapFromRegion({w:80,h:80});b.awaitingAdvance=false;
 b.enemies=[{id:'magma-handler-foe',kind:'scout',type:'guardian',x:b.p.x+50,y:b.p.y,hp:10000,max:10000,active:true,state:'idle',timer:0,stun:100,angle:Math.PI}];const d=projectWorld(50,0);h.ch.pointermove({clientX:500+d.x*ISO.zoom,clientY:385+(d.y-23)*ISO.zoom});h.key('KeyB');for(let i=0;i<190;i++)await h.frame();return h;}
function magmaShot(h){const b=h.app.battle;b.shots.push({kind:'arrow',enemy:true,x:b.p.x+12,y:b.p.y,vx:-100,vy:0,life:1,damage:20,damageType:'fire',attackerId:b.enemies[0].id,attackId:900,attackFamily:'weapon'});}
test('magma actual B hold/incoming projectile/B release gives one spray and shield Bash through production save/frame handlers',async()=>{
 const h=await magmaUi(),b=h.app.battle;assert.equal(b.p.block,true);assert.ok(b.magma.charge>=3-1e-9);const mana=b.p.mana,stamina=b.p.stamina;magmaShot(h);await h.frame();assert.equal(b.events.filter(x=>x.type==='magmaActiveBlock').length,1);assert.equal(b.events.filter(x=>x.type==='magmaSpray').length,1);assert.equal(b.p.stamina,stamina-b.stats.actions.shield_block.staminaCost);assert.ok(b.magma.token);h.up('KeyB');assert.equal(b.p.action?.magmaBash,true);const events=[];for(let i=0;i<70&&b.p.action;i++){await h.frame();events.push(...b.events);}assert.equal(events.filter(x=>x.type==='magmaShieldBash').length,1);assert.equal(b.magma.token,null);assert.equal(b.p.mana,mana);assert.equal(h.gate.blocked,false);assert.doesNotMatch(JSON.stringify(h.store.load().state),/"(?:magma|magmaPose|magmaCharge|magmaEnabled|magmaImpact)":/);
});
for(const reason of ['blur','visibility','focusin','pointercancel'])test(`magma actual ${reason} clears pending defence before later physical release`,async()=>{
 const h=await magmaUi(),b=h.app.battle;magmaShot(h);await h.frame();assert.ok(b.magma.token);if(reason==='blur')h.wh.blur();if(reason==='visibility'){h.document.hidden=true;h.dh.visibilitychange();}if(reason==='focusin')h.dh.focusin({target:{tagName:'BUTTON'}});if(reason==='pointercancel')h.ch.pointercancel();await h.frame();assert.equal(b.magma.token,null);assert.equal(b.magma.raised,false);assert.equal(b.p.block,false);assert.ok(b.magma.charge<.05);h.up('KeyB');await h.frame();assert.equal(b.p.action?.magmaBash,undefined);assert.equal(b.events.some(x=>x.type==='magmaBashStarted'),false);
});
test('magma menu respects hold-control, stale-epoch and field selection requirements',async()=>{
 const classic=await ui();classic.key('Escape');await classic.frame();await classic.click('magma-menu');assert.match(classic.modal.innerHTML,/PoE형 조작과 방패 누름 유지/);
 const h=await ui({poeMode:'wasd'});h.key('Escape');await h.frame();await h.click('magma-menu');await h.click('magma-mode:1',{magmaEpoch:h.modal.presentationEpoch-1});assert.notEqual(h.app.battle.magmaEnabled,true);h.app.battle.region='ember_road';await h.click('magma-mode:1',{magmaEpoch:h.modal.presentationEpoch});assert.notEqual(h.app.battle.magmaEnabled,true);
});

test('actual safety resume explains fresh press and never rearms previously held shield',async()=>{
 const h=await magmaUi(),b=h.app.battle;assert.equal(b.p.block,true);await h.frame(.501);assert.match(h.modal.innerHTML,/누르고 있던 키·버튼을 먼저 놓고 다시 눌러/);assert.match(h.modal.innerHTML,/방패도 새로 눌러야/);await next();await h.frame();assert.equal(b.p.block,false);await h.click('close');await h.frame();assert.equal(b.p.block,false);assert.equal(b.magma.token,null);h.up('KeyB');h.key('KeyB');await h.frame();assert.equal(b.p.block,true);
});

// Production pad pointer handlers, router, locomotion and frame; DOM boundary
// only is a probe. Native touch-emulated browser evidence is documented apart.
for(const mode of ['wasd','click'])for(const direction of ['up','left','down','right'])test(`touch pad ${mode}/${direction} pointerdown/frame/pointerup moves then stops`,async()=>{
 const h=await ui({poeMode:mode}),b=h.app.battle,controls=structuredClone(h.app.state.options.controls),start={x:b.p.x,y:b.p.y},pad=h.moves[direction];
 pad.handlers.pointerdown({preventDefault(){},pointerId:7});const routed=h.app.sampledCombatInput().move;
 for(let i=0;i<6;i++)await h.frame(1/30);
 const moved=Math.hypot(b.p.x-start.x,b.p.y-start.y);pad.handlers.pointerup();const at={x:b.p.x,y:b.p.y};
 for(let i=0;i<6;i++)await h.frame(1/30);
 console.log(JSON.stringify({case:'touch-pad',mode,direction,routed,moved,afterRelease:Math.hypot(b.p.x-at.x,b.p.y-at.y)}));
 assert.ok(moved>1);assert.ok((b.p.x-start.x)*routed.x+(b.p.y-start.y)*routed.y>0);
 assert.equal(Math.hypot(b.p.x-at.x,b.p.y-at.y),0);assert.deepEqual(h.app.state.options.controls,controls);
});
for(const ending of ['pointercancel','lostpointercapture'])test(`touch pad click ${ending} clears movement without a stuck direction`,async()=>{
 const h=await ui({poeMode:'click'}),b=h.app.battle,pad=h.moves.down,start={x:b.p.x,y:b.p.y};pad.handlers.pointerdown({preventDefault(){},pointerId:8});await h.frame(.05);
 assert.ok(Math.hypot(b.p.x-start.x,b.p.y-start.y)>1);pad.handlers[ending]();const at={x:b.p.x,y:b.p.y};for(let i=0;i<8;i++)await h.frame();assert.deepEqual({x:b.p.x,y:b.p.y},at);
});
test('touch pad click ignores keyboard walking even when it opposes the touched direction',async()=>{
 const h=await ui({poeMode:'click'}),b=h.app.battle,start={x:b.p.x,y:b.p.y};h.key('KeyW');await h.frame(.05);assert.deepEqual({x:b.p.x,y:b.p.y},start);
 h.moves.down.handlers.pointerdown({preventDefault(){},pointerId:9});await h.frame(.05);assert.ok(b.p.x>start.x&&b.p.y>start.y);
 h.moves.down.handlers.pointerup();const at={x:b.p.x,y:b.p.y};await h.frame(.05);assert.deepEqual({x:b.p.x,y:b.p.y},at);h.up('KeyW');
});
test('touch pad click replaces old ground destination, release stops, and a fresh click still walks',async()=>{
 const h=await ui({poeMode:'click'}),b=h.app.battle;h.ch.mousedown({button:0,clientX:580,clientY:385,preventDefault(){}});h.wh.mouseup({button:0});assert.ok(h.app.sampledCombatInput().moveTarget);
 h.moves.down.handlers.pointerdown({preventDefault(){},pointerId:10});assert.equal(h.app.sampledCombatInput().moveTarget,undefined);await h.frame(.05);h.moves.down.handlers.pointerup();const at={x:b.p.x,y:b.p.y};for(let i=0;i<10;i++)await h.frame();assert.deepEqual({x:b.p.x,y:b.p.y},at);
 h.ch.mousedown({button:0,clientX:580,clientY:385,preventDefault(){}});h.wh.mouseup({button:0});assert.ok(h.app.sampledCombatInput().moveTarget);await h.frame(.05);assert.ok(Math.hypot(b.p.x-at.x,b.p.y-at.y)>1);
});
test('touch pad cancels old NPC approach so it cannot open after touch release',async()=>{
 const h=await contextUi(),trainer=h.app.interactionCandidates().find(o=>o.id==='trainer');clickContextLabel(h,trainer);assert.equal(h.app.contextClick.active,true);
 h.moves.down.handlers.pointerdown({preventDefault(){},pointerId:11});assert.equal(h.app.contextClick.active,false);await h.frame(.05);h.moves.down.handlers.pointerup();const at={x:h.app.battle.p.x,y:h.app.battle.p.y};for(let i=0;i<20;i++)await h.frame();assert.equal(h.modal.hidden,true);assert.deepEqual({x:h.app.battle.p.x,y:h.app.battle.p.y},at);
});
test('touch pad menu clears held movement and ignores paused pointerdown until a fresh press',async()=>{
 const h=await ui({poeMode:'click'}),b=h.app.battle,pad=h.moves.down;pad.handlers.pointerdown({preventDefault(){},pointerId:12});await h.frame(.05);h.key('Escape');await next();const at={x:b.p.x,y:b.p.y};pad.handlers.pointerdown({preventDefault(){},pointerId:13});h.app.closePanel();for(let i=0;i<8;i++)await h.frame();assert.deepEqual({x:b.p.x,y:b.p.y},at);
 pad.handlers.pointerdown({preventDefault(){},pointerId:14});await h.frame(.05);assert.ok(Math.hypot(b.p.x-at.x,b.p.y-at.y)>1);pad.handlers.pointerup();
});
test('touch pad controls5 click movement keeps the exact saved binding and skill-slot settings',async()=>{
 const h=await ui({poeMode:'click'}),controls=imports.enableSkillLoadout(h.app.state.options.controls,{skills:h.app.state.character.skills,actionSlots:h.app.state.actionSlots});assert.equal(await h.app.dispatch({type:'setControls',controls}),true);
 const before=structuredClone(h.app.state.options.controls),b=h.app.battle,at={x:b.p.x,y:b.p.y};h.moves.down.handlers.pointerdown({preventDefault(){},pointerId:15});await h.frame(.05);h.moves.down.handlers.pointerup();assert.ok(Math.hypot(b.p.x-at.x,b.p.y-at.y)>1);assert.deepEqual(h.app.state.options.controls,before);assert.deepEqual(h.store.load().state.options.controls,before);
});
