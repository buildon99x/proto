"""Assemble literal gameplay evidence; never turn automated passes into experience scores."""
import json, math, hashlib, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

base = Path(__file__).resolve().parents[1] / 'verification/switch-benchmark-20261017'
out = base / 'delivery'
out.mkdir(exist_ok=True)
load = lambda p: json.loads((base / p).read_text())
paths = {
    'play': 'final-play/benchmark-experience-report.json',
    'native': 'final-native/benchmark-native-report.json',
    'native2': 'final-native-2/benchmark-native-report.json',
    'native3': 'final-native-3/benchmark-native-report.json',
    'scene': 'final-scene/benchmark-scene-report.json',
    'dialog': 'final-dialog/experience-dialog-report.json',
    'pause': 'final-pause/benchmark-pause-report.json',
    'loss': 'final-loss/experience-loss-report.json',
    'pressure': 'final-pressure/experience-pressure-report.json',
    'rotation': 'final-rotation/court-resize-report.json',
    'defence': 'final-defence/smash-drop-regression-report.json',
    'rally': 'final-rally/court-framing-report.json',
}
images_only = '--images-only' in sys.argv
if not images_only:
    reports = {k: load(p) for k, p in paths.items()}
    assert all(r['pass'] and not r['errors'] for r in reports.values())
    hashes = {r['buildEvidence']['sha256'] for r in reports.values()}
    assert len(hashes) == 1
    assert '67 passed (67)' in (base / 'tests-final.txt').read_text()
scores = [load('evaluation-' + name + '.json') for name in ['baseline', 'cycle1', 'cycle2']]
rubric_hash = hashlib.sha256((base / 'rubric.json').read_bytes()).hexdigest()
assert all(e['rubricSha256'] == rubric_hash and e['overallScore'] is None and not e['targetAchieved'] for e in scores)
assert [(e['verifiedSubtotal'], e['verifiedWeight'], e['unverifiedWeight']) for e in scores] == [(33,55,45),(35,55,45),(37,55,45)]
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = lambda n: ImageFont.truetype(font_path,n)

