// Aperiodic spatial relief, periodic time. The integer cycle counts share the
// world's 96-second clock; no accumulated offsets or frame-dependent noise.
export const WATER_LAYERS = Object.freeze([
 {scale:.82,amplitude:.060,angle:.37,cycles:6,orbit:1.2},
 {scale:2.31,amplitude:.025,angle:1.63,cycles:10,orbit:.9},
 {scale:6.73,amplitude:.010,angle:2.47,cycles:18,orbit:.75},
 {scale:17.13,amplitude:.004,angle:-.83,cycles:26,orbit:.6},
 {scale:38.27,amplitude:.0016,angle:.98,cycles:44,orbit:.5}
]);
const fract=n=>n-Math.floor(n), hash=(x,z)=>fract(Math.sin(x*127.1+z*311.7)*43758.5453);
function noiseGradient(x,z) {
 const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
 const ux=fx*fx*(3-2*fx),uz=fz*fz*(3-2*fz),dx=6*fx*(1-fx),dz=6*fz*(1-fz);
 const a=hash(ix,iz),b=hash(ix+1,iz),c=hash(ix,iz+1),d=hash(ix+1,iz+1),cross=a-b-c+d;
 return [a+(b-a)*ux+(c-a)*uz+cross*ux*uz,dx*(b-a+cross*uz),dz*(c-a+cross*ux)];
}
export function sampleWaterField(x,z,time) {
 const out=[0,0,0],phase=time*Math.PI*2/96;
 for(const l of WATER_LAYERS){
  const c=Math.cos(l.angle),s=Math.sin(l.angle),a=phase*l.cycles;
  const n=noiseGradient((c*x-s*z)*l.scale+Math.cos(a)*l.orbit,(s*x+c*z)*l.scale+Math.sin(a)*l.orbit);
  out[0]+=(n[0]-.5)*l.amplitude;out[1]+=(c*n[1]+s*n[2])*l.scale*l.amplitude;out[2]+=(-s*n[1]+c*n[2])*l.scale*l.amplitude;
 }
 return out;
}
const num=n=>Number(n).toFixed(7);
const waveCalls=WATER_LAYERS.map(l=>`{
 float c=${num(Math.cos(l.angle))},s=${num(Math.sin(l.angle))};
 vec2 q=vec2(c*p.x-s*p.y,s*p.x+c*p.y)*${num(l.scale)}+vec2(cos(a*${num(l.cycles)}),sin(a*${num(l.cycles)}))*${num(l.orbit)};
 vec3 n=gradientNoise(q);h.x+=(n.x-.5)*${num(l.amplitude)};
 h.yz+=vec2(c*n.y+s*n.z,-s*n.y+c*n.z)*${num(l.scale*l.amplitude)};
}`).join('\n');
export function water(W) {
 const T=W.THREE;
 const material=W.own(new T.ShaderMaterial({
 uniforms:{time:{value:0},vessels:{value:Array.from({length:4},()=>new T.Vector4())}},
 vertexShader:`varying vec3 worldP;void main(){worldP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldP,1.);}`,
 fragmentShader:`precision highp float;uniform float time;uniform vec4 vessels[4];varying vec3 worldP;
 float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
 vec3 gradientNoise(vec2 q){
  vec2 i=floor(q),f=fract(q),u=f*f*(3.-2.*f),du=6.*f*(1.-f);
  float a=hash(i),b=hash(i+vec2(1.,0.)),c=hash(i+vec2(0.,1.)),d=hash(i+1.);
  float k=a-b-c+d;
  return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y,du*vec2(b-a+k*u.y,c-a+k*u.x));
 }
 vec3 relief(vec2 p,float a){vec3 h=vec3(0.);${waveCalls}return h;}
 void main(){
  float a=time*6.28318530718/96.;vec2 p=worldP.xz;vec3 h=relief(p,a);
  vec3 normal=normalize(vec3(-h.y*3.8,1.,-h.z*3.8));
  vec3 viewDir=normalize(cameraPosition-worldP);
  vec3 reflection=reflect(-viewDir,normal);
  float fresnel=.035+.965*pow(1.-max(dot(normal,viewDir),0.),5.);
  // Keep the absorption field quiet: most visible variation comes from reflected
  // light and fine normal detail, not broad painted diagonal sine bands.
  vec3 deep=vec3(.004,.085,.115),turquoise=vec3(.009,.155,.183);
  float depthTone=clamp(.45+h.x*3.,.2,.7);
  vec3 color=mix(deep,turquoise,depthTone);
  vec3 sky=mix(vec3(.27,.38,.39),vec3(.50,.65,.68),smoothstep(.05,.85,reflection.y));
  float bank=pow(clamp(abs(p.x)/3.85,0.,1.),5.);
  sky=mix(sky,vec3(.28,.22,.13),bank*.55);
  color=mix(color,sky,clamp(fresnel+.09,0.,.55));
  vec3 sun=normalize(vec3(-.45,.82,.36));
  vec3 halfLight=normalize(sun+viewDir);
  float ndh=max(dot(normal,halfLight),0.);
  float glint=pow(ndh,150.);float sheen=pow(ndh,22.);
  float breakup=.45+.55*gradientNoise(p*29.+h.yz*4.).x;
  color+=vec3(1.0,.88,.64)*(glint*breakup*.85+sheen*.018);
  // Analytic, rippled reflection approximations, not a planar scene capture.
  // Mooring/quay shadows darken contact with the bank instead of flat tan bands.
  float quay=exp(-max(0.,3.85-abs(p.x))*3.7);
  color=mix(color,vec3(.018,.045,.040),quay*.45);
  vec2 disturbed=p+vec2(h.y,h.z)*.55;
  float cranePatch=exp(-pow((disturbed.y+1.7)*.64,2.))+exp(-pow((disturbed.y-5.7)*.64,2.));
  float craneLine=pow(.5+.5*sin(disturbed.y*12.+h.x*65.),5.);
  color=mix(color,vec3(.24,.095,.025),quay*cranePatch*craneLine*.34);
  for(int i=0;i<4;i++){
   vec2 q=p-vessels[i].xy;float c=cos(vessels[i].z),s=sin(vessels[i].z);
   q=mat2(c,-s,s,c)*q;float width=vessels[i].w;
   q+=vec2(h.y*.45+.075,h.z*.3);
   float silhouette=1.-smoothstep(.75,1.35,length(q/vec2(width,.9+width*1.4)));
   float broken=.55+.45*gradientNoise(p*19.+h.yz*3.).x;
   color=mix(color,vec3(.003,.026,.035),silhouette*broken*.54);
   float hullEdge=exp(-pow((abs(q.x)-width)*11.,2.))*(1.-smoothstep(.75,1.1,abs(q.y)/(.9+width*1.4)));
   color+=vec3(.12,.16,.14)*hullEdge*.13*broken;
  }
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`,side:T.DoubleSide}));
 const geometry=W.own(new T.PlaneGeometry(7.7,22.3));geometry.rotateX(-Math.PI/2);
 const mesh=new T.Mesh(geometry,material);mesh.position.y=.045;W.group().add(mesh);
 return {material};
}

