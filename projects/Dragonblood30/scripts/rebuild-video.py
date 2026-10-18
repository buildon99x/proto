"""Reassemble committed selected source clips without the local raw capture."""
import subprocess,json
from pathlib import Path
P=Path(__file__).resolve().parents[1];edit=json.loads((P/'artifacts/edit_decisions.json').read_text());lst=P/'artifacts/concat-clips.txt'
lst.write_text(''.join(f"file '{(P/c['selected_clip']).as_posix()}'\n" for c in edit['cuts']))
subprocess.run(['ffmpeg','-hide_banner','-y','-f','concat','-safe','0','-i',str(lst),'-c','copy','-movflags','+faststart',str(P/'hyperframes/assets/gameplay.mp4')],check=True)
