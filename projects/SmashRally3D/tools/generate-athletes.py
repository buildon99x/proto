"""Original weighted athlete skin, 17-joint common rig and nine full-body clips.
No downloaded characters, motions, textures, or external generation service."""
from pathlib import Path
import math,json,struct
# Reuse original primitive author without executing its legacy asset creation block.
source=Path(__file__).with_name('generate-assets.py').read_text();scope={'__file__':str(Path(__file__).with_name('generate-assets.py'))};exec(source[:source.index('for uniform,name')],scope);GLB=scope['GLB']
MOTIONS=json.loads((Path(__file__).resolve().parents[1]/'app/src/motion-data.json').read_text())
BONES=[('Hip',None,[0,.96,0]),('Spine','Hip',[0,.28,0]),('Chest','Spine',[0,.22,0]),('Neck','Chest',[0,.16,0]),('Head','Neck',[0,.13,0]),('ShoulderR','Chest',[.27,.02,0]),('ElbowR','ShoulderR',[0,-.36,0]),('WristR','ElbowR',[0,-.36,0]),('ShoulderL','Chest',[-.27,.02,0]),('ElbowL','ShoulderL',[0,-.36,0]),('WristL','ElbowL',[0,-.36,0]),('HipR','Hip',[.16,0,0]),('KneeR','HipR',[0,-.43,0]),('AnkleR','KneeR',[0,-.43,0]),('HipL','Hip',[-.16,0,0]),('KneeL','HipL',[0,-.43,0]),('AnkleL','KneeL',[0,-.43,0])]
def quat(x,y,z):
 x,y,z=[math.radians(a)/2 for a in (x,y,z)];cx,sx=math.cos(x),math.sin(x);cy,sy=math.cos(y),math.sin(y);cz,sz=math.cos(z),math.sin(z);return [sx*cy*cz-cx*sy*sz,cx*sy*cz+sx*cy*sz,cx*cy*sz-sx*sy*cz,cx*cy*cz+sx*sy*sz]
