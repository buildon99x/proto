/* Original articulated utility hands and procedural props; shares no weapon resources. */
(function(root){
'use strict';
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
function pose(a={}){
 const p=a.progress||0,stage=a.stage||'idle',present=stage==='present'?ease(p):['ready','aim','use','recover'].includes(stage)?1:0;
 const use=stage==='use'?ease(p):0,lower=stage==='lower'?ease(p):stage==='recover'?1-ease(p):a.active?1:0;
 const visibility=a.active&&stage!=='lower'&&!(stage==='recover'&&p>.95);
 const retract=stage==='recover'?ease(p):0;
 if(stage==='recover'&&a.recoverFrom){const from=pose(a.recoverFrom),u=ease(p);return {...from,visible:from.visible&&p<.55,lower:from.lower*(1-ease(from.visible?(p-.38)/.62:p)),y:from.y-.5*ease(p/.55),z:from.z+.15*ease(p/.55),pinPull:a.cancelled?from.pinPull*(1-ease(p/.6)):from.pinPull};}
 const result={visible:visibility,lower,x:.30,y:-.40-(1-present)*.45-retract*.5,z:-.82+retract*.15,
  pitch:stage==='use'&&a.itemId==='frag'?.12-.75*Math.sin(use*Math.PI):.12,roll:-.14,
  leftX:-.25,leftY:stage==='use'&&a.itemId!=='frag'?Math.sin(p*Math.PI*4)*.008:0,leftZ:-.035,leftRotX:-.35,leftRotY:.2,leftRotZ:-.55,
  rightX:0,rightY:0,rightZ:0,rightRotZ:.08,pinPull:stage==='use'&&a.itemId==='frag'?ease((p-.22)/.28):0,pinReach:a.itemId==='frag'?(stage==='present'?ease((p-.35)/.65):['ready','aim','use'].includes(stage)?1:0):0,treatment:stage==='use'&&['bandage','medkit'].includes(a.itemId)?ease(p/.2):0,
  grip:a.itemId==='frag'&&stage==='use'?1-ease((p-.50)/.16):a.itemId==='frag'&&a.committed?0:1,propVisible:!a.committed||a.itemId!=='frag',ringVisible:!(a.itemId==='frag'&&stage==='use'&&p>.2),use};
 if(stage==='use'&&a.itemId!=='frag'){result.rightX=-.16*use;result.rightY=-.12*use;result.rightRotZ=.08+.65*use;result.leftRotZ=-.55+.2*use;}
 if(a.itemId==='frag'){Object.assign(result,{leftX:-.09,leftY:.075,leftRotX:-.3,leftRotY:.3,leftRotZ:-.15});if(stage==='use'){const pull=ease((p-.16)/.28);result.leftX-=.22*pull;result.leftY-=.12*pull;result.rightZ=-.19*use;result.rightY=.15*Math.sin(use*Math.PI);}}
 return result;
}
function create(T){
 const group=new T.Group();group.name='utility-viewmodel';const glove=new T.MeshStandardMaterial({color:'#465661',roughness:.87}),panel=new T.MeshStandardMaterial({color:'#7b8c97',roughness:.91}),cloth=new T.MeshStandardMaterial({color:'#303c48',roughness:1}),ivory=new T.MeshStandardMaterial({color:'#dae1df',roughness:.73}),red=new T.MeshStandardMaterial({color:'#8b2434',roughness:.8}),wrist=new T.MeshStandardMaterial({color:'#b6aea7',roughness:.95}),metal=new T.MeshStandardMaterial({color:'#91a09f',metalness:.18,roughness:.5}),pinMetal=new T.MeshStandardMaterial({color:'#d2dcd9',metalness:.35,roughness:.3});
 function box(parent,name,pos,size,mat){const rounded=name.startsWith('finger-')||name==='thumb',palm=name==='glove-palm',radius=Math.min(size[0],size[2])*.5,geometry=rounded?new T.CapsuleGeometry(radius,Math.max(.001,size[1]-radius*2),3,8):palm?new T.SphereGeometry(1,12,8):new T.BoxGeometry(...size),mesh=new T.Mesh(geometry,mat);if(palm)mesh.scale.set(size[0]*.62,size[1]*.58,size[2]*.65);else if(rounded)mesh.scale.z=size[2]/(radius*2);mesh.name=name;mesh.position.set(...pos);parent.add(mesh);mesh.castShadow=mesh.receiveShadow=true;return mesh;}
 function hand(side){const h=new T.Group();h.name=side+'-utility-hand';group.add(h);const mirror=side==='left'?-1:1;
  box(h,'glove-palm',[0,0,0],[.105,.13,.064],glove);box(h,'glove-back-panel',[0,.005,.036],[.078,.09,.012],panel);
  box(h,'glove-cuff',[0,-.083,.009],[.105,.033,.077],cloth);box(h,'exposed-wrist',[0,-.12,.023],[.084,.045,.065],wrist);box(h,'sleeve',[0,-.285,.10],[.12,.28,.10],cloth).rotation.x=-.32;
  const fingers=[];for(let i=0;i<4;i++){const finger=new T.Group();finger.position.set((i-1.5)*.024,.065,0);h.add(finger);const middle=new T.Group(),tip=new T.Group();box(finger,'finger-proximal',[0,.019,0],[.022,.038,.027],glove);middle.position.y=.038;finger.add(middle);box(middle,'finger-middle',[0,.014,0],[.021,.029,.024],glove);tip.position.y=.029;middle.add(tip);box(tip,'finger-tip',[0,.012,0],[.020,.023,.022],glove);fingers.push([finger,middle,tip]);}
  const thumb=new T.Group();thumb.position.set(mirror*.058,.014,0);thumb.rotation.z=-mirror*.7;h.add(thumb);box(thumb,'thumb',[0,.029,0],[.031,.058,.035],glove);h.userData={fingers,thumb};return h;
 }
 const right=hand('right'),left=hand('left'),props={};
 const frag=new T.Group();frag.name='held-frag';right.add(frag);frag.position.set(0,.079,-.051);
 const body=new T.Mesh(new T.SphereGeometry(.058,10,8),metal);body.scale.y=1.2;frag.add(body);box(frag,'grenade-cap',[0,.072,0],[.037,.025,.03],metal);box(frag,'grenade-lever',[.047,.029,0],[.012,.12,.027],ivory);const ring=new T.Mesh(new T.TorusGeometry(.016,.003,5,12),pinMetal);ring.name='grenade-pin-ring';ring.position.set(-.027,.084,0);frag.add(ring);props.frag=frag;const pulledPin=new T.Group();pulledPin.name='held-pulled-pin';group.add(pulledPin);const pulledRing=new T.Mesh(new T.TorusGeometry(.016,.003,5,12),pinMetal);pulledPin.add(pulledRing);box(pulledPin,'pin-stem',[.013,-.016,0],[.003,.032,.003],pinMetal);pulledPin.visible=false;
 for(const id of ['bandage','medkit','scanner']){const g=new T.Group();g.name='held-'+id;right.add(g);g.position.set(0,.075,-.05);props[id]=g;
  const contact=new T.Object3D();contact.name='treatment-contact';contact.position.z=id==='bandage'?-.0375:-.025;g.add(contact);g.userData.contact=contact;
  box(g,'utility-body',[0,0,0],id==='bandage'?[.09,.075,.075]:[.10,.15,.05],id==='scanner'?metal:ivory);
  if(id==='scanner'){box(g,'scanner-screen',[0,.02,.028],[.068,.07,.005],cloth);box(g,'scanner-indicator',[0,.02,.032],[.045,.008,.004],ivory);}else{box(g,'medical-mark-horizontal',[0,0,.041],[.056,.015,.006],red);box(g,'medical-mark-vertical',[0,0,.042],[.015,.05,.006],red);}
 }
 const dressing=new T.Group();dressing.name='wrist-field-dressing';left.add(dressing);dressing.position.set(0,-.12,.06);box(dressing,'dressing-pad',[0,0,0],[.07,.034,.008],ivory);for(const side of [-1,1])box(dressing,'dressing-tape',[side*.035,0,-.01],[.012,.031,.029],ivory);dressing.visible=false;
 glove.name='utility-glove';panel.name='utility-glove-panel';cloth.name='utility-sleeve';wrist.name='utility-wrist';metal.name='utility-metal';ivory.name='utility-ivory';pinMetal.name='utility-pin';
 group.userData={right,left,props,ring,pulledPin,dressing,pinError:0,treatmentError:0};group.visible=false;return group;
}
function apply(group,a){const V=group.position.constructor,p=pose(a),v=group.userData;group.visible=p.visible;group.position.set(p.x,p.y,p.z);group.rotation.set(p.pitch,0,p.roll);v.right.position.set(p.rightX,p.rightY,p.rightZ);v.right.rotation.set(-.12,0,p.rightRotZ);v.left.position.set(p.leftX,-.025+p.leftY,p.leftZ);v.left.rotation.set(p.leftRotX,p.leftRotY,p.leftRotZ);
 for(const [id,g] of Object.entries(v.props))g.visible=id===a.itemId&&p.propVisible;
 v.ring.visible=p.pinPull<1e-7;v.pulledPin.visible=false;v.dressing.visible=['bandage','medkit'].includes(a.itemId)&&p.treatment>.99&&(a.progress>.3||a.stage==='recover');
 for(const h of [v.right,v.left])for(const [base,middle,tip] of h.userData.fingers){const grip=h===v.left&&a.itemId==='frag'?.48:p.grip;base.rotation.x=-.6*grip;middle.rotation.x=-1.1*grip;tip.rotation.x=-.8*grip;}
 // Contact constraints are solved in rig coordinates after all authored joints.
 group.updateMatrixWorld(true);
 if(a.itemId==='frag'&&p.pinReach>0){
  const target=group.worldToLocal(v.ring.getWorldPosition(new V()));target.x-=.20*p.pinPull;target.y+=.035*p.pinPull;target.z+=.025*p.pinPull;
  const tip=v.left.userData.fingers[3][2],contact=group.worldToLocal(tip.localToWorld(new V(0,.023,0))),delta=target.clone().sub(contact);
  v.left.position.addScaledVector(delta,p.pinReach);group.updateMatrixWorld(true);
  const reached=group.worldToLocal(tip.localToWorld(new V(0,.023,0)));v.pinError=reached.distanceTo(target);
  v.pulledPin.position.copy(reached);v.pulledPin.rotation.copy(v.left.rotation);v.pulledPin.visible=p.pinPull>=1e-7&&group.visible;
 }
 if(p.treatment>0){
  const target=group.worldToLocal(v.left.localToWorld(new V(0,-.12,.06))),contactNode=v.props[a.itemId].userData.contact,contact=group.worldToLocal(contactNode.getWorldPosition(new V()));
  v.right.position.addScaledVector(target.clone().sub(contact),p.treatment);group.updateMatrixWorld(true);
  v.treatmentError=group.worldToLocal(contactNode.getWorldPosition(new V())).distanceTo(target);
 }
 return p;
}
function lighting(T){
 const lights=new T.Group();lights.name='utility-only-lighting';
 const ambient=new T.HemisphereLight('#d9e4e7','#263342',1.25);ambient.name='utility-ambient';lights.add(ambient);
 const key=new T.DirectionalLight('#f1f0e9',3.0);key.name='utility-key';key.position.set(-1.2,1.8,1.5);key.target.position.set(.18,-.35,-.8);key.castShadow=true;key.shadow.mapSize.set(512,512);Object.assign(key.shadow.camera,{left:-1,right:1,top:.7,bottom:-1.2,near:.1,far:6});key.shadow.camera.updateProjectionMatrix();key.shadow.bias=-.00012;key.shadow.normalBias=.003;key.shadow.radius=1.5;lights.add(key,key.target);
 const fill=new T.DirectionalLight('#c6d4de',2.2);fill.name='utility-frontal-fill';fill.position.set(.1,.05,2);fill.target.position.set(.2,-.4,-.8);lights.add(fill,fill.target);
 return lights;
}
root.DFItemView={create,apply,pose,lighting};
})(globalThis);
