"""Select real capture ranges; preserve complete landscape viewport (no crop)."""
import json,subprocess,re,hashlib,shutil
from pathlib import Path
P=Path(__file__).resolve().parents[1];raw=P/'assets/gameplay/raw-session.mp4'
# Editorially selected from the recorded, real main-scene cockpit inputs.
parts=[('hook',292.0,3),('card-target',155.6,5),('pyrren',55.2,3),('volgrim',39.9,3),('map',131.4,2),('reward',116.0,3),('guard-buff',184.6,3),('buffed-attack',196.6,4),('cta-combat',244.5,4)]
clips=[];at=0
for name,start,duration in parts:
 out=P/'assets/gameplay'/f'{name}.mp4'
 cmd=['ffmpeg','-hide_banner','-y','-ss',str(start),'-i',str(raw),'-t',str(duration),'-an','-vf','fps=30','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-g','30','-keyint_min','30','-sc_threshold','0','-movflags','+faststart',str(out)]
 with (P/'qa'/f'trim-{name}.txt').open('w') as log:subprocess.run(cmd,stdout=log,stderr=log,check=True)
 clips.append({'id':name,'timeline_start':at,'duration_seconds':duration,'source_in_seconds':start,'source':'assets/gameplay/raw-session.mp4','selected_clip':str(out.relative_to(P)),'speed':1,'full_viewport':True});at+=duration
assert at==30
lst=P/'artifacts/concat-clips.txt';lst.write_text(''.join(f"file '{(P/c['selected_clip']).as_posix()}'\n" for c in clips))
subprocess.run(['ffmpeg','-hide_banner','-y','-f','concat','-safe','0','-i',str(lst),'-c','copy','-movflags','+faststart',str(P/'hyperframes/assets/gameplay.mp4')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
log=(P/'qa/capture-ffmpeg.txt').read_text();epoch=float(re.search(r'start: ([0-9.]+)',log).group(1))
(P/'artifacts/edit_decisions.json').write_text(json.dumps({'pipeline':'hybrid','render_runtime':'hyperframes','composition_mode':'atelier','duration_seconds':30,'cuts':clips,'source_capture_start_unix':epoch,'source_sha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'note':'Full raw capture retained locally and excluded from Git size; all selected source clips and input commands committed. No game viewport cropping or speed changes.'},ensure_ascii=False,indent=2))
# Keep actual UI screenshots as evidence and separately labeled detail crops.
from PIL import Image
source=P/'capture-session'
shots=['shot-010-combat-opening','shot-003-choose-house','shot-004-volgrim-house','shot-005-pyrren-house','shot-009-branch-map','shot-009-thunder-reward-selected','shot-011-static-claw-hover','shot-011-target-choice','shot-012-guard-buff-hover','shot-012-guard-buff-result','shot-013-buffed-attack-target','shot-013-buffed-attack-result','shot-017-enemy-defeated']
(P/'assets/screenshots').mkdir(exist_ok=True)
for name in shots:shutil.copy2(source/f'{name}.png',P/'assets/screenshots'/f'{name}.png')
crops={'card':('shot-011-target-choice',(830,457,999,719)),'guard':('shot-012-guard-buff-hover',(795,446,988,718)),'buff':('shot-012-guard-buff-result',(416,469,571,707)),'pyrren':('shot-005-pyrren-house',(730,126,1080,480)),'volgrim':('shot-004-volgrim-house',(251,100,642,474)),'map':('shot-009-branch-map',(339,351,877,686)),'reward':('shot-009-thunder-reward-selected',(580,259,1062,465)),'combat':('shot-017-enemy-defeated',(913,100,1240,446))}
manifest=[]
for name,(shot,box) in crops.items():
 im=Image.open(source/f'{shot}.png');im.crop(box).save(P/'hyperframes/assets'/f'detail-{name}.png');manifest.append({'id':name,'source_shot':f'capture-session/{shot}.png','crop':box,'purpose':'Labeled actual UI/art detail insert; full gameplay viewport remains visible above.'})
for name,shot,box in [('before','shot-010-combat-opening',(293,485,431,700)),('after','shot-012-guard-buff-result',(423,477,566,700))]:
 Image.open(source/f'{shot}.png').crop(box).save(P/'hyperframes/assets'/f'detail-{name}.png');manifest.append({'id':name,'source_shot':f'capture-session/{shot}.png','crop':box,'purpose':'Actual same-card display before/after captured buff'})
(P/'artifacts/detail-crops.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Prepared 9 real capture clips totaling exactly 30 seconds.')
