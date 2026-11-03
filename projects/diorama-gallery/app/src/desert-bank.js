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
  const [x,z]=ring[i],s=row===3?1:.92+.065*(.5+.5*Math.sin(i*2.17+row*1.39));
  const y=row===3?.538:row===0?-.012:[0,.17,.35][row]+.012*Math.sin(i*1.67+row);
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
 const material=W.own(new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}));const cliff=new T.Mesh(geo,material);cliff.name='temple-riverbank-cliff';cliff.castShadow=cliff.receiveShadow=true;g.add(cliff);
 const stairs=W.group(0,0,0,g);stairs.name='temple-bank-stairs';for(let i=0;i<6;i++){const height=.538-i*.083;W.box(.86,height,.18,i%2?'#b99973':'#c5a47a',0,height/2,1.31+i*.14,stairs);}
 return g;
}
