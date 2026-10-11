from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[2]
base=Path('/workspace/shared/emberwatch-r14a13-combat-presentation-project')
out=root/'docs/verification-r14a14'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
archive=json.loads(Path('/workspace/shared/emberwatch-r14a13-github-publish/archive-r14a13-snapshot-manifest.json').read_text())
for f in archive['files']:
 p=base/f['path'];assert p.is_file() and sha(p)==f['sha256'], 'Frozen a13 changed: '+f['path']
old={str(p.relative_to(base/'app/src')):sha(p) for p in (base/'app/src').rglob('*') if p.is_file()}
new={str(p.relative_to(root/'app/src')):sha(p) for p in (root/'app/src').rglob('*') if p.is_file()}
assert set(old)==set(new),'Source file set changed'
changed=[k for k in old if old[k]!=new[k]]
assert set(changed)=={'main.js','index.html','recovery-page.js'},changed
assets={}
for directory in ['assets','app/src/assets']:
 a={str(p.relative_to(base)):sha(p) for p in (base/directory).rglob('*') if p.is_file()}
 b={str(p.relative_to(root)):sha(p) for p in (root/directory).rglob('*') if p.is_file()}
 assert a==b,directory+' changed';assets[directory]=len(a)
manifest=json.loads((root/'app/dist/qa-r14/build-manifest.json').read_text());assert manifest['version']=='0.14.0-reimplementation.14' and manifest['namespace']=='qa-r14'
copied=0
for row in manifest['files']:
 p=root/'app/dist/qa-r14'/row['path'];assert sha(p)==row['sha256'] and p.stat().st_size==row['bytes']
 source=root/'app/src'/row['path']
 if source.is_file():assert sha(source)==row['sha256'];copied+=1
result={'frozenA13SourceFilesUnchanged':len(archive['files']),'sourceFilesTotal':len(old),'sourceFilesUnchanged':len(old)-len(changed),'sourceFilesChanged':changed,'unchangedAssets':assets,'allCombatRenderAudioTimingAndSaveModelModulesByteIdentical':True,'builtFiles':len(manifest['files']),'builtBytes':sum(f['bytes'] for f in manifest['files']),'buildSourceCopiesVerified':copied,'sourceHashes':new}
(out/'source-integrity.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='sourceHashes'},indent=2))
