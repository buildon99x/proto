"""Build literal fixed-camera phase sheets; never synthesize a pose."""
import json,math,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
base=Path(__file__).resolve().parents[1]/'verification/stroke-chain-20261017'
out=base/'delivery';out.mkdir(exist_ok=True)
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
def project(p,c):
 v=[p[k]-c['p'][k] for k in 'xyz'];q=c['q'];u=[-q[k] for k in 'xyz'];w=q['w']
 cross=lambda a,b:[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
 uv=cross(u,v);uuv=cross(u,uv);local=[v[i]+2*(w*uv[i]+uuv[i]) for i in range(3)];scale=180/math.tan(math.radians(c['fov']/2))
 return [320+local[0]/-local[2]*scale,180-local[1]/-local[2]*scale]
def sheet(left,right,target,title,left_suffix='',right_suffix='',left_label=None,right_label=None):
 a=json.loads((base/left/'phases.json').read_text())['samples'];b=json.loads((base/right/'phases.json').read_text())['samples']
 im=Image.new('RGB',(1280,2250),'#122632');d=ImageDraw.Draw(im)
 d.text((16,12),title,font=font(24),fill='#ffe0a0');d.text((16,48),'Held naturally reached phases / identical applied baseline camera / no speed or listening claim',font=font(17),fill='#bdd1d6')
 crops=[]
 for n,(x,y) in enumerate(zip(a,b)):
  points=[]
  for row in [x,y]:
   p=row['actors'][0]['skinPose'];points += [project(v,row['camera']) for v in [*p['joints'].values(),p['racket']['center']]]
  box=(max(0,math.floor(min(p[0] for p in points))-24),max(0,math.floor(min(p[1] for p in points))-24),min(640,math.ceil(max(p[0] for p in points))+24),min(360,math.ceil(max(p[1] for p in points))+24));crops.append({'phase':x['name'],'crop':box})
  for col,(folder,row,suffix) in enumerate([(left,x,left_suffix),(right,y,right_suffix)]):
   xx=col*640;yy=95+n*355
   relative=row.get('relativeToActual');display_label=(left_label or left) if col==0 else (right_label or right)
   label=f"{display_label}: {row['name']} / "+(f'{relative:+.3f}s sim' if relative is not None else 'pre-input forecast')
   d.text((xx+10,yy),label,font=font(18),fill='#ffdb98')
   raw=Image.open(base/folder/('phase-'+row['name']+suffix+'.png')).convert('RGB').crop(box);raw=ImageOps.contain(raw,(620,310));im.paste(raw,(xx+(640-raw.width)//2,yy+30+(310-raw.height)//2))
 im.save(out/target);(out/(Path(target).stem+'-crops.json')).write_text(json.dumps(crops,indent=2)+'\n')
sheet('phases-before','phases-motion','02-motion-phases.png','Motion only | legacy colors held constant',left_label='Before',right_label='Motion only')
if (base/'phases-art/phases.json').exists():
 sheet('phases-art','phases-art','03-art-only.png','Art only | same exact candidate pose, clock, camera',left_suffix='-legacy-color',left_label='Legacy color',right_label='Corrected color')
print('Literal phase sheets assembled.')
