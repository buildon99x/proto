"""Assemble literal browser screenshots and consecutive captured swing frames."""
from pathlib import Path
import hashlib,json,shutil,sys
from PIL import Image,ImageDraw,ImageFont,ImageOps

base=Path(__file__).resolve().parents[1]/'verification/sideline-play-20261017'
out=base/'delivery';out.mkdir(exist_ok=True)
font=lambda n:ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',n)
sources=[]
def full_pair(name,entries):
    images=[Image.open(base/file).convert('RGB') for file,label in entries]
    canvas=Image.new('RGB',(sum(im.width for im in images),max(im.height for im in images)+72),'#122632')
    draw=ImageDraw.Draw(canvas);x=0
    for image,(file,label) in zip(images,entries):
        draw.text((x+12,10),label,font=font(18),fill='#ffdfaa')
        draw.text((x+12,37),'Literal ordinary-input screenshot; different actual point/pose, no pixel-isolation claim',font=font(12),fill='#bfd3d8')
        canvas.paste(image,(x,72));x+=image.width;sources.append({'file':file,'sha256':hashlib.sha256((base/file).read_bytes()).hexdigest()})
    canvas.save(out/name)

full_pair('01-optional-line-risk.png', [('before-pc/point-in.png','Before: requested edge clamps to2.25m / actual IN'),('final-weak-pc-1/point-settled.png','After: optional2.50m aim / actual weak shot lands OUT')])
full_pair('02-in-out-next-server.png',[('final-good-pc-1/point-settled.png','Actual legal IN / score YOU1 - AI0'),('final-weak-pc-1/next-serve.png','Actual OUT gave AI point / AI now serves')])
full_pair('03-native-touch-ground-calls.png',[('final-weak-touch-1/point-settled.png','Native early-window actual ground call'),('final-good-touch-1/point-settled.png','Native tight-window actual ground call')])

# Original raster crops only: 180CSSpx around each actual marker projection.
canvas=Image.new('RGB',(1080,440),'#122632');draw=ImageDraw.Draw(canvas);crops=[]
for i,folder in enumerate(['final-good-pc-1','final-weak-pc-1','final-good-touch-1']):
    data=json.loads((base/folder/'sideline-play.json').read_text());p=data['marker']['screen'];im=Image.open(base/folder/'point-settled.png').convert('RGB')
    scale=im.width/(390 if data['touch'] else 1065);x,y=p['x']*scale,p['y']*scale
    box=(max(0,int(x-90*scale)),max(0,int(y-90*scale)),min(im.width,int(x+90*scale)),min(im.height,int(y+90*scale)))
    crop=ImageOps.contain(im.crop(box),(340,340));canvas.paste(crop,(i*360+(360-crop.width)//2,72))
    draw.text((i*360+10,10),folder,font=font(16),fill='#ffdfaa');draw.text((i*360+10,37),'Actual marker crop / annotation only',font=font(13),fill='#bfd3d8')
    crops.append({'source':folder+'/point-settled.png','boxPixels':box,'sourcePixelRatio':scale,'markerAtActualCollision':data['marker']['at']})
canvas.save(out/'04-literal-landing-details.png')
(out/'landing-crop-sources.json').write_text(json.dumps(crops,indent=2)+'\n')
if '--screens-only' in sys.argv:
    print('Literal point comparisons assembled; swing capture intentionally pending.')
    sys.exit(0)

# Consecutive actual CDP source frames around the physical CPU contact event.
play=json.loads((base/'final-play/experience.json').read_text());capture=json.loads((base/'final-play/capture-source.json').read_text())
hit=next(h for h in play['match']['shots'] if h['actor']==0 and h['shot']=='smash')
event=next(e for e in play['match']['audioLedger'] if e['physicsTime']==hit['time'])
target=(capture['origin']+event['audioPerf'])/1000
stamps=[f['timestamp'] for f in capture['frames']];centre=min(range(len(stamps)),key=lambda i:abs(stamps[i]-target));start=max(0,centre-5)
retained=out/'swing-source-frames';retained.mkdir(exist_ok=True)
sheet=Image.new('RGB',(1280,1440),'#122632');draw=ImageDraw.Draw(sheet);sequence=[]
for n,i in enumerate(range(start,min(start+24,len(stamps)))):
    name=f'{i:06d}.jpg';src=Path(capture['rawDirectory'])/name;dest=retained/name
    if src.is_file():shutil.copyfile(src,dest)
    assert dest.is_file()
    im=ImageOps.contain(Image.open(dest).convert('RGB'),(320,180));x=n%4*320;y=n//4*240;sheet.paste(im,(x,y+30));draw.text((x+6,y+7),f'CDP{i} / {stamps[i]-target:+.3f}s',font=font(15),fill='#ffdfaa')
    sequence.append({'file':'swing-source-frames/'+name,'index':i,'cpuEventOffsetSeconds':stamps[i]-target,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
sheet.save(out/'05-consecutive-actual-swing.png')
(out/'sources.json').write_text(json.dumps({'screenshots':sources,'swing':sequence,'method':'Literal screenshots and24consecutive recorded CDP frames spanning preparation, contact, follow-through and recovery. CPU-event offsets are not photon timing, slow-motion poses or normal-speed watching/listening evidence. Existing swing is unchanged in this cycle.'},indent=2)+'\n')
print('Literal source comparisons, landing crops and consecutive actual swing frames assembled.')
