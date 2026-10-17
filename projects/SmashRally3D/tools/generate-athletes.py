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
 g=GLB(linear_colors=True);names={};rest={};g.g['nodes']=[{'name':'AthleteRig','children':[]}];g.g['scenes'][0]['nodes']=[0]
 for name,parent,p in BONES:
  i=len(g.g['nodes']);names[name]=i;g.g['nodes'].append({'name':name,'translation':p,'children':[]});g.g['nodes'][names[parent] if parent else 0]['children'].append(i);r=rest[parent] if parent else [0,0,0];rest[name]=[r[k]+p[k] for k in range(3)]
 joints=[names[x[0]] for x in BONES];joint_index={n:i for i,(n,_,_) in enumerate(BONES)};parts={};geo={}
 def read_acc(index):
  a=g.g['accessors'][index];v=g.g['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC3':3}[a['type']];fmt='f' if a['componentType']==5126 else 'H';vals=struct.unpack_from('<'+fmt*(a['count']*n),g.data,v.get('byteOffset',0));return [list(vals[i:i+n]) for i in range(0,len(vals),n)] if n>1 else list(vals)
 def unit(kind):
  if kind not in geo:
   mid=g.mesh(kind,g.material('#ffffff'));pr=g.g['meshes'][mid]['primitives'][0];geo[kind]=(read_acc(pr['attributes']['POSITION']),read_acc(pr['attributes']['NORMAL']),read_acc(pr['indices']))
  return geo[kind]
 def vertex_normals(pos,idx,fallback=None,columns=None):
  values=[[0.,0.,0.] for _ in pos]
  for i in range(0,len(idx),3):
   a,b,c=idx[i:i+3];u=[pos[b][k]-pos[a][k] for k in range(3)];v=[pos[c][k]-pos[a][k] for k in range(3)]
   n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
   for j in [a,b,c]:values[j]=[values[j][k]+n[k] for k in range(3)]
  if columns:
   for first in range(0,len(pos),columns+1):
    merged=[values[first][k]+values[first+columns][k] for k in range(3)];values[first]=merged;values[first+columns]=merged[:]
  result=[]
  for i,n in enumerate(values):
   length=math.sqrt(sum(v*v for v in n));result.append([v/length for v in n] if length>1e-12 else fallback[i] if fallback else [0,1,0])
  return result
 def loft(name,stations,axis='y',columns=24):
  # Authored elliptical sections, rather than rescaled spheres/cylinders.
  # Station: axial coordinate, two radii, offset of the second cross axis.
  pos=[];idx=[]
  for at,rx,ry,offset in stations:
   for col in range(columns+1):
    angle=col/columns*math.tau;a=rx*math.cos(angle);b=offset+ry*math.sin(angle)
    pos.append([a,at,b] if axis=='y' else [a,b,at])
  for row in range(len(stations)-1):
   for col in range(columns):
    a=row*(columns+1)+col;b=a+columns+1
    idx.extend([a,b,a+1,a+1,b,b+1] if axis=='y' else [a,a+1,b,a+1,b+1,b])
  normal=vertex_normals(pos,idx,columns=columns)
  # Separate flat cap normals retain crisp sewn hems and stable shoe grounding.
  for row,side in [(0,-1),(len(stations)-1,1)]:
   at,_,_,offset=stations[row];centre=len(pos);pos.append([0,at,offset] if axis=='y' else [0,offset,at]);n=[0,side,0] if axis=='y' else [0,0,side];normal.append(n[:]);start=len(pos)
   for col in range(columns+1):pos.append(pos[row*(columns+1)+col][:]);normal.append(n[:])
   for col in range(columns):
    a=start+col;b=a+1;reverse=(side==1) if axis=='y' else (side==-1);idx.extend([centre,b,a] if reverse else [centre,a,b])
  geo[name]=(pos,normal,idx);return name
 def shaped_head():
  pos,normal,idx=unit('sphere');pos=[[p[0]*(1-.23*max(0,-p[1]*2)**1.3),p[1],p[2]*(1-.08*max(0,-p[1]*2))] for p in pos]
  geo['jaw']=(pos,vertex_normals(pos,idx,normal,24),idx);return 'jaw'
 def part(kind,center,scale,color,bone,blend=None):
  pos,normal,idx=unit(kind);buf=parts.setdefault(color,{'p':[],'n':[],'i':[],'j':[],'w':[]});offset=len(buf['p'])
  for p,n in zip(pos,normal):
   at=[center[k]+p[k]*scale[k] for k in range(3)];no=[n[k]/scale[k] for k in range(3)];length=math.sqrt(sum(v*v for v in no));buf['p'].append(at);buf['n'].append([v/length for v in no]);weights=[1,0,0,0];ji=[joint_index[bone],0,0,0]
   if blend:
    t=max(0,min(1,(at[1]-blend[2])/(blend[3]-blend[2])));ji=[joint_index[blend[0]],joint_index[blend[1]],0,0];weights=[1-t,t,0,0]
   buf['j'].append(ji);buf['w'].append(weights)
  buf['i'].extend([v+offset for v in idx])
 jersey=loft('jersey',[(.96,.235,.155,0),(1.02,.224,.158,0),(1.17,.253,.18,0),(1.34,.296,.187,0),(1.45,.29,.16,0),(1.51,.215,.132,0),(1.555,.105,.105,0)])
 part(jersey,[0,0,0],[1,1,1],uniform,'Spine',('Spine','Chest',1.15,1.47))
 part(loft('shorts waist',[(.78,.20,.155,0),(.90,.24,.175,0),(1.02,.235,.165,0),(1.085,.223,.15,0)]),[0,0,0],[1,1,1],'#1b3145','Hip')
 part('sphere',[0,1.67,0],[.19,.29,.19],'#dcb08b','Neck')
 part(shaped_head(),[0,1.84,0],[.36,.42,.33],'#dcb08b','Head')
 part(loft('short crop',[(1.90,.16,.14,-.025),(1.93,.19,.17,-.025),(2.00,.175,.155,-.025),(2.055,.11,.095,-.025),(2.08,.006,.006,-.025)]),[0,0,0],[1,1,1],'#263346','Head')
 part(loft('collar',[(1.535,.135,.116,0),(1.552,.108,.106,0),(1.56,.103,.101,0)]),[0,0,0],[1,1,1],'#1b3145','Chest')
 # Face +Z; player yaw0, opponent yaw180, same handed rig.
 for x in [-.070,.070]:part('sphere',[x,1.875,.146],[.047,.048,.027],'#f2f4ec','Head');part('sphere',[x,1.875,.163],[.020,.028,.015],'#263346','Head')
 part('sphere',[0,1.83,.166],[.055,.068,.060],'#d1a07d','Head')
 for sign in [-1,1]:
  part('sphere',[sign*.177,1.845,0],[.05,.09,.05],'#dcb08b','Head')
  part('box',[sign*.070,1.907,.167],[.055,.012,.018],'#263346','Head')
 part('sphere',[0,1.793,.164],[.061,.012,.018],'#263346','Head')
 for suffix,sign in [('R',1),('L',-1)]:
  x=sign*.27
  part(loft('sleeve',[(1.32,.091,.096,0),(1.36,.111,.12,0),(1.46,.135,.145,0),(1.53,.118,.128,0),(1.585,.032,.04,0)]),[x,0,0],[1,1,1],uniform,'Shoulder'+suffix)
  part(loft('sleeve hem',[(1.32,.093,.098,0),(1.342,.101,.108,0)]),[x,0,0],[1,1,1],'#1b3145','Shoulder'+suffix)
  part(loft('upper arm',[(1.12,.075,.073,0),(1.20,.077,.077,0),(1.31,.086,.080,0),(1.42,.079,.075,0),(1.48,.067,.067,0)]),[x,0,0],[1,1,1],'#dcb08b','Shoulder'+suffix)
  part(loft('forearm',[(.76,.052,.05,0),(.84,.058,.055,0),(.96,.071,.066,0),(1.06,.074,.069,0),(1.12,.073,.07,0)]),[x,0,0],[1,1,1],'#dcb08b','Elbow'+suffix)
  part('sphere',[x,1.12,0],[.156,.16,.15],'#dcb08b','Elbow'+suffix);part('sphere',[x,.76,0],[.145,.18,.12],'#dcb08b','Wrist'+suffix)
  part('sphere',[x+sign*.060,.778,.015],[.050,.09,.05],'#dcb08b','Wrist'+suffix)
  x=sign*.16
  part(loft('shorts leg',[(.645,.123,.143,0),(.70,.14,.158,0),(.90,.145,.164,0),(1.015,.119,.14,0)]),[x,0,0],[1,1,1],'#1b3145','Hip'+suffix)
  part(loft('thigh',[(.53,.084,.081,0),(.65,.095,.089,0),(.83,.100,.094,0),(.96,.093,.089,0)]),[x,0,0],[1,1,1],'#dcb08b','Hip'+suffix)
  part('sphere',[x,.53,0],[.18,.20,.17],'#dcb08b','Knee'+suffix)
  part(loft('calf',[(.10,.054,.054,0),(.19,.061,.062,0),(.34,.083,.078,0),(.44,.077,.074,0),(.53,.072,.070,0)]),[x,0,0],[1,1,1],'#dcb08b','Knee'+suffix)
  part(loft('shoe upper',[(-.10,.045,.015,.105),(-.08,.095,.05,.12),(.04,.115,.06,.12),(.19,.110,.04,.105),(.26,.035,.01,.09)],'z'),[x,0,0],[1,1,1],'#f2f4ec','Ankle'+suffix)
  part(loft('shoe sole',[(-.115,.055,.0125,.0525),(-.09,.10,.0125,.0525),(.12,.125,.0125,.0525),(.24,.110,.0125,.0525),(.275,.04,.0125,.0525)],'z'),[x,0,0],[1,1,1],'#23364b','Ankle'+suffix)
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
