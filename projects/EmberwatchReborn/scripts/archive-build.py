"""Preserve a build with independent CRC and per-file hash validation."""
from pathlib import Path
import argparse, hashlib, json, zipfile
p=argparse.ArgumentParser();p.add_argument('destination',type=Path);args=p.parse_args()
root=Path(__file__).resolve().parents[1]/'app/dist';dest=args.destination
if dest.exists(): raise SystemExit('Refusing to overwrite archive')
entries=[]
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for path in sorted(root.rglob('*')):
  if path.is_file():
   data=path.read_bytes();rel=str(path.relative_to(root));z.writestr(rel,data);entries.append({'path':rel,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 z.writestr('ARCHIVE-MANIFEST.json',json.dumps(entries,indent=2))
 z.writestr('README.txt','Emberwatch Reborn new reimplementation browser build, not a full campaign. See build-manifest.json for exact version. Serve this directory with HTTP(S). The matching source archive contains tests/provenance/QA limitations. Browser saves are local to the origin.\n')
with zipfile.ZipFile(dest) as z:
 assert z.testzip() is None
 for entry in entries:
  data=z.read(entry['path']);assert len(data)==entry['bytes'];assert hashlib.sha256(data).hexdigest()==entry['sha256']
print(json.dumps({'path':str(dest),'bytes':dest.stat().st_size,'files':len(entries),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'crc':'pass','fileHashes':'pass'}))
