"""Compose literal browser sources, preserving their original aspect and provenance."""
from pathlib import Path
import hashlib,json,subprocess
from PIL import Image,ImageDraw,ImageFont,ImageOps
b=Path(__file__).resolve().parents[1]/'verification/point-camera-20261017';out=b/'delivery';out.mkdir(exist_ok=True)
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
proof=[]
canvas=Image.new('RGB',(2400,1840),'#142536');draw=ImageDraw.Draw(canvas)
draw.text((12,8),'Actual independent UI matches | 4800 baseline / point-camera fix | not identical poses or continuous playback review',font=font(26),fill='white')
for i,(phase,title) in enumerate([('ready','Serve-ready'),('rally','Rally'),('point-late','Your point'),('results','Results (modal)'),('restart-ready','Restart ready'),('restart-rally','Restart rally')]):
 for j,(folder,label) in enumerate([('before-portrait','BEFORE4800'),('after-portrait','AFTER90e8cf1')]):
  source=b/folder/(phase+'.png');image=Image.open(source).convert('RGB');image.thumbnail((390,844));x=(i%3)*800+j*400;y=52+(i//3)*890
  draw.text((x+6,y),title+' / '+label,font=font(19),fill='#ffdc98');canvas.paste(image,(x,y+30));proof.append({'file':str(source.relative_to(b)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
canvas.save(out/'01-portrait-lifecycle-before-after.png')
canvas=Image.new('RGB',(2130,1400),'#142536');draw=ImageDraw.Draw(canvas)
for i,(folder,name) in enumerate([('after-pc','point-late'),('after-landscape','point-late'),('after-portrait','point-rotated-landscape'),('after-portrait','point-rotated-portrait')]):
 source=b/folder/(name+'.png');image=Image.open(source).convert('RGB');image=ImageOps.contain(image,(1060,650));x=(i%2)*1065;y=(i//2)*700
 draw.text((x+8,y+8),folder+' / '+name,font=font(22),fill='#ffdc98');canvas.paste(image,(x+(1065-image.width)//2,y+42));proof.append({'file':str(source.relative_to(b)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
canvas.save(out/'02-point-views-and-rotation.png')
video=b/'after-portrait/actual-lifecycle-silent.mp4';duration=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(video)]))['format']['duration']);raw=out/'decoded';raw.mkdir(exist_ok=True)
canvas=Image.new('RGB',(1170,2700),'#142536');draw=ImageDraw.Draw(canvas)
for i,fraction in enumerate([.02,.12,.22,.32,.42,.52,.67,.82,.97]):
 t=duration*fraction;dest=raw/f'{i:02}.png';subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(t),'-i',str(video),'-frames:v','1',str(dest)],check=True)
 image=Image.open(dest).convert('RGB');image.thumbnail((390,844));x=(i%3)*390;y=(i//3)*900
 draw.text((x+8,y+8),f'Literal decoded MP4 / {t:.2f}s',font=font(19),fill='#ffdc98');canvas.paste(image,(x,y+36));proof.append({'decodedFile':str(dest.relative_to(b)),'videoSha256':hashlib.sha256(video.read_bytes()).hexdigest(),'seekSeconds':t,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
canvas.save(out/'03-literal-video-samples.png');(out/'sources.json').write_text(json.dumps(proof,indent=2)+'\n');print('Literal sources',len(proof))
