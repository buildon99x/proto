#!/usr/bin/env python3
"""Validate checked-in deliverables without rebuilding or calling any API."""
import hashlib,json,re,sys
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'studio'))
from cli import inspect_png,validate,PIN,digest
reports=[]
for name in ['ember-valley','lantern-keeper','copper-lantern']:
 folder=root/'assets/samples'/name
 m=json.loads((folder/'manifest.json').read_text())
 job=validate(m['job'])
 checks=inspect_png(folder/m['image'],job)
 assert checks['sha256']==m['checks']['sha256'],name+' PNG hash'
 assert checks['rgb_sha256']==m['checks']['rgb_sha256'],name+' pixels'
 assert digest(folder/'painting.lua')==m['program_sha256'],name+' log hash'
 assert m['phase']=='approved' and m['approval']['image_sha256']==checks['sha256'],name+' approval'
 assert m['engine']['commit']==PIN,name+' engine pin'
 replay=json.loads((folder/'reproduction.json').read_text())
 assert replay['same_rgb_pixels'] and replay['same_binary'],name+' reproduction'
 assert replay['original']['sha256']==checks['sha256'],name+' replay binding'
 reports.append({'sample':name,'size':[checks['width'],checks['height']],'mode':checks['mode'],'sha256':checks['sha256'],'reproduced_rgb':True})
# Check every local gallery target exists in the source assets (or built gallery).
html=(root/'app/index.html').read_text()
for target in re.findall(r'(?:href|src)="(samples/[^"#]+)"',html):
 assert (root/'assets'/target).is_file(),target
print(json.dumps({'status':'PASS','samples':reports,'gallery_links':'all resolved'},indent=2))
