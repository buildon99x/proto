"""Color isolation on held actual poses; no experience points inferred."""
import json,math
from pathlib import Path
from PIL import Image,ImageChops
base=Path(__file__).resolve().parents[1]/'verification/stroke-chain-20261017'
folder='refined-phases-art' if (base/'refined-phases-art/phases.json').exists() else 'phases-art'
data=json.loads((base/folder/'phases.json').read_text());rows=[]
def project(p,c):
 v=[p[k]-c['p'][k] for k in 'xyz'];q=c['q'];u=[-q[k] for k in 'xyz'];w=q['w'];cross=lambda a,b:[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
 uv=cross(u,v);uuv=cross(u,uv);v=[v[i]+2*(w*uv[i]+uuv[i]) for i in range(3)];scale=180/math.tan(math.radians(c['fov']/2));return [320+v[0]/-v[2]*scale,180-v[1]/-v[2]*scale]
for row in data['samples']:
 a=Image.open(base/folder/f"phase-{row['name']}.png").convert('RGB');b=Image.open(base/folder/f"phase-{row['name']}-legacy-color.png").convert('RGB');mask=ImageChops.difference(a,b);changed=sum(any(p) for p in mask.get_flattened_data());bounds=[]
 for actor in row['actors']:
  points=[project({k:p[k]+d[k] for k in 'xyz'},row['camera']) for p in actor['skinPose']['joints'].values() for d in [{'x':x,'y':y,'z':z} for x in [-.35,.35] for y in [-.35,.35] for z in [-.35,.35]]]
  bounds.append((max(0,math.floor(min(p[0] for p in points))),max(0,math.floor(min(p[1] for p in points))),min(640,math.ceil(max(p[0] for p in points))),min(360,math.ceil(max(p[1] for p in points)))))
 for box in bounds:mask.paste((0,0,0),box)
 outside=sum(any(p) for p in mask.get_flattened_data());assert outside==0
 assert row['artComparison']['samePose'] and row['artComparison']['sameTime']
 rows.append({'phase':row['name'],'samePoseAndClock':True,'changedPixels':changed,'changedPixelsOutsideConservativeAthleteBounds':outside,'bounds':bounds})
(base/'art-pixel-proof.json').write_text(json.dumps({'method':'Exact raw PNG color isolation. Identical held pose/clock/camera;0changed pixels outside conservative athlete joint±.35m bounds. Not an experience score.','source':folder,'results':rows},indent=2)+'\n')
print(json.dumps({'pairs':len(rows),'outsideChangedPixels':sum(r['changedPixelsOutsideConservativeAthleteBounds'] for r in rows)}))
