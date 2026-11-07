"""Validate physical return, speed and observation evidence from ordinary UI logs."""
from pathlib import Path
import json,math
root=Path(__file__).resolve().parents[1]/'verification/reference-swing-20261015'
rows=[]
for line in (root/'drop-defence/run.txt').read_text().splitlines():
 if not line.startswith('DROP MATCH '):continue
 m=json.loads(line[11:]);speed=0;delays=[];confirmed=unresolved=faults=0
 score_events=[{'time':b['time'],'winner':0 if b['scores'][0]>a['scores'][0] else 1}
  for a,b in zip(m['trace'],m['trace'][1:]) if b['scores']!=a['scores']]
 for a,b in zip(m['trace'],m['trace'][1:]):
  dt=b['time']-a['time']
  if a['phase']==b['phase']=='RALLY' and 0<dt<0.12:
   for p,q in zip(a['actors'],b['actors']):speed=max(speed,math.hypot(q['x']-p['x'],q['z']-p['z'])/dt)
 for attempt in m['attempts']:
  if attempt['firstObservation']:delays.append(attempt['firstObservation']['time']-attempt['hit']['time'])
  if not attempt['returned']:continue
  time=attempt['reply']['time']
  shots=[h for h in m['shots'] if h['time']>time+1e-6]
  points=[p for p in score_events if p['time']>time+1e-6]
  if shots and (not points or shots[0]['time']<points[0]['time']):confirmed+=1
  elif points:
   if points[0]['winner']==1:confirmed+=1
   else:faults+=1
  else:unresolved+=1
 row={'difficulty':m['difficulty'],'pattern':m['pattern'],'physicalAiContacts':m['metrics']['returned'],
  'confirmedSuccessfulReplies':confirmed,'unresolvedReplies':unresolved,'replyFaults':faults,
  'directSoftWinners':m['metrics']['directWinners'],'maximumObservedSpeed':speed,
  'minimumObservationDelay':min(delays) if delays else None}
 assert speed<=5.80001,row
 assert min(delays)>={'EASY':.5,'NORMAL':.3,'HARD':.18}[m['difficulty']]-.01,row
 assert row['physicalAiContacts']>=3 and not faults and not row['directSoftWinners'],row
 rows.append(row)
assert len(rows)==9,len(rows)
result={'pass':True,'windows':rows,'totals':{k:sum(r[k] for r in rows) for k in ['physicalAiContacts','confirmedSuccessfulReplies','unresolvedReplies','replyFaults','directSoftWinners']}}
(root/'drop-defence/physical-analysis.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
