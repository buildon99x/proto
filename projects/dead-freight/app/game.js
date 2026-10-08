'use strict';
(()=>{
const $=id=>document.getElementById(id),T=globalThis.THREE;
const canvas=$('game');let renderer;
try{
 renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.autoClear=false;
}catch(error){
 // Stop before creating a mission, sound engine, gameplay listeners or RAF chain.
 try{renderer?.dispose();}catch(e){/* Cleanup must not hide the recovery action. */}
 $('overlay').dataset.startup='unavailable';
 $('startup-status').textContent='3D 렌더러 시작 실패 · 플레이 불가';
 $('startup-status').hidden=false;
 $('description').textContent='이 브라우저 세션에서 3D 렌더러(WebGL)를 시작하지 못해 게임을 실행할 수 없습니다. 새로고침하여 다시 시도하세요. 계속 실패하면 WebGL을 지원하는 다른 데스크톱 브라우저에서 열거나 브라우저의 그래픽 가속 설정을 확인하세요.';
 for(const id of ['game','hud','damage','controls','options','start','restart','fullscreen','mission-guide','save-panel','deployment-label','inventory-open','quickbar','inventory-overlay'])$(id).hidden=true;
 $('start').disabled=true;$('restart').disabled=true;
 $('retry').hidden=false;$('retry').onclick=()=>window.location.reload();
 console.error('DEAD FREIGHT: 3D renderer initialization failed.',error);
 return;
}
const scene=new T.Scene();scene.background=new T.Color('#0d1521');scene.fog=new T.FogExp2('#1c2a38',.0075);
const cam=new T.PerspectiveCamera(78,1,.06,440);cam.rotation.order='YXZ';
// Stylized low-level bounce keeps silhouettes readable; there is no direct sunlight.
scene.add(new T.HemisphereLight('#778ca6','#111b25',.65));const nightFill=new T.DirectionalLight('#8099b9',.48);nightFill.position.set(-15,40,20);scene.add(nightFill);
const gunScene=new T.Scene(),gunCam=new T.PerspectiveCamera(62,1,.01,10);gunScene.add(new T.HemisphereLight('#a8b9cb','#101724',.60));let gl=new T.DirectionalLight('#dce7f0',2.5);gl.position.set(-1.3,2.2,1.5);gl.castShadow=true;gl.shadow.mapSize.set(1024,1024);Object.assign(gl.shadow.camera,{left:-1.1,right:1.1,top:1.1,bottom:-1.1,near:.1,far:6});gl.shadow.camera.updateProjectionMatrix();gl.shadow.bias=-.00012;gl.shadow.normalBias=.003;gl.shadow.radius=1.5;gl.target.position.set(0,-.22,-.85);gunScene.add(gl,gl.target);
let world,level=1,totalCash=0,state='title',yaw=0,pitch=0,clock=0,shake=0,recoil=0,flash=0,flashPending=false,damageFlash=0,msgTime=0,msg='',bob=0,mouseHeld=false,aimDown=false,muted=false,wallMeshes=[],enemyMeshes=[],itemMeshes=[],debris=[],decals=[],dynamic=new T.Group();scene.add(dynamic);
const save=DFStashProfile.create({getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)});
level=save.snapshot().nextLevel;totalCash=save.snapshot().bank;
const runClock=new DFRunClock.RunClock();runClock.reset(performance.now());let lastResult=null,carry=null,gear=null,prepared=null,raidId=null,bagOpen=false,bagMode='raid',bagSelection=null,bagMessage='',pendingDeployment=null,pendingSettlement=null;
const INTRO_COPY='태양빛이 지표에 닿지 않는 영구적인 밤. 작업등과 M 지도를 따라 중계소 표적을 찾아 증표를 회수하고, 탈출 지점에서 E로 신호를 보내세요.';
const motion=DFMotion.create();let sound=DeadFreightAudio.create();let presentation=motion.step(0);const pendingImpacts=[];
const casings=[];let viewEye=1.62,ads=0,reloadPhase=-1,swayX=0,swayY=0,cycleTime=0,cycleDuration=.19,hitPause=0,hitMarker=0;let keys={},firstStart=true,gunGroup=new T.Group();gunScene.add(gunGroup);let hammer,gunCylinder,muzzle;
const grenadeMeshes=new Map();
const geo=new T.BoxGeometry(1,1,1),sphereGeo=new T.IcosahedronGeometry(1,1);
const colors={boundary:[40,45,53],rock:[90,98,111],wood:[69,73,83],trunk:[34,39,49],concrete:[148,156,143],brick:[116,71,53],steel:[46,65,65],red:[91,18,28],gold:[169,137,57],crate:[102,78,46],plaster:[156,145,112],floor:[92,102,91]};
const mats={};
function texture(kind){const n=64,d=new Uint8Array(n*n*4),c=colors[kind];let seed=31;for(let y=0;y<n;y++)for(let x=0;x<n;x++){seed=(seed*1664525+1013904223)>>>0;let v=(seed/4294967296-.5)*30;let line=false;
 if(kind==='brick')line=y%16<2||(x+(Math.floor(y/16)%2)*16)%32<2;
 else if(kind==='steel')line=x%8<2||y%32<2;
 else if(kind==='red')v+=Math.sin(x*.8)*Math.sin(y*.8)*13;
 else if(kind==='crate')line=x<4||x>59||y<4||y>59||Math.abs(x-y)<3;
 else if(kind==='floor')line=x%32<2||y%32<2;
 else line=y%32<2||x%32<1;
 let i=(y*n+x)*4;for(let k=0;k<3;k++)d[i+k]=HC.clamp(c[k]+v-(line?40:0),0,255);d[i+3]=255;}
 let tex=new T.DataTexture(d,n,n,T.RGBAFormat);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=tex.minFilter=T.NearestFilter;tex.needsUpdate=true;return tex;}
for(let key in colors)mats[key]=new T.MeshLambertMaterial({map:texture(key)});
const mat=(c)=>new T.MeshLambertMaterial({color:c});const black=mat('#151c21'),metal=mat('#d8dddf'),darkmetal=mat('#394246'),gold=mat('#c0c6ce'),leather=mat('#3b231b'),skin=mat('#171d27'),red=mat('#8b2434');
function box(x,y,z,w,h,d,m,parent=dynamic){let o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;}
function cylinder(x,y,z,r,h,m,parent=dynamic,sides=10){let o=new T.Mesh(new T.CylinderGeometry(r,r,h,sides),m);o.position.set(x,y,z);parent.add(o);return o;}
function orb(x,y,z,r,m,parent=dynamic){let o=new T.Mesh(sphereGeo,m);o.position.set(x,y,z);o.scale.setScalar(r);parent.add(o);return o;}
function sign(text,x,y,z,w,color='#b8ded6',rotation=0){let c=document.createElement('canvas');c.width=512;c.height=96;let ctx=c.getContext('2d');ctx.fillStyle='#182829';ctx.fillRect(0,0,512,96);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.strokeRect(5,5,502,86);ctx.font='bold 43px monospace';ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,256,63);let t=new T.CanvasTexture(c);t.magFilter=T.NearestFilter;let o=new T.Mesh(new T.PlaneGeometry(w,w*96/512),new T.MeshBasicMaterial({map:t,side:T.DoubleSide}));o.position.set(x,y,z);o.rotation.y=rotation;dynamic.add(o);return o;}
function enemyModel(e){let g=new T.Group(),coat=mat(e.boss?'#a9afb5':'#acb7bf');let torso=box(0,1.12,0,.58,.8,.35,coat,g);box(0,.71,0,.58,.13,.4,leather,g);box(0,.71,-.22,.14,.12,.04,gold,g);let head=orb(0,1.83,0,.24,skin,g);box(0,1.87,-.205,.32,.06,.05,black,g);box(0,1.71,-.2,.22,.1,.06,leather,g);cylinder(0,2.05,0,.38,.05,black,g);cylinder(0,2.15,0,.23,.2,black,g);
 let legs=[];for(let s of [-1,1]){let l=new T.Group();l.position.set(s*.18,.74,0);box(0,-.29,0,.21,.57,.24,black,l);box(0,-.64,-.06,.24,.16,.38,leather,l);g.add(l);legs.push(l);let arm=box(s*.43,1.19,-.12,.2,.58,.22,coat,g);arm.rotation.x=-.6;orb(s*.4,1.02,-.35,.13,skin,g);}box(.24,1.2,-.53,.16,.16,.63,darkmetal,g);box(.24,1.31,-.77,.04,.08,.03,metal,g);if(e.boss){box(0,1.27,-.19,.4,.5,.08,gold,g);g.scale.setScalar(1.18);}let warning=orb(.24,1.34,-.82,.12,new T.MeshBasicMaterial({color:'#ead8d4'}),g);warning.visible=false;g.userData={enemy:e,head,legs,warning,coat};dynamic.add(g);return g;}
