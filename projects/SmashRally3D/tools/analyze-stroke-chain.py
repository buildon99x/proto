"""Read actual frame traces; these diagnostics never assign experience scores."""
import json, math, sys
from pathlib import Path
base=Path(__file__).resolve().parents[1]/'verification/stroke-chain-20261017'
distance=lambda a,b:math.dist([a[k] for k in 'xyz'],[b[k] for k in 'xyz'])
def angle(a,b,c):
 u=[a[k]-b[k] for k in 'xyz'];v=[c[k]-b[k] for k in 'xyz']
 d=sum(x*y for x,y in zip(u,v))/max(1e-12,math.hypot(*u)*math.hypot(*v))
 return math.degrees(math.acos(max(-1,min(1,d))))
def analyze(folder):
 root=base/folder;data=json.loads((root/'experience.json').read_text());trace=json.loads((root/'stroke-frames.json').read_text())
 frames=[f for f in trace['frames'] if data['capture']['videoStartPerf']<=f['perf']<=data['resultsPerf']]
 hits=[h for h in data['match']['shots'] if h['actor']==0 and h['shot'] in ['smash','superSmash']]
 rows=[]
 for h in hits:
  window=[f for f in frames if -.55<=f['time']-h['time']<=.65]
  prepare=[f for f in window if -.45<=f['time']-h['time']<=-.18]
  landing=[f for f in window if .24<=f['time']-h['time']<=.55 and min(f['actors'][0]['pose']['joints']['AnkleR']['y'],f['actors'][0]['pose']['joints']['AnkleL']['y'])<=.105]
  def loaded(f):
   j=f['actors'][0]['pose']['joints']
   return j['WristR']['y']-j['ShoulderR']['y']>.15 and angle(j['ShoulderR'],j['ElbowR'],j['WristR'])<135
  ready=[f for f in window if f['time']<h['time'] and loaded(f)]
  rows.append({'shot':h['shot'],'hitTime':h['time'],'preparationSamples':len(prepare),
   'loadedFractionBeforeInputWindow':sum(loaded(f) for f in prepare)/max(1,len(prepare)),
   'visiblePreparationLeadSeconds':h['time']-min(f['time'] for f in ready) if ready else 0,
   'preparationMeanElbowDegrees':sum(angle(f['actors'][0]['pose']['joints']['ShoulderR'],f['actors'][0]['pose']['joints']['ElbowR'],f['actors'][0]['pose']['joints']['WristR']) for f in prepare)/max(1,len(prepare)),
   'landingGroundedSamples':len(landing),'landingMinKneeDegrees':min((angle(f['actors'][0]['pose']['joints']['HipR'],f['actors'][0]['pose']['joints']['KneeR'],f['actors'][0]['pose']['joints']['AnkleR']) for f in landing),default=None)})
 armError=legError=gripError=0;handDots=[];speeds=[]
 for index,f in enumerate(frames):
  for m in f['actors']:
   p=m['pose'];j=p['joints'];r=p['racket']
   for side in ['R','L']:
    armError=max(armError,abs(distance(j['Shoulder'+side],j['Elbow'+side])-.36),abs(distance(j['Elbow'+side],j['Wrist'+side])-.36))
    legError=max(legError,abs(distance(j['Hip'+side],j['Knee'+side])-.43),abs(distance(j['Knee'+side],j['Ankle'+side])-.43))
   expected={k:r['center'][k]-.46*r['shaft'][k] for k in 'xyz'};gripError=max(gripError,distance(j['WristR'],expected))
   if 'handUp' in m:handDots.append(sum(m['handUp'][k]*m['shaft'][k] for k in 'xyz'))
  if index and 0<f['time']-frames[index-1]['time']<=.04:
   speeds.append(distance(f['actors'][0]['pose']['racket']['center'],frames[index-1]['actors'][0]['pose']['racket']['center'])/(f['time']-frames[index-1]['time']))
 out={'method':'Actual frameend traces under original640x360LOW controller. Preparation metric: -.45..-.18sim seconds before actual hit, wrist>.15m above shoulder and elbow<135deg. Landing metric: +.24..+.55sim seconds, at least one ankle<=.105m. Metrics describe geometry, not coaching correctness, natural-speed feel or a score.',
  'frames':len(frames),'hits':rows,'maxArmLengthErrorM':armError,'maxLegLengthErrorM':legError,'maxWristToGripAnchorErrorM':gripError,'minimumActualHandUpDotShaft':min(handDots,default=None),'maxObservedRacketSpeedMps':max(speeds,default=0),
  'physicalMatch':{'score':data['match']['scores'],'contacts':len(data['match']['shots']),'renderedContactSamples':len(data['renderedContacts']),'maxContactErrorM':max(c['centreErrorM'] for c in data['renderedContacts'])}}
 (root/'kinematics.json').write_text(json.dumps(out,indent=2)+'\n')
 print(json.dumps({'folder':folder,**out},ensure_ascii=False))
for folder in sys.argv[1:] or ['before','final-play']:analyze(folder)
