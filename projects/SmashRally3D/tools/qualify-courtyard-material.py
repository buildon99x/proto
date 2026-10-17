"""Consolidate fixed-bundle safety gates; experience judgment stays in manual-review."""
from pathlib import Path
import hashlib,json
b=Path(__file__).resolve().parents[1]/'verification/courtyard-material-20261017';repo=b.parents[3]
load=lambda f:json.loads((b/f).read_text());m=load('source-manifest.json')
for file,sha in m['sourceHashes'].items():assert hashlib.sha256((repo/file).read_bytes()).hexdigest()==sha,file
reports={}
for folder,scenario,role in [('phases-pc','courtyard-material-study','held material diagnostic'),('phases-portrait','courtyard-material-study','held material diagnostic'),('final-scene','benchmark-scene','ordinary menu/start'),('final-native','court-resize','ordinary native input/rotation'),('final-rally','aim-rally','ordinary3view rally/aim')]:
 r=load(f'{folder}/{scenario}-report.json');assert r['pass'] and not r['errors'],folder
 assert r['buildEvidence']['sha256']==m['bundleSha256'] and r['buildEvidence']['modelHashes']==m['modelHashes'],folder
 reports[folder]={'file':f'{folder}/{scenario}-report.json','role':role,'pass':True}
assert 'Tests  81 passed (81)' in (b/'unit-tests.txt').read_text() and 'Test Files  14 passed (14)' in (b/'unit-tests.txt').read_text()
assert 'Compiled successfully' in (b/'root-build.txt').read_text()
pixels=load('pixel-isolation.json');assert pixels['pairs']==14
assert all(r['originalRepeatChangedPixels']==r['originalRestoredChangedPixels']==r['outsideSelectedSurfaceBoundsChangedPixels']==0 and r['sameClockPhaseScoreCameraPoseContactAndViewport'] for r in pixels['rows'])
assert all(r['lower35PercentChangedPixels']==0 for r in pixels['rows'] if r['checkpoint']=='ready')
camera=load('camera-preservation.json');assert all(all(row[k] for k in ['camera','body','targets','shuttle','ambient','lights','noSpectators']) for row in camera['rows'])
for folder in ['phases-pc','phases-portrait']:
 d=load(f'{folder}/material-study.json');assert len(d['materials'])==42 and d['done'] and all(d['restore'].values())
 assert all(e['original']['gloss']==25 and e['current']['gloss'] in [.12,.82] for e in d['materials'])
 assert len({e['current']['name'] for e in d['materials']})==9
r=load('final-rally/aim-rally-report.json');r=json.loads(next(s[len('COURT FRAMING PASS '):] for s in r['logs'] if s.startswith('COURT FRAMING PASS ')))
n=load('final-native/court-resize-report.json');n=json.loads(next(s[len('LIVE ROTATION PASS '):] for s in n['logs'] if s.startswith('LIVE ROTATION PASS ')))
contract=load('contract.json');assert hashlib.sha256((b.parent/'switch-benchmark-20261017/rubric.json').read_bytes()).hexdigest()==contract['rubricSha256']
q={'status':'all_software_gates_pass; manual original-V3rating separate','runtimeCommit':m['runtimeCommit'],'runtimeBundleSha256':m['bundleSha256'],'modelHashes':m['modelHashes'],'reports':reports,'unitTests':81,'unitFiles':14,'fullRootBuild':True,'materialIsolation':pixels,'cameraReady':camera,'other17RuntimeFilesAnd5ModelsUnchanged':True,'mainOnlyAddsImportAndOneSceneryCall':m['mainOnlyAddsImportAndOneSceneryCall'],'materialScope':{'meshInstances':42,'clonedMaterials':9,'staticRGBA8Maps':3,'eachMap':[256,256],'mipmaps':True,'estimatedTextureBytesIncludingMipLevels':1048572,'newEntitiesLightsGeometry':0,'normalField':'fine grains and recessed panel joints; broad sine generator rejected','noPhysicalFpsClaim':True},'actualRallies':[{'view':x['viewport'],'returns':x['returns'],'clippedPlayers':x['framing']['clippedPlayers'],'clippedShuttle':x['framing']['clippedShuttle'],'maxHeight':x['framing']['maxHeight'],'aimErrorsCssPx':[a['pixelError'] for a in x['framing']['aim']]} for x in r['results']],'nativeRotation':{'method':n['method'],'aimErrorsCssPx':[x['pixelError'] for x in n['results']],'actualShots':[x['actual'] for x in n['results']]},'priorDeployment':load('baseline-deployment.json'),'limits':['Chromium151SwiftShader, not physical-device input/FPS/Safari or comfort.','Held old-material repeat/current/restoration pairs are diagnostics, not uninterrupted play or normal-speed watching.','Original V3same-camera material hierarchy criterion has no extra external participant prerequisite. Technical parameter fixes/pixel isolation are not experience points.','Normal-speed temporal watching/listening capability remains unsupported; no repeat of blocked Chromium/proxy attempts.','Unknown40points remain unknown and overall score remains null; no98claim.','Discarded prototypes/build syntax and initial strict-ready observer failure remain in attempts/ or pilot folders, excluded from final cohort.']}
(b/'qualification.json').write_text(json.dumps(q,indent=2)+'\n');print(json.dumps({'reports':len(reports),'allPass':True,'pairs':14,'cameraViews':len(camera['rows'])}))
