"""Create a review from observed UI captures, keeping automated/domain evidence separate."""
import json, math, subprocess, hashlib, sys
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
base=Path(__file__).resolve().parents[1]/'verification/experience-20261016'
flow=base/'flow';out=base/'delivery';out.mkdir(exist_ok=True)
d=json.loads((flow/'experience.json').read_text())
source=json.loads((flow/'experience-flow-report.json').read_text())
hits=d['match']['shots'];normal=[h for h in hits if h['actor']==0 and h['shot']=='smash'];strong=[h for h in hits if h['actor']==0 and h['shot']=='superSmash']
assert normal and strong and d['maxReturns']>=3
assert d['match']['audioEvents']==len(hits) and d['match']['pointAudioEvents']==len(d['match']['points'])
assert not d['muted']['audioEvents'] and not d['muted']['pointAudioEvents']
attack=lambda h:dict(shot=h['shot'],speed=math.hypot(*h['velocity'].values()),vy=h['velocity']['y'],quality=h['quality'],contactHeight=h['p']['y'],balance=h['balance'],preparation=h['preparation'],reason=h['strokeReason'],source=h['contact']['source'],plane=h['contact']['planeDistance'],radial=h['contact']['radialDistance'])
summary=dict(runtimeCommit='0668f6e',buildEvidence=source['buildEvidence'],method='Actual visible-cue UI game, subsequent no-return muted point and ordinary rematch. No state/time injection; offline sound amplitude checks are separate from the live stream.',renderedContacts=d['renderedContacts'],maxRenderedContactErrorM=max(c['centreErrorM'] for c in d['renderedContacts']),score=d['match']['scores'],maxRallyReturns=d['maxReturns'],normalAttacks=[attack(h) for h in normal],superAttacks=[attack(h) for h in strong],physicalHitSounds=d['match']['audioEvents'],scoreSounds=d['match']['pointAudioEvents'],points=d['match']['points'],mutedScoreSounds=d['muted']['pointAudioEvents'],dialogBounds=d['dialogBounds'],offlinePointAudio=d['audioMetrics'],limits=['Software Chromium touch emulation, not physical-device FPS/latency or human win-rate evidence.','Live WebAudio capture and numerical checks; no speaker/headphone listening.','No Naver article analysis; original source remains unread.'])
(base/'flow-summary.json').write_text(json.dumps(summary,indent=2))
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
# Literal original screenshots, proportionally letterboxed; no generated gameplay.
pairs=[
 ('Before / debug fallback',base/'baseline-fallback/fallback.png','After / hitter and safe-return reason',flow/'03-safe-return.png'),
 ('Before / stale SMASH on a dead ball',base/'baseline/point-1.png','After / point reason and next serve',flow/'05-point-1.png'),
 ('Intermediate / clipped Back control',base/'attempts/flow-before-late-reason/02-help.png','Final / fixed footer, scrollable body',flow/'help-640x360.png'),
 ('Before / terminal point promised a serve',base/'attempts/terminal-wrong-hint.png','After / terminal point routes to results',flow/'05-match-point.png'),
 ('Observed NORMAL loss / deliberately no returns',base/'loss/loss-normal-results.png','After loss / clean actual rematch',base/'loss/loss-rematch-ready.png'),
]
sheet=Image.new('RGB',(1280,2117),'#112130');draw=ImageDraw.Draw(sheet)
draw.text((20,12),'SMASH RALLY 3D | observed UX corrections',font=ImageFont.truetype(font,30),fill='#f0f6fa')
draw.text((20,52),'Actual captures from different rallies; this compares feedback, not win rate.',font=ImageFont.truetype(font,17),fill='#bdd0d8')
for row,(left,lp,right,rp) in enumerate(pairs):
 for col,(label,p) in enumerate([(left,lp),(right,rp)]):
  x,y=col*640,86+row*402
  draw.text((x+12,y+8),label,font=ImageFont.truetype(font,20),fill='#ffe0a3')
  image=ImageOps.contain(Image.open(p).convert('RGB'),(640,360))
  sheet.paste(image,(x+(640-image.width)//2,y+42+(360-image.height)//2))
sheet.save(out/'02-experience-before-after.png')
Image.open(flow/'04b-super-smash.png').save(out/'03-actual-super-smash.png')
if '--images-only' in sys.argv:
 print('IMAGES READY');sys.exit(0)
# Hard-cut excerpts of the actual captured source at its original wall-clock speed.
origin=d['capture']['videoStartPerf']/1000
ledger={e['physicsTime']:e for e in d['match']['audioLedger']}
fallback=next(h for h in hits if h['actor']==0 and h['fallbackReason'])
segments=[]
for label,h,before,after in [('Safe front return',fallback,1,3),('Normal smash',normal[0],1,3),('Natural Super Smash',strong[0],1.3,3.5)]:
 t=ledger[h['time']]['audioPerf']/1000-origin;segments.append(dict(label=label,start=max(0,t-before),end=t+after))
point=next(e for e in d['events'] if e['kind']=='point')['perf']/1000-origin
segments.append(dict(label='Real point and next-serve signal',start=point-.6,end=point+2.5))
terminal=[e for e in d['events'] if e['kind']=='point'][-1]['perf']/1000-origin
segments.append(dict(label='Winning point - results next',start=terminal-.4,end=terminal+2))
segments.append(dict(label='Match result - actual rematch',start=d['resultsPerf']/1000-origin-.3,end=d['rematchPerf']/1000-origin+1))
for i,s in enumerate(segments):
 target=out/f'clip-{i+1}.mp4';s['file']=target.name
 subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(s['start']),'-i',str(flow/'full-play.mp4'),'-t',str(s['end']-s['start']),'-vf',f"drawtext=fontfile={font}:text={s['label']}:fontsize=12:fontcolor=white:box=1:boxcolor=black@0.65:x=12:y=h-26",'-c:v','libx264','-preset','veryfast','-crf','22','-threads','1','-c:a','aac','-b:a','96k',str(target)],check=True)
