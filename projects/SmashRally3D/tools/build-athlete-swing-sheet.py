from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw,ImageFont
b=Path(__file__).resolve().parents[1]/'verification/athlete-form-20261017';r=b/'final-swing';d=json.loads((r/'sequences.json').read_text());assert not d['errors']
phases=['ready','prepare','accelerate','impact','follow','follow-peak','return','ready-returned']
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
canvas=Image.new('RGB',(8*320,len(d['sequences'])*214+48),'#142536');draw=ImageDraw.Draw(canvas)
draw.text((10,10),'Actual frameend UI play; native source frames / timestamps. No pose reconstruction. Not continuous playback review.',font=font,fill='white')
proof=[]
for y,seq in enumerate(d['sequences']):
 for x,phase in enumerate(phases):
  f=next((f for f in seq['frames'] if f['phase']==phase),None)
  if not f:continue
  source=r/f['file'];im=Image.open(source).convert('RGB');im.thumbnail((320,182))
  draw.text((x*320+5,y*214+44),f"{seq['motion']} / {phase} / {f['time']:.3f}s",font=font,fill='#ffe19b')
  canvas.paste(im,(x*320,y*214+68));proof.append({'motion':seq['motion'],'phase':phase,'time':f['time'],'source':str(source.relative_to(b)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
canvas.save(b/'delivery/07-actual-swing-sequences.png');(b/'delivery/swing-sheet-sources.json').write_text(json.dumps(proof,indent=2)+'\n')
print('literal source frames',len(proof))
