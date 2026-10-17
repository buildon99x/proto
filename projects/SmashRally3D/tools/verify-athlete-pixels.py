"""Exact repeated baseline and localized shape changes in held natural poses."""
import json,math
from pathlib import Path
from PIL import Image,ImageChops
base=Path(__file__).resolve().parents[1]/'verification/athlete-form-20261017'

def project(p,c,width,height):
 v=[p[k]-c['p'][k] for k in 'xyz'];q=c['q'];u=[-q[k] for k in 'xyz'];w=q['w']
 cross=lambda a,b:[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
 uv=cross(u,v);uuv=cross(u,uv);v=[v[i]+2*(w*uv[i]+uuv[i]) for i in range(3)];scale=height/2/math.tan(math.radians(c['fov']/2))
 return [width/2+v[0]/-v[2]*scale,height/2-v[1]/-v[2]*scale]
results=[]
for folder in ['phases-pc-1','phases-portrait-1']:
 data=json.loads((base/folder/'form-study.json').read_text())
 for row in data['samples']:
  name=row['name'];images={variant:Image.open(base/folder/(name+'-'+variant+'.png')).convert('RGB') for variant in ['baseline','baseline-repeat','candidate','baseline-restored']}
  before=images['baseline'];assert ImageChops.difference(before,images['baseline-repeat']).getbbox() is None,(folder,name,'baseline repeat')
  assert ImageChops.difference(before,images['baseline-restored']).getbbox() is None,(folder,name,'restore')
  assert all(v['state']==row['state'] for v in row['variants'])
  diff=ImageChops.difference(before,images['candidate']);changed=sum(any(p) for p in diff.get_flattened_data());outside=diff.copy();width,height=before.size;bounds=[]
  for pose in row['state']['poses']:
   # Existing project's conservative joint +/-0.35m projection envelope.
   # This bounds isolation; it is not a new visual-quality or anatomy threshold.
   points=[project({k:p[k]+d[k] for k in 'xyz'},row['state']['camera'],width,height) for p in pose['joints'].values() for d in [{'x':x,'y':y,'z':z} for x in [-.35,.35] for y in [-.35,.35] for z in [-.35,.35]]]
   box=(max(0,math.floor(min(p[0] for p in points))),max(0,math.floor(min(p[1] for p in points))),min(width,math.ceil(max(p[0] for p in points))),min(height,math.ceil(max(p[1] for p in points))))
   bounds.append(box);outside.paste((0,0,0),box)
  outside_count=sum(any(p) for p in outside.get_flattened_data());assert outside_count==0,(folder,name,outside_count)
  results.append({'folder':folder,'pose':name,'baselineRepeatAndRestoreIdentical':True,'cameraClockPosesAndContactIdentical':True,'changedPixels':changed,'changedBounds':diff.getbbox(),'changedPixelsOutsideConservativeAthleteBounds':outside_count,'bounds':bounds})
(base/'pixel-isolation.json').write_text(json.dumps({'method':'Geometry is intentionally not byte-gateable inside the athlete. Two repeated imported-baseline renders and restored baseline match exactly; same state/clock/camera/pose,0changes outside existing conservative athlete projection boxes. Visual judgments are separate.','results':results},indent=2)+'\n')
print(json.dumps({'sameStatePairs':len(results),'baselineRepeatedExact':True,'outsideChangedPixels':sum(r['changedPixelsOutsideConservativeAthleteBounds'] for r in results)}))
