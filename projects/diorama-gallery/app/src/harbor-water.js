export function water(W) {
 const T=W.THREE;
 const material=W.own(new T.ShaderMaterial({
 uniforms:{time:{value:0},vessels:{value:Array.from({length:4},()=>new T.Vector4())}},
 vertexShader:`varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`precision highp float; uniform float time;uniform vec4 vessels[4];varying vec3 p;
 void main(){
 float a=time*6.28318530718/96.;
 float w=sin(p.x*11.+p.z*7.+a*48.)*.45+sin(p.z*17.-p.x*4.-a*72.)*.27+sin(p.x*27.+p.z*21.+a*96.)*.13;
 float swell=sin(p.z*1.8+p.x*2.+a*12.);
 vec3 deep=vec3(.014,.24,.31), shallow=vec3(.025,.48,.57);
 vec3 color=mix(deep,shallow,.48+.25*swell+.2*w);
 float glint=pow(max(0.,w*.55+.38),18.);
 float ribbon=pow(max(0.,sin(p.x*15.+p.z*4.+a*36.)*sin(p.z*13.-a*24.)),18.);
 color+=vec3(.72,.87,.79)*(glint*1.9+ribbon*.24);
 color+=vec3(.07,.16,.17)*pow(max(0.,swell),5.);
 // Warm, broken quay/crane reflections and soft moving hull reflections.
 float edge=pow(clamp(abs(p.x)/3.85,0.,1.),9.);
 color=mix(color,vec3(.32,.31,.19),edge*(.27+.12*w));
 for(int i=0;i<4;i++){
 vec2 q=p.xz-vessels[i].xy;float c=cos(vessels[i].z),s=sin(vessels[i].z);
 q=mat2(c,-s,s,c)*q;q.x+=.08*w+.10;
 float hull=1.-smoothstep(.72,1.2,length(q/vec2(vessels[i].w,.9+vessels[i].w*1.4)));
 color=mix(color,vec3(.017,.12,.15),hull*.35);
 }
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,side:T.DoubleSide}));
 const geometry=W.own(new T.PlaneGeometry(7.7,22.3));geometry.rotateX(-Math.PI/2);
 const mesh=new T.Mesh(geometry,material);mesh.position.y=.045;W.group().add(mesh);
 return {material};
}
export function wake(W,length=2,width=.5) {
 const T=W.THREE,g=W.group(0,.065,0);
 const verts=[];
 // Two slender foam ribbons, widened astern; their own local mesh avoids instancer visibility limitations.
 for(const s of [-1,1]) for(let i=0;i<18;i++) {
  const z=-length*.45-i*.1,x=s*(width*.45+i*.022),nx=s*(width*.45+(i+1)*.022),nz=-length*.45-(i+1)*.1;
  verts.push(x,0,z,x+s*.035,0,z,nx,0,nz,x+s*.035,0,z,nx+s*.035,0,nz,nx,0,nz);
 }
 const geo=W.own(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.computeVertexNormals();
 const mat=W.own(new T.MeshBasicMaterial({color:'#b9e4dc',transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false}));
 g.add(new T.Mesh(geo,mat));return {root:g,material:mat};
}
