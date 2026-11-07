"""Literal browser media and auditable gates; experience scores are manually reviewed."""
import hashlib, json, subprocess, shutil, re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

base=Path(__file__).resolve().parents[1]/'verification/high-shuttle-20261017'
out=base/'delivery';out.mkdir(exist_ok=True)
load=lambda p:json.loads((base/p).read_text())
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=lambda n:ImageFont.truetype(font_path,n)
cases={'accessible':'accessible-overlays','after-flight':'high-shuttle-flight','play':'benchmark-experience',
 'native':'benchmark-native','native-2':'benchmark-native','native-3':'benchmark-native','rotation':'court-resize','defence':'smash-drop-regression','pressure':'experience-pressure',
 'scene':'benchmark-scene','rally':'court-framing','loss':'experience-loss','dialog':'experience-dialog','pause':'benchmark-pause'}
reports={k:load(k+'/'+v+'-report.json') for k,v in cases.items()}
assert all(r['pass'] and not r['errors'] for r in reports.values())
hashes={r['buildEvidence']['sha256'] for r in reports.values()};assert len(hashes)==1
assert '71 passed (71)' in (base/'tests.txt').read_text()
assert 'Copied smash-rally-3d build' in (base/'root-build.txt').read_text()
assert 'strict units and full root build exit=0' in (base/'final-checks.txt').read_text()
e=load('evaluation-final.json');previous=json.loads((base.parent/'switch-benchmark-20261017/evaluation-cycle2.json').read_text())
assert hashlib.sha256((base.parent/'switch-benchmark-20261017/rubric.json').read_bytes()).hexdigest()==e['rubricSha256']==previous['rubricSha256']
assert e['overallScore'] is None and not e['targetAchieved'] and e['unverifiedWeight']==45
assert sum(i['score'] for i in e['items'] if i['score'] is not None)==e['verifiedSubtotal']
assert e['runtimeBundleSha256']==next(iter(hashes))
dist=base.parents[1]/'app/dist'
bundle=re.search(r'<script[^>]+src="([^"]+\.js)"',(dist/'index.html').read_text()).group(1)
assert hashlib.sha256((dist/'assets'/Path(bundle).name).read_bytes()).hexdigest()==e['runtimeBundleSha256']

# Proportional copies of actual screenshots, without generated scene content.
sheet=Image.new('RGB',(1280,890),'#122632');d=ImageDraw.Draw(sheet)
d.text((20,15),'High shuttle and adaptive controls | actual browser captures',font=font(27),fill='#ffe0a0')
d.text((20,55),'Live apex frames differ in time. Exact-state alternatives are in study/comparison.png.',font=font(18),fill='#bdd1d6')
pairs=[('Before: white shuttle','before-flight/apex.png','After: local silhouette','after-flight/apex.png'),
 ('Short landscape:44px settings','accessible/settings-quality-640x360.png','Portrait:44px settings','accessible/settings-quality-320x568.png')]
