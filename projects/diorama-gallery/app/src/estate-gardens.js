const TAU=Math.PI*2;
const GREENS=['#64764a','#7f8b51','#50663e','#8a955c'];
const STONES=['#a3a28c','#b9b5a0','#8b9181','#c9c3ac'];
function ellipsoid(W,parent,x,y,z,sx,sy,sz,color){const m=W.ball(1,color,x,y,z,parent);m.scale.set(sx,sy,sz);return m;}
function rock(W,parent,x,z,s=.4,seed=0){const m=ellipsoid(W,parent,x,s*.47,z,s*(.8+(seed%3)*.12),s*.65,s*.73,STONES[seed%4]);m.rotation.set(.12*seed,.7*seed,.12);return m;}
function shrub(W,parent,x,z,s=.5,seed=0,color){
 for(let i=0;i<7;i++){const a=i*2.399;ellipsoid(W,parent,x+Math.cos(a)*s*.42,.15+s*.33+(i%3)*s*.09,z+Math.sin(a)*s*.38,s*.43,s*.35,s*.39,color||GREENS[(seed+i)%4]);}
}
function patch(W,parent,x,z,rx,rz){const m=ellipsoid(W,parent,x,.055,z,rx,.075,rz,'#8b9562');return m;}
function pine(W,parent,x,z,s=1,seed=0){
 const g=W.group(x,.08,z,parent);g.name='estate-pine';
 W.line([[0,0,0],[-.09*s,.6*s,.05*s],[.15*s,1.25*s,0],[.04*s,1.85*s,.1*s]],'#615440',.085*s,g);
 for(let k=0;k<6;k++){const a=k*2.4+seed, h=(.85+k*.19)*s,reach=(k<4?.57:.32)*s,px=Math.cos(a)*reach,pz=Math.sin(a)*reach;
 W.line([[.03*s,h-.25*s,0],[px,h,pz]],'#615440',.044*s,g);
 for(let j=0;j<5;j++){const b=j*2.4;ellipsoid(W,g,px+Math.cos(b)*.22*s,h+(j%2)*.06*s,pz+Math.sin(b)*.2*s,.36*s,.17*s,.3*s,GREENS[(k+j+seed)%4]);}}
 return g;
}
function blossom(W,parent,x,z,s=1,seed=0){
 const g=W.group(x,.08,z,parent);g.name='estate-blossom';
 W.line([[0,0,0],[.1*s,.65*s,.04*s],[-.09*s,1.3*s,0]],'#6b5a47',.065*s,g);
 const colors=seed%2?['#f0e6d6','#e7dccd','#fff0e0']:['#dca0b0','#efbdc8','#c8829a'];
 for(let k=0;k<7;k++){const a=k*2.399,r=(.4+(k%3)*.08)*s,y=(1.15+(k%3)*.19)*s,px=Math.cos(a)*r,pz=Math.sin(a)*r;
 W.line([[.04*s,.65*s,0],[px,y-.1*s,pz]],'#71604d',.035*s,g);
 for(let j=0;j<5;j++){const b=j*2.4;ellipsoid(W,g,px+Math.cos(b)*.16*s,y+(j%2)*.12*s,pz+Math.sin(b)*.16*s,.25*s,.21*s,.23*s,colors[j%3]);}}
 return g;
}
function willow(W,parent,x,z,s=1,seed=0){
 const g=W.group(x,.08,z,parent);g.name='estate-willow';
 W.line([[0,0,0],[-.15*s,.8*s,.05*s],[.08*s,1.8*s,0],[.12*s,2.5*s,.08*s]],'#6b5e42',.16*s,g);
 W.line([[-.15*s,.8*s,.05*s],[.4*s,1.6*s,.18*s],[.52*s,2.2*s,.1*s]],'#756548',.095*s,g);
 const crown=W.group(0,2.1*s,0,g);crown.userData.estateSeed=seed;
 for(let k=0;k<13;k++){const a=k*2.399+seed,r=(.47+(k%3)*.12)*s,px=Math.cos(a)*r,pz=Math.sin(a)*r,top=(.25+(k%4)*.11)*s;
 W.line([[0,0,0],[px,top,pz]],'#74694b',.04*s,crown);
 ellipsoid(W,crown,px,top,pz,.38*s,.33*s,.35*s,GREENS[(k+1)%4]);
 // Overlapping tapered leaf clusters form hanging boughs, not bare wire curtains.
 for(let j=0;j<5;j++){const drop=j*.22*s,spread=.13+j*.055;const leaf=ellipsoid(W,crown,px+Math.cos(a)*spread*s,top-drop,pz+Math.sin(a)*spread*s,(.23-j*.026)*s,.32*s,(.22-j*.024)*s,GREENS[(k+j)%4]);leaf.rotation.z=Math.cos(a)*.2;}}
 return crown;
}
function lantern(W,parent,x,z,s=1){const g=W.group(x,.1,z,parent);g.name='estate-stone-lantern';W.cylinder(.22*s,.09*s,'#aaa895',0,.045*s,0,g,8);W.cylinder(.095*s,.48*s,'#a3a48f',0,.3*s,0,g,8);W.box(.3*s,.08*s,.3*s,'#b9b6a0',0,.56*s,0,g);W.box(.22*s,.24*s,.22*s,'#716f5e',0,.71*s,0,g);for(const dx of [-1,1])for(const dz of [-1,1])W.box(.047*s,.26*s,.047*s,'#bab8a4',dx*.105*s,.71*s,dz*.105*s,g);const cap=W.ball(1,'#aaa994',0,.91*s,0,g);cap.scale.set(.26*s,.13*s,.26*s);W.ball(.07*s,'#b8b59f',0,1.04*s,0,g);}
function basin(W,parent,x,z,s=1){const g=W.group(x,.14,z,parent);g.name='estate-stone-basin';W.cylinder(.38*s,.24*s,'#9b9f8b',0,.12*s,0,g,16);W.cylinder(.29*s,.015*s,'#467c75',0,.249*s,0,g,20);W.ring(.335*s,'#c6c5ad',0,.26*s,0,g,.065*s);}
function pondShape(T,rx,rz){const shape=new T.Shape();for(let i=0;i<=64;i++){const a=i/64*TAU,r=1+.075*Math.sin(a*3)+.045*Math.cos(a*5),x=Math.cos(a)*rx*r,z=Math.sin(a)*rz*r;i?shape.lineTo(x,-z):shape.moveTo(x,-z);}shape.closePath();return shape;}
function pondMesh(W,parent,rx,rz,y,color,transparent=false){const T=W.THREE,geo=W.own(new T.ShapeGeometry(pondShape(T,rx,rz),48));geo.rotateX(-Math.PI/2);const mat=W.own(new T.MeshStandardMaterial({color,roughness:transparent?.26:.92,metalness:transparent?.07:0,transparent,opacity:transparent?.65:1,depthWrite:!transparent,side:T.DoubleSide}));const mesh=new T.Mesh(geo,mat);mesh.position.y=y;mesh.receiveShadow=true;mesh.castShadow=false;parent.add(mesh);return mesh;}
function bridge(W,parent){const g=W.group(-5.3,0,8.5,parent);g.name='estate-arched-bridge';
 const arch=x=>.42+.38*Math.cos(x/2.15*Math.PI/2);
 for(let i=0;i<27;i++){const x=-2.1+i*4.2/26,y=arch(x);const plank=W.box(.151,.09,.88,i%3?'#9e7652':'#b38c62',x,y,0,g);plank.rotation.z=-.38*Math.PI/4.3*Math.sin(x/2.15*Math.PI/2);}
 for(const z of [-.46,.46]){const upper=[],lower=[];for(let i=0;i<13;i++){const x=-2.13+i*4.26/12,y=arch(x);upper.push([x,y+.48,z]);lower.push([x,y+.24,z]);if(i%2===0){W.box(.07,.56,.07,'#735238',x,y+.24,z,g);W.ball(.054,'#b08a61',x,y+.54,z,g);}}W.line(upper,'#76543a',.042,g);W.line(lower,'#95704b',.029,g);}
 return g;
}
export function buildEstateGardens(W){
 const root=W.group();root.name='estate-gardens';const pond=W.group(-5.3,0,8.5,root);pond.name='estate-koi-pond';
 pondMesh(W,pond,2.35,2.42,.035,'#477b73');const water=pondMesh(W,pond,2.26,2.33,.2,'#65aaa2',true),waterMaterial=water.material;
 for(let i=0;i<43;i++){const a=i/43*TAU,r=1+.075*Math.sin(a*3)+.045*Math.cos(a*5);rock(W,pond,Math.cos(a)*2.32*r,Math.sin(a)*2.4*r,.19+(i%3)*.045,i);}
 bridge(W,root);
 const fish=[];for(let i=0;i<9;i++){const g=W.group(0,.115,0,root);g.name='estate-koi';g.userData.estatePhase=i/9*TAU;g.userData.estateRadius=.85+(i%3)*.25;
 ellipsoid(W,g,0,0,0,.065,.027,.17,i%3===0?'#e8dfc6':'#ec9f64');ellipsoid(W,g,0,.017,.02,.05,.018,.065,i%2?'#f1e6d4':'#d86d45');for(const side of [-1,1]){const fin=ellipsoid(W,g,side*.055,0,-.15,.045,.012,.075,'#ece1c7');fin.rotation.y=side*.55;}fish.push(g);}
 // Tree trunks occupy dry open courts; compact inner pines fit the gaps between solid houses.
 const willowCrowns=[willow(W,root,-7,6.35,.94,0),willow(W,root,-7.4,10.7,.82,2),willow(W,root,-7.65,-5,1.06,3)];
 for(const [x,z,s,seed] of [[5.9,8,1.1,2],[4.4,9.5,.75,1],[-4.8,-2.8,.55,3],[5,-2.2,.48,1],[3.6,7.6,.65,2],[6.3,-2.15,.5,0]]){patch(W,root,x,z,1,.88);pine(W,root,x,z,s,seed);shrub(W,root,x+.48,z+.52,.43,seed);rock(W,root,x-.5,z+.5,.38,seed);}
 for(const [x,z,s,seed] of [[6.8,10.65,1.1,0],[4.45,7.2,.75,1],[6.8,5.4,.85,2],[-5.3,.8,.67,1]])blossom(W,root,x,z,s,seed);
 for(const [x,z,seed] of [[4,10.7,0],[5,10.9,1],[6,9.9,2],[3.6,9,3],[5.7,7.2,4],[-3.5,10.7,5],[-3.7,6.2,6],[6.4,1.7,7],[-4.2,-2.1,8]]){patch(W,root,x,z,.62,.48);shrub(W,root,x,z,.52,seed);if(seed%2===0)for(let j=0;j<5;j++)shrub(W,root,x+.32*Math.cos(j*2.4),z+.3*Math.sin(j*2.4),.18,j,['#dc9cae','#ecd8bc','#bb788d','#ced4bc'][seed%4]);}
 for(const [x,z] of [[3.35,10.25],[6.65,8.8],[-3.2,5.9],[2.1,1.3]])lantern(W,root,x,z,.72);
 for(const [x,z,s] of [[3.8,3,.95],[4.3,-2.2,.7],[-4.1,1.2,.8],[1.5,-1.8,.8]])basin(W,root,x,z,s);
 // Narrow inner garden stays east of the uninterrupted central walk.
 const inner=W.group(1.85,0,-.3,root);inner.name='estate-inner-water-garden';pondMesh(W,inner,.68,1.05,.085,'#60958b');for(let i=0;i<13;i++){const a=i/13*TAU;rock(W,inner,Math.cos(a)*.7,Math.sin(a)*1.04,.15+(i%3)*.02,i);}shrub(W,root,2.05,.6,.38,3);
 const parts={root,pond,fish,willowCrowns,waterMaterial};animateEstateGardens({t:0,parts,W});return parts;
}
export function animateEstateGardens({t,parts}){
 const phase=(((t%48)+48)%48)/48*TAU;
 for(let i=0;i<parts.fish.length;i++){const fish=parts.fish[i],a=phase+fish.userData.estatePhase,r=fish.userData.estateRadius;fish.position.set(-5.3+Math.cos(a)*r,.12,8.5+Math.sin(a)*r*1.18);fish.rotation.y=Math.atan2(-Math.sin(a),1.18*Math.cos(a));}
 for(let i=0;i<parts.willowCrowns.length;i++){const crown=parts.willowCrowns[i];crown.rotation.z=.026*Math.sin(phase*2+i*1.7);crown.rotation.x=.018*Math.sin(phase*2+i*1.7+.7);}
}
