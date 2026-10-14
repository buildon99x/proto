import os,sys,json,dataclasses
from pathlib import Path
P=Path(__file__).resolve().parents[1]
OM=Path(os.environ.get('OPENMONTAGE_ROOT','/workspace/OpenMontage-source'));sys.path.insert(0,str(OM))
from tools.tool_registry import registry
registry.discover()
r=registry._tools['hyperframes_compose'].execute({'operation':'render_existing','workspace_path':str(P/'hyperframes'),'output_path':str(P/'renders/final.mp4'),'profile':'tiktok_vertical','fps':30,'quality':'high','strict':True,'skip_contrast':False})
(P/'artifacts/receipt_hyperframes_compose.json').write_text(json.dumps(dataclasses.asdict(r),ensure_ascii=False,indent=2))
print(json.dumps({'success':r.success,'error':r.error,'artifacts':r.artifacts},ensure_ascii=False))
if not r.success:sys.exit(1)
