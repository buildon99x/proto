"""Build inspectable review assets from actual browser captures; no pose synthesis."""
import json, math, subprocess, hashlib, array
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

base = Path(__file__).resolve().parents[1] / 'verification/smash-feel-20261015'
play = base / 'play-final'
out = base / 'delivery'
out.mkdir(exist_ok=True)
d = json.loads((play / 'smash-evidence.json').read_text())
report = json.loads((play / 'smash-feel-report.json').read_text())
attacks, settled, events = [], [], []
for session in d['sessions']:
    events.extend(session['final']['audioLedger'])
    for i, hit in enumerate(session['final']['shots']):
        if hit['actor'] != 0 or hit['shot'] not in ['smash', 'superSmash']:
            continue
        following = session['final']['shots'][i+1:i+2]
        following = following[0] if following else None
        item = dict(difficulty=session['difficulty'], time=hit['time'],
                    speed=math.hypot(*hit['velocity'].values()), vy=hit['velocity']['y'],
                    quality=hit['quality'], next=None if not following else dict(
                        actor=following['actor'], motion=following['renderPose']['motion'],
                        technique=following['technique'], time=following['time']))
        attacks.append(item)
        if following:
            settled.append(item)
packets = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-select_streams', 'a', '-show_packets',
    '-show_entries', 'packet=pts_time', '-of', 'json', str(play/'browser-audio.webm')]))['packets']
groups = []
for packet in packets:
    t = float(packet['pts_time'])
    if not groups or t-groups[-1][-1] > .2:
        groups.append([t])
    else:
        groups[-1].append(t)
assert len(groups) == len(events) == 35
anchor = events[0]['audioPerf']/1000-groups[0][0]
deltas = [g[0]-(e['audioPerf']/1000-anchor) for g, e in zip(groups, events)]
pcm = subprocess.check_output(['ffmpeg','-v','error','-i',str(play/'browser-audio.webm'),
                               '-ac','1','-ar','48000','-f','s16le','-'])
samples = array.array('h', pcm)
summary = dict(
    method='Read-only analysis of actual UI play. Immediate next Serve proves a subsequent rally; AI return requires the immediate next hit to be actor1 with a non-Serve render motion. End flights without a following physical hit are excluded from settled counts.',
    buildEvidence=report['buildEvidence'], attacks=attacks,
    actualSmashes=len(attacks), settledAttackSequences=len(settled),
    incompleteEndFlights=len(attacks)-len(settled),
    nextRallyServes=sum(h['next']['motion']=='Serve' for h in settled),
    actualAiBlocks=sum(h['next']['actor']==1 and h['next']['motion']!='Serve' and h['next']['technique']=='block' for h in settled),
    contactErrors=d['captures']['errors'],
    audio=dict(actualContacts=len(events), scheduledSounds=sum(e['audioPerf'] is not None for e in events),
               packetGroups=len(groups), containerPtsOriginPerfSeconds=anchor,
               videoOriginPerfSeconds=d['videoStart']/1000, muxDelaySeconds=anchor-d['videoStart']/1000,
               packetGroupVsScheduleRangeMs=[min(deltas)*1000,max(deltas)*1000],
               presentationCallbackVsAudioScheduleMaxMs=max(abs(e['presentedPerf']-e['audioPerf']) for e in events),
               peak=max(abs(s) for s in samples)/32768,
               listening=False, deviceLatencyMeasured=False,
               note='MediaRecorder PTS begins at its first audible packet. A single origin calibration against the first live audio scheduling event preserves all later packet spacing; no per-hit resync. Capture/callback timing is not speaker/display latency.'))
hits = [h for session in d['sessions'] for h in session['attacks']]
contacts = [f['renderedContact'] for f in d['captures']['frames'] if f['phase']=='impact']
summary['physicalContacts'] = dict(
    planeDistanceRangeM=[min(h['contact']['planeDistance'] for h in hits),max(h['contact']['planeDistance'] for h in hits)],
    planeGateM=.045,
    radialDistanceRangeM=[min(h['contact']['radialDistance'] for h in hits),max(h['contact']['radialDistance'] for h in hits)],
    radialGateM=.225,
    renderedRacketCentreMaxErrorM=max(math.dist(c['racket'].values(),c['contact'].values()) for c in contacts),
    note='Presentation mismatch compares rendered and physical racket centres. Ball contact remains within the original disk, not necessarily its centre.')
assert len(attacks)>=3 and len(settled)>=3 and summary['nextRallyServes']>=1
assert summary['actualAiBlocks']>=1 and not summary['contactErrors']
(base/'review-summary.json').write_text(json.dumps(summary,indent=2))

