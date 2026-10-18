"""Replay recorded real UI inputs through the existing main-scene cockpit.

Run start-capture.py first in an isolated new capture-userdata directory.
This replays input paths, not a timing-perfect deterministic native render.
The committed selected clips are the pixel-authoritative edit inputs.
"""
import json,subprocess,sys
from pathlib import Path
P=Path(__file__).resolve().parents[1]
events=[json.loads(x) for x in (P/'artifacts/input-events.jsonl').read_text().splitlines()]
for e in events:
 if e['command'].get('op')=='quit':continue
 subprocess.run([sys.executable,str(P/'scripts/input.py'),json.dumps(e['command'],ensure_ascii=False)],check=True)
