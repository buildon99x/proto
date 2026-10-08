'use strict';
(()=>{
const $=id=>document.getElementById(id),T=THREE;
const canvas=$('game');let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});}catch(e){$('description').textContent='WebGL을 시작하지 못했습니다. 최신 데스크톱 브라우저에서 하드웨어 가속을 켜고 다시 열어주세요.';throw e;}
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.autoClear=false;
const scene=new T.Scene();scene.background=new T.Color('#8c929f');scene.fog=new T.FogExp2('#89919c',.0095);
const cam=new T.PerspectiveCamera(78,1,.06,440);cam.rotation.order='YXZ';
scene.add(new T.HemisphereLight('#cbd2dc','#1a1e29',1.7));let sunlight=new T.DirectionalLight('#d5dbe1',1.65);sunlight.position.set(-15,40,20);scene.add(sunlight);
const gunScene=new T.Scene(),gunCam=new T.PerspectiveCamera(62,1,.01,10);gunScene.add(new T.HemisphereLight('#cbd4df','#101724',.85));let gl=new T.DirectionalLight('#ffffff',3.2);gl.position.set(-1.3,2.2,1.5);gl.castShadow=true;gl.shadow.mapSize.set(1024,1024);Object.assign(gl.shadow.camera,{left:-1.1,right:1.1,top:1.1,bottom:-1.1,near:.1,far:6});gl.shadow.camera.updateProjectionMatrix();gl.shadow.bias=-.00012;gl.shadow.normalBias=.003;gl.shadow.radius=1.5;gl.target.position.set(0,-.22,-.85);gunScene.add(gl,gl.target);
let world,level=1,totalCash=0,state='title',yaw=0,pitch=0,clock=0,shake=0,recoil=0,flash=0,damageFlash=0,msgTime=0,msg='',bob=0,mouseHeld=false,aimDown=false,muted=false,wallMeshes=[],enemyMeshes=[],itemMeshes=[],debris=[],decals=[],dynamic=new T.Group();scene.add(dynamic);
try{const saved=JSON.parse(localStorage.getItem('deadfreight-best')||'{}');totalCash=Number.isFinite(saved.cash)?Math.max(0,saved.cash):0;}catch(e){}
const motion=DFMotion.create();let sound=DeadFreightAudio.create();let presentation=motion.step(0);const pendingImpacts=[];
const casings=[];let viewEye=1.62,ads=0,reloadPhase=-1,swayX=0,swayY=0,cycleTime=0,cycleDuration=.19,hitPause=0,hitMarker=0;let keys={},firstStart=true,gunGroup=new T.Group();gunScene.add(gunGroup);let hammer,gunCylinder,muzzle;
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

function build(){const persistent=new Set([...Object.values(mats),black,metal,darkmetal,gold,leather,skin,red]);const geometries=new Set(),materials=new Set(),textures=new Set();dynamic.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&o.geometry!==geo&&o.geometry!==sphereGeo)geometries.add(o.geometry);if(o.material&&!persistent.has(o.material))materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{for(const key of ['map','normalMap','roughnessMap'])if(m[key])textures.add(m[key]);m.dispose();});textures.forEach(t=>t.dispose());while(dynamic.children.length)dynamic.remove(dynamic.children[0]);wallMeshes=[];enemyMeshes=[];itemMeshes=[];debris=[];decals=[];
 const environment=DFWorldView.build({T,parent:dynamic,world});wallMeshes=environment.wallMeshes;
 world.enemies.forEach(e=>enemyMeshes.push(enemyModel(e)));syncItems();weaponModel();
}

