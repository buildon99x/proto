/* Original articulated first-person viewmodel. All geometry is authored here. */
(function (root) {
  'use strict';
  function create(T, weapon = 0, options = {}) {
    if(weapon===3)return createRifle(T,options);
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
    group.userData.weapon=weapon;group.userData.ejectionPort=new T.Vector3(.105,.06,-.04);group.userData.attachmentOrigins={muzzle:group.userData.muzzle.clone(),laser:group.userData.laserEmitter.clone(),ejection:group.userData.ejectionPort.clone()};rememberNeutral(group);
    return group;
  }
  // The rifle is its own receiver/stock/handguard assembly; no pistol geometry is scaled up.
  function createRifle(T, options = {}) {
    const group=new T.Group();group.name='field-rifle-viewmodel';
    const material=(name,color,roughness=.65,metalness=.25)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});m.name=name;return m;};
    const ivory=material('rifle-ceramic-ivory','#c8d0d4',.62,.28),edge=material('rifle-machined-edge','#818e9b',.48,.55),black=material('rifle-graphite','#18202a',.6,.4),recess=material('rifle-recess','#0c131d',.9,.12),rubber=material('rifle-rubber','#222a33',.96,.02),glove=material('rifle-glove','#515d69',.96,0),panel=material('rifle-glove-panels','#76818c',.93,0),seam=material('rifle-glove-seams','#303b48',.98,0),rust=material('oxide-red-accent','#965e68',.8,.14),skin=material('exposed-wrist','#d1d6d3',.86,0);
    skin.vertexColors=true;
    const boxGeo=new T.BoxGeometry(1,1,1),jointGeo=new T.IcosahedronGeometry(1,1);
    function box(name,p,s,m,parent=group){const o=new T.Mesh(boxGeo,m);o.name=name;o.position.fromArray(p);o.scale.fromArray(s);parent.add(o);return o;}
    function bone(name,a,b,r1,r2,m,parent=group,sides=10){const p=new T.Vector3(...a),q=new T.Vector3(...b),d=q.clone().sub(p);const o=new T.Mesh(new T.CylinderGeometry(r2,r1,d.length(),sides),m);o.name=name;o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());parent.add(o);return o;}
    function pad(name,p,s,m,parent=group){const o=new T.Mesh(jointGeo,m);o.name=name;o.position.fromArray(p);o.scale.fromArray(s);parent.add(o);return o;}
    function section(name,z,y,w,h,d,m,parent=group){const a=Math.min(w,h)*.19,shape=new T.Shape();shape.moveTo(-w/2+a,-h/2);shape.lineTo(w/2-a,-h/2);shape.lineTo(w/2,-h/2+a);shape.lineTo(w/2,h/2-a);shape.lineTo(w/2-a,h/2);shape.lineTo(-w/2+a,h/2);shape.lineTo(-w/2,h/2-a);shape.lineTo(-w/2,-h/2+a);shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1});geo.translate(0,0,-d/2);const o=new T.Mesh(geo,m);o.name=name;o.position.set(0,y,z);parent.add(o);return o;}
    function side(name,points,width,m,parent=group,holes=[]){const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();for(const points of holes){const hole=new T.Path();points.forEach(([z,y],i)=>i?hole.lineTo(-z,y):hole.moveTo(-z,y));hole.closePath();shape.holes.push(hole);}const geo=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1});geo.translate(0,0,-width/2);const o=new T.Mesh(geo,m);o.name=name;o.rotation.y=Math.PI/2;parent.add(o);return o;}
    function wrist(name,a,b,r1,r2,parent){const o=bone(name,a,b,r1,r2,skin,parent,14),pos=o.geometry.attributes.position,n=o.geometry.attributes.normal,L=new T.Vector3(...a).distanceTo(new T.Vector3(...b)),colors=[];for(let i=0;i<pos.count;i++){const t=Math.max(0,Math.min(1,pos.getY(i)/L+.5)),v=(.81+.19*Math.sin(t*Math.PI))*(.76+.24*Math.max(0,n.getZ(i)));colors.push(v,v,v);}o.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));return o;}

    const receiver=section('rifle-upper-receiver',-.10,.035,.131,.118,.41,ivory);
    side('rifle-lower-receiver',[[.09,-.012],[-.31,-.012],[-.33,-.116],[-.18,-.132],[-.147,-.069],[-.027,-.072],[.045,-.107],[.105,-.088]],.118,black);
    for(const s of [-1,1]){
      box('receiver-side-seam',[s*.067,.006,-.117],[.003,.007,.34],edge);
      bone('receiver-takedown-pin',[s*.063,-.035,.052],[s*.071,-.035,.052],.009,.009,edge);
      bone('receiver-front-pin',[s*.063,-.035,-.251],[s*.071,-.035,-.251],.007,.007,edge);
      box('magwell-bevel',[s*.061,-.094,-.245],[.006,.014,.125],edge);
    }
    box('ejection-port-recess',[.068,.047,-.063],[.004,.042,.117],recess);
    const slide=new T.Group();slide.name='rifle-moving-bolt';slide.position.set(.072,.047,-.064);group.add(slide);
    box('bolt-carrier',[0,0,0],[.006,.027,.068],edge,slide);
    box('bolt-extractor',[.004,-.007,.017],[.005,.008,.016],black,slide);
    box('ejection-port-deflector',[.083,.037,.019],[.025,.051,.025],black).rotation.y=-.22;
    box('charging-handle',[0,.092,.115],[.13,.018,.025],black);
    box('bolt-release',[-.072,-.004,-.108],[.018,.032,.041],edge);
    bone('selector-shaft',[-.062,-.044,.012],[-.074,-.044,.012],.012,.012,black);
    box('selector-lever',[-.077,-.047,-.008],[.012,.015,.042],edge).rotation.x=-.34;
    box('selector-mark',[-.074,-.023,.012],[.004,.009,.006],rust);

    const stock=new T.Group();stock.name='rifle-stock';group.add(stock);
    bone('stock-buffer-tube',[0,.027,.108],[0,.027,.363],.034,.031,black,stock,12);
    side('stock-skeleton',[[.17,.06],[.415,.063],[.487,.006],[.483,-.148],[.415,-.165],[.323,-.077],[.18,-.052]],.083,ivory,stock,[[[.242,-.012],[.35,-.01],[.426,-.071],[.429,-.111],[.393,-.11],[.324,-.048],[.239,-.043]]]);
    section('stock-cheek-rest',.29,.062,.10,.052,.25,black,stock);
    box('stock-adjustment-latch',[0,-.092,.29],[.049,.029,.078],black,stock).rotation.x=-.15;
    const stockPad=box('stock-butt-pad',[0,-.047,.49],[.103,.22,.027],rubber,stock);stockPad.rotation.x=-.12;
    for(let i=0;i<7;i++)box('stock-pad-rib',[0,-.137+i*.029,.507],[.105,.007,.004],recess,stock);

    const handguard=new T.Group();handguard.name='rifle-long-handguard';group.add(handguard);
    section('handguard-octagonal-shell',-.531,.027,.112,.115,.431,ivory,handguard);
    section('handguard-front-collar',-.748,.027,.119,.122,.028,black,handguard);
    for(const s of [-1,1]){
      for(let i=0;i<5;i++){box('handguard-vent',[s*.057,.035,-.38-i*.067],[.004,.025,.044],recess,handguard);box('handguard-slot-lip',[s*.058,.019,-.38-i*.067],[.004,.004,.044],edge,handguard);}
      box('handguard-lower-bevel',[s*.044,-.026,-.529],[.018,.01,.378],edge,handguard).rotation.z=s*.45;
    }
    // A continuous top rail, with a lowered gap below the unobstructed optic bore.
    box('receiver-top-rail',[0,.101,-.129],[.067,.012,.388],black);
    box('handguard-top-rail',[0,.091,-.53],[.056,.012,.408],black,handguard);
    for(let i=0;i<18;i++)box('rail-tooth',[0,.107,-.72+i*.046],[.072,.013,.018],edge);
    bone('rifle-barrel',[0,.027,-.744],[0,.027,-.918],.020,.018,black,group,14);
    bone('barrel-step',[0,.027,-.798],[0,.027,-.826],.026,.026,edge,group,14);
    bone('muzzle-brake',[0,.027,-.908],[0,.027,-.969],.030,.032,black,group,12);
    for(const s of [-1,1])for(let i=0;i<2;i++)box('muzzle-brake-port',[s*.032,.027,-.925-i*.019],[.003,.029,.010],recess);
    bone('muzzle-bore',[0,.027,-.969],[0,.027,-.973],.016,.016,recess,group,12);
    const suppressor=new T.Group();suppressor.name='rifle-suppressor';suppressor.visible=options.suppressed!==false;group.add(suppressor);
    bone('suppressor-locking-collar',[0,.027,-.92],[0,.027,-.955],.044,.047,edge,suppressor,18);
    bone('suppressor-body',[0,.027,-.956],[0,.027,-1.12],.047,.044,black,suppressor,18);
    bone('suppressor-oxide-cap',[0,.027,-1.121],[0,.027,-1.18],.045,.041,rust,suppressor,18);
    bone('suppressor-front-chamfer',[0,.027,-1.18],[0,.027,-1.191],.041,.033,rust,suppressor,18);
    bone('suppressor-bore',[0,.027,-1.192],[0,.027,-1.196],.016,.016,recess,suppressor,14);
    for(let i=0;i<3;i++)bone('suppressor-index',[0,.027,-.976-i*.014],[0,.027,-.980-i*.014],.048,.048,edge,suppressor,18);

    const optic=new T.Group();optic.name='rifle-open-optic';group.add(optic);
    box('optic-mount',[0,.119,-.091],[.069,.025,.167],black,optic);
    box('optic-base',[0,.132,-.091],[.097,.016,.174],edge,optic);
    // Hollow rear/front frames. There is deliberately no opaque glass or center post.
    for(const z of [.0,-.182]){
      const shape=new T.Shape();shape.moveTo(-.061,-.043);shape.lineTo(.061,-.043);shape.lineTo(.066,.024);shape.lineTo(.043,.06);shape.lineTo(-.043,.06);shape.lineTo(-.066,.024);shape.closePath();
      const hole=new T.Path();hole.moveTo(-.047,-.025);hole.lineTo(-.050,.019);hole.lineTo(-.033,.044);hole.lineTo(.033,.044);hole.lineTo(.050,.019);hole.lineTo(.047,-.025);hole.closePath();shape.holes.push(hole);
      const geo=new T.ExtrudeGeometry(shape,{depth:.013,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:1,steps:1});geo.translate(0,0,-.0065);const frame=new T.Mesh(geo,black);frame.name=z===0?'optic-rear-frame':'optic-front-frame';frame.position.set(0,.18,z);optic.add(frame);
    }
    for(const s of [-1,1])box('optic-side-shroud',[s*.057,.168,-.091],[.011,.044,.17],black,optic);
    box('optic-adjustment',[.073,.158,-.073],[.018,.029,.042],edge,optic);
    box('optic-oxide-witness',[.082,.165,-.071],[.003,.005,.021],rust,optic);

    const grip=side('rifle-pistol-grip',[[.041,-.069],[-.035,-.074],[-.011,-.246],[.075,-.267],[.095,-.216]],.087,black);
    for(const s of [-1,1])for(let i=0;i<5;i++)box('grip-texture',[s*.046,-.126-i*.023,.034+i*.007],[.003,.013,.065],rubber).rotation.x=-.13;
    side('rifle-trigger-guard',[[.01,-.067],[-.152,-.067],[-.151,-.139],[-.011,-.154],[.024,-.126]],.029,black,group,[[[-.008,-.085],[-.13,-.084],[-.13,-.12],[-.02,-.134],[.003,-.116]]]);
    const trigger=new T.Group();trigger.name='rifle-trigger';trigger.position.set(0,-.072,-.074);group.add(trigger);
    bone('trigger-blade',[0,0,0],[0,-.048,.005],.006,.006,edge,trigger,8);
    bone('trigger-toe',[0,-.048,.005],[0,-.061,-.002],.006,.005,edge,trigger,8);
    const hammer=box('internal-hammer',[0,-.017,.029],[.024,.035,.023],black);

    const magazine=new T.Group();magazine.name='rifle-curved-magazine';magazine.position.set(0,-.102,-.233);group.add(magazine);
    side('magazine-curved-body',[[.052,.026],[-.057,.026],[-.059,-.087],[-.084,-.216],[-.13,-.335],[-.029,-.356],[.015,-.256],[.043,-.121]],.077,edge,magazine);
    side('magazine-floorplate',[[-.028,-.339],[-.135,-.318],[-.146,-.342],[-.035,-.37]],.091,black,magazine);
    for(const s of [-1,1])for(const off of [-.033,.013]){
      bone('magazine-flute',[s*.040,-.045,off],[s*.040,-.175,off-.018],.004,.004,black,magazine,6);
      bone('magazine-flute',[s*.040,-.175,off-.018],[s*.040,-.298,off-.060],.004,.004,black,magazine,6);
    }
    box('magazine-oxide-mark',[.041,-.23,-.012],[.003,.016,.059],rust,magazine).rotation.x=.28;

    const right=new T.Group();right.name='rifle-firing-hand';group.add(right);
    pad('firing-palm',[.047,-.169,.071],[.063,.086,.061],glove,right);
    pad('firing-palm-panel',[.074,-.164,.103],[.033,.072,.029],panel,right);
    const fingerRoots=[];
    for(let i=0;i<3;i++){
      const finger=new T.Group();finger.position.set(.045,-.139-i*.036,.044+i*.009);right.add(finger);fingerRoots.push(finger);
      const points=[[.026,0,.013],[.040,-.007,-.035],[-.002,-.012,-.074],[-.04,-.008,-.085]];
      for(let j=0;j<3;j++)bone('firing-finger',points[j],points[j+1],.019-j*.002,.017-j*.002,glove,finger,8);
      pad('firing-knuckle',points[1],[.021,.019,.019],rubber,finger);
    }
    const index=new T.Group();index.name='rifle-trigger-index';index.position.set(.049,-.10,.018);right.add(index);
    const ip=[[.012,.017,.023],[.028,.011,-.035],[-.009,-.023,-.081],[-.047,-.033,-.090]];
    for(let i=0;i<3;i++)bone('trigger-index',ip[i],ip[i+1],.019-i*.002,.017-i*.002,glove,index,8);
    pad('trigger-index-knuckle',ip[1],[.02,.019,.019],rubber,index);
    bone('firing-thumb',[.036,-.133,.115],[-.042,-.11,.074],.027,.024,glove,right);
    bone('firing-thumb-tip',[-.042,-.11,.074],[-.066,-.067,.010],.024,.019,glove,right);
    bone('firing-glove-opening',[.022,-.217,.081],[.029,-.245,.103],.047,.050,recess,right,12);
    const rightWrist=wrist('right-exposed-wrist',[.029,-.242,.103],[.044,-.294,.146],.049,.055,right);
    bone('right-sleeve-cuff',[.045,-.29,.145],[.065,-.331,.174],.06,.065,black,right,12);
    bone('right-sleeve',[.065,-.327,.172],[.206,-.589,.344],.064,.105,rubber,right,12);
    for(let i=0;i<3;i++)bone('firing-glove-fold',[.047,-.147-i*.033,.125],[.087,-.153-i*.033,.118],.002,.002,seam,right,5);

    // The support palm wraps the handguard, well ahead of the magazine. Its pivot is the palm.
    const support=new T.Group();support.name='rifle-forward-support';support.position.set(-.006,-.064,-.555);group.add(support);
    pad('support-palm',[-.028,-.023,0],[.071,.046,.080],glove,support);
    pad('support-back',[-.057,-.042,.017],[.048,.023,.075],panel,support);
    for(let i=0;i<4;i++){
      const z=-.063+i*.037,pts=[[-.063,-.012,z],[-.007,-.024,z-.005],[.057,-.004,z-.007],[.073,.041,z-.006]];
      for(let j=0;j<3;j++)bone('support-finger',pts[j],pts[j+1],.017-j*.002,.016-j*.002,glove,support,8);
      pad('support-knuckle',pts[1],[.019,.019,.017],rubber,support);
    }
    bone('support-thumb',[-.044,-.015,.049],[-.078,.076,.055],.024,.021,glove,support);
    bone('support-thumb-tip',[-.078,.076,.055],[-.073,.126,.004],.021,.017,glove,support);
    bone('support-glove-opening',[-.062,-.044,.045],[-.086,-.078,.095],.047,.051,recess,support,12);
    const leftWrist=wrist('left-exposed-wrist',[-.083,-.075,.09],[-.114,-.115,.145],.049,.056,support);
    bone('left-sleeve-cuff',[-.112,-.111,.14],[-.141,-.149,.196],.061,.065,black,support,12);
    bone('left-sleeve',[-.137,-.145,.189],[-.283,-.342,.58],.065,.105,rubber,support,12);
    for(let i=0;i<3;i++)bone('support-glove-fold',[-.076,-.03,-.037+i*.035],[-.046,-.054,-.047+i*.035],.002,.002,seam,support,5);

    const laserModule=new T.Group();laserModule.name='rifle-laser';laserModule.visible=!!options.laser;group.add(laserModule);
    box('laser-body',[.078,.044,-.638],[.049,.042,.115],black,laserModule);
    bone('laser-lens',[.079,.044,-.695],[.079,.044,-.704],.014,.014,rust,laserModule,10);
    box('laser-switch',[.105,.044,-.622],[.006,.021,.025],edge,laserModule);
    const muzzle=new T.Vector3(0,.027,options.suppressed===false?-.979:-1.201),laserEmitter=new T.Vector3(.079,.044,-.707),ejectionPort=new T.Vector3(.096,.047,-.06);
    const poses=getPose(3);group.position.fromArray(poses.hip.position);group.rotation.set(...poses.hip.rotation);
    group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    group.userData={weapon:3,receiver,stock,handguard,grip,optic,slide,bolt:slide,hammer,trigger,index,indexTip:new T.Vector3(...ip[3]),support,magazine,right,fingerRoots,rightWrist,leftWrist,suppressor,laserModule,muzzle,laserEmitter,ejectionPort,opticRear:new T.Vector3(0,.18,0),opticFront:new T.Vector3(0,.18,-.182),attachmentOrigins:{muzzle:muzzle.clone(),laser:laserEmitter.clone(),ejection:ejectionPort.clone()},supportGrip:new T.Vector3(-.034,-.087,-.555)};
    rememberNeutral(group);return group;
  }

  const legacyPoses={hip:{position:[.30,-.245,-1.20],rotation:[.10,.30,-.09]},ads:{position:[0,-.13,-.84],rotation:[.005,0,0]}};
  const riflePoses={hip:{position:[.39,-.28,-1.25],rotation:[.10,.27,-.075]},ads:{position:[0,-.18,-.60],rotation:[0,0,0]}};
  const posesByWeapon={0:legacyPoses,1:legacyPoses,2:legacyPoses,3:riflePoses};
  function getPose(weapon=0,stance){const p=posesByWeapon[weapon]||legacyPoses;return stance?p[stance]:p;}
  function rememberNeutral(model){const v=model.userData;v.neutral={};for(const key of ['slide','hammer','trigger','index','support','magazine']){const o=v[key];v.neutral[key]={position:o.position.clone(),rotation:o.rotation.clone()};}}
  // Restore authored joint transforms on every frame, then apply animation offsets.
  // bolt is local +Z travel; trigger, hammer and index are additive X angles in radians.
  function applyReload(model,r={},action={}){
    const v=model.userData,n=v.neutral;for(const key of ['slide','hammer','trigger','index','support','magazine']){v[key].position.copy(n[key].position);v[key].rotation.copy(n[key].rotation);}
    v.slide.position.z+=Number.isFinite(r.boltOverride)?r.boltOverride:(action.bolt||0)+(r.slide||0);v.hammer.rotation.x+=action.hammer||0;v.trigger.rotation.x+=action.trigger||0;
    v.index.rotation.x+=(action.index||0)+(r.index||0)*.30;v.index.rotation.y+=(r.index||0)*.27;
    v.support.position.x+=r.supportX||0;v.support.position.y+=r.supportY||0;v.support.position.z+=r.supportZ||0;
    v.support.rotation.x+=r.supportRotX||0;v.support.rotation.y+=r.supportRotY||0;v.support.rotation.z+=r.supportRotZ??(-(r.index||0)*.24);
    v.magazine.position.x+=r.magazineX||0;v.magazine.position.y+=r.magazineY??(r.magazine||0);v.magazine.position.z+=r.magazineZ||0;
    v.magazine.rotation.x+=r.magazineRotX||0;v.magazine.rotation.y+=r.magazineRotY||0;v.magazine.rotation.z+=r.magazineRotZ||0;v.magazine.visible=r.magazineVisible!==false;
    return model;
  }
  root.DFWeapon={create,poses:legacyPoses,posesByWeapon,getPose,applyReload};
})(globalThis);
