"""Render the authored source-led edit through the real OpenMontage tool registry."""
import os,sys,json,dataclasses,hashlib
from pathlib import Path
P=Path(__file__).resolve().parents[1];sys.path.insert(0,os.environ.get('OPENMONTAGE_ROOT','/workspace/OpenMontage-source'))
from tools.tool_registry import registry
registry.discover();original=hashlib.sha256((P/'hyperframes/index.html').read_bytes()).hexdigest()
r=registry._tools['hyperframes_compose'].execute({'operation':'render_existing','workspace_path':str(P/'hyperframes'),'output_path':str(P/'renders/DRAGONBLOOD-30s.mp4'),'profile':'tiktok_vertical','fps':30,'quality':'high','strict':True,'skip_contrast':False})
(P/'artifacts/receipt_hyperframes_compose.json').write_text(json.dumps(dataclasses.asdict(r),ensure_ascii=False,indent=2))
print(json.dumps({'success':r.success,'error':r.error,'artifacts':r.artifacts,'entry_sha256':original},ensure_ascii=False))
if not r.success:sys.exit(1)
assert hashlib.sha256((P/'hyperframes/index.html').read_bytes()).hexdigest()==original
