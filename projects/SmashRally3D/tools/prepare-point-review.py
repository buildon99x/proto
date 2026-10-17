"""Prepare literal neighboring source frames; a reviewer must choose the visible point UI."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import hashlib,json,os,shutil
base=Path(os.environ.get('SMASH_REVIEW_BASE',str(Path(__file__).resolve().parents[1]/'verification/athlete-form-20261017')))
root=base/'final-pressure'
data=json.loads((root/'defence-observation.json').read_text());source=json.loads((root/'capture-source.json').read_text());report=json.loads((root/'defence-review-report.json').read_text())
rows=[json.loads(line.split('DROP MATCH ',1)[1]) for line in report['logs'] if line.startswith('DROP MATCH ')]
direct={(a['hit']['time'],a['hit']['target']['x'],a['hit']['target']['z']) for r in rows for a in r['attempts'] if a['directWinner'] and a['hit']['quality'] in ['good','perfect']}
winners=[]
for point in data['points']:
 if point['point']['winner']!=0:continue
 launches=[f for f in data['frames'] if f['round']==point['round'] and f['hit']['actor']==0 and f['hit']['time']<point['time']]
 if not launches:continue
 launch=max(launches,key=lambda f:f['hit']['time']);h=launch['hit']
 if (h['time'],h['target']['x'],h['target']['z']) in direct:winners.append((launch,point))
assert winners,'No literal good/perfect direct-winner specimen'
launch,point=winners[0];target=(source['origin']+point['perf'])/1000
nearest=min(range(len(source['frames'])),key=lambda i:abs(source['frames'][i]['timestamp']-target))
scores=[sum(p['point']['winner']==i for p in data['points'] if p['round']==point['round'] and p['time']<=point['time']) for i in [0,1]]
keep=root/'review-source-frames';keep.mkdir(exist_ok=True);sheet=Image.new('RGB',(1728,1560),'#132333');draw=ImageDraw.Draw(sheet);font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
draw.text((10,8),f'Literal pressure point neighbors | CPU nearest {nearest} | expected YOU {scores[0]} / AI {scores[1]} / YOUR POINT',font=font,fill='white');candidates=[]
for offset,index in enumerate(range(nearest-3,nearest+9)):
 filename=f'{index:06d}.jpg';dest=keep/filename;shutil.copyfile(Path(source['rawDirectory'])/filename,dest);image=Image.open(dest).convert('RGB');x=(offset%3)*576;y=40+(offset//3)*380;draw.text((x+8,y),f'CDP {index}',font=font,fill='#ffdc98');sheet.paste(image,(x,y+24));candidates.append({'index':index,'file':str(dest.relative_to(base)),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
sheet.save(base/'point-ui-neighbours.png')
proof={'sourceCaptureSha256':hashlib.sha256((root/'capture-source.json').read_bytes()).hexdigest(),'cpuNearestPointUiFrame':nearest,'expectedScore':scores,'launch':launch,'point':point,'candidates':candidates,'reviewStatus':'Pending direct visual selection. CPU timestamp alone does not assert a visible point HUD.'}
(base/'point-frame-candidates.json').write_text(json.dumps(proof,indent=2)+'\n');print(json.dumps({'nearest':nearest,'expectedScore':scores,'launchQuality':launch['hit']['quality']}))