concat=out/'clips.ffconcat';concat.write_text('\n'.join(f"file '{s['file']}'" for s in segments)+'\n')
video=out/'01-experience-review.mp4'
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(video)],check=True)
(out/'edit.json').write_text(json.dumps(dict(method='Six labelled hard cuts, original wall-clock playback speed, no interpolated poses. Actual captured WebAudio stream with one media-origin calibration, not replacement sound or a physical AV latency measurement.',source='../flow/full-play.mp4',segments=segments,sha256=hashlib.sha256(video.read_bytes()).hexdigest()),indent=2))
if '--media-only' in sys.argv:
 print('MEDIA READY');sys.exit(0)
paths={'flow':'flow/experience-flow-report.json','loss':'loss/experience-loss-report.json','pressure':'pressure/experience-pressure-report.json','native':'native/mobile-native-report.json','rotation':'rotation/court-resize-report.json','native-repeat-2':'native-repeat-2/mobile-native-report.json','native-repeat-3':'native-repeat-3/mobile-native-report.json','dialog':'dialog/experience-dialog-report.json','defence':'defence/smash-drop-regression-report.json','rally':'rally/court-framing-report.json'}
assert '62 passed (62)' in (base/'tests-final.txt').read_text()
reports={k:json.loads((base/v).read_text()) for k,v in paths.items()}
assert all(r['pass'] and not r['errors'] for r in reports.values())
hashes={r['buildEvidence']['sha256'] for r in reports.values()};assert len(hashes)==1
rally=next(json.loads(x.split('COURT FRAMING PASS ',1)[1]) for x in reports['rally']['logs'] if x.startswith('COURT FRAMING PASS '))
layouts=[]
for x in rally['results']:
 f=x['framing'];assert x['returns']>=6 and not f['clippedPlayers'] and not f['clippedShuttle']
 layouts.append(dict(view=x['viewport'],returns=x['returns'],clippedPlayers=f['clippedPlayers'],clippedShuttle=f['clippedShuttle'],maxAimErrorPx=max(a['pixelError'] for a in f['aim']),apexM=f['maxHeight']))
pressure=next(json.loads(x.split('EXPERIENCE PRESSURE PASS ',1)[1]) for x in reports['pressure']['logs'] if x.startswith('EXPERIENCE PRESSURE PASS '))
assert pressure['returned']>0 and pressure['goodPerfectWinners']>0
qualification=dict(pass_=True,runtimeCommit='0668f6e',runtimeBundleSha256=hashes.pop(),unitTests=62,unitFiles=10,projectBuild='build-final.txt',fullBuild='root-build-final.txt',reports={k:dict(file=paths[k],pass_=r['pass'],errors=r['errors']) for k,r in reports.items()},layouts=layouts,pressure=pressure,flowSummary='flow-summary.json',limits=summary['limits'])
qualification['pass']=qualification.pop('pass_')
for result in qualification['reports'].values(): result['pass']=result.pop('pass_')
root_log=(base/'root-build-final.txt').read_text()
start=root_log.index('> smash-rally-3d@')
end=root_log.index('Copied smash-rally-3d build',start)
end=root_log.find('\n',end)
(base/'build-final.txt').write_text('Extracted successful SmashRally3D stage from root-build-final.txt\n'+root_log[start:end]+'\n')
(base/'qualification.json').write_text(json.dumps(qualification,indent=2))
print(json.dumps(dict(normal=len(normal),super=len(strong),points=summary['scoreSounds'],layouts=layouts,pressure=pressure)))
