"""Durable literal media and final gates; manually reviewed rubric stays separate."""
import json,hashlib,subprocess,math,shutil,re
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
base=Path(__file__).resolve().parents[1]/'verification/stroke-chain-20261017';out=base/'delivery';out.mkdir(exist_ok=True)
load=lambda p:json.loads((base/p).read_text())
cases={'play':('final-play','stroke-chain'),'native':('final-native','benchmark-native'),'native2':('final-native-2','benchmark-native'),'native3':('final-native-3','benchmark-native'),'rotation':('final-rotation','court-resize'),'defence':('final-defence','smash-drop-regression'),'pressure':('final-pressure','experience-pressure'),'scene':('final-scene','benchmark-scene'),'rally':('final-rally','court-framing'),'accessible':('final-accessible','accessible-overlays'),'flight':('final-flight','high-shuttle-flight'),'loss':('final-loss','experience-loss'),'dialog':('final-dialog','experience-dialog'),'pause':('final-pause','benchmark-pause')}
reports={k:load(f'{folder}/{scenario}-report.json') for k,(folder,scenario) in cases.items()}
assert all(r['pass'] and not r['errors'] for r in reports.values())
hashes={r['buildEvidence']['sha256'] for r in reports.values()};models={json.dumps(r['buildEvidence']['modelHashes'],sort_keys=True) for r in reports.values()};assert len(hashes)==len(models)==1
assert '77 passed (77)' in (base/'tests-final.txt').read_text()
assert '77 strict units and full root build exit=0' in (base/'finish-checks.txt').read_text()
dist=base.parents[1]/'app/dist';js=re.search(r'<script[^>]+src="([^"]+\.js)"',(dist/'index.html').read_text()).group(1)
assert hashlib.sha256((dist/'assets'/Path(js).name).read_bytes()).hexdigest()==next(iter(hashes))
actual_models={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((dist/'assets/models').glob('*.glb'))};assert json.dumps(actual_models,sort_keys=True)==next(iter(models))
e=load('evaluation-final.json');prior=json.loads((base.parent/'high-shuttle-20261017/evaluation-final.json').read_text())
frozen=base.parent/'switch-benchmark-20261017/rubric.json';assert hashlib.sha256(frozen.read_bytes()).hexdigest()==e['rubricSha256']==prior['rubricSha256']
assert e['overallScore'] is None and not e['targetAchieved'] and sum(i['score'] for i in e['items'] if i['score'] is not None)==e['verifiedSubtotal']
assert e['unverifiedWeight']==45 and e['runtimeBundleSha256']==next(iter(hashes))
for folder in ['refined-phases-before','refined-phases-motion','refined-phases-art']:
 r=load(folder+'/stroke-phases-report.json');assert r['pass'] and not r['errors']
art=load('refined-phases-art/phases.json');assert all(r['artComparison']['samePose'] and r['artComparison']['sameTime'] for r in art['samples'])
subprocess.run(['python3',str(base.parents[1]/'tools/build-stroke-phase-sheets.py')],check=True)
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';font=lambda n:ImageFont.truetype(font_path,n)

# The same CPU-event offsets as the previous literal sample sheet. No pose interpolation.
play=load('final-play/experience.json');source=load('final-play/capture-source.json');raw=Path(source['rawDirectory']);retained=base/'final-play/review-source-frames';retained.mkdir(exist_ok=True)
def frame(i):
 name=f'{i:06d}.jpg';p=raw/name;saved=retained/name
 if p.is_file():shutil.copyfile(p,saved)
 assert saved.is_file();return saved
hit=next(h for h in play['match']['shots'] if h['actor']==0 and h['shot']=='smash');event=next(x for x in play['match']['audioLedger'] if x['physicsTime']==hit['time']);target=(source['origin']+event['audioPerf'])/1000;stamps=[f['timestamp'] for f in source['frames']]
sheet=Image.new('RGB',(1280,1600),'#122632');d=ImageDraw.Draw(sheet);samples=[]
for n,offset in enumerate([-2,-1.2,-.6,-.1,.4,1,1.8,2.8]):
 i=min(range(len(stamps)),key=lambda i:abs(stamps[i]-target-offset));im=Image.open(frame(i)).convert('RGB');x=n%2*640;y=n//2*400;sheet.paste(im,(x,y+30));d.text((x+8,y+7),f'CDP{i} /{stamps[i]-target:+.3f}s CPU event',font=font(17),fill='#ffdb98');samples.append({'index':i,'actualOffsetSeconds':stamps[i]-target,'sha256':hashlib.sha256(frame(i).read_bytes()).hexdigest()})