for row,(a,ap,b,bp) in enumerate(pairs):
 for col,(label,p) in enumerate([(a,ap),(b,bp)]):
  x=640*col;y=95+390*row;d.text((x+12,y),label,font=font(20),fill='#ffdb98')
  im=ImageOps.contain(Image.open(base/p).convert('RGB'),(640,350));sheet.paste(im,(x+(640-im.width)//2,y+30+(350-im.height)//2))
sheet.save(out/'02-high-shuttle-before-after.png')
shutil.copyfile(base/'scene/scene-1065x606-ready.png',out/'06-reference-composition.png')

card=Image.new('RGB',(1120,1100),'#122632');d=ImageDraw.Draw(card)
d.text((24,20),'Frozen 100-point rubric | 98 target NOT QUALIFIED',font=font(29),fill='#ffe0a0')
d.text((24,68),f"Reviewed: 37 -> {e['verifiedSubtotal']} /55; 45 weight UNVERIFIED",font=font(26),fill='#f4f4eb')
d.text((24,110),'Overall score remains null. No normalization to100. Single-reviewer scope.',font=font(18),fill='#bdd1d6')
labels=['Player/racket/net separation','Character material and volume','Court/environment coherence','Stroke/contact readability','Real-speed natural motion','Simple core controls','Aim/outcome explanation','Hardware input latency','Perceived hit feel','Physical mobile comfort','Cork/strings timbre','Perceptual AV sync','Mix comfort','Learning and guidance','Point/result/rematch','Adaptive accessible UI','Contextual shot variety','Opponent defence experience','Human fairness/depth','Rules/spatial cause']
old={i['id']:i for i in previous['items']}
for n,(item,label) in enumerate(zip(e['items'],labels)):
 y=164+n*36
 if n%2==0:d.rectangle((16,y-4,1100,y+30),fill='#193440')
 color='#edf4ef' if item['score'] is not None else '#91aab4'
 for x,t in [(25,item['id']),(105,label),(800,'U' if old[item['id']]['score'] is None else str(old[item['id']]['score'])),(940,'U' if item['score'] is None else str(item['score']))]:d.text((x,y),t,font=font(20),fill=color)
d.text((790,140),'Prior',font=font(16),fill='#ffdb98');d.text((930,140),'Current',font=font(16),fill='#ffdb98')
for n,t in enumerate(['U is unverified, not zero. Automated gates do not award experience points.',
 'Still missing: dot/hardware access, actual listening, reference video viewing,',
 'normal-speed motion, novice/mobile comfort and human fairness studies.',
 'Technical status and the full evidence boundaries are in qualification.json.']):d.text((24,930+n*35),t,font=font(19),fill='#bdd1d6')
card.save(out/'03-scorecard.png')

# Before/after hard cuts at original wall-clock1x; each retains its own recorded audio.
segments=[]
for i,(folder,label) in enumerate([('before-flight','Before: white shuttle, actual UI clear rally'),('after-flight','After: local silhouette, same UI controller')]):
 duration=min(35,load(folder+'/capture.json')['duration']);label_file=out/f'label-{i}.txt';label_file.write_text(label)
 target=out/f'clip-{i}.mp4'
 overlay=f"drawtext=fontfile={font_path}:textfile={label_file}:fontsize=12:fontcolor=white:box=1:boxcolor=black@0.7:x=8:y=h-37,drawtext=fontfile={font_path}:text='1x wall-clock software capture - hardware speed and listening unverified':fontsize=9:fontcolor=white:box=1:boxcolor=black@0.7:x=8:y=h-21"
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(base/folder/'full-play.mp4'),'-t',str(duration),'-vf',overlay,'-c:v','libx264','-preset','veryfast','-crf','22','-threads','1','-c:a','aac','-b:a','96k',str(target)],check=True)
 segments.append({'source':folder+'/full-play.mp4','start':0,'duration':duration,'label':label,'file':target.name})
concat=out/'clips.ffconcat';concat.write_text(''.join(f"file '{s['file']}'\n" for s in segments))
video=out/'01-high-shuttle-review.mp4'
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(video)],check=True)
(out/'edit.json').write_text(json.dumps({'method':'Hard-cut real CDP browser excerpts at wall-clock1x;20fps holds actual sampled frames; no pose synthesis/interpolation or time rescaling. Software simulation slows below render budget, so this does not prove real-device natural motion. Each clip uses its actual WebAudio destination recording with one origin calibration, not listening/AV-latency certification.','segments':segments,'sha256':hashlib.sha256(video.read_bytes()).hexdigest()},indent=2)+'\n')

# Eight actual video samples around a real normal smash, and12 consecutive raw CDP frames.
play=load('play/experience.json');hit=next(h for h in play['match']['shots'] if h['actor']==0 and h['shot']=='smash')
event=next(x for x in play['match']['audioLedger'] if x['physicsTime']==hit['time'])
t=(event['audioPerf']-play['capture']['videoStartPerf'])/1000
source=load('play/capture-source.json');raw=Path(source['rawDirectory'])
retained=base/'play/swing-source-frames';retained.mkdir(exist_ok=True)
def frame_path(i):
 name=f'{i:06d}.jpg';original=raw/name;saved=retained/name
 if original.is_file():shutil.copyfile(original,saved)
 if not saved.is_file():raise FileNotFoundError(saved)
 return saved
