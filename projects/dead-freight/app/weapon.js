/* Original articulated first-person viewmodel. All geometry is authored here. */
(function (root) {
  'use strict';
  function create(T, weapon = 0, options = {}) {
    const group = new T.Group();
    const ivory = new T.MeshStandardMaterial({color: '#ccd3d7', roughness: .62, metalness: .25});
    const edge = new T.MeshStandardMaterial({color: '#8994a3', roughness: .42, metalness: .5});
    const black = new T.MeshStandardMaterial({color: '#121923', roughness: .56, metalness: .35});
    const rubber = new T.MeshStandardMaterial({color: '#141922', roughness: .95});
    const leather = new T.MeshStandardMaterial({color: '#626b78', roughness: .92});
    const dorsal = new T.MeshStandardMaterial({color: '#87909b', roughness: .94});
    const recess = new T.MeshStandardMaterial({color: '#222b38', roughness: 1});
    const skin = new T.MeshStandardMaterial({color: '#d9dcd8', roughness: .83, vertexColors:true});
    skin.name='exposed-wrist';
    const seam = new T.MeshStandardMaterial({color: '#536071', roughness: .9});
    const cuff = new T.MeshStandardMaterial({color: '#171f2a', roughness: .96});
    const rust = new T.MeshStandardMaterial({color: '#a56672', emissive:'#291218', emissiveIntensity:.28, roughness: .78, metalness:.12});
    rust.name='oxide-red-accent';
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
    // A machined six-sided section, not a rectangular block: narrow crown, bevel shoulders, vertical side flats.
    const receiverProfile=new T.Shape();receiverProfile.moveTo(-.074,-.055);receiverProfile.lineTo(.074,-.055);receiverProfile.lineTo(.083,-.026);receiverProfile.lineTo(.080,.022);receiverProfile.lineTo(.058,.060);receiverProfile.lineTo(-.058,.060);receiverProfile.lineTo(-.080,.022);receiverProfile.lineTo(-.083,-.026);receiverProfile.closePath();
    const receiverGeo=new T.ExtrudeGeometry(receiverProfile,{depth:.452,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:1,steps:1});receiverGeo.translate(0,0,-.226);
    const receiver=new T.Mesh(receiverGeo,ivory);receiver.position.set(0,.041,-.16);slide.add(receiver);
    for(let side of [-1,1]){bone([side*.08,-.006,-.379],[side*.08,-.006,.061],.002,.002,edge,slide,5);box(side*.076,.088,-.16,.005,.006,.424,edge,slide).rotation.z=side*.52;}
    bevel(0,.108,-.173,.105,.016,.39,edge,slide,.003);
    box(0,.13,-.35,.018,.018,.041,black,slide);
    box(0,.112,.044,.088,.014,.033,black,slide);
    for(const side of [-1,1]){box(side*.032,.129,.044,.020,.026,.033,black,slide);box(side*.032,.13,.062,.006,.005,.003,ivory,slide);}
    box(0,.133,-.327,.004,.005,.003,ivory,slide);
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
    // Stepped mount, long black body and a broad oxide-red front shroud echo the reference's silhouette.
    bone([0,.036,-.399],[0,.036,-.429],.047,.063,edge,suppressor,20);
    bone([0,.036,-.43],[0,.036,-.614],.069,.075,black,suppressor,20);
    bone([0,.036,-.616],[0,.036,-.628],.077,.077,edge,suppressor,20);
    bone([0,.036,-.630],[0,.036,-.788],.079,.076,rust,suppressor,20);
    bone([0,.036,-.789],[0,.036,-.805],.076,.064,rust,suppressor,20);
    bone([0,.036,-.805],[0,.036,-.808],.044,.044,black,suppressor,18);
    bone([0,.036,-.808],[0,.036,-.813],.026,.026,rubber,suppressor,16);
    for(let z of [-.447,-.461,-.597])bone([0,.036,z],[0,.036,z-.004],.073,.073,edge,suppressor,20);
    // Recessed seam, small cap-index marks and a front chamfer; restrained, not a field of decorative greebles.
    for(let angle of [.25,2.34,4.44]){let x=Math.cos(angle)*.077,y=.036+Math.sin(angle)*.077;bone([x,y,-.758],[x,y,-.777],.0022,.0022,black,suppressor,5);}
    const laserModule=new T.Group();laserModule.visible=!!options.laser;group.add(laserModule);
    bevel(.016,-.12,-.279,.115,.069,.145,black,laserModule,.005);
    bone([.042,-.116,-.35],[.042,-.116,-.364],.021,.021,edge,laserModule,10);
    bone([.042,-.116,-.365],[.042,-.116,-.368],.014,.014,rust,laserModule,10);
    box(-.048,-.119,-.272,.006,.035,.046,rubber,laserModule);
    box(.072,-.103,-.251,.006,.017,.032,ivory,laserModule);
    // Right hand: separate palm, thenar pad, articulated phalanges and an index in the guard.
    const right=new T.Group();group.add(right);
    const palm=joint([.04,-.18,.085],.098,leather,right);palm.scale.set(.78,1.12,.68).multiplyScalar(.098);
    const heel=joint([.018,-.257,.10],.067,recess,right);heel.scale.set(.94,.75,.69).multiplyScalar(.067);
    // Broad leather panels, not isolated beads: seam recesses and compressed grip folds.
    const back=joint([.061,-.174,.133],.079,dorsal,right);back.scale.set(.70,1.10,.28).multiplyScalar(.079);
    for(let i=0;i<3;i++){bone([.015,-.163-i*.031,.15],[.077,-.17-i*.033,.151],.0025,.002,recess,right,5);}
    bone([.03,-.112,.148],[.075,-.24,.143],.0022,.002,seam,right,5);
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
    // Glove opening, exposed wrist, then sleeve: the pale area is anatomical skin, not a cuff.
    bone([.007,-.233,.09],[.011,-.26,.097],.066,.066,recess,right,12);
    function wrist(a,b,r1,r2,parent){
      const mesh=bone(a,b,r1,r2,skin,parent,16),normal=mesh.geometry.attributes.normal,colors=[];
      // Gentle authored occlusion under glove/sleeve edges, retained in the four-tone palette.
      const pos=mesh.geometry.attributes.position,L=new T.Vector3(...a).distanceTo(new T.Vector3(...b));
      for(let i=0;i<normal.count;i++) {const u=pos.getY(i)/L+.5,edgeShade=.80+.20*Math.sin(Math.PI*Math.max(0,Math.min(1,u))),side=.71+.29*Math.max(0,normal.getZ(i));const shade=edgeShade*side;colors.push(shade,shade,shade);}
      mesh.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));return mesh;
    }
    const rightWrist=wrist([.005,-.234,.083],[.025,-.344,.112],.067,.078,right);
    // Two thin flexion creases, subtle enough not to resemble cloth bands.
    bone([-.025,-.283,.137],[.029,-.291,.155],.0018,.0015,seam,right,5);
    bone([-.022,-.297,.142],[.024,-.304,.158],.0016,.0015,seam,right,5);
    bone([.025,-.337,.111],[.043,-.372,.13],.079,.083,cuff,right,12);
    bone([.043,-.369,.13],[.15,-.67,.22],.085,.133,rubber,right,12);
    for(let i=0;i<3;i++)bone([.052+i*.023,-.39-i*.069,.142+i*.021],[.069+i*.023,-.417-i*.07,.151+i*.021],.086+i*.01,.088+i*.01,recess,right,10);
    box(.097,-.381,.161,.057,.028,.017,recess,right).rotation.z=-.22;
    // Support hand cups the grip, and departs with the magazine during reload.
    const support=new T.Group();group.add(support);
    const supportPalm=joint([-.095,-.215,.065],.085,leather,support);supportPalm.scale.y*=1.13;supportPalm.scale.z*=.66;
    const supportBack=joint([-.139,-.223,.077],.068,dorsal,support);supportBack.scale.set(.34,1.17,.67).multiplyScalar(.068);
    bone([-.148,-.168,.086],[-.151,-.269,.081],.002,.002,seam,support,5);
    for(let i=0;i<4;i++) {
      const y=-.164-i*.039,z=.001+i*.017;
      const pts=[[-.107,y,z+.036],[-.104,y+.01,z-.025],[-.055,y+.008,z-.055],[-.016,y-.008,z-.044]];
      for(let j=0;j<3;j++)bone(pts[j],pts[j+1],.022-j*.002,.02-j*.002,leather,support);
      joint(pts[1],.023,rubber,support);box(-.12,y+.025,z+.002,.025,.016,.033,rubber,support).rotation.z=.18;
    }
    bone([-.138,-.196,.11],[-.117,-.096,.047],.034,.026,leather,support);
    bone([-.117,-.096,.047],[-.088,-.075,-.025],.026,.021,leather,support);
    bone([-.109,-.264,.068],[-.168,-.314,.050],.063,.070,recess,support,12);
    const leftWrist=wrist([-.162,-.307,.048],[-.215,-.35,.048],.064,.07,support);
    bone([-.211,-.346,.048],[-.245,-.374,.060],.076,.081,cuff,support,12);
    bone([-.241,-.37,.058],[-.51,-.56,.15],.083,.123,rubber,support,12);
    for(let i=0;i<3;i++)bone([-.261-i*.055,-.386-i*.036,.067+i*.018],[-.279-i*.055,-.40-i*.036,.073+i*.018],.085+i*.008,.085+i*.008,recess,support,10);
    if(weapon===1){bevel(0,-.045,-.41,.2,.12,.24,black);bone([.09,.03,-.4],[.09,.03,-.79],.037,.037,ivory);}
    if(weapon===2){bevel(0,-.25,-.17,.085,.32,.10,black);bevel(.112,.027,-.2,.052,.10,.22,ivory);}
    group.position.fromArray(DFWeapon.poses.hip.position);group.rotation.set(...DFWeapon.poses.hip.rotation);
    group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    group.userData={rightWrist,leftWrist,slide,hammer,trigger,index,indexTip:new T.Vector3(...ip[3]),support,magazine,right,fingerRoots,suppressor,laserModule,laserEmitter:new T.Vector3(.042,-.116,-.369),muzzle:new T.Vector3(0,.036,options.suppressed===false?-.428:-.825)};
    return group;
  }
  root.DFWeapon={create,poses:{hip:{position:[.18,-.12,-.90],rotation:[.28,.38,-.09]},ads:{position:[0,-.13,-.65],rotation:[.005,0,0]}}};
})(globalThis);