function syncItems(){world.pickups.forEach((it,i)=>{if(itemMeshes[i])return;let g=new T.Group();g.position.set(it.x,0,it.z);if(it.type==='barrel'){cylinder(0,.72,0,.55,1.4,mats.red,g,12);for(let y of [.2,1.17])cylinder(0,y,0,.565,.09,black,g,12);box(0,.77,.56,.5,.43,.015,gold,g);}else if(it.type==='bounty'){orb(0,.65,0,.3,gold,g);cylinder(0,.35,0,.36,.09,black,g);let light=new T.PointLight('#bbc8d9',4,5);g.add(light);}else{box(0,.38,0,.7,.5,.6,it.type==='health'?mat('#ddd9c6'):it.type==='cargo'?mats.crate:mat('#586674'),g);if(it.type==='health'){box(0,.64,0,.1,.01,.37,red,g);box(0,.64,0,.38,.01,.1,red,g);}else{box(0,.65,0,.5,.015,.38,gold,g);if(it.type==='cargo'){box(0,.39,0,.12,.54,.64,darkmetal,g);box(0,.39,0,.73,.54,.08,darkmetal,g);}}}g.userData={kind:it.type==='barrel'?'barrel':'item',id:i};dynamic.add(g);itemMeshes[i]=g;});}
function resetPresentation(){sound.stopAll();motion.reset();pendingImpacts.length=0;keys={};mouseHeld=false;aimDown=false;ads=0;recoil=0;shake=0;flash=0;damageFlash=0;hitPause=0;hitMarker=0;swayX=0;swayY=0;cycleTime=0;viewEye=1.62;reloadPhase=-1;for(let c of casings){gunScene.remove(c.mesh);c.mesh.geometry.dispose();c.mesh.material.dispose();}casings.length=0;}
function start(newGame=false){resetPresentation();if(newGame||firstStart||!world||state==='dead'){level=newGame?1:level;world=new HC.Mission(level,Number($('difficulty').value));yaw=0;pitch=0;build();}if(state==='won'){level++;world=new HC.Mission(level,Number($('difficulty').value));world.player.armor=0;build();yaw=0;pitch=0;}
 viewEye=Math.min(viewEye,world.player.bodyHeight-.08);state='playing';$('overlay').style.display='none';firstStart=false;sound.setMuted(!$('sound').checked);sound.resume();try{canvas.requestPointerLock()?.catch(()=>tell('마우스 잠금 불가: 화살표 키로 조준할 수 있습니다',5));}catch(e){tell('화살표 키로 조준할 수 있습니다',5);}tell('중계소의 표적을 추적하세요. SPACE 점프 · CTRL/C 슬라이드 · M 지도',6);}