function weaponModel(){const previous=gunGroup.userData.model;if(previous){const geometries=new Set(),materials=new Set();previous.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}gunGroup.clear();const g=DFWeapon.create(T,world?.weapon||0,{suppressed:$('suppressor').checked,laser:$('laser').checked});gunGroup.add(g);hammer=g.userData.hammer;gunCylinder=null;muzzle=g.userData.muzzle;gunGroup.userData.model=g;}

function build(){grenadeMeshes.clear();const persistent=new Set([...Object.values(mats),black,metal,darkmetal,gold,leather,skin,red]);const geometries=new Set(),materials=new Set(),textures=new Set();dynamic.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&o.geometry!==geo&&o.geometry!==sphereGeo)geometries.add(o.geometry);if(o.material&&!persistent.has(o.material))materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const key of ['map','normalMap','roughnessMap'])if(m[key])textures.add(m[key]);m.dispose();});textures.forEach(t=>t.dispose());while(dynamic.children.length)dynamic.remove(dynamic.children[0]);wallMeshes=[];enemyMeshes=[];itemMeshes=[];debris=[];decals=[];
 const environment=DFWorldView.build({T,parent:dynamic,world});wallMeshes=environment.wallMeshes;
 world.enemies.forEach(e=>enemyMeshes.push(enemyModel(e)));syncItems();weaponModel();
}