for uniform,filename in [('#f4b64d','athlete-gold.glb'),('#8491ed','athlete-violet.glb')]:
 g=GLB();names={};rest={};g.g['nodes']=[{'name':'AthleteRig','children':[]}];g.g['scenes'][0]['nodes']=[0]
 for name,parent,p in BONES:
  i=len(g.g['nodes']);names[name]=i;g.g['nodes'].append({'name':name,'translation':p,'children':[]});g.g['nodes'][names[parent] if parent else 0]['children'].append(i);r=rest[parent] if parent else [0,0,0];rest[name]=[r[k]+p[k] for k in range(3)]
 joints=[names[x[0]] for x in BONES];joint_index={n:i for i,(n,_,_) in enumerate(BONES)};parts={};geo={}
 def read_acc(index):
  a=g.g['accessors'][index];v=g.g['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC3':3}[a['type']];fmt='f' if a['componentType']==5126 else 'H';vals=struct.unpack_from('<'+fmt*(a['count']*n),g.data,v.get('byteOffset',0));return [list(vals[i:i+n]) for i in range(0,len(vals),n)] if n>1 else list(vals)
 def unit(kind):
  if kind not in geo:
   mid=g.mesh(kind,g.material('#ffffff'));pr=g.g['meshes'][mid]['primitives'][0];geo[kind]=(read_acc(pr['attributes']['POSITION']),read_acc(pr['attributes']['NORMAL']),read_acc(pr['indices']))
  return geo[kind]
 def part(kind,center,scale,color,bone,blend=None):
  pos,normal,idx=unit(kind);buf=parts.setdefault(color,{'p':[],'n':[],'i':[],'j':[],'w':[]});offset=len(buf['p'])
  for p,n in zip(pos,normal):
   at=[center[k]+p[k]*scale[k] for k in range(3)];no=[n[k]/scale[k] for k in range(3)];length=math.sqrt(sum(v*v for v in no));buf['p'].append(at);buf['n'].append([v/length for v in no]);weights=[1,0,0,0];ji=[joint_index[bone],0,0,0]
   if blend:
    t=max(0,min(1,(at[1]-blend[2])/(blend[3]-blend[2])));ji=[joint_index[blend[0]],joint_index[blend[1]],0,0];weights=[1-t,t,0,0]
   buf['j'].append(ji);buf['w'].append(weights)
  buf['i'].extend([v+offset for v in idx])
 part('sphere',[0,1.18,0],[.60,.86,.39],uniform,'Spine',('Spine','Chest',1.15,1.47));part('sphere',[0,.94,0],[.46,.32,.35],'#1b3145','Hip');part('sphere',[0,1.67,0],[.19,.29,.19],'#dcb08b','Neck');part('sphere',[0,1.84,0],[.36,.42,.33],'#dcb08b','Head');part('sphere',[0,1.98,-.025],[.38,.20,.34],'#263346','Head')
 # Face +Z; player yaw0, opponent yaw180, same handed rig.
 for x in [-.070,.070]:part('sphere',[x,1.875,.146],[.047,.048,.027],'#f2f4ec','Head');part('sphere',[x,1.875,.163],[.020,.028,.015],'#263346','Head')
 part('sphere',[0,1.83,.166],[.055,.068,.060],'#d1a07d','Head')
 for suffix,sign in [('R',1),('L',-1)]:
  x=sign*.27;part('sphere',[x,1.44,0],[.27,.29,.29],uniform,'Shoulder'+suffix);part('cylinder',[x,1.30,0],[.15,.36,.15],'#dcb08b','Shoulder'+suffix);part('cylinder',[x,.94,0],[.13,.36,.13],'#dcb08b','Elbow'+suffix);part('sphere',[x,1.12,0],[.17,.17,.17],'#dcb08b','Elbow'+suffix);part('sphere',[x,.76,0],[.16,.18,.16],'#dcb08b','Wrist'+suffix)
  x=sign*.16;part('sphere',[x,.83,0],[.29,.37,.33],'#1b3145','Hip'+suffix);part('cylinder',[x,.745,0],[.19,.43,.19],'#dcb08b','Hip'+suffix);part('sphere',[x,.53,0],[.20,.20,.20],'#dcb08b','Knee'+suffix);part('cylinder',[x,.315,0],[.16,.43,.16],'#dcb08b','Knee'+suffix);part('box',[x,.11,.08],[.24,.14,.38],'#f2f4ec','Ankle'+suffix);part('box',[x,.053,.08],[.25,.025,.39],'#23364b','Ankle'+suffix)
 primitives=[];g.g['meshes']=[];g.g['materials']=[]
 for color,buf in parts.items():primitives.append({'attributes':{'POSITION':g.acc(buf['p'],'VEC3'),'NORMAL':g.acc(buf['n'],'VEC3'),'JOINTS_0':g.acc(buf['j'],'VEC4',5123),'WEIGHTS_0':g.acc(buf['w'],'VEC4')},'indices':g.acc(buf['i'],'SCALAR',5123),'material':g.material(color)})
 g.g['meshes'].append({'name':'WeightedAthlete','primitives':primitives});inverse=[]
 for name,_,_ in BONES:
  p=rest[name];inverse.append([1,0,0,0,0,1,0,0,0,0,1,0,-p[0],-p[1],-p[2],1])
 g.g['skins']=[{'name':'CommonAthlete17','joints':joints,'skeleton':names['Hip'],'inverseBindMatrices':g.acc(inverse,'MAT4')}];skin_node=len(g.g['nodes']);g.g['nodes'].append({'name':'AthleteSkin','mesh':0,'skin':0});g.g['nodes'][0]['children'].append(skin_node)
 for motion,profile in MOTIONS.items():
  duration=profile['duration'];times=sorted(set([round(duration*i/24,6) for i in range(25)]+([profile['lead']] if profile['lead'] else [])));channels=[];samplers=[];time_acc=g.acc(times,'SCALAR')
  for name,_,_ in BONES:
   rotations=[]
   for t in times:
    lead=profile['lead'];progress=min(1,t/lead) if lead else 0;follow=max(0,min(1,(t-lead)/max(.18,profile['recover']))) if lead else 0;coil=(-profile['coil']*(1-progress)+profile['coil']*.75*follow)*180/math.pi if lead else math.sin(t/duration*math.tau)*3;stride=math.sin(t/duration*math.tau)*(28 if motion=='Run' else 14 if motion=='SideStep' else 0);x,y,z=0,0,0
    if name=='Spine':x=profile['bend']*45;y=coil*.3
    elif name=='Chest':x=profile['bend']*35;y=coil*.7
    elif name.startswith('Hip') and name!='Hip':x=stride*(1 if name.endswith('R') else -1)
    elif name.startswith('Knee'):x=max(8,-stride*(1 if name.endswith('R') else -1))
    elif name=='ShoulderR':x=-(150 if motion in ['Clear','Smash'] else 60 if motion=='BasicHit' else 25)*(1-progress*.25)*(1-follow*.8) if lead else -12;y=coil*.2
    elif name=='ElbowR':x=-65*(1-progress)+25*follow if lead else -40
    elif name=='ShoulderL':x=-70*(1-follow) if motion in ['Clear','Smash'] else -18
    elif name=='ElbowL':x=-35
    rotations.append(quat(x,y,z))
   samplers.append({'input':time_acc,'output':g.acc(rotations,'VEC4'),'interpolation':'LINEAR'});channels.append({'sampler':len(samplers)-1,'target':{'node':names[name],'path':'rotation'}})
  g.g['animations'].append({'name':motion,'samplers':samplers,'channels':channels,'extras':{'hit_frame_seconds':profile['lead'] or None,'runtime':'fixed-clock skeletal pose + constrained IK and planted feet'}})
 g.save(filename)
 print(filename,'17 weighted joints,',len(g.g['animations']),'full-body clips')
