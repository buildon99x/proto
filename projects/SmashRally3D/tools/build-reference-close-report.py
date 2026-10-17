from pathlib import Path
import json,hashlib,shutil
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'verification/reference-close-20261015'
old=root.parent/'reference-swing-20261015'
delivery=root/'delivery';delivery.mkdir(exist_ok=True)
if not (delivery/'01-before-reference.png').exists():shutil.copy2(old/'composition/ready-reference.png',delivery/'01-before-reference.png')
if not (delivery/'02-after-reference.png').exists():shutil.copy2(root/'composition-final/ready-reference.png',delivery/'02-after-reference.png')
for view in ['reference','pc','landscape','portrait']:
 paths=[old/'composition'/f'ready-{view}.png',root/'composition-final'/f'ready-{view}.png']
 if not all(p.exists() for p in paths):continue
 ims=[Image.open(p).convert('RGB') for p in paths]
 for im in ims:im.thumbnail((600,1000))
 board=Image.new('RGB',(1200,max(i.height for i in ims)+40),'#101c2b');d=ImageDraw.Draw(board)
 for i,im in enumerate(ims):board.paste(im,(i*600,40));d.text((i*600+10,14),'REJECTED c15a7e6' if i==0 else 'PARENT-MEASURED CLOSE VIEW',fill='white')
 board.save(root/f'comparison-{view}.png')
p=root/'attack/sequences.json'
if p.exists():
 for s in json.loads(p.read_text())['sequences']:
  frames=s['frames'];boxes=[]
  for f in frames:
   im=Image.open(root/'attack'/f['file']).convert('RGB');pix=im.load();xs=[];ys=[]
   for y in range(int(im.height*.35),int(im.height*.97)):
    for x in range(im.width):
     r,g,b=pix[x,y]
     if r>65 and r>g*1.03 and g>b*1.25:xs.append(x);ys.append(y)
   if xs:boxes.append((min(xs),min(ys),max(xs),max(ys)))
  box=(max(0,min(b[0] for b in boxes)-90),max(0,min(b[1] for b in boxes)-120),min(im.width,max(b[2] for b in boxes)+90),min(im.height,max(b[3] for b in boxes)+120))
  w,h=box[2]-box[0],box[3]-box[1]
  board=Image.new('RGB',(w*len(frames),h+36),'#101c2b');d=ImageDraw.Draw(board)
  for i,f in enumerate(frames):
   board.paste(Image.open(root/'attack'/f['file']).convert('RGB').crop(box),(i*w,36));d.text((i*w+8,12),f"{f['phase']} | {f['time']:.3f}s",fill='white')
  board.save(root/f"swing-{s['motion'].lower()}-detail.png")
 if (root/'swing-smash-detail.png').exists() and not (delivery/'03-smash-sequence.png').exists():shutil.copy2(root/'swing-smash-detail.png',delivery/'03-smash-sequence.png')
report=json.loads((root/'composition-final/reference-composition-report.json').read_text())
metrics=[json.loads(l[len('COMPOSITION '):]) for l in report['logs'] if l.startswith('COMPOSITION {')]
summary={'rejectedBaseline':'c15a7e6785aaea6f300528857266027154985e18','sourceImageAccess':'Original download failed three times; parent directly inspected original and supplied the revised measured targets.','composition':metrics,'reports':{}}
for folder,name in [('composition-final','reference-composition'),('attack','swing-sequence'),('rally','court-framing'),('rotation','court-resize'),('native','mobile-native'),('defence','reference-close-drop')]:
 p=root/folder/(name+'-report.json')
 if p.exists():summary['reports'][folder]=json.loads(p.read_text())
summary['pngSha256']={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*.png') if 'attempts' not in p.parts}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'measurements':[{k:r[k] for k in ['viewport','netWidth','playerHeight','tape','head','feet']} for r in metrics],'reports':{k:v['pass'] for k,v in summary['reports'].items()}},indent=2))