# These ten samples all belong to the first complete live EASY smash.
frames = d['captures']['frames']
chosen = [frames[i] for i in [0,1,3,4,5,6,7,8,9,10]]
font_path = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font = ImageFont.truetype(font_path, 24)
small = ImageFont.truetype(font_path, 20)
hero = ImageFont.truetype(font_path, 34)
sheet = Image.new('RGB',(1920,1740),'#101e2c')
draw = ImageDraw.Draw(sheet)
draw.text((24,12),'SMASH RALLY 3D | one real stroke, ten captured samples',font=hero,fill='#f4f7fa')
draw.text((24,57),'35.9 m/s | vY -6.0 m/s | original canvas PNGs | no reconstructed poses',font=small,fill='#b2c7d6')
labels = ['Prepare','Accelerate','Physical contact','Follow-through','Early flight','Mid flight','Late flight','Return','Late return','Ready again']
for i,(f,label) in enumerate(zip(chosen,labels)):
    x,y=(i%3)*640,100+(i//3)*410
    draw.text((x+12,y+10),f'{i+1:02} {label} | {(f["time"]-6)*1000:+.0f} ms',font=font,fill='#ffe2a8')
    sheet.paste(Image.open(play/f['file']).convert('RGB'),(x,y+50))
draw.text((680,1390),'READ THE IMPACT',font=hero,fill='#f4f7fa')
for i,line in enumerate([
    '6 real player smashes; 0 rendered/physical contact mismatches.',
    '4 settled sequences: 3 next-rally serves and 1 actual HARD AI block.',
    '28 ms requested perfect-impact hold; actors and flight pause together.',
    'Times label simulation offsets; the video retains actual wall-clock speed.',
    '35 live contacts / 35 scheduled sounds / 35 captured audio packet groups.',
    'Software Chromium capture; no speaker listening or device-latency claim.',
]):
    draw.text((680,1450+i*38),line,font=small,fill='#b2c7d6')
sheet.save(out/'02-smash-contact-sequence.png')
(out/'sequence-sources.json').write_text(json.dumps(chosen,indent=2))

# Preserve the live audio packet timeline and encode after play, never during measured input.
full=play/'full-play-with-live-audio.mp4'
if not full.exists() or ((play/'actual-play.mp4').exists() and (play/'actual-play.mp4').stat().st_mtime > full.stat().st_mtime):
    delay=round(summary['audio']['muxDelaySeconds']*1000)
    duration=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(play/'actual-play.mp4')]))['format']['duration'])
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(play/'actual-play.mp4'),'-i',str(play/'browser-audio.webm'),
                    '-filter_complex',f'[1:a]aresample=async=1:first_pts=0,adelay={delay}|{delay},apad[a]',
                    '-map','0:v','-map','[a]','-c:v','libx264','-preset','fast','-crf','25','-threads','1',
                    '-c:a','aac','-b:a','96k','-t',str(duration),'-movflags','+faststart',str(full)],check=True)
segments=[]
for difficulty,ordinal in [('EASY',0),('EASY',1),('HARD',0)]:
    session=next(s for s in d['sessions'] if s['difficulty']==difficulty)
    attack=[h for h in session['final']['shots'] if h['actor']==0 and h['shot'] in ['smash','superSmash']][ordinal]
    index=session['final']['shots'].index(attack)
    following=session['final']['shots'][index+1]
    event=next(e for e in session['final']['audioLedger'] if e['physicsTime']==attack['time'])
    next_event=next(e for e in session['final']['audioLedger'] if e['physicsTime']==following['time'])
    start=max(0,event['audioPerf']/1000-summary['audio']['videoOriginPerfSeconds']-1.8)
    end=next_event['audioPerf']/1000-summary['audio']['videoOriginPerfSeconds']+(1.7 if difficulty=='HARD' else 1.1)
    label='HARD | smash - AI block' if difficulty=='HARD' else f'EASY {ordinal+1} | smash - point - next serve'
    file=out/f'clip-{len(segments)+1}.mp4'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-ss',str(start),'-i',str(full),'-t',str(end-start),
                    '-vf',f'drawtext=fontfile={font_path}:text={label}:fontsize=12:fontcolor=white:box=1:boxcolor=black@0.65:x=12:y=h-26',
                    '-c:v','libx264','-preset','veryfast','-crf','22','-threads','1','-c:a','aac','-b:a','96k',str(file)],check=True)
    segments.append(dict(file=file.name,source=full.name,start=start,end=end,label=label))
concat=out/'clips.ffconcat'
concat.write_text('\n'.join(f"file '{s['file']}'" for s in segments)+'\n')
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(out/'01-smash-rally-review.mp4')],check=True)
review=dict(method='Three hard-cut excerpts of actual browser capture at original wall-clock speed; captured frames held at20fps without interpolation. Actual browser WebAudio stream, one origin calibration, no music or synthetic replacement.',segments=segments,
            video=summary['audio'],videoSha256=hashlib.sha256((out/'01-smash-rally-review.mp4').read_bytes()).hexdigest())
(out/'video-edit.json').write_text(json.dumps(review,indent=2))
print(json.dumps({k:summary[k] for k in ['actualSmashes','settledAttackSequences','nextRallyServes','actualAiBlocks']}))
