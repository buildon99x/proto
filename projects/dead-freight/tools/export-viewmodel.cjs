// Export only the original viewmodel for a CPU geometry diagnostic, not browser QA.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const app=path.resolve(__dirname,'../app'),T=require(path.join(app,'vendor/three.min.js'));
const old=process.argv.includes('--previous');
if(old)vm.runInThisContext(cp.execFileSync('git',['show','6e73875f7d096c0356631a89f31700accf683cd1:projects/dead-freight/app/weapon.js'],{encoding:'utf8'}));else require(path.join(app,'weapon.js'));
const g=DFWeapon.create(T,0,{suppressed:true,laser:false});g.updateMatrixWorld(true);
const output=[];const light=new T.Vector3(-2,3,4).normalize();
g.traverse(o=>{if(!o.isMesh)return;let p=o;while(p){if(!p.visible)return;p=p.parent;}
const pos=o.geometry.attributes.position,normal=o.geometry.attributes.normal,index=o.geometry.index;
const matrix=new T.Matrix3().getNormalMatrix(o.matrixWorld),N=index?index.count:pos.count;
for(let i=0;i<N;i+=3){const points=[],normals=[];for(let j=0;j<3;j++){let k=index?index.getX(i+j):i+j;points.push(new T.Vector3().fromBufferAttribute(pos,k).applyMatrix4(o.matrixWorld).toArray());normals.push(new T.Vector3().fromBufferAttribute(normal,k).applyMatrix3(matrix).normalize());}
const n=normals[0].clone().add(normals[1]).add(normals[2]).normalize();let intensity=.48+.40*Math.max(0,n.dot(light))+.12*Math.max(0,n.y);const col=o.material.color.clone().multiplyScalar(intensity);if(o.material.emissive)col.add(o.material.emissive.clone().multiplyScalar(o.material.emissiveIntensity||0));output.push({p:points,c:col.toArray()});}});
process.stdout.write(JSON.stringify({previous:old,fov:62,triangles:output}));
