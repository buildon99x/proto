from pathlib import Path
import json,subprocess,hashlib
P=Path(__file__).resolve().parents[1]; v=P/'renders/BoundaryShort50-preview-narration-pending.mp4'; beats=json.loads((P/'artifacts/script.json').read_text())['beats']
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_format','-show_streams','-of','json',str(v)])); (P/'qa/ffprobe.json').write_text(json.dumps(probe,indent=2))
from PIL import Image,ImageDraw,ImageChops,ImageStat
frames=P/'qa/frames';frames.mkdir(exist_ok=True)
metrics=[];sheet=Image.new('RGB',(1350,1920),'#19232b');d=ImageDraw.Draw(sheet)
for i,b in enumerate(beats):
 t=(b['start']+b['end'])/2
 imgs=[]
 for label,at in [('mid',t),('early',b['start']+.1),('late',b['start']+min(1.3,(b['end']-b['start'])-.2))]:
  out=frames/f'{i+1:02}-{label}.png';subprocess.run(['ffmpeg','-v','error','-ss',str(at),'-i',str(v),'-frames:v','1','-y',str(out)],check=True)
  imgs.append(Image.open(out).convert('RGB'))
 tile=imgs[0].resize((270,480));sheet.paste(tile,((i%5)*270,(i//5)*640+25));d.text(((i%5)*270+8,(i//5)*640+8),f'{i+1:02}  {t:.1f}s',fill='white')
 # Restrict to illustration area, excluding caption/footer and transition fade.
 a=imgs[1].crop((40,450,1040,1440));bb=imgs[2].crop((40,450,1040,1440));diff=ImageChops.difference(a,bb)
 mean=sum(ImageStat.Stat(diff).mean)/3
 changed=sum(1 for px in diff.getdata() if max(px)>15)/(a.width*a.height)
 metrics.append({'beat':i+1,'sample_times':[b['start']+.1,b['start']+min(1.3,b['end']-b['start']-.2)],'illustration_rgb_mean_absolute_difference':round(mean,3),'pixels_changed_over_15':round(changed,5)})
sheet.save(P/'qa/contact-sheet.jpg',quality=90)
s=next(s for s in probe['streams'] if s['codec_type']=='video')
report={'video':{'width':s['width'],'height':s['height'],'fps':s['r_frame_rate'],'frames':s['nb_read_frames'],'duration':probe['format']['duration'],'codec':s['codec_name'],'pixel_format':s['pix_fmt']},'spec_pass':s['width']==1080 and s['height']==1920 and s['r_frame_rate']=='30/1' and int(s['nb_read_frames'])==1500 and float(probe['format']['duration'])==50,'motion_samples':metrics,'motion_method':'Actual decoded illustration crops at two timestamps per beat; demonstrates pixel change, not semantic acting quality. Visual review separately required. HyperFrames motion_detected is not used.','audio':{'stream_present':any(x['codec_type']=='audio' for x in probe['streams']),'status':'BLOCKED: no narration, preview only','clipping_check':'not applicable: no audio stream','actual_listening':'not performed: no narration exists'},'sha256':hashlib.sha256(v.read_bytes()).hexdigest(),'is_final_delivery':False}
(P/'qa/verification.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
def stamp(t):return f'{t//3600:02}:{t//60%60:02}:{t%60:02},000'
(P/'artifacts/captions.srt').write_text('\n\n'.join(f"{i+1}\n{stamp(b['start'])} --> {stamp(b['end'])}\n{b['narration']}" for i,b in enumerate(beats))+'\n')
