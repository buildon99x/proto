from pathlib import Path
import subprocess,json,math
import numpy as np
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parents[1];Q=P/'qa';Q.mkdir(exist_ok=True);F=P/'renders/final.mp4'
def run(args):return subprocess.check_output(args)
probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(F)]));(Q/'ffprobe.json').write_text(json.dumps(probe,indent=2))
v=next(x for x in probe['streams'] if x['codec_type']=='video');a=next(x for x in probe['streams'] if x['codec_type']=='audio')
checks={'dimensions':(v['width'],v['height'])==(1080,1920),'fps':v['r_frame_rate']=='30/1','frames':int(v['nb_frames'])==450,'duration':abs(float(probe['format']['duration'])-15)<.001,'video_codec':v['codec_name']=='h264','pixel_format':v['pix_fmt']=='yuv420p','audio_codec':a['codec_name']=='aac','audio_channels':a['channels']==2}
frames=[0,24,72,165,201,243,360,449];imgs=[]
for frame in frames:
 raw=run(['ffmpeg','-v','error','-i',str(F),'-vf',rf'select=eq(n\,{frame})','-frames:v','1','-f','image2pipe','-vcodec','png','-threads','1','-'])
 import io
 im=Image.open(io.BytesIO(raw)).convert('RGB');im.save(Q/f'frame-{frame:03d}.png');imgs.append(np.array(im,dtype=np.int16))
Image.fromarray(imgs[5].astype(np.uint8)).save(P/'renders/poster.png')
sheet=Image.new('RGB',(360*4,640*2+60),(28,23,40));draw=ImageDraw.Draw(sheet)
for i,im in enumerate(imgs):
 x=(i%4)*360;y=(i//4)*670;sheet.paste(Image.fromarray(im.astype(np.uint8)).resize((360,640)),(x,y+30));draw.text((x+8,y+8),f'frame {frames[i]} | {frames[i]/30:.3f}s',fill='white')
sheet.save(Q/'decoded-contact-sheet.jpg')
# Character-region motion, excluding headline/clock/button changes.
box=(slice(760,1390),slice(100,920))
deltas=[float(np.abs(x[box]-y[box]).mean()) for x,y in zip(imgs,imgs[1:])]
loop=float(np.abs(imgs[0]-imgs[-1]).mean())
checks['character_motion']=max(deltas)>3;checks['loop']=loop<1
raw=run(['ffmpeg','-v','error','-i',str(F),'-map','0:a:0','-f','f32le','-acodec','pcm_f32le','-'])
samples=np.frombuffer(raw,dtype='<f4');peak=float(np.abs(samples).max());rms=float(np.sqrt(np.mean(samples**2)));checks['no_clipping']=peak<.99
checks['audio_present']=rms>.005
report={'checks':checks,'pass':all(checks.values()),'video_seconds':float(v['duration']),'container_seconds':float(probe['format']['duration']),'decoded_audio_peak_dbfs':20*math.log10(peak),'decoded_audio_rms_dbfs':20*math.log10(rms),'clipped_samples':int((np.abs(samples)>=1).sum()),'character_region_mean_absolute_deltas':deltas,'first_last_frame_mean_absolute_delta':loop,'audio_listening':'Not performed. Numerical waveform/decoded checks only; no claim of human auditory review.'}
(Q/'metrics.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if not report['pass']:raise SystemExit(1)
