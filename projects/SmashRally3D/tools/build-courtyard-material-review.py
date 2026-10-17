"""Literal same-state old/current source PNGs; no pose or frame synthesis."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json,hashlib
b=Path(__file__).resolve().parents[1]/'verification/courtyard-material-20261017';out=b/'delivery';out.mkdir(exist_ok=True)
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
proof=[]
for folder,label in [('phases-pc','pc'),('phases-portrait','portrait')]:
 d=json.loads((b/folder/'material-study.json').read_text());canvas=Image.new('RGB',(1600,100+len(d['samples'])*380),'#142536');draw=ImageDraw.Draw(canvas)
 draw.text((10,8),label+' | identical clock, camera, pose, score and contact | original / new materials',font=font(26),fill='#ffe2a0')
 draw.text((10,45),'Literal courtyard source crops; all geometry/foreground and lighting unchanged. Held diagnostic, not continuous playback.',font=font(20),fill='white')
 for i,s in enumerate(d['samples']):
  w,h=Image.open(b/folder/(s['name']+'-baseline.png')).size;vw,vh,_=s['state']['viewport'];sx,sy=w/vw,h/vh
  bounds=s['bounds'];box=(max(0,int(min(v['minX'] for v in bounds)*sx)),max(0,int(min(v['minY'] for v in bounds)*sy)),min(w,int(max(v['maxX'] for v in bounds)*sx)+1),min(h,int(max(v['maxY'] for v in bounds)*sy)+1))
  for j,variant in enumerate(['baseline','candidate']):
   file=b/folder/(s['name']+'-'+variant+'.png');image=Image.open(file).convert('RGB').crop(box);image=ImageOps.contain(image,(790,335));x=j*800;y=95+i*380
   draw.text((x+8,y),f"{s['name']} / {s['state']['phase']} / {variant}",font=font(21),fill='#ffe2a0');canvas.paste(image,(x+(800-image.width)//2,y+34));proof.append({'file':str(file.relative_to(b)),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'crop':box})
 canvas.save(out/('01-'+label+'-surface-comparison.png'))
 for checkpoint in ['ready','contact','return']:
  canvas=Image.new('RGB',(1560,1730) if label=='portrait' else (2130,650),'#142536');draw=ImageDraw.Draw(canvas)
  for j,variant in enumerate(['baseline','candidate']):
   file=b/folder/(checkpoint+'-'+variant+'.png');image=Image.open(file).convert('RGB');draw.text((j*image.width+8,8),f"{checkpoint} / {variant}",font=font(22),fill='#ffe2a0');canvas.paste(image,(j*image.width,38))
  canvas.save(out/(label+'-'+checkpoint+'-full.png'))
(out/'sources.json').write_text(json.dumps(proof,indent=2)+'\n');print('Literal old/current crops:',len(proof))