export function buildWakeGeometryData(length,width) {
 const positions=[],alpha=[],segments=36,trail=length>3?1.85:1.05;
 const vertex=(x,z,a)=>{positions.push(x,0,z);alpha.push(a);};
 // Four rails form a soft-edged ribbon. Slight unevenness breaks rigid V lines,
 // and several detached inner streaks read as aerated water rather than wire.
 const ribbon=(side,start,spread,thickness,opacity)=>{
  for(let i=0;i<segments;i++){
   const points=[];
   for(const j of [i,i+1]){
    const t=j/segments,z=-length*.45-t*trail;
    const center=side*(start+t*spread+.025*Math.sin(t*23.+side)*Math.sin(Math.PI*t));
    const breadth=thickness*(.65+Math.sin(Math.PI*t)*.8);
    const fade=Math.sin(Math.PI*t)**.7*(.72+.28*Math.sin(t*79.+side*2.));
    points.push([-1,-.28,.28,1].map((k,n)=>[center+k*breadth,z,(n===0||n===3?0:fade*opacity)]));
   }
   for(let r=0;r<3;r++)for(const [row,col] of [[0,r],[1,r],[0,r+1],[0,r+1],[1,r],[1,r+1]])vertex(...points[row][col]);
  }
 };
 for(const side of [-1,1]){ribbon(side,width*.43,width*.22,.055,1);ribbon(side,width*.18,width*.18,.032,.5);}
 return {positions,alpha};
}
export function wake(W,length=2,width=.5) {
 const T=W.THREE,g=W.group(0,.065,0),data=buildWakeGeometryData(length,width);
 const geometry=W.own(new T.BufferGeometry());geometry.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));
 const colors=[];for(const a of data.alpha)colors.push(1,1,1,a);
 geometry.setAttribute('color',new T.Float32BufferAttribute(colors,4));geometry.computeVertexNormals();
 const material=W.own(new T.MeshBasicMaterial({color:'#c7e3db',vertexColors:true,transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false}));
 g.add(new T.Mesh(geometry,material));return {root:g,material};
}
