"""Original geometric glTF assets; standard-library-only, deterministic, no third-party assets."""
from pathlib import Path
import math,json,struct
OUT=Path(__file__).resolve().parents[1]/'app/public/assets/models';OUT.mkdir(parents=True,exist_ok=True)
class GLB:
 def __init__(self):
  self.data=bytearray();self.g={'asset':{'version':'2.0','generator':'Smash Rally original asset author'},'buffers':[{}],'bufferViews':[],'accessors':[],'meshes':[],'materials':[],'nodes':[],'scenes':[{'nodes':[]}],'scene':0,'animations':[]}
 def acc(self,values,typ,component=5126):
  size={'SCALAR':1,'VEC3':3,'VEC4':4,'MAT4':16}[typ];flat=[x for v in values for x in (v if isinstance(v,(list,tuple)) else [v])];offset=len(self.data);self.data.extend(struct.pack('<'+('f' if component==5126 else 'H')*len(flat),*flat));length=len(self.data)-offset
  while len(self.data)%4:self.data.append(0)
  bi=len(self.g['bufferViews']);self.g['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':length});a={'bufferView':bi,'componentType':component,'count':len(flat)//size,'type':typ}
  if typ=='VEC3':a.update(min=[min(flat[i::3]) for i in range(3)],max=[max(flat[i::3]) for i in range(3)])
  if typ=='SCALAR':a.update(min=[min(flat)],max=[max(flat)])
  i=len(self.g['accessors']);self.g['accessors'].append(a);return i
 def material(self,color):
  rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)];i=len(self.g['materials']);self.g['materials'].append({'name':color,'pbrMetallicRoughness':{'baseColorFactor':rgb+[1],'metallicFactor':0,'roughnessFactor':.72}});return i
 def mesh(self,kind,material):
  p=[];n=[];idx=[]
  if kind=='box':
   for axis,sign in [(0,1),(0,-1),(1,1),(1,-1),(2,1),(2,-1)]:
    a=(axis+1)%3;b=(axis+2)%3;base=len(p)
    for u,v in [(-1,-1),(1,-1),(1,1),(-1,1)]:
     q=[0,0,0];q[axis]=sign*.5;q[a]=u*.5;q[b]=v*.5;p.append(q);no=[0,0,0];no[axis]=sign;n.append(no)
    idx.extend([base,base+1,base+2,base,base+2,base+3] if sign>0 else [base,base+2,base+1,base,base+3,base+2])
  else:
   cols=24;rows=12 if kind=='sphere' else 8 if kind=='torus' else 1
   for row in range(rows+1):
    for col in range(cols+1):
     t=col/cols*math.tau
     if kind=='sphere':
      v=row/rows*math.pi;no=[math.sin(v)*math.cos(t),math.cos(v),math.sin(v)*math.sin(t)];q=[k*.5 for k in no]
     elif kind=='torus':
      v=row/rows*math.tau;no=[math.cos(v)*math.cos(t),math.sin(v),math.cos(v)*math.sin(t)];q=[(.28+.025*math.cos(v))*math.cos(t),.025*math.sin(v),(.28+.025*math.cos(v))*math.sin(t)]
     elif kind=='cone':
      radius=.5*(1-row);q=[radius*math.cos(t),row-.5,radius*math.sin(t)];no=[math.cos(t)*.894,.447,math.sin(t)*.894]
     else:q=[.5*math.cos(t),row-.5,.5*math.sin(t)];no=[math.cos(t),0,math.sin(t)]
     p.append(q);n.append(no)
   for row in range(rows):
    for col in range(cols):
     a=row*(cols+1)+col;b=a+cols+1
     idx.extend([a,a+1,b,a+1,b+1,b] if kind=='sphere' else [a,b,a+1,a+1,b,b+1])
  i=len(self.g['meshes']);self.g['meshes'].append({'primitives':[{'attributes':{'POSITION':self.acc(p,'VEC3'),'NORMAL':self.acc(n,'VEC3')},'indices':self.acc(idx,'SCALAR',5123),'material':material}]});return i
 def node(self,name,kind,p,s,c,parent=None):
  i=len(self.g['nodes']);self.g['nodes'].append({'name':name,'translation':p,'scale':s,'mesh':self.mesh(kind,self.material(c))})
  if parent is None:self.g['scenes'][0]['nodes'].append(i)
  else:self.g['nodes'][parent].setdefault('children',[]).append(i)
  return i
 def animation(self,name,node,angle,duration):
  ts=[0,duration*.25,duration*.5,duration*.75,duration];qs=[[0,math.sin(v/2),0,math.cos(v/2)] for v in [0,angle,0,-angle*.3,0]];a=self.acc(ts,'SCALAR');b=self.acc(qs,'VEC4');self.g['animations'].append({'name':name,'samplers':[{'input':a,'output':b,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':node,'path':'rotation'}}],'extras':{'hit_frame_seconds':.12 if name in ['BasicHit','Drop','Clear','Smash','Serve'] else None}})
 def save(self,name):
  self.g['buffers'][0]['byteLength']=len(self.data);j=json.dumps(self.g,separators=(',',':')).encode();j+=b' '*((-len(j))%4);b=struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(self.data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(self.data),0x004e4942)+self.data;(OUT/name).write_bytes(b)
for uniform,name in [('#ffba54','athlete-gold.glb'),('#8d9aff','athlete-violet.glb')]:
 g=GLB();body=g.node('jersey','sphere',[0,1.12,0],[.55,.72,.38],uniform);g.node('shorts','box',[0,.77,0],[.48,.28,.34],'#172b45');g.node('head','sphere',[0,1.7,0],[.37,.40,.36],'#e7b48d');g.node('hair','sphere',[0,1.85,.02],[.39,.20,.37],'#273144')
 for sign,label in [(-1,'left'),(1,'right')]:g.node(label+' leg','cylinder',[sign*.15,.43,0],[.17,.58,.17],'#e7b48d');g.node(label+' shoe','box',[sign*.15,.1,-.06],[.23,.15,.36],'#f9fbf4')
 g.node('upper arm','cylinder',[.34,1.2,0],[.15,.38,.15],'#e7b48d');g.node('forearm','cylinder',[.35,.93,0],[.12,.36,.12],'#e7b48d');g.node('off arm','cylinder',[-.34,1.05,0],[.16,.55,.16],'#e7b48d')
 for name2,angle,dur in [('Ready',.03,1.2),('SideStep',.10,.5),('Run',.16,.45),('BasicHit',.8,.48),('Drop',.35,.48),('Clear',1.05,.48),('Smash',1.35,.55),('Recover',-.25,.4),('Serve',.55,.48)]:g.animation(name2,body,angle,dur)
 g.save(name)
g=GLB();g.node('frame','torus',[0,0,0],[.65,.65,.65],'#f6dd7c');grip=g.node('grip','cylinder',[0,0,-.32],[.05,.35,.05],'#172b45');g.g['nodes'][grip]['rotation']=[.70710678,0,0,.70710678]
for i in range(-2,3):g.node('string','box',[i*.045,0,0],[.004,.004,.26],'#eef2f1');g.node('string','box',[0,0,i*.045],[.26,.004,.004],'#eef2f1')
g.save('racket.glb')
g=GLB();g.node('cork','sphere',[0,0,0],[.13,.13,.13],'#ffffff');g.node('feathers','cone',[0,.16,0],[.28,.32,.28],'#ffffff');g.save('shuttle.glb')
g=GLB();g.node('court','box',[0,.016,0],[5.18,.025,13.4],'#2ea6a0')
for x in [-2.59,2.59]:g.node('sideline','box',[x,.035,0],[.045,.02,13.4],'#ecf3d9')
for z in [-6.7,-1.98,1.98,6.7]:g.node('baseline','box',[0,.035,z],[5.18,.02,.045],'#ecf3d9')
for s in [-1,1]:g.node('service center','box',[0,.035,s*4.34],[.045,.02,4.72],'#ecf3d9')
g.node('net tape','box',[0,1.524,0],[5.6,.055,.055],'#f9f5e8')
for x in [-2.8,2.8]:g.node('net post','cylinder',[x,.775,0],[.08,1.55,.08],'#f9f5e8')
for i in range(30):g.node('net mesh','box',[-2.6+i*.18,.96,0],[.006,1.1,.006],'#d8e5de')
for i in range(8):g.node('net mesh','box',[0,.43+i*.14,0],[5.4,.006,.006],'#d8e5de')
g.save('court.glb')
print('Generated',[(p.name,p.stat().st_size) for p in OUT.glob('*.glb')])