# Exact original screenshots; proportional contain only. No generated gameplay.
pairs = [
    ('Before / dark ready scene', 'baseline-scene/scene-1065x606-ready.png', 'After / daylight, same camera', 'final-scene/scene-1065x606-ready.png'),
    ('Before / first real return, clock-driven tip', 'baseline/03-safe-return.png', 'After / return earned, clear not yet learned', 'final-play/03-safe-return.png'),
    ('Before / normal smash', 'baseline/04-normal-smash.png', 'After / normal smash, same input controller', 'final-play/04-normal-smash.png'),
    ('Before / portrait ready', 'baseline-scene/scene-390x844-ready.png', 'After / portrait ready', 'final-scene/scene-390x844-ready.png'),
]
sheet = Image.new('RGB',(1280,1780),'#132837'); draw=ImageDraw.Draw(sheet)
draw.text((18,12),'SMASH RALLY 3D | two observed improvement cycles',font=font(28),fill='#f6f3e9')
draw.text((18,52),'Own captures only. Nintendo footage unavailable. Different live frames are not pixel-matched.',font=font(16),fill='#bdd1d6')
for row,(a,ap,b,bp) in enumerate(pairs):
    for col,(label,p) in enumerate([(a,ap),(b,bp)]):
        x,y=col*640,84+row*418
        draw.text((x+12,y+6),label,font=font(17),fill='#ffdb98')
        im=ImageOps.contain(Image.open(base/p).convert('RGB'),(640,375))
        sheet.paste(im,(x+(640-im.width)//2,y+34+(375-im.height)//2))
sheet.save(out/'02-before-after.png')

card=Image.new('RGB',(1280,1080),'#122632'); d=ImageDraw.Draw(card)
d.text((28,22),'100-point experience rubric | 98 target: NOT QUALIFIED',font=font(31),fill='#ffe0a0')
d.text((28,72),'Reviewed subtotal: 33 -> 35 -> 37 / 55. Remaining weight: 45 UNVERIFIED.',font=font(25),fill='#f4f4eb')
d.text((28,115),'This is not 37/100 and is not normalized to 100. Automated checks are separate.',font=font(19),fill='#b8d1d8')
labels={'V1':'Player / racket / net separation','V2':'Character material and volume','V3':'Court and environment coherence','V4':'Stroke and contact frame readability','V5':'Natural motion at real speed','C1':'Simple core controls','C2':'Aim and outcome explanation','C3':'Physical input latency','C4':'Perceived hit feel','C5':'Physical mobile comfort','A1':'Cork / strings timbre','A2':'Perceived AV synchronization','A3':'Dynamics and mix comfort','U1':'Learning and contextual guidance','U2':'Point / result / rematch flow','U3':'Readable adaptive UI','M1':'Contextual shot variety','M2':'Opponent defence experience','M3':'Human fairness and tactical depth','M4':'Observed rules / spatial cause'}
xs=[28,110,780,920,1060]; y=160
for x,t in zip(xs,['ID','Criterion (weight 5)','Before','Light','Lessons']): d.text((x,y),t,font=font(19),fill='#ffdb98')
maps=[{i['id']:i for i in e['items']} for e in scores]
for n,item in enumerate(scores[0]['items']):
    yy=195+n*34; key=item['id']; color='#f0f4ee' if item['score'] is not None else '#8fa6af'
    if n%2==0:d.rectangle((20,yy-3,1258,yy+29),fill='#193440')
    d.text((28,yy),key,font=font(18),fill=color); d.text((110,yy),labels[key],font=font(18),fill=color)
    for x,m in zip(xs[2:],maps): d.text((x,yy),str(m[key]['score']) if m[key]['score'] is not None else 'U',font=font(19),fill=color)
d.text((28,906),'U = not verified, not a zero. Same weights and evidence rules in all cycles.',font=font(20),fill='#ffd596')
d.text((28,948),'Missing: dot desktop, hardware response, actual listening, reference-video viewing,',font=font(19),fill='#bdd1d6')
d.text((28,978),'real-speed motion, novice/mobile comfort and human fairness studies.',font=font(19),fill='#bdd1d6')
d.text((28,1024),'Technical pass != experience approval. The 98/100 goal remains open.',font=font(22),fill='#ffd596')
card.save(out/'03-scorecard.png')
if images_only:
    print('Draft comparison and scorecard assembled; no qualification or Library save.')
    sys.exit(0)

# Hard-cut real wall-clock excerpts, actual recorded WebAudio. No interpolated poses.
segments=[]
def hit_segment(folder,kind,label,before=2,after=3):
    data=load(folder+'/experience.json');h=next(h for h in data['match']['shots'] if h['actor']==0 and h['shot']==kind)
    e=next(e for e in data['match']['audioLedger'] if e['physicsTime']==h['time'])
    t=(e['audioPerf']-data['capture']['videoStartPerf'])/1000
    return dict(label=label,source=folder+'/full-play.mp4',start=max(0,t-before),end=t+after)
segments.append(hit_segment('baseline','smash','Before: normal smash'))
segments.append(hit_segment('final-play','smash','After: same normal input'))
segments.append(hit_segment('final-play','superSmash','After: natural Super Smash',1.3,3.5))
data=load('final-play/experience.json');first=next(h for h in data['match']['shots'] if h['actor']==0 and h['fallbackReason'])
entry=next(e for e in data['match']['audioLedger'] if e['physicsTime']==first['time']);t=(entry['audioPerf']-data['capture']['videoStartPerf'])/1000
segments.append(dict(label='Actual return advances one lesson',source='final-play/full-play.mp4',start=t-.8,end=t+2.4))
t=([e for e in data['events'] if e['kind']=='point'][-1]['perf']-data['capture']['videoStartPerf'])/1000
segments.append(dict(label='Winning point: results next',source='final-play/full-play.mp4',start=t-.4,end=t+2))
for i,s in enumerate(segments):
    target=out/f'clip-{i+1}.mp4';s['file']=target.name
    label_file=out/f'label-{i+1}.txt';label_file.write_text(s['label'])
    overlay=f"drawtext=fontfile={font_path}:textfile={label_file}:fontsize=12:fontcolor=white:box=1:boxcolor=black@0.7:x=10:y=h-40,drawtext=fontfile={font_path}:text='1x software capture - hardware feel and listening unverified':fontsize=10:fontcolor=white:box=1:boxcolor=black@0.7:x=10:y=h-23"
    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(s['start']),'-i',str(base/s['source']),'-t',str(s['end']-s['start']),'-vf',overlay,'-c:v','libx264','-preset','veryfast','-crf','22','-threads','1','-c:a','aac','-b:a','96k',str(target)],check=True)
