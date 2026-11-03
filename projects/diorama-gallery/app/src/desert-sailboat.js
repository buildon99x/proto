/** Original procedural felucca. Same local +Z bow, −Z wake and W→Group contract as the existing boat.
 * No textures, external assets, animation loop or route changes. Cache lifetime is the owning W.
 * Caller retains the existing 1.25 scale, boatPose(t,i), y=−.015 and 120-second clock.
 */
const shared=new WeakMap();
function resources(W){
 if(shared.has(W))return shared.get(W);
 const T=W.THREE,own=r=>W.own(r),wood=own(new T.MeshStandardMaterial({color:'#694d35',roughness:.94,flatShading:true})),deck=own(new T.MeshStandardMaterial({color:'#b08a57',roughness:.94})),spar=own(new T.MeshStandardMaterial({color:'#755a3c',roughness:.92})),cloth=own(new T.MeshStandardMaterial({color:'#e0cfab',roughness:.98,side:T.DoubleSide})),thread=own(new T.LineBasicMaterial({vertexColors:true}));
 // A closed, five-sided cross-section loft. End sections rise and taper to a +Z bow.
 const stations=[[-.35,.012,.14,.085],[-.25,.078,.125,.025],[-.12,.112,.12,.010],[.05,.118,.12,.009],[.20,.092,.125,.025],[.30,.047,.14,.065],[.36,.002,.16,.12]],hullPositions=[],sides=[],top=[];
 for(const [z,w,y,k]of stations)hullPositions.push(-w,y,z,w,y,z,w*.62,k+.018,z,0,k,z,-w*.62,k+.018,z);
 for(let i=0;i<stations.length-1;i++)for(let j=0;j<5;j++){const a=i*5+j,b=a+5,c=i*5+(j+1)%5,d=c+5;(j===0?top:sides).push(a,b,c,b,d,c);}
 for(let j=1;j<4;j++){sides.push(0,j,j+1);const a=(stations.length-1)*5;sides.push(a,a+j+1,a+j);}
 const hull=own(new T.BufferGeometry());hull.setAttribute('position',new T.Float32BufferAttribute(hullPositions,3));hull.setIndex([...sides,...top]);hull.addGroup(0,sides.length,0);hull.addGroup(sides.length,top.length,1);hull.computeVertexNormals();
 // A small curved triangle of cloth, with all boundary edges on the three authored corners.
 const corners=[[0,.665,-.23],[0,.285,.27],[0,.17,-.18]],clothPoint=(a,b,c)=>[.045*27*a*b*c,...[1,2].map(k=>corners[0][k]*a+corners[1][k]*b+corners[2][k]*c)],sailPositions=[],sailIndices=[],rows=[],n=4;
 for(let i=0;i<=n;i++){rows[i]=[];for(let j=0;j<=n-i;j++){rows[i][j]=sailPositions.length/3;sailPositions.push(...clothPoint(1-(i+j)/n,i/n,j/n));}}
 for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){const a=rows[i][j],b=rows[i+1][j],c=rows[i][j+1];sailIndices.push(a,b,c);if(j<n-i-1)sailIndices.push(b,rows[i+1][j+1],c);}
 const sail=own(new T.BufferGeometry());sail.setAttribute('position',new T.Float32BufferAttribute(sailPositions,3));sail.setIndex(sailIndices);sail.computeVertexNormals();
 const linePositions=[],lineColors=[],line=(a,b,color)=>{linePositions.push(...a,...b);const c=new T.Color(color);for(let i=0;i<2;i++)lineColors.push(c.r,c.g,c.b);};
 const mastBase=[0,.12,-.015],mastTop=[0,.66,-.015],yardA=[0,.68,-.25],yardB=[0,.27,.29];
 for(const end of [[0,.14,-.32],[0,.15,.32],[-.11,.12,-.015],[.11,.12,-.015]])line(mastTop,end,'#9c8260');
 line(corners[2],[0,.125,-.28],'#9c8260');line(corners[1],[.09,.13,.20],'#9c8260');
 for(const side of [-1,1])for(let i=0;i<stations.length-1;i++){const a=stations[i],b=stations[i+1];line([side*a[1],a[2]+.002,a[0]],[side*b[1],b[2]+.002,b[0]],'#402f23');}
 for(const x of [-.06,-.025,.025,.06])for(let i=1;i<5;i++){const a=stations[i],b=stations[i+1];if(Math.abs(x)<Math.min(a[1],b[1]))line([x,a[2]+.002,a[0]],[x,b[2]+.002,b[0]],'#80603e');}
 for(const b of [1/3,2/3])for(let i=0;i<4;i++){const c0=(1-b)*i/4,c1=(1-b)*(i+1)/4,a=clothPoint(1-b-c0,b,c0),c=clothPoint(1-b-c1,b,c1);a[0]+=.001;c[0]+=.001;line(a,c,'#b9a27d');}
 const rigging=own(new T.BufferGeometry());rigging.setAttribute('position',new T.Float32BufferAttribute(linePositions,3));rigging.setAttribute('color',new T.Float32BufferAttribute(lineColors,3));
 const result={hull,sail,rigging,wood,deck,spar,cloth,thread,cylinder:own(new T.CylinderGeometry(1,1,1,6)),box:own(new T.BoxGeometry(1,1,1)),mastBase,mastTop,yardA,yardB};shared.set(W,result);return result;
}
export function sailboat(W){
 const T=W.THREE,r=resources(W),g=W.group();g.name='river-sailboat';
 const mesh=(geometry,material,name)=>{const m=new T.Mesh(geometry,material);m.name=name;m.castShadow=m.receiveShadow=true;g.add(m);return m;};
 mesh(r.hull,[r.wood,r.deck],'felucca-hull');mesh(r.sail,r.cloth,'felucca-sail');
 const beam=(a,b,radius,name)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start),m=mesh(r.cylinder,r.spar,name);m.position.copy(start).add(end).multiplyScalar(.5);m.scale.set(radius,delta.length(),radius);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());};
 beam(r.mastBase,r.mastTop,.008,'felucca-mast');beam(r.yardA,r.yardB,.006,'felucca-yard');
 for(const z of [-.10,.12]){const bench=mesh(r.box,r.deck,'felucca-bench');bench.scale.set(.18,.014,.032);bench.position.set(0,.135,z);}
 const rudder=mesh(r.box,r.wood,'felucca-rudder');rudder.scale.set(.012,.055,.065);rudder.position.set(0,.0525,-.3075);
 const rigging=new T.LineSegments(r.rigging,r.thread);rigging.name='felucca-rigging';g.add(rigging);
 // Preserve the old wake exactly, including its names, tube width and route-relative coordinates.
 const wake=W.group(0,0,0,g);wake.name='boat-wake';for(const side of [-1,1])W.line([[side*.06,.035,-.24],[side*.10,.035,-.30],[side*.14,.035,-.36]],'#bdd7bf',.022,wake);
 return g;
}
export default sailboat;