function syncItems(){world.pickups.forEach((it,i)=>{if(itemMeshes[i])return;let g=new T.Group();g.position.set(it.x,it.y||0,it.z);if(it.type==='barrel'){cylinder(0,.72,0,.55,1.4,mats.red,g,12);for(let y of [.2,1.17])cylinder(0,y,0,.565,.09,black,g,12);box(0,.77,.56,.5,.43,.015,gold,g);}else if((it.type==='bounty'||it.stack?.itemId==='bounty')){orb(0,.65,0,.3,gold,g);cylinder(0,.35,0,.36,.09,black,g);let light=new T.PointLight('#bbc8d9',4,5);g.add(light);}else{box(0,.38,0,.7,.5,.6,it.type==='health'?mat('#ddd9c6'):it.type==='cargo'?mats.crate:mat('#586674'),g);if(it.type==='health'){box(0,.64,0,.1,.01,.37,red,g);box(0,.64,0,.38,.01,.1,red,g);}else{box(0,.65,0,.5,.015,.38,gold,g);if(it.type==='cargo'){box(0,.39,0,.12,.54,.64,darkmetal,g);box(0,.39,0,.73,.54,.08,darkmetal,g);}}}g.userData={kind:it.type==='barrel'?'barrel':'item',id:i};dynamic.add(g);itemMeshes[i]=g;});}
function resetPresentation(){world?.clearFireInput('reset');sound.stopAll();motion.reset();pendingImpacts.length=0;keys={};mouseHeld=false;aimDown=false;ads=0;recoil=0;shake=0;flash=0;flashPending=false;damageFlash=0;hitPause=0;hitMarker=0;swayX=0;swayY=0;cycleTime=0;viewEye=1.62;reloadPhase=-1;for(let c of casings){(c.parent||gunScene).remove(c.mesh);c.mesh.geometry.dispose();c.mesh.material.dispose();}casings.length=0;}
function createMission(){const mission=new HC.Mission(level,Number($('difficulty').value));const selected=Number($('loadout').value);mission.switchWeapon(Number.isFinite(selected)?selected:3);mission.cooldown=0;mission.activeTime=0;mission.startingWeapon=mission.weapon;carry=arguments[0]||DFInventory.starter(mission.weapon);gear=new DFInventoryGame.Bridge(mission,carry);return mission;}
function formatTime(seconds){const n=Math.max(0,Math.floor(seconds||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
function flushSettlement(){if(!pendingSettlement)return true;if(save.snapshot().pending)return false;const r=pendingSettlement,result=save.settle(r.raidId,r.win,r.carry,r.cash,r.nextLevel);if(result.ok){pendingSettlement=null;raidId=null;}return result.ok;}
function persistenceUI(){
 const saved=save.snapshot();totalCash=saved.bank;
 let text=saved.known?'보관 '+totalCash+' · 장비 보관함 '+saved.stash.length+' 묶음. 회수 물품은 자동 판매되지 않습니다.':'기존 보관 기록을 읽지 못했습니다. 기존 데이터는 변경하지 않습니다.';
 if(saved.interrupted)text+=' 중단된 원정이 있습니다. 정리하면 보호 포켓만 회수하고 나머지 휴대 장비는 잃습니다.';
 if(saved.status==='stale-state')text+=' 다른 창에서 기록이 변경되어 이 화면의 저장을 중지했습니다. 새로고침하면 미저장 회수품은 사라지고 마지막 저장 보호 포켓만 복구할 수 있습니다. 기존 보관 기록은 덮어쓰지 않습니다.';else if(saved.pending||pendingSettlement)text+=' 저장 대기 · 창을 닫거나 새로고침하기 전에 저장 재시도를 눌러 주세요. 미저장 회수품은 이 화면에만 남아 있습니다.';
 else if(saved.status!=='ready'&&!saved.interrupted)text+=' 저장 확인 실패 · 재시도가 필요합니다.';
 $('save-status').textContent=text;$('save-retry').hidden=saved.status==='ready'&&!pendingSettlement;
 $('save-retry').textContent=saved.pendingKind==='deploy'?'출격 준비 저장 재시도':'저장 재시도';$('recover-run').hidden=!saved.interrupted;
 $('start').disabled=!!(saved.pending||saved.interrupted||pendingSettlement||!saved.known||saved.status!=='ready'||state==='paused'&&raidId&&saved.activeRaid?.id!==raidId);
 if(lastResult){const r=lastResult;$('stats').textContent=(r.win?'회수 완료 · 장비 '+r.items+' 묶음 · 현상금 +'+r.cash+' · '+(saved.pending||pendingSettlement?'저장 대기':'저장됨'):'회수 실패 · 화물 손실 '+r.cash+' · 보호 포켓만 보존')+' · '+formatTime(r.time)+' · '+r.kills+' 처치 · '+r.accuracy+'% 명중';}
}
function bagState(){return bagMode==='raid'?carry:(prepared||(prepared=DFInventory.starter(Number($('loadout').value))));}
function renderBag(){const saved=save.snapshot();$('inventory-content').innerHTML=DFInventoryUI.render({inventory:bagState(),stash:saved.stash,mode:bagMode,selected:bagSelection,activeSlot:gear?.activeSlot||0,message:bagMessage,canDeploy:saved.known&&saved.status==='ready'&&!saved.pending&&!saved.interrupted&&!pendingSettlement});$('inventory-content').querySelector?.('.inv-slot.selected, .inv-actions button, button:not([disabled])')?.focus();}
function openBag(){if(bagOpen)return;bagMode=state==='playing'||state==='paused'?'raid':'prepare';if(state==='playing')pause();if(bagMode==='raid')gear.syncFromWorld();bagOpen=true;bagSelection=null;bagMessage='';$('overlay').style.display='none';$('inventory-overlay').hidden=false;$('quickbar').hidden=true;renderBag();}
function closeBag(resume=true){if(!bagOpen)return;bagOpen=false;$('inventory-overlay').hidden=true;if(bagMode==='raid'&&resume&&save.snapshot().status==='ready'&&!save.snapshot().pending&&!pendingSettlement)start();else $('overlay').style.display='grid';persistenceUI();}
function safeJournal(){if(!raidId||!gear)return true;const result=save.updateSafe(raidId,carry.get('safe'));if(!result.ok){if(state==='playing')pause();bagMessage='보호 포켓 저장이 완료되지 않았습니다. 저장 재시도 후 계속하세요.';persistenceUI();}return result.ok;}
function inventoryAction(action,location){
 if(action==='close'){closeBag();return;}if(action==='select'){const inv=bagState();if(!inv.get(location)&&bagSelection?.kind==='carry')return inventoryAction('move',location);bagSelection={kind:'carry',location};renderBag();return;}
 if(action==='select-stash'){bagSelection={kind:'stash',uid:location};renderBag();return;}
 if(save.snapshot().pending||pendingSettlement){bagMessage='저장 작업을 먼저 재시도해 주세요.';renderBag();return;}
 const inv=bagState();let result;
 if(action==='starter'){prepared=DFInventory.starter(Number($('loadout').value));bagSelection=null;bagMessage='기본 보급키트를 준비했습니다. 보관품은 유지됩니다.';renderBag();return;}
 if(action==='deploy'){closeBag(false);start(true);return;}
 if(action==='take-stash'){const item=save.snapshot().stash.find(x=>x.uid===location);result=item?inv.addStack(item):{ok:false,reason:'missing'};}
 else if(bagSelection?.kind==='carry'){
  const from=bagSelection.location;
  if(action==='to-bag'){location=Array.from({length:12},(_,i)=>'bag:'+i).find(p=>!inv.get(p));action='move';if(!location)result={ok:false,reason:'bag-full'};}
  if(!result&&action==='move')result=bagMode==='raid'?gear.move(from,location):inv.move(from,location);
  if(action==='drop'||action==='drop-one')result=bagMode==='raid'?gear.drop(from,{yaw,quantity:action==='drop-one'?1:undefined}):inv.remove(from);
  if(action==='use'&&bagMode==='raid')result=gear.use(from,{yaw,pitch});
 }
 if(result&&action==='use'&&bagMode==='raid'&&result.reason==='cooldown'){closeBag();tell('원정으로 복귀했습니다. 잠시 후 빠른 사용 키로 다시 시도하세요.',3);return;}
 if(result){bagMessage=result.message||(result.ok?'출격 준비를 변경했습니다.':({'bag-full':'가방 12칸이 모두 찼습니다.',overweight:'휴대 중량 30 kg을 초과합니다.','wrong-slot':'이 물품을 해당 슬롯에 놓을 수 없습니다.','duplicate-weapon':'같은 종류의 무기를 두 칸에 장착할 수 없습니다.','duplicate-uid':'이미 출격 준비에 포함된 물품입니다.'}[result.reason]||'장비를 옮길 수 없습니다.'));if(result.ok){bagSelection=null;if(bagMode==='raid'){safeJournal();weaponModel();if(action==='use'){closeBag();if(gear.scannerRemaining>0){$('minimap').style.display='block';$('maplegend').style.display='flex';}return;}}}}
 renderBag();
}
function deploymentUI(){const names=['권총','샷건','SMG','R-4 라이플'],difficulty=value=>value>=1.25?'HARDCORE':value<=.6?'관광객':'현상금 사냥꾼';
 $('deployment-label').textContent=state==='paused'?'현재 원정 '+level+' · '+names[world.weapon]+' · '+difficulty(world.difficulty)+' 유지. 아래 무기·난이도 선택은 새 원정에 적용됩니다.':'계약 '+(state==='won'?Math.max(level+1,save.snapshot().nextLevel):level)+' · 준비한 장비와 선택한 난이도로 출격합니다. 장비·보관함에서 변경할 수 있습니다. 기본 난이도는 HARDCORE이며 처음이라면 관광객을 선택할 수 있습니다.';
}
function launchDeployment(){const plan=pendingDeployment;if(!plan)return false;const saved=save.snapshot();if(!saved.activeRaid||saved.interrupted)return false;
 resetPresentation();level=plan.level;world=createMission(plan.inventory);raidId=saved.activeRaid.id;prepared=null;pendingDeployment=null;pendingSettlement=null;yaw=0;pitch=0;build();runClock.reset(performance.now());lastResult=null;return true;
}
function start(fresh=false){
 if(bagOpen)closeBag(false);const previousState=state,newAttempt=fresh||firstStart||!world||state==='dead'||state==='won';
 if(newAttempt){
  const saved=save.snapshot();if(saved.pending||saved.interrupted||pendingSettlement||!saved.known||saved.status!=='ready'){persistenceUI();return;}
  if(raidId&&saved.activeRaid){gear.syncFromWorld();pendingSettlement={raidId,win:false,carry:carry.snapshot(),cash:0,nextLevel:level};if(!flushSettlement()){persistenceUI();return;}}
  const nextLevel=state==='won'?Math.max(level+1,save.snapshot().nextLevel):Math.max(level,save.snapshot().nextLevel),inventory=prepared||DFInventory.starter(Number($('loadout').value));
  pendingDeployment={level:nextLevel,inventory};const deployed=save.deploy(inventory.snapshot());if(!deployed.ok){persistenceUI();return;}if(!launchDeployment()){persistenceUI();return;}
 }else{const saved=save.snapshot();if(saved.pending||pendingSettlement||saved.status!=='ready'||raidId&&saved.activeRaid?.id!==raidId){persistenceUI();return;}resetPresentation();}
 viewEye=Math.min(viewEye,world.player.bodyHeight-.08);world.setPaused(false);state='playing';runClock.setActive(true,performance.now());world.activeTime=runClock.elapsed;
 $('description').textContent=INTRO_COPY;$('stats').textContent='';$('overlay').style.display='none';$('quickbar').hidden=false;firstStart=false;
 document.activeElement?.blur?.();canvas.focus?.({preventScroll:true});
 sound.setMuted(!$('sound').checked);sound.resume();sound.preloadRifle?.();try{canvas.requestPointerLock()?.catch(()=>tell('마우스 잠금 불가: 화살표 키로 조준할 수 있습니다',5));}catch(e){tell('화살표 키로 조준할 수 있습니다',5);}
 tell(previousState==='paused'&&!fresh?'원정을 계속합니다.':'TAB 가방 · 1/2 무기 · 3–6 빠른 사용 · E 회수',6);
}
function pause(){if(state!=='playing')return;runClock.setActive(false,performance.now());world.activeTime=runClock.elapsed;state='paused';$('quickbar').hidden=true;world.setPaused(true);world.clearFireInput('pause');sound.suspend();keys={};mouseHeld=false;aimDown=false;document.exitPointerLock?.();$('overlay').style.display='grid';$('start').textContent='현재 원정 계속';$('inventory-open').textContent='가방·장비';$('restart').hidden=false;$('restart').textContent='새 원정 · 휴대 화물 포기';$('stats').textContent='';lastResult=null;
 $('description').textContent='일시정지 · 원정 시간 '+formatTime(world.activeTime)+'. '+(world.bounty?'증표를 확보했습니다. 탈출 지점으로 이동하세요.':world.enemies.some(e=>e.boss&&e.alive)?'중계소의 표적을 추적하세요.':'표적은 제거되었습니다. 증표를 회수하세요.')+' 계속하기는 현재 장비와 난이도를 유지합니다.';deploymentUI();persistenceUI();}
function end(win){if(state!=='playing')return;gear.syncFromWorld();$('quickbar').hidden=true;runClock.setActive(false,performance.now());world.activeTime=runClock.elapsed;resetPresentation();state=win?'won':'dead';sound.suspend();keys={};mouseHeld=false;document.exitPointerLock?.();$('overlay').style.display='grid';
 const bossAlive=world.enemies.some(e=>e.boss&&e.alive);
 $('description').textContent=win?'탈출 성공. 휴대 가치를 회수했습니다. 다음 계약은 같은 Black Pines 지역을 새로 시작하며 적·보급품·증표가 초기화됩니다.':(bossAlive?'계약 실패. 중계소 표적 제거 전에 사망했습니다.':world.bounty?'계약 실패. 증표를 확보했지만 탈출 전에 사망했습니다.':'계약 실패. 표적을 제거했지만 증표 회수·탈출을 마치지 못했습니다.')+' 휴대 화물은 잃고 기존 보관 기록은 유지됩니다.';
 lastResult={win,items:carry.all().filter(x=>x.stack.itemId!=='bounty').length,cash:world.cash,time:world.activeTime,kills:world.kills,style:world.style,accuracy:Math.round(world.hits/Math.max(1,world.shots)*100)};
 $('inventory-open').textContent='장비·보관함';$('start').textContent=win?'다음 계약 · 같은 지역':'같은 계약 재도전';$('restart').hidden=true;
 pendingSettlement={raidId,win,carry:carry.snapshot(),cash:world.cash,nextLevel:level+1};flushSettlement();deploymentUI();persistenceUI();
}
function tell(s,t=2.4){msg=s;msgTime=t;$('message').textContent=s;}
$('sound').onchange=()=>sound.setMuted(!$('sound').checked);
window.addEventListener('pagehide',()=>{pause();sound.destroy();});
window.addEventListener('pageshow',e=>{if(e.persisted){sound=DeadFreightAudio.create();sound.setMuted(!$('sound').checked);}});
const ray=new T.Raycaster();
function acousticEnvironment(){const p=world.player;for(const w of world.wallCandidates(p.x,p.z,p.x,p.z))if(Math.min(w.w,w.d)>=3.5&&(w.y||0)>p.y+p.bodyHeight+.1&&(w.y||0)<p.y+p.bodyHeight+6&&Math.abs(p.x-w.x)<w.w/2&&Math.abs(p.z-w.z)<w.d/2)return 'indoor';return 'outdoor';}
function fireWithAttachments(hit){const fired=world.fire(hit);gear?.syncFromWorld();if(fired){const shot=world.events.findLast(e=>e.type==='shot');if(shot){shot.suppressed=$('suppressor').checked;shot.environment=acousticEnvironment();}}return fired;}
function shoot(rifleShot=null){
 if(!gear?.canFire)return;if(world.weapon===3&&!rifleShot)return;
 if(state!=='playing'||world.player.hp<=0||world.extracted||(world.weapon!==3&&(world.reload>0||world.cooldown>1e-6||!world.cocked)))return;
 if(!world.ammo[world.weapon]){fireWithAttachments(null);return;}
 cam.updateMatrixWorld(true);scene.updateMatrixWorld(true);ray.setFromCamera(new T.Vector2(0,0),cam);if(rifleShot){ray.ray.direction.set(Math.tan(rifleShot.spread.x),Math.tan(rifleShot.spread.y),-1).normalize().applyQuaternion(cam.quaternion);ray.far=rifleShot.range||160;}else ray.far=Infinity;let targets=wallMeshes.filter((m,i)=>world.walls[i].alive).concat(enemyMeshes.filter((m,i)=>world.enemies[i].alive),itemMeshes.filter((m,i)=>world.pickups[i]?.alive&&world.pickups[i].type==='barrel'));
 let hits=ray.intersectObjects(targets,true),hit=null;
 if(hits.length){let h=hits[0],obj=h.object;while(!obj.userData.kind&&!obj.userData.enemy&&obj.parent)obj=obj.parent;
  if(obj.userData.enemy){let e=obj.userData.enemy;hit={kind:'enemy',id:e.id,head:h.point.y>(e.boss?1.95:1.58),part:h.point.y>(e.boss?1.95:1.58)?'head':h.point.y>.75?'torso':'limb',distance:h.distance};}else hit={kind:obj.userData.kind,id:obj.userData.id,distance:h.distance};
  if(fireWithAttachments(hit)){
   const impact=world.events.findLast(e=>e.type==='impact'&&e.weapon===3);const material=hit.kind==='enemy'?(impact?.stopped?'armor':'body'):hit.kind==='barrel'?'metal':world.walls[hit.id]?.kind||'concrete';
   pendingImpacts.push({material,head:!!hit.head&&!impact?.stopped,distance:h.distance,weapon:world.weapon,armored:!!impact?.armored});
   spawnParticles(h.point.x,h.point.y,h.point.z,hit.kind==='enemy'?'#6a343f':material==='wood'||material==='trunk'?'#aab1ba':'#e0e5e8',hit.kind==='enemy'?10:7,hit.kind==='enemy'?2.4:3);
   if(hit.kind!=='enemy')impactMark(h.point,h.face?.normal.clone().transformDirection(h.object.matrixWorld),material);
  }
 }else fireWithAttachments(null);
}
function impactMark(point,normal,material){
 if(!normal)return;const o=new T.Mesh(new T.CircleGeometry(material==='wood'||material==='trunk'?.045:.033,7),new T.MeshBasicMaterial({color:'#111822',side:T.DoubleSide,transparent:true,opacity:.82,depthWrite:false}));
 o.position.copy(point).addScaledVector(normal,.004);o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);o.userData.effectMaterial={mat:o.material,refs:1};dynamic.add(o);decals.push(o);if(decals.length>45)releaseEffect(decals.shift());
}
function ejectCase(weapon=world.weapon){
 const mesh=new T.Mesh(new T.CylinderGeometry(.009,.009,.035,6),new T.MeshStandardMaterial({color:'#b8bdc2',metalness:.7,roughness:.35})),g=gunGroup.userData.model;
 mesh.position.copy(g.userData.ejectionPort||new T.Vector3(.105,.06,-.04));g.updateMatrixWorld(true);g.localToWorld(mesh.position);
 let parent=gunScene,velocity=new T.Vector3(.8+Math.random()*.4,.7+Math.random()*.4,.2),life=1.1;
 if(weapon===3){
  gunCam.updateMatrixWorld(true);cam.updateMatrixWorld(true);
  const screen=mesh.position.clone().project(gunCam),direction=new T.Vector3(screen.x,screen.y,.5).unproject(cam).sub(cam.position).normalize();
  mesh.position.copy(cam.position).addScaledVector(direction,.58);velocity.set(1.3+Math.random()*.35,1.2+Math.random()*.25,.3).applyQuaternion(cam.quaternion);parent=scene;life=2.4;
 }
 parent.add(mesh);casings.push({mesh,parent,velocity,life,weapon,bounced:false});
 while(casings.length>16){const old=casings.shift();old.parent.remove(old.mesh);old.mesh.geometry.dispose();old.mesh.material.dispose();}
}
function plankDebris(event){for(let i=0;i<9;i++){let o=new T.Mesh(geo,mats.wood);o.scale.set(.1+Math.random()*.15,.4+Math.random()*.7,.1);o.position.set(event.x+(Math.random()-.5),.3+Math.random()*2,event.z);dynamic.add(o);debris.push({o,v:new T.Vector3((Math.random()-.5)*6,1+Math.random()*4,(Math.random()-.5)*6),t:2.5});}}
function releaseEffect(o){dynamic.remove(o);if(o.geometry!==geo&&o.geometry!==sphereGeo)o.geometry?.dispose();let shared=o.userData.effectMaterial;if(shared&&--shared.refs===0)shared.mat.dispose();}
function spawnParticles(x,y,z,c,n=14,power=4){let material=new T.MeshBasicMaterial({color:c}),shared={mat:material,refs:n};for(let i=0;i<n;i++){let o=new T.Mesh(geo,material);o.userData.effectMaterial=shared;o.scale.setScalar(.025+Math.random()*.1);o.position.set(x,y,z);dynamic.add(o);debris.push({o,v:new T.Vector3((Math.random()-.5)*power,Math.random()*power,(Math.random()-.5)*power),t:.6+Math.random()*.7});}while(debris.length>240)releaseEffect(debris.shift().o);}
function splat(x,z){let o=new T.Mesh(new T.CircleGeometry(.55+Math.random()*.45,9),new T.MeshBasicMaterial({color:'#4e0d1b',transparent:true,opacity:.85}));o.userData.effectMaterial={mat:o.material,refs:1};o.rotation.x=-Math.PI/2;o.position.set(x,.025,z);o.scale.x=1.5;dynamic.add(o);decals.push(o);if(decals.length>45)releaseEffect(decals.shift());}
function events(){for(let e of world.events){
 const ep={...e,weapon:e.weapon??world.weapon,suppressed:e.suppressed??$('suppressor').checked};
 switch(e.type){
 case'shot':
  if(ep.weapon!==1)ejectCase(ep.weapon);flash=ep.suppressed?.024:.055;flashPending=true;recoil=1;motion.fire(ep.weapon,ads);sound.shot(ep.weapon,{suppressed:ep.suppressed,environment:ep.environment||'outdoor'});
  for(const impact of pendingImpacts.splice(0))sound.impact(impact.material,impact);break;
 case'switch':sound.cancelRifleReload?.();cycleTime=0;motion.impulse('swap');sound.event('switch',ep);break;
 case'dash':motion.impulse('dash');sound.event('dash',ep);break;
 case'perfect':sound.reload('perfect',world.weapon);tell('PERFECT / 30% DAMAGE',1.4);break;
 case'mistime':sound.reload('mistime',world.weapon);tell('장전 타이밍 실패',1);break;
 case'warning':if(world.weapon!==3)sound.event('warning',ep);break;
 case'cycle':if(ep.weapon===1)ejectCase();cycleDuration=HC.CYCLE[ep.weapon]?.recovery||.19;cycleTime=cycleDuration;motion.impulse('cycle');sound.event('cycle',ep);recoil=.3;break;
 case'jump':motion.impulse('jump');break;
 case'land':motion.impulse('land');sound.event('dash',ep);break;
 case'slide':motion.impulse('slide');sound.event('dash',ep);break;
 case'extractionstart':tell('탈출 신호 전송 중 · 표시된 구역 안에서 대기하세요',6);break;
 case'extractioncancel':tell('구역 이탈 · 탈출 신호가 취소되었습니다',3);break;
 case'reload':cycleTime=0;reloadPhase=-1;aimDown=false;sound.reload('start',world.weapon);tell('장전 중…',2);break;
 case'reloadcancel':if(ep.weapon===3)sound.cancelRifleReload?.();break;
 case'reloadstage':if(ep.weapon===3)sound.reload(e.stage,3);break;
 case'riflecycle':motion.impulse('riflecycle');break;
 case'impact':if(ep.weapon===3&&e.armored){hitMarker=.17;$('hitmarker').dataset.hit=e.stopped?'armor':'penetrated';}break;
 case'mode':tell('라이플 모드 · '+(e.mode==='burst'?'3점사':'연사'),1.5);break;
 case'loaded':sound.reload('loaded',world.weapon);tell('장전 완료',1);break;
 case'needcycle':break;
 case'empty':sound.event('empty',ep);tell('R: 탄약을 장전하세요',1.3);break;
 case'hurt':damageFlash=.36;motion.impulse('hurt');sound.event('hurt',ep);shake=.01;break;
 case'blood':{hitMarker=e.head?.22:.12;const impact=ep.weapon===3?world.events.findLast(v=>v.type==='impact'&&v.weapon===3&&v.kind==='enemy'&&v.x===e.x&&v.z===e.z):null;$('hitmarker').dataset.hit=e.head?'head':impact?.armored?'penetrated':'body';break;}
 case'kill':if(enemyMeshes[e.id])enemyMeshes[e.id].userData.deathTime=clock;hitPause=.035;hitMarker=.23;$('hitmarker').dataset.hit='kill';spawnParticles(e.x,1.3,e.z,'#743c49',18,4);splat(e.x,e.z);if(world.weapon!==3)sound.event('kill',ep);if(e.boss)tell('표적 제거. E로 금빛 증표를 회수하세요',5);break;
 case'break':plankDebris(e);hitPause=.018;spawnParticles(e.x,e.y+1,e.z,'#a99975',18,5);shake=.05;sound.event('break',ep);break;
 case'explosion':spawnParticles(e.x,Number.isFinite(e.y)?e.y:.9,e.z,'#e4dfd1',34,8);shake=.12;sound.event('explosion',ep);break;
 case'enemyshot':spawnParticles(e.x,1.3,e.z,'#e1e3e7',3,2);sound.event('enemyshot',{...ep,distance:Math.hypot(e.x-world.player.x,e.z-world.player.z),pan:HC.clamp((e.x-world.player.x)/15,-1,1)});break;
 case'heal':sound.event('pickup',ep);tell('체력 +'+Math.round(e.amount),2);break;
 case'scan':tell('탐지 펄스 · 35m 안의 적 표시',4);break;
 case'pickup':sound.event('pickup',ep);tell(e.message||(e.kind==='bounty'?'증표 회수 · 지도에서 탈출 지점을 찾아 신호를 보내세요':e.kind==='cargo'?'화물 확보 · 살아서 탈출하면 정산됩니다':e.kind==='health'?'체력 회복':e.kind==='armor'?'방탄 장비 획득':'탄약 획득'),4);break;
 case'win':end(true);break;
 }
 }world.events=[];syncItems();}
function update(dt,draw=true){clock+=dt;flash=Math.max(0,flash-dt);if(state==='playing'){
 const p=world.player,simulationDt=hitPause>0?dt*.12:dt;
 hitPause=Math.max(0,hitPause-dt);
 let forward=(keys.KeyW?1:0)-(keys.KeyS?1:0),strafe=(keys.KeyD?1:0)-(keys.KeyA?1:0);
 const walking=!!(forward||strafe),requestedSprint=walking&&!!(keys.ShiftLeft||keys.ShiftRight)&&!aimDown&&p.slide<=0;
 world.setMovementIntent({moving:walking,sprint:requestedSprint,aiming:ads>.5});const sprinting=world.movementSprinting();
 world.setWeaponIntent({sprint:sprinting,ads:aimDown,moving:walking,airborne:!p.grounded});
 world.setFireInput(mouseHeld);
 gear.beforeStep();world.tick(simulationDt);gear.afterStep(simulationDt);
 const speed=world.movementSpeed()*dt;
 if(forward&&strafe){forward*=.707;strafe*=.707;}
 if(p.slide<=0)world.move((-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*speed);
 if(keys.ArrowLeft)yaw+=dt*1.8;if(keys.ArrowRight)yaw-=dt*1.8;
 if(keys.ArrowUp)pitch=HC.clamp(pitch+dt,-.85,.85);if(keys.ArrowDown)pitch=HC.clamp(pitch-dt,-.85,.85);
 if(walking)bob+=speed*1.8;else bob*=.95;
 events();if(p.hp<=0)end(false);
 }
 const moving=state==='playing'&&(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD),reloadProgress=world.reload>0?1-world.reload/Math.max(.1,world.reloadDuration):0;
 presentation=motion.step(dt,{weapon:world.weapon,boltLocked:world.weapon===3&&world.rifle.snapshot().boltLocked,aimProgress:world.weapon===3?world.rifle.snapshot().ads:undefined,reloadKind:world.weapon===3?world.rifle.snapshot().reloadKind:'tactical',aim:aimDown&&state==='playing'&&world.reload<=0,speed:moving?1:0,sprint:state==='playing'&&world.movementSprinting(),dash:world.player.dash>0,slide:world.player.slide>0,airborne:!world.player.grounded,reload:reloadProgress,time:clock});ads=presentation.ads;
 cam.fov=78-ads*19;cam.updateProjectionMatrix();cycleTime=Math.max(0,cycleTime-dt);swayX*=Math.exp(-dt*12);swayY*=Math.exp(-dt*12);hitMarker=Math.max(0,hitMarker-dt);$('hitmarker').classList.toggle('confirmed',hitMarker>0);$('crosshair').dataset.aim=ads>.8?'ads':'hip';recoil=Math.max(0,recoil-dt*7);damageFlash=Math.max(0,damageFlash-dt);shake=Math.max(0,shake-dt*.6);msgTime-=dt;if(msgTime<=0)$('message').textContent='';
 if(world){viewEye+=(world.player.eyeHeight-viewEye)*(1-Math.exp(-dt*15));viewEye=Math.min(viewEye,world.player.bodyHeight-.08);cam.position.set(world.player.x,world.player.y+viewEye+(world.player.grounded&&world.player.slide<=0?Math.sin(bob)*.024:0)+(Math.random()-.5)*shake,world.player.z);cam.rotation.set(pitch+presentation.camera+Math.sin(clock*73)*shake,yaw+presentation.cameraYaw+Math.cos(clock*67)*shake*.35,Math.sin(clock*51)*shake*.25);wallMeshes.forEach((o,i)=>o.visible=world.walls[i].alive&&world.walls[i].kind!=='boundary'&&!o.userData.renderProxy);enemyMeshes.forEach((o,i)=>{let e=world.enemies[i];o.position.set(e.x,0,e.z);o.rotation.y=Math.atan2(world.player.x-e.x,world.player.z-e.z)+Math.PI;let deathAge=clock-(o.userData.deathTime??-100);o.visible=e.alive||deathAge<1.25;o.position.y=e.alive?0:-Math.min(.75,deathAge*.6);o.rotation.z=e.alive?0:Math.min(1.4,deathAge*2.4);o.userData.coat.emissive.setHex(e.hit>0?0x9099aa:0);o.userData.warning.visible=e.windup>0;o.userData.warning.scale.setScalar(e.windup>0?.12+.09*Math.sin(clock*30):.12);if(e.alert&&e.alive){o.userData.legs.forEach((l,j)=>l.rotation.x=Math.sin(clock*8+j*Math.PI)*.3);}o.scale.setScalar((e.boss?1.18:1)*(e.hit>0?1.04:1));});itemMeshes.forEach((o,i)=>{let it=world.pickups[i];o.visible=it.alive;if(it.type!=='barrel'){o.rotation.y=clock;o.position.y=(it.y||0)+Math.sin(clock*2+i)*.08;}});
 let g=gunGroup.userData.model;if(g){
 const v=g.userData,rp=world.reload>0?1-world.reload/Math.max(.1,world.reloadDuration):0;
 const r=presentation.reload,poses=DFWeapon.getPose(world.weapon),hip=poses.hip,aim=poses.ads;
 g.position.set(T.MathUtils.lerp(hip.position[0],aim.position[0],ads)+presentation.x+swayX*.009*(1-ads),T.MathUtils.lerp(hip.position[1],aim.position[1],ads)+presentation.y-presentation.drop,T.MathUtils.lerp(hip.position[2],aim.position[2],ads)+presentation.z+presentation.back);
 g.rotation.set(T.MathUtils.lerp(hip.rotation[0],aim.rotation[0],ads)+presentation.pitch+presentation.rotX+swayY*.014*(1-ads)+r.pitch,T.MathUtils.lerp(hip.rotation[1],aim.rotation[1],ads)+presentation.yaw+presentation.rotY+r.yaw,T.MathUtils.lerp(hip.rotation[2],aim.rotation[2],ads)+presentation.roll+presentation.rotZ+r.roll);
 const mechanical=world.weapon===3?presentation.bolt:(recoil>.48?.064*Math.sin((1-recoil)/.52*Math.PI):0);
 DFWeapon.applyReload(g,r,{bolt:mechanical,trigger:-recoil*.35,index:-recoil*.18,hammer:world.weapon===3?0:world.cocked?-.7:0});
 if(world.reload>0&&world.weapon!==3){const phase=rp<.18?0:rp<.6?1:rp<.8?2:3;if(phase>reloadPhase){reloadPhase=phase;if(phase>0)sound.reload(['start','eject','insert','close'][phase],world.weapon);}}
 if(cycleTime>0){let t=Math.sin(cycleTime/cycleDuration*Math.PI);v.support.position.y+=t*.10;v.support.position.z-=t*.09;v.slide.position.z+=t*.055;}
 }if(state==='playing'){if(gear.canFire&&world.weapon===3){const pendingShot=world.shouldFire();if(pendingShot){shoot(pendingShot);events();}}else if(gear.canFire&&mouseHeld&&world.weapon===2){shoot();events();}}hud();
 }else{cam.position.set(0,2,24);cam.rotation.set(0,Math.sin(clock*.08)*.18,0);}
 for(let p of debris){p.t-=dt;p.v.y-=dt*9;p.o.position.addScaledVector(p.v,dt);p.o.rotation.x+=dt*4;p.o.rotation.z+=dt*3;if(p.o.position.y<.07){p.o.position.y=.07;p.v.y*=-.25;p.v.x*=.9;p.v.z*=.9;}}debris=debris.filter(p=>{if(p.t<=0){releaseEffect(p.o);return false;}return true;});$('damage').style.opacity=damageFlash;$('crt').style.display=$('crtsetting').checked?'block':'none';
 laserLine.visible=laserDot.visible=$('laser').checked&&state==='playing'&&world.reload<=0;if(laserLine.visible){cam.updateMatrixWorld();ray.setFromCamera(new T.Vector2(0,0),cam);let hits=ray.intersectObjects(wallMeshes.filter((m,i)=>world.walls[i].alive).concat(enemyMeshes.filter((m,i)=>world.enemies[i].alive),itemMeshes.filter((m,i)=>world.pickups[i]?.alive&&world.pickups[i].type==='barrel')),true);let end=hits.length?hits[0].point:ray.ray.at(45,new T.Vector3());let viewmodel=gunGroup.userData.model;viewmodel.updateMatrixWorld(true);gunCam.updateMatrixWorld();let projected=viewmodel.localToWorld(viewmodel.userData.laserEmitter.clone()).project(gunCam);let origin=new T.Vector3(projected.x,projected.y,.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(.45).add(cam.position);let arr=laserGeometry.attributes.position.array;origin.toArray(arr,0);end.toArray(arr,3);laserGeometry.attributes.position.needsUpdate=true;laserGeometry.computeBoundingSphere();laserDot.position.copy(end);}
 shotMeshes.forEach((m,i)=>{let p=world?.projectiles[i];m.visible=!!p;if(p){m.position.set(p.x,p.y??1.4,p.z);m.scale.set(1,1,2.8);}});for(let i=casings.length-1;i>=0;i--){
 const c=casings[i];if(state==='playing'){
  c.life-=dt;const old=c.mesh.position.clone();c.velocity.y-=dt*(c.weapon===3?9.81:3.8);c.mesh.position.addScaledVector(c.velocity,dt);
  c.mesh.rotation.x+=dt*13;c.mesh.rotation.z+=dt*9;
  if(c.weapon===3){
   let ground=0;const p=c.mesh.position;let material=DFWorld.routeDistance(p.x,p.z)<=0?'stone':'dirt';for(const landmark of world.landmarks)if(Math.hypot(p.x-landmark.x,p.z-landmark.z)<landmark.radius*.84)material=['depot','relay'].includes(landmark.id)?'concrete':'stone';
   for(const w of world.wallCandidates(p.x-.02,p.z-.02,p.x+.02,p.z+.02)){const top=(w.y||0)+w.h;if(p.x>w.x-w.w/2&&p.x<w.x+w.w/2&&p.z>w.z-w.d/2&&p.z<w.z+w.d/2&&top<=old.y+.025&&top>ground){ground=top;material=w.kind;}}
   if(p.y<=ground+.015&&c.velocity.y<0){const impact=Math.abs(c.velocity.y);p.y=ground+.015;c.velocity.y=impact>.4?impact*.23:0;c.velocity.x*=.65;c.velocity.z*=.65;
    if(!c.bounced){c.bounced=true;const offset=p.clone().sub(cam.position);sound.event('casingbounce',{weapon:3,material,distance:offset.length(),pan:HC.clamp(offset.dot(new T.Vector3(1,0,0).applyQuaternion(cam.quaternion))/4,-1,1),intensity:HC.clamp(impact/6,.2,.7)});}
   }
  }
 }
 if(c.life<=0){c.parent.remove(c.mesh);c.mesh.geometry.dispose();c.mesh.material.dispose();casings.splice(i,1);}
}const liveGrenades=new Set();for(const grenade of gear.throwables){liveGrenades.add(grenade.id);let mesh=grenadeMeshes.get(grenade.id);if(!mesh){mesh=new T.Mesh(sphereGeo,new T.MeshStandardMaterial({color:'#82917d',metalness:.55,roughness:.45,emissive:'#251319'}));mesh.scale.setScalar(.15);mesh.castShadow=true;mesh.userData.kind='grenade';dynamic.add(mesh);grenadeMeshes.set(grenade.id,mesh);}mesh.position.set(grenade.x,grenade.y,grenade.z);mesh.rotation.x+=dt*8;mesh.rotation.z+=dt*5;}for(const [id,mesh] of grenadeMeshes)if(!liveGrenades.has(id)){dynamic.remove(mesh);mesh.material.dispose();grenadeMeshes.delete(id);}if(!draw)return;renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,cam);renderer.clearDepth();renderer.render(gunScene,gunCam);if(flash>0||flashPending){flashMesh.visible=true;flashMesh.position.copy(muzzle||new T.Vector3());gunGroup.userData.model.localToWorld(flashMesh.position);flashMesh.scale.setScalar(.1+Math.random()*.12);flashMesh.rotation.z=Math.random()*6;renderer.render(flashScene,gunCam);}else flashMesh.visible=false;renderer.setRenderTarget(null);renderer.clear();postMaterial.uniforms.time.value=clock;renderer.render(postScene,postCamera);flashPending=false;
}
const laserGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);const laserLine=new T.Line(laserGeometry,new T.LineBasicMaterial({color:'#784b56',transparent:true,opacity:.38}));scene.add(laserLine);const laserDot=new T.Mesh(new T.SphereGeometry(.035,7,5),new T.MeshBasicMaterial({color:'#bd8291'}));scene.add(laserDot);
const shotMeshes=[];for(let i=0;i<32;i++){let m=new T.Mesh(new T.SphereGeometry(.08,5,4),new T.MeshBasicMaterial({color:'#f3eeee'}));m.visible=false;scene.add(m);shotMeshes.push(m);}
const target=new T.WebGLRenderTarget(960,540,{minFilter:T.NearestFilter,magFilter:T.NearestFilter});const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const postMaterial=new T.ShaderMaterial({uniforms:{frame:{value:target.texture},time:{value:0}},vertexShader:DFRenderStyle.vertexShader,fragmentShader:DFRenderStyle.fragmentShader});postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMaterial));
const flashScene=new T.Scene(),flashMesh=new T.Mesh(new T.OctahedronGeometry(1,0),new T.MeshBasicMaterial({color:'#ffe7a0',transparent:true,opacity:.96}));flashScene.add(flashMesh);
function hud(){let p=world.player,rifle=world.weapon===3?world.rifle.snapshot():null;$('hp').textContent=Math.ceil(p.hp);$('armor').textContent=Math.ceil(p.armor);$('healthfill').style.width=p.hp+'%';$('staminafill').style.width=p.stamina+'%';$('staminavalue').textContent=Math.ceil(p.stamina);$('stamina').dataset.exhausted=p.stamina<10?'true':'false';$('style').textContent=world.combo>1?world.combo+' CHAIN / '+world.style:world.style+' STYLE';$('reloadmeter').style.display=world.reload>0?'block':'none';$('reloadzone').style.display=rifle?'none':'block';$('reloadcursor').style.left=(1-world.reload/Math.max(.1,world.reloadDuration))*100+'%';$('ammo').textContent=String(world.ammo[world.weapon]).padStart(2,'0');$('reserve').textContent=' / '+world.reserve[world.weapon];$('weapon').textContent=['IRON SIX / PISTOL','BREACH / SHOTGUN','TWIN / SMG','R-4 / ASSAULT RIFLE'][world.weapon];$('weaponstate').textContent=rifle?(rifle.mode==='burst'?'BURST 3':'AUTO')+' · MAG '+rifle.magazine+' + CH '+rifle.chamber+' · '+rifle.state:'LEGACY PROTOTYPE';const bank=sound.stats().rifle;$('audiostatus').textContent=world.weapon!==3||!$('sound').checked?'':bank?.status==='ready'?'RECORDED RIFLE AUDIO':bank?.status==='error'?'오디오 로딩 실패 · 다시 시작하여 재시도':'라이플 오디오 로딩 중';let count=world.ammo[world.weapon];$('rounds').innerHTML=Array.from({length:world.weapon===3?15:world.weapon===2?12:[6,2][world.weapon]},(_,i)=>`<i class="${i<(world.weapon===3?Math.ceil(count/2):world.weapon===2?Math.ceil(count/2):count)?'':'empty'}"></i>`).join('');const boss=world.enemies.find(e=>e.boss),token=world.pickups.find(i=>(i.type==='bounty'||i.stack?.itemId==='bounty')&&i.alive),target=world.bounty?world.extractions.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b):token||boss;
 $('objective').textContent=world.bounty?'증표 확보 · 탈출 지점으로 이동':boss?.alive?'계약 0'+level+' · 북쪽 중계소의 표적 제거':'표적 제거 · 현상금 증표 회수';
 const landmark=world.landmarks.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b);
 $('region').textContent=landmark.name+' / BLACK PINES';
 const angle=((yaw*180/Math.PI%360)+360)%360,directions=['N','NW','W','SW','S','SE','E','NE'];
 $('route').textContent=directions[Math.round(angle/45)%8]+' · '+(target?(world.bounty?target.name:'중계소 계약')+' '+Math.round(Math.hypot(target.x-p.x,target.z-p.z))+' m':'')+' · M 지도';
 $('quickbar').innerHTML=[0,1].map(i=>{const item=carry.get('weapon:'+i);return '<span class="'+(gear.activeSlot===i?'active':'')+'">'+(i+1)+' '+(item?DFInventory.Catalog[item.itemId].name:'빈 무기')+'</span>';}).concat([0,1,2,3].map(i=>{const item=carry.get('quick:'+i);return '<span>'+(i+3)+' '+(item?DFInventory.Catalog[item.itemId].name+' ×'+item.quantity:'비어 있음')+'</span>';})).join('');gunGroup.visible=!!gear.activeWeapon;
 const saved=save.snapshot();$('loot').textContent='가방 '+carry.usedSlots()+'/12 · '+carry.weight().toFixed(1)+'/30 kg · 전리품 '+carry.value()+' · '+(saved.known?'보관 '+totalCash:'보관 확인 불가')+(saved.pending?' · 미저장 '+saved.pendingCash:'');$('raid-time').textContent='원정 '+formatTime(world.activeTime)+' · 현재 시간 제한 없음';
 $('extraction').hidden=!world.extractionZone;$('extractionstatus').textContent=world.extractionZone?.name||'탈출 지점 방어';$('extractiontime').textContent=Math.max(0,world.extractionRequired-world.extractionProgress).toFixed(1)+' s';$('extractionfill').style.width=(100*world.extractionProgress/Math.max(.1,world.extractionRequired))+'%';
 const preview=gear.previewNearest(),near=preview?.item,zone=world.nearExtraction();
 $('hint').textContent=preview?'[ E ] '+preview.name+' ×'+preview.quantity+' · '+preview.weight.toFixed(2)+' kg':world.extractionZone?'탈출 '+Math.max(0,world.extractionRequired-world.extractionProgress).toFixed(1)+'초 · 구역 유지':zone?(world.bounty?'[ E ] '+zone.name+' 탈출 신호':'탈출 지점 · 중계소 증표 필요'):gear.scannerRemaining>0?'탐지 펄스 '+gear.scannerRemaining.toFixed(1)+'초':p.slide>0?'슬라이딩':!p.grounded?'공중':'';
 if($('minimap').style.display==='block')drawMap();}
