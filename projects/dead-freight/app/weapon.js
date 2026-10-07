/* Original articulated first-person viewmodel. All geometry is authored here. */
(function (root) {
  'use strict';
  function create(T, weapon = 0, options = {}) {
    const group = new T.Group();
    const ivory = new T.MeshStandardMaterial({color: '#ccd3d7', roughness: .62, metalness: .25});
    const edge = new T.MeshStandardMaterial({color: '#8994a3', roughness: .42, metalness: .5});
    const black = new T.MeshStandardMaterial({color: '#121923', roughness: .56, metalness: .35});
    const rubber = new T.MeshStandardMaterial({color: '#141922', roughness: .95});
    const leather = new T.MeshStandardMaterial({color: '#252d3a', roughness: .86});
    const seam = new T.MeshStandardMaterial({color: '#536071', roughness: .9});
    const cuff = new T.MeshStandardMaterial({color: '#b9c4ce', roughness: .96});
    const rust = new T.MeshStandardMaterial({color: '#764c54', roughness: .88});
    const boxGeo = new T.BoxGeometry(1, 1, 1);
    const jointGeo = new T.IcosahedronGeometry(1, 1);
    function box(x,y,z,w,h,d,material,parent=group) {
      const mesh=new T.Mesh(boxGeo,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;
    }
    function joint(point,radius,material,parent=group) {
      const mesh=new T.Mesh(jointGeo,material);mesh.position.fromArray(point);mesh.scale.setScalar(radius);parent.add(mesh);return mesh;
    }
    function bone(a,b,r1,r2,material,parent=group,sides=8) {
      const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from);
      const mesh=new T.Mesh(new T.CylinderGeometry(r2,r1,delta.length(),sides),material);
      mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());parent.add(mesh);return mesh;
    }
    function bevel(x,y,z,w,h,d,material,parent=group,amount=.008) {
      const shape=new T.Shape();shape.moveTo(-w/2,-h/2);shape.lineTo(w/2,-h/2);shape.lineTo(w/2,h/2);shape.lineTo(-w/2,h/2);shape.closePath();
      const geometry=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:amount,bevelThickness:amount,bevelSegments:1,steps:1});
      geometry.translate(0,0,-d/2);const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;
    }
    const slide=new T.Group();group.add(slide);
    bevel(0,.041,-.16,.164,.119,.46,ivory,slide,.008);
    bevel(0,.108,-.173,.105,.016,.39,edge,slide,.003);
    box(0,.123,-.35,.018,.013,.041,black,slide);
    box(0,.126,.044,.088,.022,.033,black,slide);
    box(0,.137,.045,.038,.011,.038,ivory,slide);
    box(.084,.072,-.06,.004,.043,.1,black,slide); // ejection port
    box(.088,.063,-.035,.007,.013,.026,edge,slide); // extractor
    box(.087,.047,-.065,.005,.012,.046,edge,slide); // chamber edge
    for(let side of [-1,1]) {
      for(let i=0;i<8;i++)box(side*.087,.038,.023-i*.015,.008,.085,.004,black,slide).rotation.x=-.18;
      for(let i=0;i<4;i++)box(side*.087,.033,-.31-i*.016,.008,.071,.005,black,slide).rotation.x=.16;
      box(side*.088,.012,-.15,.003,.009,.08,edge,slide);
    }
    bevel(0,-.054,-.14,.144,.051,.4,black,group,.006);
    box(0,-.079,-.24,.103,.02,.13,edge);
    for(let i=0;i<4;i++)box(0,-.093,-.2-i*.023,.1,.01,.009,black);
    const grip=bevel(0,-.208,.055,.117,.252,.142,black,group,.008);grip.rotation.x=-.22;
    bevel(0,-.079,.087,.166,.057,.127,black,group,.006);
    box(.085,-.077,.067,.017,.014,.055,edge); // slide release
    bone([-.075,-.072,.075],[-.075,-.039,.087],.012,.012,edge);
    for(let side of [-1,1])for(let row=0;row<7;row++)for(let col=0;col<3;col++) {
      const mark=box(side*.064,-.14-row*.024,.015+col*.036,.007,.012,.014,rubber);mark.rotation.x=.25;
    }
    const magazine=new T.Group();group.add(magazine);
    bevel(0,-.282,.072,.092,.16,.112,edge,magazine,.004);
    bevel(0,-.367,.091,.149,.026,.17,black,magazine,.004);
    // Squared, bevelled trigger guard with a real open center.
    const outline=new T.Shape();outline.moveTo(-.106,-.033);outline.lineTo(.065,-.033);outline.lineTo(.083,-.095);outline.quadraticCurveTo(.065,-.15,.014,-.151);outline.lineTo(-.095,-.13);outline.closePath();
    const hole=new T.Path();hole.moveTo(-.082,-.051);hole.lineTo(-.075,-.112);hole.lineTo(.014,-.13);hole.quadraticCurveTo(.058,-.129,.061,-.091);hole.lineTo(.048,-.051);hole.closePath();outline.holes.push(hole);
    const guard=new T.Mesh(new T.ExtrudeGeometry(outline,{depth:.023,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,steps:1}),black);guard.rotation.y=Math.PI/2;guard.position.set(-.011,0,-.045);group.add(guard);
    const trigger=new T.Group();trigger.position.set(0,-.058,-.075);group.add(trigger);
    bone([0,0,0],[0,-.059,.014],.009,.008,edge,trigger,6);
    bone([0,-.059,.014],[0,-.069,.006],.008,.006,edge,trigger,6);
    const hammer=bevel(0,.098,.117,.041,.044,.034,black,group,.003);
    bone([0,.036,-.365],[0,.036,-.417],.035,.035,edge,group,12);
    const suppressor=new T.Group();suppressor.visible=options.suppressed!==false;group.add(suppressor);
    bone([0,.036,-.39],[0,.036,-.77],.071,.079,black,suppressor,14);
    bone([0,.036,-.735],[0,.036,-.80],.080,.076,rust,suppressor,14);
    bone([0,.036,-.798],[0,.036,-.807],.047,.047,black,suppressor,14);
    bone([0,.036,-.807],[0,.036,-.81],.028,.028,rubber,suppressor,12);
    for(let z of [-.421,-.468,-.523,-.64])bone([0,.036,z],[0,.036,z-.012],.073,.073,edge,suppressor,14);
    const laserModule=new T.Group();laserModule.visible=!!options.laser;group.add(laserModule);
    bevel(.016,-.12,-.279,.115,.069,.145,black,laserModule,.005);
    bone([.042,-.116,-.35],[.042,-.116,-.364],.021,.021,edge,laserModule,10);
    bone([.042,-.116,-.365],[.042,-.116,-.368],.014,.014,rust,laserModule,10);
    box(-.048,-.119,-.272,.006,.035,.046,rubber,laserModule);
    box(.072,-.103,-.251,.006,.017,.032,ivory,laserModule);
    // Right hand: separate palm, thenar pad, articulated phalanges and an index in the guard.
    const right=new T.Group();group.add(right);
    const palm=joint([.071,-.205,.14],.107,leather,right);palm.scale.set(.78,1.18,.66).multiplyScalar(.107);
    const heel=joint([.049,-.291,.155],.075,rubber,right);heel.scale.z*=.7;
    const fingerRoots=[];
    for(let i=0;i<3;i++) {
      const y=-.154-i*.049,z=.045+i*.015,r=.025-i*.0015;
      const finger=new T.Group();finger.position.set(.075,y,z);right.add(finger);fingerRoots.push(finger);
      const points=[[.015,0,.035],[.043,-.008,-.014],[.025,-.015,-.068],[-.026,-.011,-.077]];
      for(let j=0;j<3;j++)bone(points[j],points[j+1],r-j*.002,r-(j+1)*.002,leather,finger,8);
      points.slice(1,3).forEach(p=>joint(p,r*.97,rubber,finger));
      bevel(.027,.012,-.015,.044,.016,.036,rubber,finger,.003);
      bone([.005,.02,.032],[.036,.013,-.012],.0025,.0025,seam,finger,5);
    }
    const index=new T.Group();index.position.set(.055,-.104,.029);right.add(index);
    const ip=[[.014,.015,.025],[.032,.013,-.043],[-.012,-.006,-.076],[-.052,-.017,-.079]];
    for(let i=0;i<3;i++)bone(ip[i],ip[i+1],.023-i*.003,.021-i*.003,leather,index);
    joint(ip[1],.022,rubber,index);joint(ip[2],.019,rubber,index);
    // Thumb passes up the near side and rests below the receiver.
    bone([.021,-.172,.197],[-.055,-.133,.135],.035,.03,leather,right);
    bone([-.055,-.133,.135],[-.09,-.075,.063],.03,.021,leather,right);
    joint([-.055,-.133,.135],.032,rubber,right);
    bone([.052,-.27,.166],[.112,-.407,.24],.073,.086,leather,right,10);
    bone([.107,-.393,.232],[.13,-.44,.27],.088,.092,cuff,right,10);
    bone([.132,-.444,.271],[.31,-.78,.52],.1,.151,rubber,right,10);
    for(let i=0;i<3;i++)bone([.123+i*.012,-.446-i*.035,.28+i*.02],[.14+i*.016,-.465-i*.036,.30+i*.02],.101+i*.003,.101+i*.003,leather,right,9);
    box(.157,-.393,.19,.11,.037,.023,black,right).rotation.z=.27;
    // Support hand cups the grip, and departs with the magazine during reload.
    const support=new T.Group();group.add(support);
    const supportPalm=joint([-.105,-.232,.108],.09,leather,support);supportPalm.scale.y*=1.2;supportPalm.scale.z*=.68;
    for(let i=0;i<4;i++) {
      const y=-.164-i*.039,z=.001+i*.017;
      const pts=[[-.107,y,z+.036],[-.104,y+.01,z-.025],[-.055,y+.008,z-.055],[-.016,y-.008,z-.044]];
      for(let j=0;j<3;j++)bone(pts[j],pts[j+1],.022-j*.002,.02-j*.002,leather,support);
      joint(pts[1],.023,rubber,support);box(-.12,y+.025,z+.002,.025,.016,.033,rubber,support).rotation.z=.18;
    }
    bone([-.138,-.196,.11],[-.117,-.096,.047],.034,.026,leather,support);
    bone([-.117,-.096,.047],[-.088,-.075,-.025],.026,.021,leather,support);
    bone([-.123,-.3,.152],[-.237,-.402,.272],.068,.09,leather,support,10);
    bone([-.23,-.396,.266],[-.271,-.433,.308],.092,.098,cuff,support,10);
    bone([-.27,-.433,.31],[-.54,-.66,.60],.104,.139,rubber,support,10);
    for(let i=0;i<4;i++)bone([-.287-i*.027,-.44-i*.023,.32+i*.029],[-.31-i*.027,-.461-i*.023,.347+i*.029],.105+i*.003,.105+i*.003,leather,support,9);
    if(weapon===1){bevel(0,-.045,-.41,.2,.12,.24,black);bone([.09,.03,-.4],[.09,.03,-.79],.037,.037,ivory);}
    if(weapon===2){bevel(0,-.25,-.17,.085,.32,.10,black);bevel(.112,.027,-.2,.052,.10,.22,ivory);}
    group.position.set(.16,-.19,-.55);group.rotation.set(.22,.45,-.09);
    group.userData={slide,hammer,trigger,index,indexTip:new T.Vector3(...ip[3]),support,magazine,right,fingerRoots,suppressor,laserModule,laserEmitter:new T.Vector3(.042,-.116,-.369),muzzle:new T.Vector3(0,.036,options.suppressed===false?-.428:-.825)};
    return group;
  }
  root.DFWeapon={create};
})(globalThis);
