"""Verify fixed-build lifecycle evidence; do not turn camera checks into score points."""
from pathlib import Path
import hashlib,json,math,subprocess
from PIL import Image,ImageChops
b=Path(__file__).resolve().parents[1]/'verification/point-camera-20261017'
load=lambda f:json.loads((b/f).read_text())
m=load('source-manifest.json');models=m['models'];reports={}
assert hashlib.sha256((b.parents[1]/'app/src/main.ts').read_bytes()).hexdigest()==m['mainSha256']
for folder,scenario,before in [('before-portrait','point-camera-lifecycle',True),*[(f'after-{v}','point-camera-lifecycle',False) for v in ['portrait','pc','landscape']],('native-rotation','court-resize',False),('rally-aim','aim-rally',False),*[(f'preserve-{p}-{v}','point-camera-preservation',p=='before') for p in ['before','after'] for v in ['pc','portrait']]]:
 r=load(f'{folder}/{scenario}-report.json');assert r['pass'] and not r['errors'],folder
 assert r['buildEvidence']['sha256']==m['beforeBundle' if before else 'afterBundle'],folder
 assert r['buildEvidence']['modelHashes']==models,folder
 reports[folder]={'file':f'{folder}/{scenario}-report.json','pass':True,'bundleSha256':r['buildEvidence']['sha256']}
assert 'Tests  81 passed (81)' in (b/'unit-tests.txt').read_text()
assert 'Test Files  14 passed (14)' in (b/'unit-tests.txt').read_text()
assert 'Compiled successfully' in (b/'root-build.txt').read_text()
assert hashlib.sha256((b.parent/'switch-benchmark-20261017/rubric.json').read_bytes()).hexdigest()==m['rubricSha256']
scores=load('score-preservation.json');prior=json.loads((b.parent/'athlete-form-20261017/evaluation-final.json').read_text())
assert scores['items']==[{'id':i['id'],'weight':i['weight'],'score':i['score']} for i in prior['items']]
assert scores['reviewedSubtotal']==48 and scores['unknownWeight']==40 and scores['overallScore'] is None
old=load('before-portrait/point-camera.json');assert next(r for r in old['summaries'] if r['phase']=='POINT_RESOLVED')['clipped']>0
transitions=lambda data:[{'time':f['time'],'score':f['score'],'positionStepM':math.dist(list(p['camera']['p'].values()),list(f['camera']['p'].values())),'fovStepDegrees':f['camera']['fov']-p['camera']['fov'],'before':p['camera'],'after':f['camera']} for p,f in zip(data['frames'],data['frames'][1:]) if p['phase']=='RALLY' and f['phase']=='POINT_RESOLVED']
results={}
for view in ['portrait','pc','landscape']:
 d=load(f'after-{view}/point-camera.json');assert {'ready','rally','point-enter','point-follow','point-late','results'}.issubset(d['captured'])
 assert d['state']['phase']=='RALLY' and d['state']['scores']==[0,0]
 for r in d['summaries']:
  assert r['samples']>0
  if r['phase'] in ['POINT_RESOLVED','RESULTS']:assert r['clipped']==0,(view,r)
 if view=='portrait':assert d['rotated']
 results[view]={'summaries':d['summaries'],'actualPointTransitions':transitions(d),'frames':len(d['frames']),'restartPhase':d['state']['phase'],'restartScore':d['state']['scores']}
# Separate exact held-ready proof; point camera images intentionally differ.
pixels=[]
for view in ['pc','portrait']:
 original=b/f'preserve-before-{view}';current=b/f'preserve-after-{view}'
 a=Image.open(original/'ready.png').convert('RGBA');ar=Image.open(original/'ready-repeat.png').convert('RGBA');c=Image.open(current/'ready.png').convert('RGBA');cr=Image.open(current/'ready-repeat.png').convert('RGBA')
 assert a.size==ar.size==c.size==cr.size
 delta=lambda x,y:sum(px!=(0,0,0,0) for px in ImageChops.difference(x,y).getdata())
 counts={'originalRepeatChangedPixels':delta(a,ar),'currentRepeatChangedPixels':delta(c,cr),'originalVsCurrentChangedPixels':delta(a,c)}
 assert all(n==0 for n in counts.values()),(view,counts)
 assert load(f'preserve-before-{view}/preservation.json')['state']==load(f'preserve-after-{view}/preservation.json')['state']
 pixels.append({'view':view,'dimensions':a.size,**counts,'sameHeldState':True})
rally=load('rally-aim/aim-rally-report.json');rally=json.loads(next(s[len('COURT FRAMING PASS '):] for s in rally['logs'] if s.startswith('COURT FRAMING PASS ')))
native=load('native-rotation/court-resize-report.json');native=json.loads(next(s[len('LIVE ROTATION PASS '):] for s in native['logs'] if s.startswith('LIVE ROTATION PASS ')))
video=b/'after-portrait/actual-lifecycle-silent.mp4';probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]))
assert any(s['codec_type']=='video' for s in probe['streams']) and not any(s['codec_type']=='audio' for s in probe['streams'])
result={'status':'all_software_gates_pass; direct raster review separately required','runtimeCommit':m['runtimeCommit'],'reports':reports,'unitTests':81,'unitFiles':14,'fullRootBuild':True,'modelHashes':models,'beforeBundle':m['beforeBundle'],'afterBundle':m['afterBundle'],'baselinePortrait':{'summaries':old['summaries'],'actualPointTransitions':transitions(old)},'after':results,'rallyAim':[{'view':r['viewport'],'returns':r['returns'],'clippedPlayers':r['framing']['clippedPlayers'],'clippedShuttle':r['framing']['clippedShuttle'],'maxHeight':r['framing']['maxHeight'],'aimErrorsCssPx':[a['pixelError'] for a in r['framing']['aim']]} for r in rally['results']],'nativeRotation':{'method':native['method'],'aimErrorsCssPx':[r['pixelError'] for r in native['results']],'actualShots':[r['actual'] for r in native['results']]},'readyPixelProof':pixels,'video':{'file':'after-portrait/actual-lifecycle-silent.mp4','sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'duration':probe['format']['duration'],'silent':True,'continuousNormalSpeedWatched':False},'score':{'reviewedSubtotal':48,'reviewedWeight':60,'unknownWeight':40,'overallScore':None,'V2':4,'change':0},'limits':['Joint projections are not complete mesh/garment or modal-occlusion visibility proof; direct raster sources are separate.','PC/mobile CSS software-browser checks do not establish physical touch,FPS,latency or Safari.','Silent wall-clock recording and decoded still inspection do not establish normal-speed continuous watching or actual listening.','Interrupted viewport-probe attempts are excluded, retained under attempts/.','4800Vercel success does not overcome pre-HTTP Chromium transport block; no remote playable claim.']}
(b/'qualification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'reports':len(reports),'allPass':True,'readyChangedPixels':[r['originalVsCurrentChangedPixels'] for r in pixels]}))