function pause(){if(state!=='playing')return;state='paused';sound.suspend();keys={};mouseHeld=false;aimDown=false;document.exitPointerLock?.();$('overlay').style.display='grid';$('start').textContent='계속하기';$('restart').hidden=false;$('stats').textContent='';}
function end(win){resetPresentation();state=win?'won':'dead';sound.suspend();keys={};mouseHeld=false;document.exitPointerLock?.();$('overlay').style.display='grid';$('description').textContent=win?'계약 완료. 안개를 뚫고 살아 돌아왔습니다. 다음 계약에서도 정확한 사격과 회피 타이밍이 중요합니다.':'계약 실패. 표적은 아직 살아 있습니다. 장전을 마친 뒤 엄폐를 이용해 다시 도전하세요.';$('stats').textContent=`${win?'화물 정산 +'+world.cash:'회수 실패 · 화물 손실 '+world.cash} · ${Math.floor(world.time)}초 · ${world.kills} 처치 · ${world.style} STYLE · ${Math.round(world.hits/Math.max(1,world.shots)*100)}% 명중`;$('start').textContent=win?'다음 계약':'다시 도전';$('restart').hidden=false;if(win){totalCash+=world.cash;try{localStorage.setItem('deadfreight-best',JSON.stringify({cash:totalCash,level}));}catch(e){}}}
function tell(s,t=2.4){msg=s;msgTime=t;$('message').textContent=s;}
$('sound').onchange=()=>sound.setMuted(!$('sound').checked);
window.addEventListener('pagehide',()=>{pause();sound.destroy();});
window.addEventListener('pageshow',e=>{if(e.persisted){sound=DeadFreightAudio.create();sound.setMuted(!$('sound').checked);}});
const ray=new T.Raycaster();
function fireWithAttachments(hit){const fired=world.fire(hit);if(fired){const shot=world.events.findLast(e=>e.type==='shot');if(shot)shot.suppressed=$('suppressor').checked;}return fired;}
function shoot(){
 if(state!=='playing'||world.player.hp<=0||world.extracted||world.reload>0||world.cooldown>1e-6||!world.cocked)return;
 if(!world.ammo[world.weapon]){fireWithAttachments(null);return;}
 cam.updateMatrixWorld(true);scene.updateMatrixWorld(true);ray.setFromCamera(new T.Vector2(0,0),cam);let targets=wallMeshes.filter((m,i)=>world.walls[i].alive).concat(enemyMeshes.filter((m,i)=>world.enemies[i].alive),itemMeshes.filter((m,i)=>world.pickups[i]?.alive&&world.pickups[i].type==='barrel'));
 let hits=ray.intersectObjects(targets,true),hit=null;
 if(hits.length){let h=hits[0],obj=h.object;while(!obj.userData.kind&&!obj.userData.enemy&&obj.parent)obj=obj.parent;
  if(obj.userData.enemy){let e=obj.userData.enemy;hit={kind:'enemy',id:e.id,head:h.point.y>(e.boss?1.95:1.58)};}else hit={kind:obj.userData.kind,id:obj.userData.id};
  if(fireWithAttachments(hit)){
   const material=hit.kind==='enemy'?'body':hit.kind==='barrel'?'metal':world.walls[hit.id]?.kind||'concrete';
   pendingImpacts.push({material,head:!!hit.head,distance:h.distance});
   spawnParticles(h.point.x,h.point.y,h.point.z,hit.kind==='enemy'?'#6a343f':material==='wood'||material==='trunk'?'#aab1ba':'#e0e5e8',hit.kind==='enemy'?10:7,hit.kind==='enemy'?2.4:3);
   if(hit.kind!=='enemy')impactMark(h.point,h.face?.normal.clone().transformDirection(h.object.matrixWorld),material);
  }
 }else fireWithAttachments(null);
}
function impactMark(point,normal,material){
 if(!normal)return;const o=new T.Mesh(new T.CircleGeometry(material==='wood'||material==='trunk'?.045:.033,7),new T.MeshBasicMaterial({color:'#111822',side:T.DoubleSide,transparent:true,opacity:.82,depthWrite:false}));
 o.position.copy(point).addScaledVector(normal,.004);o.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal);o.userData.effectMaterial={mat:o.material,refs:1};dynamic.add(o);decals.push(o);if(decals.length>45)releaseEffect(decals.shift());
}
function ejectCase(){let mesh=new T.Mesh(new T.CylinderGeometry(.009,.009,.035,6),new T.MeshStandardMaterial({color:'#b8bdc2',metalness:.7,roughness:.35}));let g=gunGroup.userData.model;mesh.position.set(.105,.06,-.04);g.updateMatrixWorld(true);g.localToWorld(mesh.position);gunScene.add(mesh);casings.push({mesh,velocity:new T.Vector3(.8+Math.random()*.4,.7+Math.random()*.4,.2),life:1.1});while(casings.length>16){let old=casings.shift().mesh;gunScene.remove(old);old.geometry.dispose();old.material.dispose();}}
function plankDebris(event){for(let i=0;i<9;i++){let o=new T.Mesh(geo,mats.wood);o.scale.set(.1+Math.random()*.15,.4+Math.random()*.7,.1);o.position.set(event.x+(Math.random()-.5),.3+Math.random()*2,event.z);dynamic.add(o);debris.push({o,v:new T.Vector3((Math.random()-.5)*6,1+Math.random()*4,(Math.random()-.5)*6),t:2.5});}}
function releaseEffect(o){dynamic.remove(o);if(o.geometry!==geo&&o.geometry!==sphereGeo)o.geometry?.dispose();let shared=o.userData.effectMaterial;if(shared&&--shared.refs===0)shared.mat.dispose();}
function spawnParticles(x,y,z,c,n=14,power=4){let material=new T.MeshBasicMaterial({color:c}),shared={mat:material,refs:n};for(let i=0;i<n;i++){let o=new T.Mesh(geo,material);o.userData.effectMaterial=shared;o.scale.setScalar(.025+Math.random()*.1);o.position.set(x,y,z);dynamic.add(o);debris.push({o,v:new T.Vector3((Math.random()-.5)*power,Math.random()*power,(Math.random()-.5)*power),t:.6+Math.random()*.7});}while(debris.length>240)releaseEffect(debris.shift().o);}
function splat(x,z){let o=new T.Mesh(new T.CircleGeometry(.55+Math.random()*.45,9),new T.MeshBasicMaterial({color:'#4e0d1b',transparent:true,opacity:.85}));o.userData.effectMaterial={mat:o.material,refs:1};o.rotation.x=-Math.PI/2;o.position.set(x,.025,z);o.scale.x=1.5;dynamic.add(o);decals.push(o);if(decals.length>45)releaseEffect(decals.shift());}
function events(){for(let e of world.events){
 const ep={...e,weapon:e.weapon??world.weapon,suppressed:e.suppressed??$('suppressor').checked};
 switch(e.type){
 case'shot':
  if(ep.weapon!==1)ejectCase();flash=ep.suppressed?.024:.055;recoil=1;motion.fire(ep.weapon,ads);sound.shot(ep.weapon,{suppressed:ep.suppressed});
  for(const impact of pendingImpacts.splice(0))sound.impact(impact.material,impact);break;
 case'switch':cycleTime=0;motion.impulse('swap');sound.event('switch',ep);break;
 case'dash':motion.impulse('dash');sound.event('dash',ep);break;
 case'perfect':sound.reload('perfect',world.weapon);tell('PERFECT / 30% DAMAGE',1.4);break;
 case'mistime':sound.reload('mistime',world.weapon);tell('장전 타이밍 실패',1);break;
 case'warning':sound.event('warning',ep);break;
 case'cycle':if(ep.weapon===1)ejectCase();cycleDuration=HC.CYCLE[ep.weapon]?.recovery||.19;cycleTime=cycleDuration;motion.impulse('cycle');sound.event('cycle',ep);recoil=.3;break;
 case'jump':motion.impulse('jump');break;
 case'land':motion.impulse('land');sound.event('dash',ep);break;
 case'slide':motion.impulse('slide');sound.event('dash',ep);break;
 case'extractionstart':tell('탈출 신호 전송 중 · 표시된 구역 안에서 대기하세요',6);break;
 case'extractioncancel':tell('구역 이탈 · 탈출 신호가 취소되었습니다',3);break;
 case'reload':cycleTime=0;reloadPhase=-1;aimDown=false;sound.reload('start',world.weapon);tell('장전 중…',2);break;
 case'loaded':sound.reload('loaded',world.weapon);tell('장전 완료',1);break;
 case'needcycle':break;
 case'empty':sound.event('empty',ep);tell('R: 탄약을 장전하세요',1.3);break;
 case'hurt':damageFlash=.36;motion.impulse('hurt');sound.event('hurt',ep);shake=.01;break;
 case'blood':hitMarker=e.head?.22:.12;$('hitmarker').dataset.hit=e.head?'head':'body';break;
 case'kill':if(enemyMeshes[e.id])enemyMeshes[e.id].userData.deathTime=clock;hitPause=.035;hitMarker=.23;$('hitmarker').dataset.hit='kill';spawnParticles(e.x,1.3,e.z,'#743c49',18,4);splat(e.x,e.z);sound.event('kill',ep);if(e.boss)tell('표적 제거. E로 금빛 증표를 회수하세요',5);break;
 case'break':plankDebris(e);hitPause=.018;spawnParticles(e.x,e.y+1,e.z,'#a99975',18,5);shake=.05;sound.event('break',ep);break;
 case'explosion':spawnParticles(e.x,.9,e.z,'#e4dfd1',34,8);shake=.12;sound.event('explosion',ep);break;
 case'enemyshot':spawnParticles(e.x,1.3,e.z,'#e1e3e7',3,2);sound.event('enemyshot',{...ep,distance:Math.hypot(e.x-world.player.x,e.z-world.player.z),pan:HC.clamp((e.x-world.player.x)/15,-1,1)});break;
 case'pickup':sound.event('pickup',ep);tell(e.kind==='bounty'?'증표 회수 · 지도에서 탈출 지점을 찾아 신호를 보내세요':e.kind==='cargo'?'화물 확보 · 살아서 탈출하면 정산됩니다':e.kind==='health'?'체력 회복':e.kind==='armor'?'방탄 장비 획득':'탄약 획득',4);break;
 case'win':end(true);break;
 }
 }world.events=[];syncItems();}
