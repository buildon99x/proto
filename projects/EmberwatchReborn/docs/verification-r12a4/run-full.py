from pathlib import Path
import hashlib,json,subprocess,datetime,time,sys
root=Path(__file__).resolve().parents[2]; app=root/'app';out=Path(__file__).resolve().parent
prefix=(sys.argv[1]+'-') if len(sys.argv)>1 else ''
paths=sorted([p for folder in ('src','tests','scripts') for p in (app/folder).rglob('*') if p.is_file()]+[app/'package.json',root/'project.json'])
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();frozen={str(p.relative_to(root)):h(p)for p in paths};(out/(prefix+'frozen-files.json')).write_text(json.dumps(frozen,indent=2));start=time.monotonic()
with (out/(prefix+'full.tap')).open('w')as log:
 result=subprocess.run(['node','--test','--test-reporter=tap','--test-concurrency=2',*map(str,sorted((app/'tests').glob('*.test.mjs')))],cwd=app,stdout=log,stderr=subprocess.STDOUT)
changed=[p for p,v in frozen.items()if h(root/p)!=v]
status={'exit_code':result.returncode,'frozen_files':len(frozen),'frozen_changed':changed,'wallSeconds':round(time.monotonic()-start,3),'finishedUtc':datetime.datetime.now(datetime.timezone.utc).isoformat()};(out/(prefix+'full-status.json')).write_text(json.dumps(status,indent=2));print(json.dumps(status));print('\n'.join((out/(prefix+'full.tap')).read_text().splitlines()[-12:]));raise SystemExit(result.returncode or bool(changed))