function drawMap(){const canvas=$('minimap'),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,b=world.bounds,p=world.player,pad=12,scale=Math.min((w-pad*2)/(b.maxX-b.minX),(h-pad*2)/(b.maxZ-b.minZ)),sx=x=>pad+(x-b.minX)*scale,sz=z=>pad+(z-b.minZ)*scale;
 c.clearRect(0,0,w,h);c.strokeStyle='#778492';c.lineWidth=2;
 for(const route of world.routes){c.beginPath();route.points.forEach((p,i)=>i?c.lineTo(sx(p.x),sz(p.z)):c.moveTo(sx(p.x),sz(p.z)));c.stroke();}
 c.fillStyle='#596474';for(const wall of world.walls)if(wall.alive&&!['boundary','trunk'].includes(wall.kind))c.fillRect(sx(wall.x-wall.w/2),sz(wall.z-wall.d/2),Math.max(1,wall.w*scale),Math.max(1,wall.d*scale));
 c.font='9px monospace';c.textAlign='center';for(const l of world.landmarks){c.fillStyle=l.id==='relay'?'#d6b7b9':'#b8c4d0';c.fillRect(sx(l.x)-2,sz(l.z)-2,4,4);c.fillText(l.short,sx(l.x),sz(l.z)-6);}
 c.strokeStyle='#d9e4da';for(const ex of world.extractions){c.beginPath();c.arc(sx(ex.x),sz(ex.z),5,0,Math.PI*2);c.stroke();}
 c.fillStyle='#cbbb94';for(const item of world.pickups)if(item.alive&&!['barrel','bounty'].includes(item.type))c.fillRect(sx(item.x)-1,sz(item.z)-1,2,2);
 c.fillStyle='#d599a3';for(const e of world.enemies)if(e.alive&&(e.alert&&Math.hypot(e.x-p.x,e.z-p.z)<45||gear.isScanned(e)))c.fillRect(sx(e.x)-1.5,sz(e.z)-1.5,3,3);
 c.fillStyle='#fff';c.beginPath();c.arc(sx(p.x),sz(p.z),3,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.beginPath();c.moveTo(sx(p.x),sz(p.z));c.lineTo(sx(p.x)-Math.sin(yaw)*10,sz(p.z)-Math.cos(yaw)*10);c.stroke();}

function resize(){let w=Math.min(innerWidth-24,(innerHeight-24)*16/9),h=w*9/16;renderer.setSize(960,540,false);canvas.style.width=w+'px';canvas.style.height=h+'px';canvas.style.left=(innerWidth-w)/2+'px';canvas.style.top=(innerHeight-h)/2+'px';cam.aspect=gunCam.aspect=16/9;cam.updateProjectionMatrix();gunCam.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
const deploymentChanged=()=>{if(state==='title'){world=createMission(prepared||undefined);build();}deploymentUI();};$('loadout').onchange=()=>{prepared=DFInventory.starter(Number($('loadout').value));deploymentChanged();};$('difficulty').onchange=deploymentChanged;$('save-retry').onclick=()=>{if(save.retry()){flushSettlement();if(pendingDeployment&&save.snapshot().activeRaid&&!save.snapshot().interrupted){if(launchDeployment()){firstStart=false;state='paused';start();}}}if(state==='title')level=Math.max(level,save.snapshot().nextLevel);persistenceUI();deploymentUI();};$('recover-run').onclick=()=>{save.recoverInterrupted();persistenceUI();deploymentUI();};$('inventory-open').onclick=openBag;$('inventory-content').onclick=e=>{const button=e.target.closest?.('button[data-action]');if(button&&!button.disabled)inventoryAction(button.dataset.action,button.dataset.location);};$('laser').onchange=weaponModel;$('suppressor').onchange=weaponModel;$('start').onclick=()=>start();$('restart').onclick=()=>start(true);$('fullscreen').onclick=()=>{document.documentElement.requestFullscreen?.().catch(()=>tell('브라우저 메뉴에서 전체 화면을 선택하세요'));};
window.addEventListener('keydown',e=>{if(bagOpen){if(e.code==='Escape'){e.preventDefault();closeBag();}return;}if(state==='playing'&&e.code==='Tab'){e.preventDefault();openBag();return;}const target=e.target||document.activeElement;if(state!=='playing'||(!document.pointerLockElement&&(target?.isContentEditable||['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(target?.tagName))))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.repeat)return;if(e.code==='Escape')pause();if(state!=='playing')return;if(e.code==='KeyL'){$('laser').checked=!$('laser').checked;weaponModel();}if(e.code==='Space'){if(!world.jump()&&world.player.stamina<10)tell('점프하려면 잠시 멈춰 스태미나를 회복하세요',1.5);}if(e.code==='KeyX')world.dash();if(['ControlLeft','ControlRight','KeyC'].includes(e.code)){let f=(keys.KeyW?1:0)-(keys.KeyS?1:0),r=(keys.KeyD?1:0)-(keys.KeyA?1:0);if(!f&&!r)f=1;world.slide(-Math.sin(yaw)*f+Math.cos(yaw)*r,-Math.cos(yaw)*f-Math.sin(yaw)*r);}if(e.code==='KeyR'&&gear.canFire)world.load();if(e.code==='KeyE'){const r=gear.interact();tell(r.message,3);}if(e.code==='KeyF'&&gear.canFire){if(world.weapon===3)world.requestTrigger();else shoot();}if(e.code==='KeyB'&&world.weapon===3)world.setFireMode(world.rifle.snapshot().mode==='auto'?'burst':'auto');if(e.code==='KeyM'){const visible=$('minimap').style.display!=='block';$('minimap').style.display=visible?'block':'none';$('maplegend').style.display=visible?'flex':'none';}if(/^Digit[12]$/.test(e.code)){const r=gear.equipWeapon(Number(e.code.at(-1))-1);tell(r.message,1.5);hammer=null;weaponModel();}if(/^Digit[3456]$/.test(e.code)){const r=gear.use('quick:'+(Number(e.code.at(-1))-3),{yaw,pitch});tell(r.message,2);if(r.ok&&gear.scannerRemaining>0){$('minimap').style.display='block';$('maplegend').style.display='flex';}}});
window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&state==='playing')pause();});document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&state==='playing'){swayX=HC.clamp(swayX+e.movementX*.014,-1,1);swayY=HC.clamp(swayY+e.movementY*.014,-1,1);yaw-=e.movementX*.0024;pitch=HC.clamp(pitch-e.movementY*.0024,-1.05,1.05);}});canvas.addEventListener('mousedown',e=>{if(state!=='playing')return;if(e.button===0&&gear.canFire){mouseHeld=true;if(world.weapon===3)world.setFireInput(true);else shoot();}if(e.button===2)aimDown=true;});window.addEventListener('mouseup',e=>{if(e.button===0){mouseHeld=false;world?.setFireInput(false);}if(e.button===2)aimDown=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
world=createMission();build();
$('overlay').dataset.startup='ready';$('startup-status').hidden=true;$('start').disabled=false;
for(const id of ['game','hud','damage'])$(id).hidden=false;
deploymentUI();persistenceUI();
function frame(now){const timing=runClock.advance(now);world.activeTime=timing.elapsed;if(state==='playing'&&timing.steps){for(let i=0;i<timing.steps;i++){update(timing.step,i===timing.steps-1);if(state!=='playing'){if(i<timing.steps-1)update(0);break;}}}else update(state==='playing'?0:timing.renderDelta);requestAnimationFrame(frame);}requestAnimationFrame(frame);
window.addEventListener('error',e=>{$('notice').textContent='실행 오류: '+e.message;});
})();
