"""New, per-video numerical QA; no prior pilot metrics are reused."""
from pathlib import Path
import subprocess,json,io,math,hashlib
import numpy as np
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parents[1];Q=P/'qa';F=P/'renders/DRAGONBLOOD-30s.mp4'
def run(args):return subprocess.check_output(args)
probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(F)]));(Q/'ffprobe.json').write_text(json.dumps(probe,indent=2));v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio')
checks={'dimensions':(v['width'],v['height'])==(1080,1920),'fps':v['r_frame_rate']=='30/1','frames':int(v['nb_frames'])==900,'duration':abs(float(probe['format']['duration'])-30)<.001,'video_codec':v['codec_name']=='h264','pixel_format':v['pix_fmt']=='yuv420p','audio_codec':a['codec_name']=='aac','audio_stereo':a['channels']==2}
times=[.7,1.7,4.8,6.6,9.5,12.5,15,17.4,20.6,21.4,23.4,24.6,28.2,29.1];imgs=[]
for i,t in enumerate(times):
 data=run(['ffmpeg','-v','error','-ss',str(t),'-i',str(F),'-frames:v','1','-f','image2pipe','-vcodec','png','-threads','1','-']);im=Image.open(io.BytesIO(data)).convert('RGB');im.save(Q/f'decoded-{i:02d}-at-{t}s.png');imgs.append(np.array(im,dtype=np.int16))
Image.fromarray(imgs[0].astype(np.uint8)).save(P/'renders/poster.png')
sheet=Image.new('RGB',(4*270,4*505),(10,15,26));d=ImageDraw.Draw(sheet)
for i,im in enumerate(imgs):
 x=i%4*270;y=i//4*505;sheet.paste(Image.fromarray(im.astype(np.uint8)).resize((270,480)),(x,y+25));d.text((x+5,y+6),f'{times[i]:.1f}s',fill='white')
sheet.save(Q/'decoded-contact-sheet.jpg')
# Measure only main game screen pixels, excluding all typography/inset motion.
box=(slice(639,1215),slice(28,1052));pairs=[(0,1),(2,3),(8,9),(10,11),(12,13)];deltas=[{'from':times[i],'to':times[j],'mean_absolute_delta':float(np.abs(imgs[i][box]-imgs[j][box]).mean())} for i,j in pairs]
checks['actual_gameplay_motion']=all(x['mean_absolute_delta']>.3 for x in deltas)
checks['gameplay_visible']=all(float(im[box].std())>15 for im in imgs)
raw=run(['ffmpeg','-v','error','-i',str(F),'-map','0:a:0','-f','f32le','-acodec','pcm_f32le','-']);samples=np.frombuffer(raw,dtype='<f4');peak=float(np.abs(samples).max());rms=float(np.sqrt(np.mean(samples*samples)));checks['audio_no_clipping']=peak<.99;checks['audio_present']=rms>.005
prior=P.parent/'OpenMontagePilot/renders/final.mp4';prior_sha=hashlib.sha256(prior.read_bytes()).hexdigest();checks['previous_15s_preserved']=prior_sha=='15456583ba806c5fbb41a8b6ac75006169e34f4f8aab502c7dcb6ec8b4656ad5'
report={'checks':checks,'pass':all(checks.values()),'main_game_region':[28,639,1024,576],'gameplay_motion_pairs':deltas,'decoded_audio_peak_dbfs':20*math.log10(peak),'decoded_audio_rms_dbfs':20*math.log10(rms),'clipped_samples':int((np.abs(samples)>=1).sum()),'audio_listening':'not performed; numerical checks only','prior_15s_sha256':prior_sha,'final_sha256':hashlib.sha256(F.read_bytes()).hexdigest(),'frame_sample_times':times,'note':'These measured deltas exclude titles/GSAP overlays. Actual visual inspection and playback are separate. HyperFrames motion disabled/samples0 must not be treated as a motion pass.'}
(Q/'metrics.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
if not report['pass']:raise SystemExit(1)
