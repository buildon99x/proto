"""Same-state isolation, not a perceptual score or physical-device certificate."""
from pathlib import Path
from PIL import Image,ImageChops,ImageDraw
import json,math
b=Path(__file__).resolve().parents[1]/'verification/courtyard-material-20261017'
count=lambda im:sum(p!=(0,0,0) for p in im.getdata())
rows=[]
for folder in ['phases-pc','phases-portrait']:
 d=json.loads((b/folder/'material-study.json').read_text());assert d['done'] and all(d['restore'].values())
 for s in d['samples']:
  read=lambda variant:Image.open(b/folder/(s['name']+'-'+variant+'.png')).convert('RGB')
  a=read('baseline');repeat=read('baseline-repeat');c=read('candidate');restored=read('baseline-restored');assert a.size==repeat.size==c.size==restored.size
  repeatN=count(ImageChops.difference(a,repeat));restoreN=count(ImageChops.difference(a,restored));assert repeatN==restoreN==0,(folder,s['name'],'baseline repeat/restoration')
  assert all(v['state']==s['state'] for v in s['variants'])
  w,h=a.size;vw,vh,_=s['state']['viewport'];sx,sy=w/vw,h/vh;mask=Image.new('L',(w,h),0);draw=ImageDraw.Draw(mask)
  boxes=[]
  for v in s['bounds']:
   box=[max(0,math.floor(v['minX']*sx)-2),max(0,math.floor(v['minY']*sy)-2),min(w,math.ceil(v['maxX']*sx)+2),min(h,math.ceil(v['maxY']*sy)+2)]
   if box[2]>=box[0]and box[3]>=box[1]:draw.rectangle(box,fill=255);boxes.append(box)
  diff=ImageChops.difference(a,c);outside=ImageChops.multiply(diff,ImageChops.invert(mask).convert('RGB'));outsideN=count(outside);assert outsideN==0,(folder,s['name'],outsideN)
  lower=count(diff.crop((0,int(h*.65),w,h)))
  if s['name']=='ready':assert lower==0,(folder,'ready lower35% changed')
  rows.append({'folder':folder,'checkpoint':s['name'],'phase':s['state']['phase'],'score':s['state']['scores'],'originalRepeatChangedPixels':repeatN,'originalRestoredChangedPixels':restoreN,'currentChangedPixels':count(diff),'outsideSelectedSurfaceBoundsChangedPixels':outsideN,'lower35PercentChangedPixels':lower,'sameClockPhaseScoreCameraPoseContactAndViewport':True,'bounds':boxes})
result={'gate':'Only selected courtyard materials change. Original repeat/restore exact; same state;0pixels changed outside selected world-AABB projection+2native-pixel raster coverage. Ready lower35%exact, reusing prior composition gate; no aesthetic threshold inferred.','rows':rows,'pairs':len(rows)}
(b/'pixel-isolation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'pairs':len(rows),'outsideChanged':sum(r['outsideSelectedSurfaceBoundsChangedPixels'] for r in rows),'readyLowerChanged':[r['lower35PercentChangedPixels'] for r in rows if r['checkpoint']=='ready']}))
