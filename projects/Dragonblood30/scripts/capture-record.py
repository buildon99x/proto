"""Record the real Xorg game window. Stop with Ctrl-C; never changes game source."""
import subprocess,json,time,os,signal
from pathlib import Path
P=Path(__file__).resolve().parents[1]
cmd=['ffmpeg','-hide_banner','-y','-f','x11grab','-framerate','30','-video_size','1280x720','-draw_mouse','0','-i',os.environ.get('DISPLAY',':99')+'.0+0,0','-an','-c:v','libx264','-preset','ultrafast','-crf','18','-pix_fmt','yuv420p',str(P/'assets/gameplay/raw-session.mp4')]
(P/'artifacts/capture-record-command.json').write_text(json.dumps({'command':cmd,'wall_time':time.time()},indent=2))
with (P/'qa/capture-ffmpeg.txt').open('w') as log:
 proc=subprocess.Popen(cmd,stdout=log,stderr=log)
 try:proc.wait()
 except KeyboardInterrupt:proc.send_signal(signal.SIGINT);proc.wait()
