/** Procedural kraft paper plus real exposed flutes, not a painted brown plinth. */
export function cardboard(W) {
 const T=W.THREE,canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#b68b59';ctx.fillRect(0,0,1024,1024);
 // Long paper fibres and compression streaks, mixed with finer recycled-paper flecks.
 for(let i=0;i<38000;i++){
  ctx.fillStyle=i%3?'rgba(65,37,17,.085)':'rgba(255,235,190,.14)';
  const x=W.random()*1024,y=W.random()*1024;
  ctx.fillRect(x,y,.4+W.random()*1.5,1+W.random()*12);
 }
 for(let i=0;i<130;i++) {ctx.fillStyle=i%2?'rgba(93,60,30,.035)':'rgba(247,216,167,.04)';ctx.fillRect(W.random()*1024,0,1+W.random()*4,1024);}
 const texture=W.own(new T.CanvasTexture(canvas));texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(2.5,1.6);texture.anisotropy=4;
 const paper=W.own(new T.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.055,roughness:.94,color:'#ead8ba'}));
 const edgePaper=W.own(new T.MeshStandardMaterial({color:'#bfa06c',roughness:1}));
 const flutePaper=W.own(new T.MeshStandardMaterial({color:'#71512e',roughness:1}));
 const geo=W.own(new T.BoxGeometry(1,1,1)),root=W.group();root.name='corrugated-cardboard-box';
 const panel=(w,h,d,x,y,z,parent=root)=>{const m=new T.Mesh(geo,paper);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const strip=(w,h,d,x,y,z,parent=root)=>{const m=new T.Mesh(geo,edgePaper);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 function flutes(length,y,z,parent=root){
  const points=[],steps=Math.ceil(length/.035);
  for(let i=0;i<=steps;i++){const x=-length/2+i/steps*length;points.push(new T.Vector3(x,y,z+Math.sin(x*42)*.057));}
  const curve=new T.CatmullRomCurve3(points);
  const fluteGeo=W.own(new T.TubeGeometry(curve,steps, .013,4,false));
  const m=new T.Mesh(fluteGeo,flutePaper);m.castShadow=m.receiveShadow=true;parent.add(m);
  strip(length,.018,.018,0,y,z-.078,parent);strip(length,.018,.018,0,y,z+.078,parent);
 }
 panel(17.4,.24,23.1,0,-.32,0);
 panel(17.4,3.65,.18,0,1.6,-11.5);panel(.18,3.1,23.1,-8.65,1.32,0);
 panel(17.4,.56,.18,0,-.02,11.5);panel(.18,.65,23.1,8.65,.03,0);
 const flap=W.group(0,4.25,-11.85,root);flap.rotation.x=-.32;
 panel(17.4,2.05,.18,0,0,0,flap);flutes(17.3,1.03,0,flap);
 flutes(17.3,.269,11.5);
 const sideEdge=W.group(8.65,.363,0,root);sideEdge.rotation.y=Math.PI/2;flutes(23,0,0,sideEdge);
 // Creased hinge, doubled liner edges, compression seams and tape corners.
 W.box(17.3,.025,.04,'#7c5733',0,3.41,-11.39,root);
 W.box(17.2,.035,.10,'#967142',0,-.19,-11.34,root);
 W.box(.08,.025,22.9,'#8e683a',-8.52,-.19,0,root);
 for(const x of [-8.4,8.4]) W.box(.06,3.5,.012,'#a17946',x,1.6,-11.395,root);
 const tapeMaterial=W.own(new T.MeshStandardMaterial({color:'#d2ad73',roughness:.45,transparent:true,opacity:.65,depthWrite:false}));
 for(const x of [-7.7,7.7]){const tape=new T.Mesh(geo,tapeMaterial);tape.scale.set(.52,.012,1.3);tape.position.set(x,-.186,10.7);root.add(tape);}
 return root;
}
