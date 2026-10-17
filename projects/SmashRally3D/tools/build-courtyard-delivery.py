"""Final fixed-rubric evidence bundle; scores must already be manually reviewed."""
import hashlib, json, re, shutil, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

base = Path(__file__).resolve().parents[1] / 'verification/courtyard-depth-20261017'
out = base / 'delivery'
out.mkdir(exist_ok=True)
load = lambda p: json.loads((base / p).read_text())
cases = {'scene':('final-scene','courtyard-scene'),'play':('final-play','stroke-chain'),'native':('final-native','benchmark-native'),'native2':('final-native-2','benchmark-native'),'native3':('final-native-3','benchmark-native'),'rotation':('final-rotation','court-resize'),'defence':('final-defence','defence-review'),'pressure':('final-pressure','defence-review'),'rally':('final-rally','court-framing'),'accessible':('final-accessible','accessible-overlays'),'flight':('final-flight','high-shuttle-flight'),'loss':('final-loss','experience-loss'),'dialog':('final-dialog','experience-dialog'),'pause':('final-pause','benchmark-pause')}
reports = {k:load(f'{folder}/{name}-report.json') for k,(folder,name) in cases.items()}
assert all(r['pass'] and not r['errors'] for r in reports.values())
bundles = {r['buildEvidence']['sha256'] for r in reports.values()}
models = {json.dumps(r['buildEvidence']['modelHashes'],sort_keys=True) for r in reports.values()}
assert len(bundles)==len(models)==1
placement=load('placement/courtyard-placement-report.json')
assert placement['pass'] and not placement['errors'] and placement['buildEvidence']['sha256']==next(iter(bundles))
assert json.dumps(placement['buildEvidence']['modelHashes'],sort_keys=True)==next(iter(models))
assert '77 passed (77)' in (base/'tests-final.txt').read_text()
assert '77 strict units and full root build exit=0' in (base/'checks.txt').read_text()
dist=base.parents[1]/'app/dist'
js=re.search(r'src="([^"]+\.js)"',(dist/'index.html').read_text()).group(1)
assert hashlib.sha256((dist/js.lstrip('/')).read_bytes()).hexdigest()==next(iter(bundles))
assert {p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (dist/'assets/models').glob('*.glb')}==json.loads(next(iter(models)))
prior=json.loads((base.parent/'stroke-chain-20261017/evaluation-final.json').read_text())
environment=load('evaluation-environment.json')
evaluation=load('evaluation-final.json')
frozen=base.parent/'switch-benchmark-20261017/rubric.json'
assert hashlib.sha256(frozen.read_bytes()).hexdigest()==evaluation['rubricSha256']==prior['rubricSha256']
for e in [environment,evaluation]:
    assert len(e['items'])==20 and sum(x['weight'] for x in e['items'])==100
    assert e['verifiedSubtotal']==sum(x['score'] for x in e['items'] if x['score'] is not None)
    assert e['unverifiedWeight']==sum(x['weight'] for x in e['items'] if x['score'] is None)
    assert e['overallScore'] is None and not e['targetAchieved']
    assert e['validationStatus'] in ['provisional_pending_remaining_gates_and_media_review','reviewed_in_stated_scope_after_final_gates_and_media_review']

fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=lambda n:ImageFont.truetype(fontpath,n)
segments=[]
for kind in ['smash','superSmash']:
    for folder,label in [('../stroke-chain-20261017/final-play','Before courtyard'),('final-play','After courtyard')]:
        match=load(folder+'/experience.json')
        hit=next(h for h in match['match']['shots'] if h['actor']==0 and h['shot']==kind)
        event=next(a for a in match['match']['audioLedger'] if a['physicsTime']==hit['time'])
        start=(event['audioPerf']-match['capture']['videoStartPerf'])/1000-2
        i=len(segments);labelpath=out/f'clip-label-{i}.txt';labelpath.write_text(label+' / '+kind)
        clip=out/f'clip-{i}.mp4'
        overlay=f"drawtext=fontfile={fontpath}:textfile={labelpath}:fontsize=12:fontcolor=white:box=1:boxcolor=black@0.7:x=8:y=h-37,drawtext=fontfile={fontpath}:text='1x wall-clock software capture - natural-speed and listening unverified':fontsize=9:fontcolor=white:box=1:boxcolor=black@0.7:x=8:y=h-21"
        subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(start),'-i',str(base/folder/'full-play.mp4'),'-t','7','-vf',overlay,'-c:v','libx264','-preset','veryfast','-crf','22','-threads','1','-c:a','aac','-b:a','96k',str(clip)],check=True)
        segments.append({'source':folder+'/full-play.mp4','kind':kind,'start':start,'duration':7,'file':clip.name})
concat=out/'clips.ffconcat';concat.write_text(''.join(f"file '{s['file']}'\n" for s in segments))
video=out/'04-courtyard-match-review.mp4'
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(video)],check=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(video),'-vf','fps=1/3,scale=426:240,tile=3x3','-frames:v','1',str(out/'06-decoded-video-review.png')],check=True)
probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height','-of','json',str(video)],check=True,capture_output=True,text=True)
(out/'video-streams.json').write_text(probe.stdout)
(out/'edit.json').write_text(json.dumps({'method':'Four7-second before/after normal/Super excerpts from actual UI source videos, original wall-clock1x.20fps holds captured frames; no pose/frame interpolation or time rescaling/per-event audio replacement. Software-render throughput differs. No actual playback watching, listening, physical AV latency or natural-speed certification.','segments':segments,'sha256':hashlib.sha256(video.read_bytes()).hexdigest()},indent=2)+'\n')