function update(dt){clock+=dt;if(state==='playing'){
 let simulationDt=hitPause>0?dt*.12:dt;hitPause=Math.max(0,hitPause-dt);world.tick(simulationDt);let speed=(world.player.dash>0?18:ads>.5?2.8:keys.ShiftLeft||keys.ShiftRight?7.5:4.8)*dt;let forward=(keys.KeyW?1:0)-(keys.KeyS?1:0),strafe=(keys.KeyD?1:0)-(keys.KeyA?1:0);if(forward&&strafe){forward*=.707;strafe*=.707;}if(world.player.slide<=0)world.move((-Math.sin(yaw)*forward+Math.cos(yaw)*strafe)*speed,(-Math.cos(yaw)*forward-Math.sin(yaw)*strafe)*speed);if(keys.ArrowLeft)yaw+=dt*1.8;if(keys.ArrowRight)yaw-=dt*1.8;if(keys.ArrowUp)pitch=HC.clamp(pitch+dt,-.85,.85);if(keys.ArrowDown)pitch=HC.clamp(pitch-dt,-.85,.85);if(forward||strafe)bob+=speed*1.8;else bob*=.95;events();if(world.player.hp<=0)end(false);
 }
 const moving=state==='playing'&&(keys.KeyW||keys.KeyS||keys.KeyA||keys.KeyD),reloadProgress=world.reload>0?1-world.reload/Math.max(.1,world.reloadDuration):0;
 presentation=motion.step(dt,{aim:aimDown&&state==='playing'&&world.reload<=0,speed:moving?1:0,sprint:moving&&(keys.ShiftLeft||keys.ShiftRight),dash:world.player.dash>0,slide:world.player.slide>0,airborne:!world.player.grounded,reload:reloadProgress,time:clock});ads=presentation.ads;
 cam.fov=78-ads*19;cam.updateProjectionMatrix();cycleTime=Math.max(0,cycleTime-dt);swayX*=Math.exp(-dt*12);swayY*=Math.exp(-dt*12);hitMarker=Math.max(0,hitMarker-dt);$('hitmarker').classList.toggle('confirmed',hitMarker>0);$('crosshair').dataset.aim=ads>.8?'ads':'hip';recoil=Math.max(0,recoil-dt*7);damageFlash=Math.max(0,damageFlash-dt);shake=Math.max(0,shake-dt*.6);msgTime-=dt;if(msgTime<=0)$('message').textContent='';
 if(world){viewEye+=(world.player.eyeHeight-viewEye)*(1-Math.exp(-dt*15));viewEye=Math.min(viewEye,world.player.bodyHeight-.08);cam.position.set(world.player.x,world.player.y+viewEye+(world.player.grounded&&world.player.slide<=0?Math.sin(bob)*.024:0)+(Math.random()-.5)*shake,world.player.z);cam.rotation.set(pitch+presentation.camera+Math.sin(clock*73)*shake,yaw+presentation.cameraYaw+Math.cos(clock*67)*shake*.35,Math.sin(clock*51)*shake*.25);wallMeshes.forEach((o,i)=>o.visible=world.walls[i].alive&&world.walls[i].kind!=='boundary'&&!o.userData.renderProxy);enemyMeshes.forEach((o,i)=>{let e=world.enemies[i];o.position.set(e.x,0,e.z);o.rotation.y=Math.atan2(world.player.x-e.x,world.player.z-e.z)+Math.PI;let deathAge=clock-(o.userData.deathTime??-100);o.visible=e.alive||deathAge<1.25;o.position.y=e.alive?0:-Math.min(.75,deathAge*.6);o.rotation.z=e.alive?0:Math.min(1.4,deathAge*2.4);o.userData.coat.emissive.setHex(e.hit>0?0x9099aa:0);o.userData.warning.visible=e.windup>0;o.userData.warning.scale.setScalar(e.windup>0?.12+.09*Math.sin(clock*30):.12);if(e.alert&&e.alive){o.userData.legs.forEach((l,j)=>l.rotation.x=Math.sin(clock*8+j*Math.PI)*.3);}o.scale.setScalar((e.boss?1.18:1)*(e.hit>0?1.04:1));});itemMeshes.forEach((o,i)=>{let it=world.pickups[i];o.visible=it.alive;if(it.type!=='barrel'){o.rotation.y=clock;o.position.y=Math.sin(clock*2+i)*.08;}});
 let g=gunGroup.userData.model;if(g){
 const v=g.userData,rp=world.reload>0?1-world.reload/Math.max(.1,world.reloadDuration):0;
 const r=presentation.reload,hip=DFWeapon.poses.hip,aim=DFWeapon.poses.ads;
 g.position.set(T.MathUtils.lerp(hip.position[0],aim.position[0],ads)+presentation.x+swayX*.009*(1-ads),T.MathUtils.lerp(hip.position[1],aim.position[1],ads)+presentation.y-presentation.drop,T.MathUtils.lerp(hip.position[2],aim.position[2],ads)+presentation.z+presentation.back);
 g.rotation.set(T.MathUtils.lerp(hip.rotation[0],aim.rotation[0],ads)+presentation.pitch+presentation.rotX+swayY*.014*(1-ads)+r.pitch,T.MathUtils.lerp(hip.rotation[1],aim.rotation[1],ads)+presentation.yaw+presentation.rotY+r.yaw,T.MathUtils.lerp(hip.rotation[2],aim.rotation[2],ads)+presentation.roll+presentation.rotZ+r.roll);
 v.slide.position.z=(recoil>.48?.064*Math.sin((1-recoil)/.52*Math.PI):0)+r.slide;
 v.hammer.rotation.x=world.cocked?-.7:0;v.trigger.rotation.x=-recoil*.35;v.index.rotation.x=-recoil*.18+r.index*.30;v.index.rotation.y=r.index*.27;
 v.support.position.set(r.supportX,r.supportY,r.supportZ);v.support.rotation.z=-r.index*.24;v.magazine.position.y=r.magazine;
 if(world.reload>0){const phase=rp<.18?0:rp<.6?1:rp<.8?2:3;if(phase>reloadPhase){reloadPhase=phase;if(phase>0)sound.reload(['start','eject','insert','close'][phase],world.weapon);}}
 if(cycleTime>0){let t=Math.sin(cycleTime/cycleDuration*Math.PI);v.support.position.y+=t*.10;v.support.position.z-=t*.09;v.slide.position.z+=t*.055;}
 }if(state==='playing'&&mouseHeld&&world.weapon===2){shoot();events();}hud();
 }else{cam.position.set(0,2,24);cam.rotation.set(0,Math.sin(clock*.08)*.18,0);}
 for(let p of debris){p.t-=dt;p.v.y-=dt*9;p.o.position.addScaledVector(p.v,dt);p.o.rotation.x+=dt*4;p.o.rotation.z+=dt*3;if(p.o.position.y<.07){p.o.position.y=.07;p.v.y*=-.25;p.v.x*=.9;p.v.z*=.9;}}debris=debris.filter(p=>{if(p.t<=0){releaseEffect(p.o);return false;}return true;});$('damage').style.opacity=damageFlash;$('crt').style.display=$('crtsetting').checked?'block':'none';
 laserLine.visible=laserDot.visible=$('laser').checked&&state==='playing'&&world.reload<=0;if(laserLine.visible){cam.updateMatrixWorld();ray.setFromCamera(new T.Vector2(0,0),cam);let hits=ray.intersectObjects(wallMeshes.filter((m,i)=>world.walls[i].alive).concat(enemyMeshes.filter((m,i)=>world.enemies[i].alive),itemMeshes.filter((m,i)=>world.pickups[i]?.alive&&world.pickups[i].type==='barrel')),true);let end=hits.length?hits[0].point:ray.ray.at(45,new T.Vector3());let viewmodel=gunGroup.userData.model;viewmodel.updateMatrixWorld(true);gunCam.updateMatrixWorld();let projected=viewmodel.localToWorld(viewmodel.userData.laserEmitter.clone()).project(gunCam);let origin=new T.Vector3(projected.x,projected.y,.5).unproject(cam).sub(cam.position).normalize().multiplyScalar(.45).add(cam.position);let arr=laserGeometry.attributes.position.array;origin.toArray(arr,0);end.toArray(arr,3);laserGeometry.attributes.position.needsUpdate=true;laserGeometry.computeBoundingSphere();laserDot.position.copy(end);}
 shotMeshes.forEach((m,i)=>{let p=world?.projectiles[i];m.visible=!!p;if(p){m.position.set(p.x,p.y??1.4,p.z);m.scale.set(1,1,2.8);}});for(let i=casings.length-1;i>=0;i--){let c=casings[i];c.life-=dt;c.velocity.y-=dt*3.8;c.mesh.position.addScaledVector(c.velocity,dt);c.mesh.rotation.x+=dt*13;c.mesh.rotation.z+=dt*9;if(c.life<=0){gunScene.remove(c.mesh);c.mesh.geometry.dispose();c.mesh.material.dispose();casings.splice(i,1);}}renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,cam);renderer.clearDepth();renderer.render(gunScene,gunCam);if(flash>0){flashMesh.visible=true;flashMesh.position.copy(muzzle||new T.Vector3());gunGroup.userData.model.localToWorld(flashMesh.position);flashMesh.scale.setScalar(.1+Math.random()*.12);flashMesh.rotation.z=Math.random()*6;renderer.render(flashScene,gunCam);}else flashMesh.visible=false;renderer.setRenderTarget(null);renderer.clear();postMaterial.uniforms.time.value=clock;renderer.render(postScene,postCamera);flash=Math.max(0,flash-dt);
}
const laserGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);const laserLine=new T.Line(laserGeometry,new T.LineBasicMaterial({color:'#784b56',transparent:true,opacity:.38}));scene.add(laserLine);const laserDot=new T.Mesh(new T.SphereGeometry(.035,7,5),new T.MeshBasicMaterial({color:'#bd8291'}));scene.add(laserDot);
const shotMeshes=[];for(let i=0;i<32;i++){let m=new T.Mesh(new T.SphereGeometry(.08,5,4),new T.MeshBasicMaterial({color:'#f3eeee'}));m.visible=false;scene.add(m);shotMeshes.push(m);}
const target=new T.WebGLRenderTarget(960,540,{minFilter:T.NearestFilter,magFilter:T.NearestFilter});const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
const postMaterial=new T.ShaderMaterial({uniforms:{frame:{value:target.texture},time:{value:0}},vertexShader:DFRenderStyle.vertexShader,fragmentShader:DFRenderStyle.fragmentShader});postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMaterial));
const flashScene=new T.Scene(),flashMesh=new T.Mesh(new T.OctahedronGeometry(1,0),new T.MeshBasicMaterial({color:'#ffe7a0',transparent:true,opacity:.96}));flashScene.add(flashMesh);
function hud(){let p=world.player;$('hp').textContent=Math.ceil(p.hp);$('armor').textContent=Math.ceil(p.armor);$('healthfill').style.width=p.hp+'%';$('staminafill').style.width=p.stamina+'%';$('style').textContent=world.combo>1?world.combo+' CHAIN / '+world.style:world.style+' STYLE';$('reloadmeter').style.display=world.reload>0?'block':'none';$('reloadcursor').style.left=(1-world.reload/Math.max(.1,world.reloadDuration))*100+'%';$('ammo').textContent=String(world.ammo[world.weapon]).padStart(2,'0');$('reserve').textContent=' / '+world.reserve[world.weapon];$('weapon').textContent=['IRON SIX / PISTOL','BREACH / SHOTGUN','TWIN / SMG'][world.weapon];let count=world.ammo[world.weapon];$('rounds').innerHTML=Array.from({length:world.weapon===2?12:[6,2][world.weapon]},(_,i)=>`<i class="${i<(world.weapon===2?Math.ceil(count/2):count)?'':'empty'}"></i>`).join('');const boss=world.enemies.find(e=>e.boss),token=world.pickups.find(i=>i.type==='bounty'&&i.alive),target=world.bounty?world.extractions.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b):token||boss;
 $('objective').textContent=world.bounty?'증표 확보 · 탈출 지점으로 이동':boss?.alive?'계약 0'+level+' · 북쪽 중계소의 표적 제거':'표적 제거 · 현상금 증표 회수';
 const landmark=world.landmarks.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b);
 $('region').textContent=landmark.name+' / BLACK PINES';
 const angle=((yaw*180/Math.PI%360)+360)%360,directions=['N','NW','W','SW','S','SE','E','NE'];
 $('route').textContent=directions[Math.round(angle/45)%8]+' · '+(target?(world.bounty?target.name:'중계소 계약')+' '+Math.round(Math.hypot(target.x-p.x,target.z-p.z))+' m':'')+' · M 지도';
 $('loot').textContent='화물 '+world.cargo+' · 회수 가치 '+world.cash+' · 보관 '+totalCash;
 $('extraction').hidden=!world.extractionZone;$('extractionstatus').textContent=world.extractionZone?.name||'탈출 지점 방어';$('extractiontime').textContent=Math.max(0,world.extractionRequired-world.extractionProgress).toFixed(1)+' s';$('extractionfill').style.width=(100*world.extractionProgress/Math.max(.1,world.extractionRequired))+'%';
 const near=world.pickups.find(it=>it.alive&&it.type!=='barrel'&&Math.hypot(it.x-p.x,it.z-p.z)<2.5&&Math.abs((it.y||0)-p.y)<1.5),zone=world.nearExtraction();
 $('hint').textContent=near?'[ E ] '+({health:'구급상자',armor:'방탄 장비',ammo:'탄약',cargo:'회수 화물',bounty:'현상금 증표'})[near.type]:world.extractionZone?'탈출 '+Math.max(0,world.extractionRequired-world.extractionProgress).toFixed(1)+'초 · 구역 유지':zone?(world.bounty?'[ E ] '+zone.name+' 탈출 신호':'탈출 지점 · 중계소 증표 필요'):p.slide>0?'슬라이딩':!p.grounded?'공중':'';
 if($('minimap').style.display==='block')drawMap();}
