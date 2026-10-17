"""Check authored geometry without changing the shared rig, clips or physical runtime."""
from pathlib import Path
import hashlib,json,math,struct,subprocess

repo=Path(__file__).resolve().parents[3]
base=repo/'projects/SmashRally3D/verification/athlete-form-20261017'
reference='3f181892613ef7c4b898534efc062bb22f36f362'
def parse(raw):
 magic,version,total=struct.unpack_from('<III',raw);assert magic==0x46546c67 and version==2 and total==len(raw)
 length,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
 data=json.loads(raw[20:20+length]);offset=20+length;length,kind=struct.unpack_from('<II',raw,offset);assert kind==0x004e4942
 return data,raw[offset+8:offset+8+length]
def accessor(glb,index):
 data,raw=glb;a=data['accessors'][index];view=data['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt={5123:'H',5126:'f'}[a['componentType']];width=struct.calcsize(fmt);stride=view.get('byteStride',count*width);offset=view.get('byteOffset',0)+a.get('byteOffset',0)
 return [tuple(struct.unpack_from('<'+fmt*count,raw,offset+i*stride)) for i in range(a['count'])]
def bounds(glb):
 p=[p for mesh in glb[0]['meshes'] for primitive in mesh['primitives'] for p in accessor(glb,primitive['attributes']['POSITION'])]
 return [[min(p[k] for p in p) for k in range(3)],[max(p[k] for p in p) for k in range(3)]]
results=[]
for name in ['athlete-gold.glb','athlete-violet.glb']:
 relative='projects/SmashRally3D/app/public/assets/models/'+name
 old=parse(subprocess.check_output(['git','show',reference+':'+relative],cwd=repo));new=parse((repo/relative).read_bytes());a,b=old[0],new[0]
 assert a['nodes']==b['nodes'] and a['scenes']==b['scenes'], 'Changed joint hierarchy/rest or root transforms'
 assert a['materials']==b['materials'], 'Geometry review must not also change material values/order'
 assert len(a['meshes'][0]['primitives'])==len(b['meshes'][0]['primitives']), 'Changed draw/material batch count'
 assert {k:v for k,v in a['skins'][0].items() if k!='inverseBindMatrices'}=={k:v for k,v in b['skins'][0].items() if k!='inverseBindMatrices'}
 assert accessor(old,a['skins'][0]['inverseBindMatrices'])==accessor(new,b['skins'][0]['inverseBindMatrices'])
 assert bounds(old)==bounds(new), (name,bounds(old),bounds(new))
 clips=[]
 for x,y in zip(a['animations'],b['animations']):
  assert x['name']==y['name'] and x['channels']==y['channels'] and x.get('extras')==y.get('extras')
  for u,v in zip(x['samplers'],y['samplers']):
   assert u['interpolation']==v['interpolation']
   for key in ['input','output']:assert accessor(old,u[key])==accessor(new,v[key]), (name,x['name'],key)
  clips.append(x['name'])
 assert len(a['animations'])==len(b['animations'])==9
 vertices=0;triangles=0
 for primitive in b['meshes'][0]['primitives']:
  attr=primitive['attributes'];p=accessor(new,attr['POSITION']);n=accessor(new,attr['NORMAL']);j=accessor(new,attr['JOINTS_0']);w=accessor(new,attr['WEIGHTS_0']);indices=[i[0] for i in accessor(new,primitive['indices'])]
  assert len(p)==len(n)==len(j)==len(w);assert len(indices)%3==0 and all(0<=i<len(p) for i in indices)
  assert all(math.isfinite(v) for row in p+n+w for v in row)
  assert all(abs(sum(v*v for v in row)-1)<1e-5 for row in n), 'Invalid normal'
  assert all(abs(sum(row)-1)<1e-6 and all(0<=v<=1 for v in row) for row in w)
  assert all(all(0<=i<17 for i in row) for row in j)
  vertices+=len(p);triangles+=len(indices)//3
 results.append({'file':name,'bounds':bounds(new),'nodesRestAndHierarchyIdentical':True,'jointCount':17,'inverseBindsIdentical':True,'animationDecodedValuesIdentical':clips,'materialsAndBatchCountIdentical':True,'primitives':len(b['meshes'][0]['primitives']),'vertices':vertices,'triangles':triangles,'sha256':hashlib.sha256((repo/relative).read_bytes()).hexdigest()})
unchanged=[]
for relative in ['projects/SmashRally3D/app/src/'+n for n in ['main.ts','style.css','game.ts','physics.ts','tactics.ts','motion.ts','motion-data.json','camera-framing.ts','stroke-presentation.ts','contact-visibility.ts','aim-feedback.ts']]+['projects/SmashRally3D/app/public/assets/models/'+n for n in ['court.glb','racket.glb','shuttle.glb']]:
 raw=(repo/relative).read_bytes();assert raw==subprocess.check_output(['git','show',reference+':'+relative],cwd=repo),relative;unchanged.append({'file':relative,'sha256':hashlib.sha256(raw).hexdigest()})
record={'reference':reference,'method':'Decoded binary accessor equality for17-joint rest/binds and every nine-clip input/output; exact vertex envelope, unchanged material batches, finite geometry/normals/weights. These are structural/physical safety gates, not a V2visual score.','athletes':results,'unchangedRuntimeAndThreeOtherModels':unchanged,'calibration':{'rootScale':1,'newRuntimeCompensation':False,'placement':'Existing world-space17joint posing remains unchanged; bind extents/grounding match original. Facing+Z in asset, player yaw0/opponent yaw180 as existing runtime; animated bounds require direct scene review.'}}
base.mkdir(exist_ok=True);(base/'asset-invariants.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'athletes':len(results),'clipsEach':9,'unchangedFiles':len(unchanged),'boundsAndRigExact':True}))