card=Image.new('RGB',(1280,1140),'#122632');d=ImageDraw.Draw(card)
d.text((24,20),'Frozen 100-point rubric | 98 target NOT QUALIFIED',font=font(29),fill='#ffe0a0')
d.text((24,66),f"Prior41/55 -> courtyard{environment['verifiedSubtotal']}/55 -> reviewed{evaluation['verifiedSubtotal']}/{evaluation['verifiedWeight']}",font=font(27),fill='#edf4ef')
d.text((24,110),f"{evaluation['unverifiedWeight']} weight UNVERIFIED. Overall score remains null. No normalization.",font=font(22),fill='#bdd1d6')
labels=['Player/racket/net separation','Character material and volume','Court/environment coherence','Stroke/contact readability','Real-speed natural motion','Simple core controls','Aim/outcome explanation','Hardware input latency','Perceived hit feel','Physical mobile comfort','Cork/strings timbre','Perceptual AV sync','Mix comfort','Learning and guidance','Point/result/rematch','Adaptive accessible UI','Contextual shot variety','Opponent defence observation','Human fairness/depth','Rules/spatial cause']
for x,t in [(750,'Prior'),(900,'Court'),(1080,'Reviewed')]:d.text((x,152),t,font=font(18),fill='#ffdb98')
for i,(a,b,c,label) in enumerate(zip(prior['items'],environment['items'],evaluation['items'],labels)):
    y=183+i*36
    if i%2==0:d.rectangle((16,y-4,1262,y+30),fill='#193440')
    color='#edf4ef' if c['score'] is not None else '#91aab4'
    for x,t in [(25,c['id']),(105,label),(770,a['score']),(930,b['score']),(1110,c['score'])]:d.text((x,y),'U' if t is None else str(t),font=font(20),fill=color)
for i,text in enumerate(['Court column changes V3 only; M2 is a separate new bounded observation.','U is unverified, not zero. Technical gates do not award experience points.','Literal software-rendered frames reviewed; real-speed/human fairness remains open.','Missing: physical devices, direct listening, reference playback and user studies.']):d.text((24,965+i*35),text,font=font(20),fill='#bdd1d6')
card.save(out/'05-scorecard.png')
shutil.copyfile(base/'final-scene/scene-1065x606-ready.png',out/'07-current-ready.png')
match=load('final-play/experience.json')
rally=next(json.loads(l.split('COURT FRAMING PASS ',1)[1]) for l in reports['rally']['logs'] if l.startswith('COURT FRAMING PASS '))
q={'runtimeCommit':evaluation['runtimeCommit'],'runtimeBundleSha256':next(iter(bundles)),'modelHashes':json.loads(next(iter(models))), 'automatedGates':{'unitTests':77,'unitFiles':13,'fullRootBuild':True,'finalBrowserReports':14,'allPass':True,'rally':[{'viewport':x['viewport'],'returns':x['returns'],'clippedPlayers':x['framing']['clippedPlayers'],'clippedShuttle':x['framing']['clippedShuttle'],'maxAimPixelError':max(a['pixelError'] for a in x['framing']['aim']),'contrast':x['framing']['contrast']} for x in rally['results']],'separatePlacementDiagnostic':{'file':'placement/courtyard-placement-report.json','pass':True,'views':2,'restored':load('placement/placement.json')['proof']},'reports':{k:{'file':f'{cases[k][0]}/{cases[k][1]}-report.json','pass':r['pass'],'errors':r['errors']} for k,r in reports.items()}},'courtPreservation':load('camera-and-court-preservation.json'),'batchIsolation':load('batch-isolation.json'),'domainAndAssets':load('unchanged-domain-and-assets.json'),'placement':load('scenery-placement.json'),'actualMatch':{'score':match['match']['scores'],'contacts':len(match['match']['shots']),'renderedContacts':len(match['renderedContacts']),'maxContactErrorM':max(r['centreErrorM'] for r in match['renderedContacts']),'hitAudioEvents':match['match']['audioEvents'],'pointAudioEvents':match['match']['pointAudioEvents'],'muted':[match['muted']['audioEvents'],match['muted']['pointAudioEvents']]},'experience':{'validationStatus':evaluation['validationStatus'],'baselineSubtotal':41,'baselineWeight':55,'environmentOnlySubtotal':environment['verifiedSubtotal'],'reviewedSubtotal':evaluation['verifiedSubtotal'],'reviewedWeight':evaluation['verifiedWeight'],'unverifiedWeight':evaluation['unverifiedWeight'],'overallScore':None,'target98Achieved':False,'manualReview':'manual-review-final.json'},'opponentFacts':load('opponent-observation-facts.json'),'libraryStatus':'library-save-status.json','limits':evaluation['limits']}
(base/'qualification.json').write_text(json.dumps(q,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'browserReports':14,'units':77,'experience':q['experience'],'bundleSha256':next(iter(bundles))}))
