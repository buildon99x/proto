import {authoredStoneMaterial} from './stone-material.js';
export function isTemplePad(x,z,margin=0){return x>=-3.575-margin&&x<=-.025+margin&&z>=3.65-margin&&z<=6.35+margin;}
export function isTempleStairFootprint(x,z,margin=0){return x>=-2.23-margin&&x<=-1.37+margin&&z>=6.22-margin&&z<=7.10+margin;}
/** An irregular, closed rock podium supporting the foreground temple, entirely on land. */
export function templeRiverbank(W,parent){
 const T=W.THREE,g=W.group(-1.8,-.038,5,parent);g.name='foreground-rock-bank';
 const ring=[];const n=8,hw=1.775,hd=1.35;
 for(let i=0;i<n;i++)ring.push([-hw+2*hw*i/n,-hd]);
 for(let i=0;i<n;i++)ring.push([hw,-hd+2*hd*i/n]);
 for(let i=0;i<n;i++)ring.push([hw-2*hw*i/n,hd]);
 for(let i=0;i<n;i++)ring.push([-hw,hd-2*hd*i/n]);
 const vertices=[],colors=[],indices=[],c=[new T.Color('#957453'),new T.Color('#b39470'),new T.Color('#a88761'),new T.Color('#c2a27a')];
 for(let row=0;row<4;row++)for(let i=0;i<ring.length;i++){
  const [x,z]=ring[i],s=row===3?1:.82+.16*(.5+.5*Math.sin(i*2.17+row*1.39));
  const y=row===3?.538:row===0?-.012:[0,.17,.35][row]+.055*Math.sin(i*1.67+row);
  vertices.push(x*s,y,z*s);const col=c[(i+row)%c.length];colors.push(col.r,col.g,col.b);
 }
 for(let row=0;row<3;row++)for(let i=0;i<ring.length;i++){
  const j=(i+1)%ring.length,a=row*ring.length+i,b=row*ring.length+j,d=(row+1)*ring.length+i,e=(row+1)*ring.length+j;
  indices.push(a,d,b,b,d,e);
 }
 // The uninterrupted, level summit supports every corner of the temple's lowest plinth.
 const centre=vertices.length/3;vertices.push(0,.538,0);colors.push(.64,.48,.31);
 for(let i=0;i<ring.length;i++)indices.push(centre,3*ring.length+(i+1)%ring.length,3*ring.length+i);
 const bottom=vertices.length/3;vertices.push(0,-.012,0);colors.push(.45,.32,.22);
 for(let i=0;i<ring.length;i++)indices.push(bottom,i,(i+1)%ring.length);
 const geo=W.own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 const material=W.own(new T.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,side:T.DoubleSide}));const cliff=new T.Mesh(geo,material);cliff.name='temple-riverbank-cliff';cliff.castShadow=cliff.receiveShadow=true;g.add(cliff);
 // Cohesive, deterministic rock outcrops intersect the authoritative solid bank.
 const lod=new T.LOD();lod.name='temple-cliff-lod';lod.userData.skipBatch=true;g.add(lod);
 const rockMaterial=authoredStoneMaterial(W);const sites=[...[-1.48,-1.2,-.93,-.68,.68,.93,1.2,1.48].map((x,i)=>[x,.16+(i%3)*.025,1.16+(i%2)*.05]),...[ -1,-.52,0,.52].map((z,i)=>[1.54,.17+(i%2)*.035,z])];
 for(const [geo,distance] of [[new T.IcosahedronGeometry(1,0),0],[new T.OctahedronGeometry(1,0),36]]){
  const position=geo.attributes.position;for(let i=0;i<position.count;i++){const x=position.getX(i),y=position.getY(i),z=position.getZ(i),f=.83+.16*Math.sin(x*13+y*23+z*37);position.setXYZ(i,x*f,y*(.85+.12*f),z*(1.05-.08*f));}geo.computeVertexNormals();W.own(geo);
  const instances=new T.InstancedMesh(geo,rockMaterial,sites.length);instances.castShadow=instances.receiveShadow=true;instances.userData.skipBatch=true;const matrix=new T.Matrix4(),quaternion=new T.Quaternion(),axis=new T.Vector3(0,1,0),scale=new T.Vector3();for(let i=0;i<sites.length;i++){const [x,y,z]=sites[i];quaternion.setFromAxisAngle(axis,i*1.73);scale.set(.16+.025*(i%3),.14+.018*(i%4),.15+.015*(i%2));matrix.compose(new T.Vector3(x,y,z),quaternion,scale);instances.setMatrixAt(i,matrix);}instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();lod.addLevel(instances,distance,.1);
 }
 const stairs=W.group(0,0,0,g);stairs.name='temple-bank-stairs';for(let i=0;i<6;i++){const height=.538-i*.083;W.box(.86,height,.18,i%2?'#b99973':'#c5a47a',0,height/2,1.31+i*.14,stairs);}
 return g;
}
