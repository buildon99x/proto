"""Real OpenMontage render; cannot label a narration-blocked preview as final."""
from pathlib import Path
import sys,os,json,dataclasses
P=Path(__file__).resolve().parents[1];sys.path.insert(0,os.environ.get('OPENMONTAGE_ROOT','/workspace/OpenMontage-source'))
from tools.tool_registry import registry
registry.discover();status=json.loads((P/'artifacts/authoring-status.json').read_text());name='BoundaryShort50.mp4' if status['voice_available'] else 'BoundaryShort50-preview-narration-pending.mp4'
r=registry._tools['hyperframes_compose'].execute({'operation':'render_existing','workspace_path':str(P/'hyperframes'),'output_path':str(P/'renders'/name),'profile':'tiktok_vertical','fps':30,'quality':'high','strict':True,'skip_contrast':False})
(P/'artifacts/receipt_hyperframes_compose.json').write_text(json.dumps(dataclasses.asdict(r),ensure_ascii=False,indent=2));print(json.dumps({'success':r.success,'error':r.error,'artifacts':r.artifacts,'narration_available':status['voice_available'],'is_final_delivery':status['voice_available']},ensure_ascii=False))
if not r.success:raise SystemExit(1)