function drawMap(){const canvas=$('minimap'),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,b=world.bounds,p=world.player,pad=12,scale=Math.min((w-pad*2)/(b.maxX-b.minX),(h-pad*2)/(b.maxZ-b.minZ)),sx=x=>pad+(x-b.minX)*scale,sz=z=>pad+(z-b.minZ)*scale;
 c.clearRect(0,0,w,h);c.strokeStyle='#778492';c.lineWidth=2;
 for(const route of world.routes){c.beginPath();route.points.forEach((p,i)=>i?c.lineTo(sx(p.x),sz(p.z)):c.moveTo(sx(p.x),sz(p.z)));c.stroke();}
 c.fillStyle='#596474';for(const wall of world.walls)if(wall.alive&&!['boundary','trunk'].includes(wall.kind))c.fillRect(sx(wall.x-wall.w/2),sz(wall.z-wall.d/2),Math.max(1,wall.w*scale),Math.max(1,wall.d*scale));
 c.font='9px monospace';c.textAlign='center';for(const l of world.landmarks){c.fillStyle=l.id==='relay'?'#d6b7b9':'#b8c4d0';c.fillRect(sx(l.x)-2,sz(l.z)-2,4,4);c.fillText(l.short,sx(l.x),sz(l.z)-6);}
 c.strokeStyle='#d9e4da';for(const ex of world.extractions){c.beginPath();c.arc(sx(ex.x),sz(ex.z),5,0,Math.PI*2);c.stroke();}
 c.fillStyle='#cbbb94';for(const item of world.pickups)if(item.alive&&!['barrel','bounty'].includes(item.type))c.fillRect(sx(item.x)-1,sz(item.z)-1,2,2);
 c.fillStyle='#d599a3';for(const e of world.enemies)if(e.alive&&e.alert&&Math.hypot(e.x-p.x,e.z-p.z)<45)c.fillRect(sx(e.x)-1.5,sz(e.z)-1.5,3,3);
 c.fillStyle='#fff';c.beginPath();c.arc(sx(p.x),sz(p.z),3,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.beginPath();c.moveTo(sx(p.x),sz(p.z));c.lineTo(sx(p.x)-Math.sin(yaw)*10,sz(p.z)-Math.cos(yaw)*10);c.stroke();}

function resize(){let w=Math.min(innerWidth-24,(innerHeight-24)*16/9),h=w*9/16;renderer.setSize(960,540,false);canvas.style.width=w+'px';canvas.style.height=h+'px';canvas.style.left=(innerWidth-w)/2+'px';canvas.style.top=(innerHeight-h)/2+'px';cam.aspect=gunCam.aspect=16/9;cam.updateProjectionMatrix();gunCam.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();
$('laser').onchange=weaponModel;$('suppressor').onchange=weaponModel;$('start').onclick=()=>start();$('restart').onclick=()=>{state='title';start(true);};$('fullscreen').onclick=()=>{document.documentElement.requestFullscreen?.().catch(()=>tell('브라우저 메뉴에서 전체 화면을 선택하세요'));};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ControlLeft','ControlRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.repeat)return;if(e.code==='Escape')pause();if(state!=='playing')return;if(e.code==='KeyL'){$('laser').checked=!$('laser').checked;weaponModel();}if(e.code==='Space')world.jump();if(e.code==='KeyX')world.dash();if(['ControlLeft','ControlRight','KeyC'].includes(e.code)){let f=(keys.KeyW?1:0)-(keys.KeyS?1:0),r=(keys.KeyD?1:0)-(keys.KeyA?1:0);if(!f&&!r)f=1;world.slide(-Math.sin(yaw)*f+Math.cos(yaw)*r,-Math.cos(yaw)*f-Math.sin(yaw)*r);}if(e.code==='KeyR')world.load();if(e.code==='KeyE')world.interact();if(e.code==='KeyF')shoot();if(e.code==='KeyM'){const visible=$('minimap').style.display!=='block';$('minimap').style.display=visible?'block':'none';$('maplegend').style.display=visible?'flex':'none';}if(/^Digit[123]$/.test(e.code)){world.switchWeapon(Number(e.code.at(-1))-1);hammer=null;weaponModel();}});
window.addEventListener('keyup',e=>keys[e.code]=false);window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&state==='playing')pause();});document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&state==='playing'){swayX=HC.clamp(swayX+e.movementX*.014,-1,1);swayY=HC.clamp(swayY+e.movementY*.014,-1,1);yaw-=e.movementX*.0024;pitch=HC.clamp(pitch-e.movementY*.0024,-1.05,1.05);}});canvas.addEventListener('mousedown',e=>{if(state!=='playing')return;if(e.button===0){mouseHeld=true;shoot();}if(e.button===2)aimDown=true;});window.addEventListener('mouseup',e=>{if(e.button===0)mouseHeld=false;if(e.button===2)aimDown=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
world=new HC.Mission(1);build();let previous=performance.now();function frame(now){let dt=Math.min(.05,(now-previous)/1000);previous=now;update(dt);requestAnimationFrame(frame);}requestAnimationFrame(frame);
window.addEventListener('error',e=>{$('notice').textContent='실행 오류: '+e.message;});
})();
