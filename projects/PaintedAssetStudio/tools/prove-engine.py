#!/usr/bin/env python3
"""Exercise original upstream five tool equivalents in an isolated live studio."""
import json, os, subprocess, sys
from pathlib import Path
engine=Path(sys.argv[1]).resolve(); root=Path(sys.argv[2]).resolve();root.mkdir(parents=True,exist_ok=False)
env={**os.environ,'EASEL_ROOT':str(root),'RAYON_NUM_THREADS':'2'}
commands=[['open','sketch-proof'], ['do','canvas{size=300,aspect=1.5,seed=99,linen=18,ground={{pile={{"lead white",4},{"raw umber",1}},um=100,apply="knife"}}}'], ['do','p=pile{{"yellow ochre",2},{"lead white",1}}; work(ellipse(500,333,120,120),{pile=p,hand="broad",coverage=2,clip=true})'], ['look','--size','600'], ['note','Original live-engine proof: an ochre disk, not reused artwork.'], ['status'], ['log'], ['save',str(root/'proof.png')], ['close']]
receipts=[]
try:
 for args in commands:
  r=subprocess.run([str(engine),*args],env=env,capture_output=True,text=True,timeout=120)
  receipts.append(dict(argv=[str(engine),*args],exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
  (root/'commands.json').write_text(json.dumps(receipts,indent=2))
  if r.returncode:raise RuntimeError(r.stderr)
finally:
 subprocess.run([str(engine),'close'],env=env,capture_output=True,text=True,timeout=120)
print(root/'commands.json')
