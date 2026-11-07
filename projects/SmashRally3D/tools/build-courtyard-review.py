"""Matched-view environment evidence. Experience scores are reviewed separately."""
import json, hashlib, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageChops

base = Path(__file__).resolve().parents[1] / 'verification/courtyard-depth-20261017'
out = base / 'delivery'
out.mkdir(exist_ok=True)
load = lambda p: json.loads((base / p).read_text())
before, after = load('before-scene/scene.json')['results'], load('final-scene/scene.json')['results']
font = lambda n: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', n)
sheet = Image.new('RGB', (1280, 1940), '#122632')
draw = ImageDraw.Draw(sheet)
draw.text((20, 16), 'Original club courtyard | same camera, court, light and athletes', font=font(25), fill='#ffe0a0')
draw.text((20, 55), 'Actual ordinary UI serve-ready frames; no experience points from automation', font=font(18), fill='#c1d3d8')
checks = []
for i, (a, b) in enumerate(zip(before, after)):
    assert a['view'] == b['view']
    assert a['camera'] == b['camera'] and a['targets'] == b['targets']
    assert a['lights'] == b['lights'] and a['ambient'] == b['ambient'] and b['spectators'] == 0
    name = f"scene-{a['view']['width']}x{a['view']['height']}-ready.png"
    left, right = [Image.open(base / folder / name).convert('RGB') for folder in ['before-scene', 'final-scene']]
    w, h = left.size
    lower = ImageChops.difference(left.crop((0, int(h*.65), w, h)), right.crop((0, int(h*.65), w, h)))
    lower_changed = sum(p != (0, 0, 0) for p in lower.get_flattened_data())
    assert lower_changed == 0, (name, lower_changed)
    checks.append({'view': a['view'], 'cameraAndTargetsIdentical': True, 'lightsAndAmbientIdentical': True, 'spectators': 0, 'unchangedBottom35PercentPixels': lower_changed})
    y = 105 + i * 455
    for column, image, label in [(0, left, 'Before'), (1, right, 'After')]:
        draw.text((column * 640 + 16, y), f"{label} / {w}x{h}", font=font(21), fill='#ffdb98')
        image = ImageOps.contain(image, (640, 420))
        sheet.paste(image, (column * 640 + (640-image.width)//2, y+32))
sheet.save(out / '01-courtyard-comparison.png')
(base / 'camera-and-court-preservation.json').write_text(json.dumps({'method': 'Four fresh ordinary UI ready views. Exact observed camera/target/ambient/light equality and literal bottom35%pixel equality; not a physical FPS claim.', 'results': checks}, indent=2)+'\n')

assets = sorted((base.parents[1] / 'app/public/assets/models').glob('*.glb'))
repo = base.parents[3]
source_paths = ['game.ts', 'physics.ts', 'motion.ts', 'motion-data.json', 'camera-framing.ts', 'stroke-presentation.ts']
unchanged = []
for p in [*(base.parents[1] / 'app/src' / s for s in source_paths), *assets]:
    relative = str(p.relative_to(repo))
    original = subprocess.check_output(['git', 'show', 'ab5102d:'+relative], cwd=repo)
    current = p.read_bytes()
    assert original == current, relative
    unchanged.append({'file': relative, 'sha256': hashlib.sha256(current).hexdigest()})
(base / 'unchanged-domain-and-assets.json').write_text(json.dumps({'baseline': 'ab5102d', 'byteIdentical': unchanged}, indent=2)+'\n')
print(json.dumps({'matchedViews': len(checks), 'unchangedDomainAndAssets': len(unchanged), 'pixelProof': 'bottom35%unchanged in every ready view'}))