stamps=[x['timestamp'] for x in source['frames']];target=(source['origin']+event['audioPerf'])/1000
offsets=[-2,-1.2,-.6,-.1,.4,1,1.8,2.8];swings=Image.new('RGB',(1280,1600),'#122632');d=ImageDraw.Draw(swings);samples=[]
for n,offset in enumerate(offsets):
 i=min(range(len(stamps)),key=lambda i:abs(stamps[i]-(target+offset)))
 im=ImageOps.contain(Image.open(frame_path(i)).convert('RGB'),(640,360))
 x=n%2*640;y=n//2*400;swings.paste(im,(x+(640-im.width)//2,y+30));d.text((x+8,y+7),f'{stamps[i]-target:+.3f}s /CDP{i}',font=font(16),fill='#ffdb98')
 samples.append({'requestedOffsetSeconds':offset,'sourceIndex':i,'actualOffsetSeconds':stamps[i]-target,'sha256':hashlib.sha256(frame_path(i).read_bytes()).hexdigest()})
swings.save(out/'04-swing-sequence.png')
index=min(range(len(stamps)),key=lambda i:abs(stamps[i]-target));start=max(0,index-5)
consecutive=Image.new('RGB',(1280,720),'#122632');d=ImageDraw.Draw(consecutive);entries=[]
for n,i in enumerate(range(start,min(len(stamps),start+12))):
 im=Image.open(frame_path(i)).convert('RGB');im=ImageOps.contain(im,(320,180));x=n%4*320;y=n//4*240
 consecutive.paste(im,(x,y+30));delta=stamps[i]-target;d.text((x+8,y+8),f'CDP {i} / {delta:+.3f}s',font=font(16),fill='#ffdb98');entries.append({'sourceIndex':i,'deltaFromCpuAudioSchedulingSeconds':delta,'sha256':hashlib.sha256(frame_path(i).read_bytes()).hexdigest()})
consecutive.save(out/'05-consecutive-contact-frames.png')
(out/'swing-samples.json').write_text(json.dumps({'method':'Literal complete actual CDP samples plus12 consecutive actual CDP source frames around CPU hit/audio scheduling. No pose interpolation. Event time is not physical display or audio latency.','normalSmashPhysicsTime':hit['time'],'firstContactVideoTime':t,'actualSourceSamples':samples,'consecutive':entries},indent=2)+'\n')

rally=next(json.loads(x.split('COURT FRAMING PASS ',1)[1]) for x in reports['rally']['logs'] if x.startswith('COURT FRAMING PASS '))
for row in rally['results']:
 c=row['framing']['contrast']
 assert row['returns']>=6 and row['highClearCapture']['contrast']['visible']
 assert c['visible'] and c['maxAnchorError']<=.5 and not c['nearContactVisible'] and not c['pointerBlocking'] and not c['underTutorial']
 assert not row['framing']['clippedPlayers'] and not row['framing']['clippedShuttle']
flight=load('after-flight/flight.json')
qualification={'runtimeCommit':e['runtimeCommit'],'runtimeBundleSha256':next(iter(hashes)),
 'automatedGates':{'unitTests':71,'unitFiles':12,'fullRootBuild':True,'browserReports':len(reports),'allPass':True,'reports':{k:{'file':k+'/'+cases[k]+'-report.json','pass':r['pass'],'errors':r['errors']} for k,r in reports.items()},'flight':flight['visibility'],'rally':rally['results']},
 'actualUiMatch':{'score':play['match']['scores'],'physicalContacts':len(play['match']['shots']),'renderedContactSamples':len(play['renderedContacts']),'maxRenderedContactErrorM':max(x['centreErrorM'] for x in play['renderedContacts']),'contrastSuppressedAtEveryContact':all(not c['visible'] for c in play['match']['shuttleContrast']['contacts']),'hitAudioEvents':play['match']['audioEvents'],'pointAudioEvents':play['match']['pointAudioEvents'],'mutedEvents':[play['muted']['audioEvents'],play['muted']['pointAudioEvents']]},
 'experience':{'reviewedSubtotal':e['verifiedSubtotal'],'reviewedWeight':55,'unverifiedWeight':45,'overallScore':None,'target98Achieved':False},'limits':e['limits']}
(base/'qualification.json').write_text(json.dumps(qualification,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'reports':len(reports),'bundleSha256':next(iter(hashes)),'score':e['verifiedSubtotal'],'overallScore':None}))
