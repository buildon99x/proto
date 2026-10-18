"""Launch the unmodified game's existing cockpit in isolated XDG save paths."""
import os,subprocess,time,json
from pathlib import Path
P=Path(__file__).resolve().parents[1];CB=Path(os.environ.get('CB_SOURCE','/workspace/cb-ll-video-source'))
(P/'capture-session').mkdir(exist_ok=True)
for n in ['cmd.json','done.json']:(P/'capture-session'/n).unlink(missing_ok=True)
for n in ['data','config','cache','state']:(P/'capture-userdata'/n).mkdir(parents=True,exist_ok=True)
env=dict(os.environ,DISPLAY=os.environ.get('DISPLAY',':99'),COCKPIT_DIR=str(P/'capture-session'),XDG_DATA_HOME=str(P/'capture-userdata/data'),XDG_CONFIG_HOME=str(P/'capture-userdata/config'),XDG_CACHE_HOME=str(P/'capture-userdata/cache'),XDG_STATE_HOME=str(P/'capture-userdata/state'))
cmd=['godot','--path',str(CB/'godot'),'--resolution','1280x720','--position','0,0','--rendering-method','gl_compatibility','--audio-driver','Dummy','--script','res://tests/cockpit.gd','--log-file',str(P/'qa/gameplay-godot.txt')]
log=(P/'qa/gameplay-process.txt').open('w');proc=subprocess.Popen(cmd,env=env,stdout=log,stderr=log,start_new_session=True)
(P/'artifacts/capture-process.json').write_text(json.dumps({'pid':proc.pid,'command':cmd,'XDG_isolation':{k:v for k,v in env.items() if k.startswith('XDG_')},'original_HOME_untouched':True},indent=2));print(proc.pid)
