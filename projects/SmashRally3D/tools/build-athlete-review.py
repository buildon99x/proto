"""Literal old/new athlete body crops from identical natural held poses."""
from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFont,ImageOps
base=Path(__file__).resolve().parents[1]/'verification/athlete-form-20261017'
out=base/'delivery';out.mkdir(exist_ok=True)
proof=json.loads((base/'pixel-isolation.json').read_text())['results']
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
for folder,label in [('phases-pc-1','pc'),('phases-portrait-1','portrait')]:
 data=json.loads((base/folder/'form-study.json').read_text());sheet=Image.new('RGB',(1280,160+len(data['samples'])*290),'#132333');draw=ImageDraw.Draw(sheet)
 draw.text((15,10),label+' | same camera, clock, poses and material values',font=font(25),fill='#ffe0a0')
 draw.text((15,47),'Actual source PNG crops. Near: old/new; opponent: old/new. No synthesized pose or interpolation.',font=font(20),fill='#c4d7da')
 for row,sample in enumerate(data['samples']):
  p=next(r for r in proof if r['folder']==folder and r['pose']==sample['name']);images={v:Image.open(base/folder/(sample['name']+'-'+v+'.png')).convert('RGB') for v in ['baseline','candidate']}
  for col,(actor,variant) in enumerate([(0,'baseline'),(0,'candidate'),(1,'baseline'),(1,'candidate')]):
   box=p['bounds'][actor];image=ImageOps.contain(images[variant].crop(box),(310,245),method=Image.Resampling.NEAREST);x=col*320;y=90+row*290
   checkpoint='point checkpoint' if label=='portrait' and sample['name']=='return' else sample['name']
   draw.text((x+7,y),checkpoint+' / '+variant,font=font(18),fill='#ffdb98');sheet.paste(image,(x+(320-image.width)//2,y+32))
 if label=='portrait':draw.text((15,100+len(data['samples'])*290),'Final checkpoint already shows YOUR POINT: near player is clipped in BOTH versions. Legacy camera issue retained.',font=font(18),fill='#ffdb98')
 sheet.save(out/('01-'+label+'-form-comparison.png'))
# Full actual composition remains available beside the enlarged crops.
for pose in ['ready','contact','follow','return']:
 files=[base/'phases-pc-1'/(pose+'-'+v+'.png') for v in ['baseline','candidate']];ims=[Image.open(p).convert('RGB') for p in files];w,h=ims[0].size;sheet=Image.new('RGB',(w*2,h+35),'#132333');d=ImageDraw.Draw(sheet)
 for i,(im,label) in enumerate(zip(ims,['Original','Authored contours'])):d.text((i*w+12,8),pose+' / '+label,font=font(18),fill='white');sheet.paste(im,(i*w,35))
 sheet.save(out/('pc-'+pose+'-full.png'))
print('Built actual same-pose comparison crops and full PC composition pairs.')