sheet.save(out/'05-actual-swing-sequence.png')
center=min(range(len(stamps)),key=lambda i:abs(stamps[i]-target));start=max(0,center-5);sheet=Image.new('RGB',(1280,720),'#122632');d=ImageDraw.Draw(sheet);consecutive=[]
for n,i in enumerate(range(start,min(start+12,len(stamps)))):
 im=ImageOps.contain(Image.open(frame(i)).convert('RGB'),(320,180));x=n%4*320;y=n//4*240;sheet.paste(im,(x,y+30));d.text((x+7,y+8),f'CDP{i} /{stamps[i]-target:+.3f}s',font=font(16),fill='#ffdb98');consecutive.append({'index':i,'offsetSeconds':stamps[i]-target,'sha256':hashlib.sha256(frame(i).read_bytes()).hexdigest()})
sheet.save(out/'06-consecutive-contact-frames.png');(out/'swing-sources.json').write_text(json.dumps({'method':'Actual full CDP source samples and12consecutive captured source frames. Labels are relative to CPU hit/audio scheduling; not photon/contact timing or natural-speed certification. No synthesized poses or time rescaling.','samples':samples,'consecutive':consecutive},indent=2)+'\n')

# Actual wall-clock1x excerpts; each retains its own recorded audio.
segments=[]
for kind in ['smash','superSmash']:
 for folder,label in [('before','Before'),('final-play','After motion + color')]:
  data=load(folder+'/experience.json');h=next(h for h in data['match']['shots'] if h['actor']==0 and h['shot']==kind);event=next(x for x in data['match']['audioLedger'] if x['physicsTime']==h['time']);t=(event['audioPerf']-data['capture']['videoStartPerf'])/1000
  n=len(segments);text=out/f'clip-label-{n}.txt';text.write_text(label+' / '+kind);clip=out/f'clip-{n}.mp4'
  overlay=f"drawtext=fontfile={font_path}:textfile={text}:fontsize=12:fontcolor=white:box=1:boxcolor=black@0.7:x=8:y=h-37,drawtext=fontfile={font_path}:text='1x wall-clock software capture - device speed and listening unverified':fontsize=9:fontcolor=white:box=1:boxcolor=black@0.7:x=8:y=h-21"
  subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(t-2),'-i',str(base/folder/'full-play.mp4'),'-t','7','-vf',overlay,'-c:v','libx264','-preset','veryfast','-crf','22','-threads','1','-c:a','aac','-b:a','96k',str(clip)],check=True)
  segments.append({'source':folder+'/full-play.mp4','kind':kind,'start':t-2,'duration':7,'file':clip.name})
concat=out/'clips.ffconcat';concat.write_text(''.join(f"file '{s['file']}'\n" for s in segments));video=out/'01-stroke-review.mp4';subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(video)],check=True)
(out/'edit.json').write_text(json.dumps({'method':'Four7-second normal/Super before-after excerpts at original wall-clock1x, actual WebAudio with one source-origin calibration. No per-event audio replacement, pose interpolation or time rescaling. Software-render throughput differs; do not score real-speed motion/AV latency from this.','segments':segments,'sha256':hashlib.sha256(video.read_bytes()).hexdigest()},indent=2)+'\n')
shutil.copyfile(base/'final-scene/scene-1065x606-ready.png',out/'07-current-ready.png')
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(video),'-vf','fps=1/3,scale=426:240,tile=3x3','-frames:v','1',str(out/'08-decoded-video-review.png')],check=True)
probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height','-of','json',str(video)],check=True,capture_output=True,text=True)
(out/'video-streams.json').write_text(probe.stdout)


