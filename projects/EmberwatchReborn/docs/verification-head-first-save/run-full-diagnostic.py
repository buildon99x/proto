from pathlib import Path
import subprocess,json,time,datetime,resource,os
root=Path('/workspace/shared/emberwatch-head-first-save-patch');out=root/'docs/verification-head-first-save';start=time.monotonic()
probe=subprocess.run(['node','-p','JSON.stringify({version:process.version,availableParallelism:require("node:os").availableParallelism(),heapLimitBytes:require("node:v8").getHeapStatistics().heap_size_limit,constrainedMemoryBytes:process.constrainedMemory?.(),availableMemoryBytes:process.availableMemory?.()})'],cwd=root/'app',capture_output=True,text=True)
environment={'probeExit':probe.returncode,'node':json.loads(probe.stdout) if probe.returncode==0 else probe.stderr,'startedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceUnchanged':True,'testReporter':'tap','testConcurrency':'Node default, not overridden','samplingIntervalSeconds':.5,'resourceScope':'Read-only /proc RSS of the launched Node test process and its descendants; no heap dump or environment-secret logging.'}
for name in ['memory.max','memory.current','memory.events','cpu.max']:
 p=Path('/sys/fs/cgroup')/name;environment[name]=p.read_text() if p.is_file() else 'not exposed at conventional cgroup path'
(out/'full-diagnostic-environment.json').write_text(json.dumps(environment,indent=2)+'\n')
command=['node','--test','--test-reporter=tap']+[str(p.relative_to(root/'app')) for p in sorted((root/'app/tests').glob('*.test.mjs'))]
def sample(pid):
 rows={}
 try:entries=list(Path('/proc').iterdir())
 except OSError:return {'unavailable':True}
 for d in entries:
  if not d.name.isdigit():continue
  try:
   fields={line.split(':',1)[0]:line.split(':',1)[1].strip() for line in (d/'status').read_text().splitlines() if ':' in line};rows[int(d.name)]={'pid':int(d.name),'ppid':int(fields['PPid']),'rssKiB':int(fields.get('VmRSS','0 kB').split()[0])}
  except (OSError,KeyError,ValueError):pass
 owned={pid};changed=True
 while changed:
  added={i for i,r in rows.items() if r['ppid'] in owned}-owned;changed=bool(added);owned|=added
 members=[rows[i] for i in sorted(owned) if i in rows]
 return {'elapsedSeconds':time.monotonic()-start,'processCount':len(members),'totalRssKiB':sum(x['rssKiB'] for x in members),'processes':members}
with (out/'full-diagnostic.tap').open('w') as log,(out/'full-diagnostic-memory.jsonl').open('w') as metrics:
 p=subprocess.Popen(command,cwd=root/'app',stdout=log,stderr=subprocess.STDOUT);peak={'totalRssKiB':0};samples=0
 while p.poll() is None:
  row=sample(p.pid);metrics.write(json.dumps(row)+'\n');metrics.flush();samples+=1
  if row.get('totalRssKiB',0)>peak.get('totalRssKiB',0):peak=row
  time.sleep(.5)
 code=p.wait()
usage=resource.getrusage(resource.RUSAGE_CHILDREN);result={'exitCode':code,'completedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-start,'samples':samples,'sampledPeakNodeFamily':peak,'childUsage':{'userSeconds':usage.ru_utime,'systemSeconds':usage.ru_stime,'maxRssKiB':usage.ru_maxrss},'caveat':'Sampled RSS does not prove the cause of an earlier uninstrumented termination. No test timeout/concurrency/assertion/source was changed.'};(out/'full-diagnostic.exit').write_text(str(code)+'\n');(out/'full-diagnostic-result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));print('\n'.join((out/'full-diagnostic.tap').read_text().splitlines()[-18:]));raise SystemExit(0 if code==0 else 1)