concat=out/'clips.ffconcat';concat.write_text('\n'.join(f"file '{s['file']}'" for s in segments)+'\n')
video=out/'01-benchmark-review.mp4'
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(video)],check=True)
(out/'edit.json').write_text(json.dumps(dict(method='Five hard-cut real browser excerpts at captured wall-clock1x, actual destination WebAudio with one media-origin calibration. Software frames held, no synthesized pose/interpolation. Not normal-speed real-device, physical latency or listening proof.',segments=segments,sha256=hashlib.sha256(video.read_bytes()).hexdigest()),indent=2)+'\n')
summary={'runtimeCommit':subprocess.check_output(['git','rev-parse','dd0571b'],cwd=base.parents[3],text=True).strip(),'runtimeBundleSha256':hashes.pop(),'automatedGates':{'unitTests':67,'unitFiles':11,'browserReports':len(reports),'allPass':True,'reports':{k:{'file':paths[k],'errors':r['errors'],'pass':r['pass']} for k,r in reports.items()}},'experience':{'reviewedSubtotals':[33,35,37],'reviewedWeight':55,'unverifiedWeight':45,'overallScore':None,'target98Achieved':False},'limits':scores[-1]['limits']}


# Summaries below remain technical evidence, not experience grades.
rally=next(json.loads(x.split('COURT FRAMING PASS ',1)[1]) for x in reports['rally']['logs'] if x.startswith('COURT FRAMING PASS '))
layouts=[]
for row in rally['results']:
    f=row['framing'];assert row['returns']>=6 and not f['clippedPlayers'] and not f['clippedShuttle']
    layouts.append(dict(view=row['viewport'],returns=row['returns'],clippedPlayers=f['clippedPlayers'],clippedShuttle=f['clippedShuttle'],maxAimErrorPx=max(a['pixelError'] for a in f['aim']),apexM=f['maxHeight']))
pressure=next(json.loads(x.split('EXPERIENCE PRESSURE PASS ',1)[1]) for x in reports['pressure']['logs'] if x.startswith('EXPERIENCE PRESSURE PASS '))
defence=next(json.loads(x.split('SMASH DROP REGRESSION PASS ',1)[1]) for x in reports['defence']['logs'] if x.startswith('SMASH DROP REGRESSION PASS '))
assert pressure['returned']>0 and pressure['goodPerfectWinners']>0 and defence['physicalAiReturns']>=6 and defence['directWinners']==0
hits=data['match']['shots'];attacks=[dict(shot=h['shot'],speedMps=math.hypot(*h['velocity'].values()),contactY=h['p']['y']) for h in hits if h['actor']==0 and h['shot'] in ['smash','superSmash']]
summary['automatedGates'].update(layouts=layouts,pressure=pressure,defence=defence)
summary['actualUiMatch']=dict(score=data['match']['scores'],contacts=len(hits),renderedContactSamples=len(data['renderedContacts']),maxReturns=data['maxReturns'],attacks=attacks,lessonState=data['match']['lessons'],hitSoundEvents=data['match']['audioEvents'],pointSoundEvents=data['match']['pointAudioEvents'],mutedHitEvents=data['muted']['audioEvents'],mutedPointEvents=data['muted']['pointAudioEvents'],maxRenderedContactErrorM=max(x['centreErrorM'] for x in data['renderedContacts']),limits='Actual software UI trajectory/event data, not human feel, listening, hardware latency or win-rate evidence.')
summary['automatedGates']['fullBuild']={'pass':True,'file':'root-build-final.txt','projectStage':'build-final.txt'}
summary['experience'].update(dotAccessVerified=False,actualListeningPerformed=False,referenceVideoViewed=False)
summary['goalStatus']='incomplete: dot access, real listening, hardware response/reference viewing and human experience evidence remain open'
summary['qaRetry']=dict(original='attempts/final-play-serve-assumption/benchmark-experience-report.json',notes='attempts/serve-expectation-notes.txt',result='final-play-retry.txt',runtimeChanged=False)
(base/'qualification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
root_log=(base/'root-build-final.txt').read_text();start=root_log.index('> smash-rally-3d@');end=root_log.index('Copied smash-rally-3d build',start);end=root_log.find('\n',end)
(base/'build-final.txt').write_text('Extracted from successful full root-build-final.txt\n'+root_log[start:end]+'\n')

print(json.dumps({'reviewedSubtotals':[33,35,37],'reviewedWeight':55,'unverifiedWeight':45,'overallScore':None,'browserReports':len(reports)}))
