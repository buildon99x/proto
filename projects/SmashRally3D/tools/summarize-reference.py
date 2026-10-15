"""Assemble inspectable screenshots and measured evidence; never synthesize pixels."""
from pathlib import Path
import json,hashlib
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'verification/reference-swing-20261015'
def logs(folder,name):
 p=root/folder/name
 return json.loads(p.read_text()) if p.exists() else {}
def tagged(report,tag):
 return [json.loads(v[len(tag)+1:]) for v in report.get('logs',[]) if v.startswith(tag+' {')]
before=logs('before-low','reference-composition-report.json')
after=logs('composition','reference-composition-report.json')
summary={'baseline':'c5446f637a23a45d4e80e5a106ce4c1c43cbb51a','implementation':'cd736ad6cd376c0e926ab7500f66923d23062b7a',
 'reference':{'libraryFile':'libfile_8ad23cd0827081918a24e7ffdc9b90fb','filename':'13013.jpg','width':1065,'height':606,'directVisualInspection':'blocked: Library image response supplied pointer only; official download failed three times, including after connection recheck'},'composition':[]}
b=tagged(before,'COMPOSITION');a=tagged(after,'COMPOSITION')
for old,new in zip(b,a):
 h=new['viewport']['height'];summary['composition'].append({'viewport':new['viewport'],'beforeCamera':old['camera'],'afterCamera':new['camera'],'tapeHeightFraction':new['tape']['y']/h,'nearAthleteHeightRatio':(new['feet']['y']-new['head']['y'])/(old['feet']['y']-old['head']['y'])})
for folder,name in [('rally','court-framing'),('rotation','court-resize'),('swings','swing-sequence'),('swings-attack','swing-sequence'),('native','mobile-native'),('drop-defence','reference-drop')]:
 r=logs(folder,name+'-report.json');summary[folder]={'pass':r.get('pass'),'errors':r.get('errors'),'failure':r.get('failure'),'bundle':r.get('buildEvidence')}
 if folder=='rally':summary['rally']['views']=tagged(r,'COURT FRAMING')
 if folder=='rotation':summary['rotation']['measurement']=tagged(r,'LIVE ROTATION PASS')
 if folder.startswith('swings'):summary[folder]['measurement']=tagged(r,'SWING SEQUENCES')
 if folder=='drop-defence':summary['drop-defence']['measurement']=tagged(r,'BOUNDED DROP REGRESSION PASS')
summary['drop-defence']['physicalAnalysis']=logs('drop-defence','physical-analysis.json')
# The comparison is assembled from full original screenshots at the same state and viewport.
for name in ['pc','reference','landscape','portrait']:
 p=root/'before-low'/('ready-'+name+'.png');q=root/'composition'/('ready-'+name+'.png')
 if not(p.exists() and q.exists()):continue
 images=[Image.open(p).convert('RGB'),Image.open(q).convert('RGB')];w=600
 thumbs=[]
 for im in images:
  im.thumbnail((w,1000));thumbs.append(im)
 board=Image.new('RGB',(w*2,max(i.height for i in thumbs)+44),'#101c2b');d=ImageDraw.Draw(board)
 for i,im in enumerate(thumbs):board.paste(im,(i*w,44));d.text((i*w+12,15),'BEFORE c5446f6' if i==0 else 'AFTER cd736ad',fill='white')
 board.save(root/('comparison-'+name+'.png'))
for sequence_folder in ['swings','swings-attack']:
 p=root/sequence_folder/'sequences.json'
 prefix='swing-' if sequence_folder=='swings' else 'attack-'
 if p.exists():
  sequences=json.loads(p.read_text())['sequences']
  for index,s in enumerate(sequences):
   frames=list(s['frames'])
   if index+1<len(sequences):
    ready=sequences[index+1]['frames'][0]
    if ready['phase']=='ready' and 0 < ready['time']-frames[-1]['time'] < 0.25:
     frames.append({**ready,'phase':'ready-returned (next ready sample)'})
   w=355;h=246
   board=Image.new('RGB',(w*len(frames),h),'#101c2b');d=ImageDraw.Draw(board)
   for i,f in enumerate(frames):
    im=Image.open(root/sequence_folder/f['file']).convert('RGB');im.thumbnail((w,210));board.paste(im,(i*w,36));d.text((i*w+10,12),f"{s['motion']} | {f['phase']} | {f['time']:.3f}s",fill='white')
   board.save(root/(prefix+s['motion'].lower()+'.png'))
   # A consistent crop makes small wrist/racket movement inspectable, while the
   # numbered full-frame originals remain the evidence of the actual composition.
   boxes=[]
   for f in frames:
    im=Image.open(root/sequence_folder/f['file']).convert('RGB');pix=im.load();xs=[];ys=[]
    for y in range(int(im.height*.4),int(im.height*.94)):
     for x in range(im.width):
      r,g,b=pix[x,y]
      if r>65 and r>g*1.03 and g>b*1.25:xs.append(x);ys.append(y)
    if xs:boxes.append((min(xs),min(ys),max(xs),max(ys)))
   if boxes:
    box=(max(0,min(b[0] for b in boxes)-85),max(0,min(b[1] for b in boxes)-100),
         min(im.width,max(b[2] for b in boxes)+85),min(im.height,max(b[3] for b in boxes)+120))
    cw,ch=box[2]-box[0],box[3]-box[1]
    detail=Image.new('RGB',(cw*len(frames),ch+36),'#101c2b');draw=ImageDraw.Draw(detail)
    for i,f in enumerate(frames):
     detail.paste(Image.open(root/sequence_folder/f['file']).convert('RGB').crop(box),(i*cw,36))
     draw.text((i*cw+8,12),f"{f['phase']} | {f['time']:.3f}s | ORIGINAL CROP",fill='white')
    detail.save(root/(prefix+s['motion'].lower()+'-detail.png'))
    (root/(prefix+s['motion'].lower()+'-crop.json')).write_text(json.dumps({'crop':box,'frames':[f['file'] for f in frames]},indent=2)+'\n')
summary['pngSha256']={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*.png') if 'attempts' not in p.parts}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='pngSha256'},indent=2))
