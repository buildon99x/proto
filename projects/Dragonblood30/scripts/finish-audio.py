"""Raise the original edit score by 6dB, keeping the rendered video bitstream intact."""
from pathlib import Path
import hashlib,json,subprocess,os
P=Path(__file__).resolve().parents[1];F=P/'renders/DRAGONBLOOD-30s.mp4';R=P/'artifacts/receipt_audio_finish.json'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def video_hash(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:v:0','-c','copy','-f','hash','-hash','sha256','-'],text=True).strip()
initial=sha(F)
if R.exists() and json.loads(R.read_text()).get('output_sha256')==initial:
 print('Audio finish already applied; unchanged.');raise SystemExit(0)
before=video_hash(F);out=P/'renders/.audio-finish.mp4';cmd=['ffmpeg','-hide_banner','-y','-i',str(F),'-c:v','copy','-af','volume=2','-c:a','aac','-b:a','192k','-t','30','-movflags','+faststart',str(out)]
with (P/'qa/audio-finish.txt').open('w') as log:subprocess.run(cmd,stdout=log,stderr=log,check=True)
after=video_hash(out);assert before==after,'Audio finishing must never change rendered video bitstream'
os.replace(out,F);R.write_text(json.dumps({'operation':'FFmpeg audio-only postprocess after OpenMontage HyperFrames render','command':cmd,'gain_db':6.020599913279624,'input_sha256':initial,'output_sha256':sha(F),'video_stream_hash_before':before,'video_stream_hash_after':after,'rendered_video_bitstream_preserved':True,'reason':'Measured original score was -27.1 LUFS-I / -10.9 dBTP; raise original edit-only score without clipping or rerendering visuals.'},ensure_ascii=False,indent=2));print('Audio finish complete; rendered video bitstream preserved.')
