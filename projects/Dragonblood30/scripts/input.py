"""Send existing cockpit's real input commands, retaining command receipts/timing."""
import json,os,sys,time
from pathlib import Path
P=Path(__file__).resolve().parents[1]
CB=Path(os.environ.get('CB_SOURCE','/workspace/cb-ll-video-source'))
sys.path.insert(0,str(CB/'tools'))
from cockpit import send
D=P/'capture-session';D.mkdir(exist_ok=True)
cmd=json.loads(sys.argv[1]);at=time.time()
r=send(str(D),cmd,timeout=60)
with Path(os.environ.get('INPUT_LOG_PATH',str(P/'artifacts/input-events.jsonl'))).open('a') as f:f.write(json.dumps({'wall_time':at,'command':cmd,'receipt':r},ensure_ascii=False)+'\n')
print(json.dumps(r,ensure_ascii=False))
if not r.get('ok',False):raise SystemExit(1)