# Same twenty criteria and unknowns; points come only from the manual evaluation.
card=Image.new('RGB',(1120,1100),'#122632');d=ImageDraw.Draw(card)
d.text((24,20),'Frozen 100-point rubric | 98 target NOT QUALIFIED',font=font(29),fill='#ffe0a0');d.text((24,68),f"Reviewed:39 ->40 motion -> {e['verifiedSubtotal']} color /55; 45 weight UNVERIFIED",font=font(26),fill='#edf4ef');d.text((24,110),'Overall score remains null. Same weights. No normalization to100.',font=font(19),fill='#bdd1d6')
labels=['Player/racket/net separation','Character material and volume','Court/environment coherence','Stroke/contact readability','Real-speed natural motion','Simple core controls','Aim/outcome explanation','Hardware input latency','Perceived hit feel','Physical mobile comfort','Cork/strings timbre','Perceptual AV sync','Mix comfort','Learning and guidance','Point/result/rematch','Adaptive accessible UI','Contextual shot variety','Opponent defence experience','Human fairness/depth','Rules/spatial cause'];old={i['id']:i for i in prior['items']}
d.text((790,140),'Prior',font=font(16),fill='#ffdb98');d.text((930,140),'Current',font=font(16),fill='#ffdb98')
for n,(item,label) in enumerate(zip(e['items'],labels)):
 y=164+n*36
 if n%2==0:d.rectangle((16,y-4,1100,y+30),fill='#193440')
 color='#edf4ef' if item['score'] is not None else '#91aab4'
 for x,t in [(25,item['id']),(105,label),(800,'U' if old[item['id']]['score'] is None else str(old[item['id']]['score'])),(940,'U' if item['score'] is None else str(item['score']))]:d.text((x,y),t,font=font(20),fill=color)
for n,t in enumerate(['U is unverified, not zero. Technical gates do not award experience points.','Motion and color effects were inspected separately; simple geometry remains.','Still missing: actual device/desktop, listening, reference-video viewing,','normal-speed/human comfort and fairness studies. Single-reviewer scope.']):d.text((24,930+n*35),t,font=font(19),fill='#bdd1d6')
card.save(out/'04-scorecard.png')

rally=next(json.loads(l.split('COURT FRAMING PASS ',1)[1]) for l in reports['rally']['logs'] if l.startswith('COURT FRAMING PASS '))
for row in rally['results']:
 c=row['framing']['contrast'];assert row['returns']>=6 and row['highClearCapture']['contrast']['visible'] and c['maxAnchorError']<=.5 and not c['underTutorial'] and not c['pointerBlocking'] and not c['nearContactVisible'];assert not row['framing']['clippedPlayers'] and not row['framing']['clippedShuttle']
q={'runtimeMotionCommit':e['motionCommit'],'runtimeArtCommit':e['runtimeCommit'],'runtimeBundleSha256':next(iter(hashes)),'modelHashes':actual_models,
 'automatedGates':{'unitTests':77,'unitFiles':13,'fullRootBuild':True,'finalBrowserReports':14,'allPass':True,'reports':{k:{'file':f'{cases[k][0]}/{cases[k][1]}-report.json','pass':r['pass'],'errors':r['errors']} for k,r in reports.items()},'rally':rally['results']},
 'motionBefore':load('before/kinematics.json'),'motionAfter':load('final-play/kinematics.json'),'artAssets':load('art-asset-validation.json'),'artImportedColors':load('art-import-colors.json'),
 'actualMatch':{'score':play['match']['scores'],'contacts':len(play['match']['shots']),'renderedContacts':len(play['renderedContacts']),'maxContactErrorM':max(x['centreErrorM'] for x in play['renderedContacts']),'contrastOffAtEveryContact':all(not c['visible'] for c in play['match']['shuttleContrast']['contacts']),'hitAudioEvents':play['match']['audioEvents'],'pointAudioEvents':play['match']['pointAudioEvents'],'mutedEvents':[play['muted']['audioEvents'],play['muted']['pointAudioEvents']]},
 'experience':{'validationStatus':e.get('validationStatus'),'reviewedSubtotal':e['verifiedSubtotal'],'reviewedWeight':55,'unverifiedWeight':45,'overallScore':None,'target98Achieved':False},'limits':e['limits']}
(base/'qualification.json').write_text(json.dumps(q,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'browserReports':14,'units':77,'experience':q['experience'],'bundleSha256':next(iter(hashes))}))
