from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[2]
base=Path('/workspace/shared/emberwatch-r14a12-combat-response-project')
verification=root/'docs/verification-r14a13'
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
frozen=json.loads((verification/'baseline-sha256.json').read_text())
assert all((base/name).is_file() and sha(base/name)==digest for name,digest in frozen.items()),'Frozen baseline changed'
assert set(frozen)=={str(p.relative_to(base)) for p in base.rglob('*') if p.is_file()},'Frozen baseline file set changed'
assets={}
for directory in ['assets','app/src/assets']:
 old={str(p.relative_to(base)):sha(p) for p in (base/directory).rglob('*') if p.is_file()}
 new={str(p.relative_to(root)):sha(p) for p in (root/directory).rglob('*') if p.is_file()}
 assert new==old,directory+' changed'
 assets[directory]={'files':len(old),'byteIdentical':True}
protected=['state.js','save.js','controller.js','controls.js','dialog-focus.js','town-portal.js','town-portal-presentation.js','warrior-balance.js','poe-skill-policy.js','poe-mobility.js','actor-body.js','world.js','world-geometry.js','recovery.js','skill-loadout.js','motion.js','art.js','action-safety.js']
protected=[str(Path('app/src')/name) for name in protected if (base/'app/src'/name).is_file()]
for name in protected:assert sha(root/name)==frozen[name],name+' changed'
manifest=json.loads((root/'app/dist/qa-r14/build-manifest.json').read_text())
assert manifest['version']=='0.14.0-reimplementation.13'
assert manifest['namespace']=='qa-r14'
assert manifest['kind'].startswith('R14a13 ')
built=0
for row in manifest['files']:
 output=root/'app/dist/qa-r14'/row['path']
 assert output.is_file() and sha(output)==row['sha256'] and output.stat().st_size==row['bytes'],row['path']+' output mismatch'
 source=root/'app/src'/row['path']
 if source.is_file():assert sha(source)==row['sha256'],row['path']+' source mismatch';built+=1
changed=[];added=[]
for path in (root/'app/src').rglob('*'):
 if not path.is_file():continue
 name=str(path.relative_to(root))
 if name not in frozen:added.append(name)
 elif sha(path)!=frozen[name]:changed.append(name)
for name in frozen:
 if name.startswith('app/src/'):assert (root/name).is_file(),name+' removed'
result={'frozenBaselineFiles':len(frozen),'frozenBaselineUnchanged':True,'assetPreservation':assets,'protectedByteIdentical':protected,'sourceChanged':sorted(changed),'sourceAdded':sorted(added),'buildFiles':len(manifest['files']),'buildBytes':sum(row['bytes'] for row in manifest['files']),'builtSourceHashesVerified':built,'sourceHashes':{name:sha(root/name) for name in sorted(changed+added)}}
(verification/'source-integrity.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
