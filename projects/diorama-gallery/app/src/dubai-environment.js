import {mesh,TAU} from './dubai-architecture.js';
const palettes=new WeakMap();
function resources(W){
 if(palettes.has(W))return palettes.get(W);const T=W.THREE,leafMaterial=W.own(new T.MeshStandardMaterial({vertexColors:true,roughness:.93,side:T.DoubleSide})),crowns=[];
 for(let variant=0;variant<4;variant++){
  const positions=[],colors=[];function tri(a,b,c,color){positions.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(...color);}
  const n=7+variant%2;
  for(let f=0;f<n;f++){
   const angle=f*TAU/n+variant*.19,dx=Math.cos(angle),dz=Math.sin(angle),side=[-dz,dx];
   const point=t=>[dx*(.045+.55*t),.99+.14*Math.sin(Math.PI*t)-(.18+variant*.018)*t*t,dz*(.045+.55*t)];
   for(let j=1;j<=9;j++){
    const t=j/10,p=point(t),next=point(Math.min(1,t+.1)),length=.16*Math.sqrt(Math.sin(Math.PI*t));
    for(const sign of [-1,1]){const tip=[p[0]+side[0]*length*sign+dx*.065,p[1]-.045-variant*.005,p[2]+side[1]*length*sign+dz*.065];const color=sign>0?[.055+variant*.01,.14+f%3*.018,.035]:[.09+variant*.01,.2+f%2*.02,.055];tri([p[0]-dx*.045,p[1],p[2]-dz*.045],tip,[p[0]+dx*.025,p[1]+.004,p[2]+dz*.025],color);}
    tri([p[0]+side[0]*.008,p[1],p[2]+side[1]*.008],[p[0]-side[0]*.008,p[1],p[2]-side[1]*.008],next,[.19,.23,.08]);
   }
  }
  const geo=W.own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();crowns.push(geo);
 }
 const r={crowns,leafMaterial};palettes.set(W,r);return r;
}
export function makePalm(W,x,z,size=.8,parent){
 const {crowns,leafMaterial}=resources(W),T=W.THREE,variant=Math.abs(Math.round(x*13+z*19))%4,s=size*1.35,g=W.group(x,.12,z,parent);g.name='date-palm';g.scale.setScalar(s);g.rotation.y=(x*.47+z*.63)%TAU;
 W.line([[0,0,0],[.025,.44,.01],[.055,.96,0]],['#8f7651','#aa8a5c','#7f6b4d','#9a8058'][variant],.031,g);
 for(let i=0;i<7;i++){const y=.15+i*.105;W.cylinder(.034,.013,'#695c40',y*.055,y,0,g,8);}
 const crown=new T.Mesh(crowns[variant],leafMaterial);crown.position.x=.055;crown.castShadow=crown.receiveShadow=true;g.add(crown);
 for(let i=0;i<3;i++){const dates=W.ball(.04,'#8f6335',.055+Math.cos(i*2.1)*.04,.9,Math.sin(i*2.1)*.04,g);dates.scale.set(.025,.07,.025);}
 return g;
}
export function groundMaterial(W,kind='sand'){
 const T=W.THREE,c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');let seed=kind==='sand'?117:529;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 ctx.fillStyle=kind==='sand'?'#d8bd8c':'#bdb293';ctx.fillRect(0,0,1024,1024);
 for(let i=0;i<43000;i++){const k=Math.floor(rnd()*40),alpha=.07+rnd()*.16;ctx.fillStyle=`rgba(${kind==='sand'?`${160+k},${133+k},${91+k}`:`${119+k},${111+k},${87+k}`},${alpha})`;ctx.fillRect(rnd()*1024,rnd()*1024,.6+rnd()*2,.6+rnd()*2);}
 if(kind==='sand'){for(let i=0;i<80;i++){const y=rnd()*1024;ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(280,y-18-rnd()*16,660,y+25,1024,y-12);ctx.strokeStyle=`rgba(235,214,169,${.08+rnd()*.08})`;ctx.lineWidth=.5+rnd();ctx.stroke();}}
 else{ctx.strokeStyle='rgba(104,99,78,.16)';ctx.lineWidth=1;for(let row=0;row<32;row++)for(let col=0;col<32;col++)ctx.strokeRect(col*32+(row%2)*16,row*32,32,32);}
 const texture=W.own(new T.CanvasTexture(c));texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(.16,.16);texture.anisotropy=4;
 return W.own(new T.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:kind==='sand'?.025:.009,roughness:1,side:T.DoubleSide}));
}
function patch(W,points,material,y,parent){const T=W.THREE,shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,z):shape.moveTo(x,z));shape.closePath();const geometry=new T.ShapeGeometry(shape,24);geometry.rotateX(Math.PI/2);const m=mesh(W,geometry,material,parent);m.position.y=y;return m;}
function bush(W,x,z,s=.16,parent){for(let i=0;i<3;i++){const b=W.ball(1,['#617948','#829254','#435f3e'][i],x+Math.cos(i*2.1)*s*.55,.12+s*.65,z+Math.sin(i*2.1)*s*.55,parent);b.scale.set(s,s*.65,s*.85);}}
function agave(W,x,z,parent){const T=W.THREE,positions=[];for(let i=0;i<9;i++){const a=i*TAU/9;positions.push(x-.025,.12,z,x+Math.cos(a)*.25,.12+.11+(i%3)*.04,z+Math.sin(a)*.25,x+.025,.12,z);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.computeVertexNormals();mesh(W,geo,new T.MeshStandardMaterial({color:'#80977d',roughness:1,side:T.DoubleSide}),parent);}
function shadePlaza(W,x,z,angle=0,parent){
 const T=W.THREE,g=W.group(x,.1,z,parent);g.rotation.y=angle;g.name='shaded-plaza';W.box(1.3,.035,.95,'#d2c29e',0,0,0,g);
 for(const xx of [-.55,.55])for(const zz of [-.35,.35])W.cylinder(.018,.9,'#817b5c',xx,.45,zz,g,6);
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-.6,.97,-.4,.6,.88,-.4,0,.78,0,.6,.88,-.4,.6,.97,.4,0,.78,0,.6,.97,.4,-.6,.88,.4,0,.78,0,-.6,.88,.4,-.6,.97,-.4,0,.78,0],3));geo.computeVertexNormals();mesh(W,geo,new T.MeshStandardMaterial({color:'#e1d3b1',roughness:.93,side:T.DoubleSide}),g);
 for(const zz of [-.29,.29]){W.box(.85,.035,.15,'#8f7e5d',0,.24,zz,g);for(const xx of [-.34,.34])W.box(.04,.23,.07,'#6f7565',xx,.11,zz,g);}
 return g;
}
export function environment(W){
 const T=W.THREE,root=W.group();root.name='desert-gardens';const sand=W.group(0,0,0,root);sand.name='coastal-sand';
 const sandMaterial=groundMaterial(W,'sand');patch(W,[[-6.9,5.6],[-6.6,4.85],[-5.8,4.5],[-4.6,4.22],[-3.5,4.25],[-2.55,3.92],[-2.2,4.55],[-3.6,5.1],[-5.1,5.8]],sandMaterial,.075,sand);
 const duneGeometry=W.own(new T.SphereGeometry(1,12,6));for(let i=0;i<10;i++){const dune=new T.Mesh(duneGeometry,sandMaterial);dune.position.set(-6.15+i*.33,.085,4.65+.13*Math.sin(i*.8));dune.scale.set(.24+(i%3)*.06,.035+(i%2)*.015,.14);dune.castShadow=dune.receiveShadow=true;sand.add(dune);}
 const shore=[[-6.9,.085,5.6],[-6.6,.085,4.85],[-5.8,.085,4.5],[-4.6,.085,4.22],[-3.5,.085,4.25],[-2.55,.085,3.92]];W.line(shore,'#d9cba6',.035,sand);
 for(let i=0;i<42;i++){const a=i/42*TAU,x=-.35+Math.sin(a)*2.58,z=2.65+Math.cos(a)*1.88;if(x>1.6&&z<3.9)continue;bush(W,x,z,.12+(i%4)*.025,root);}
 for(let i=0;i<26;i++){const x=.5+(i%6)*1.12,z=-6.8+Math.floor(i/6)*1.4;bush(W,x,z,.15+(i%3)*.025,root);}
 for(let i=0;i<9;i++){const x=-6.25+i*.43,z=4.88+.1*Math.sin(i);agave(W,x,z,root);if(i%2===0){const rock=mesh(W,new T.DodecahedronGeometry(.08),new T.MeshStandardMaterial({color:'#b5a581',roughness:1}),root);rock.position.set(x+.14,.14,z+.13);rock.scale.set(1.4,.65,.9);}}
 shadePlaza(W,-5.2,5.55,-.15,root);shadePlaza(W,-2.9,5.05,.22,root);shadePlaza(W,1.65,.42,.15,root);
 // Layered planted strips, shaded pockets and small bollards break the empty grid.
 for(let i=0;i<14;i++){const x=2.2+(i%4)*1.24,z=-6.6+Math.floor(i/4)*1.5;W.box(.55,.08,.3,'#a99b7c',x,.1,z,root);bush(W,x,z,.18,root);}
 for(let i=0;i<14;i++)W.cylinder(.025,.18,'#666f5d',-6.3+i*.6,.17,5.95,root,7);
 return root;
}
