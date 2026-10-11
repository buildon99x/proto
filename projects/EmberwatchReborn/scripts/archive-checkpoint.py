#!/usr/bin/env python3
"""Archive committed Reborn source only; validate CRC and every included digest."""
import argparse
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('destination', type=Path)
parser.add_argument('--checkpoint', required=True)
parser.add_argument('--revision', help='Archive exactly this committed revision while unrelated in-progress edits remain outside the snapshot.')
args = parser.parse_args()
project = Path(__file__).resolve().parents[1]
repo = project.parents[1]
prefix = str(project.relative_to(repo))
git = lambda *cmd: subprocess.check_output(['git', *cmd], cwd=repo).decode().strip()
if not args.revision and git('status', '--porcelain', '--', prefix):
    raise SystemExit('Commit related changes before archiving; uncommitted source must not be omitted.')
revision = git('rev-parse', '--verify', (args.revision or 'HEAD') + '^{commit}')
files = git('ls-tree', '-r', '--name-only', revision, '--', prefix).splitlines()
manifest = []
metadata = {
    'checkpoint': args.checkpoint,
    'kind': 'new_reimplementation_not_exact_recovery',
    'commit': revision,
    'projectTree': git('rev-parse', f'{revision}:{prefix}'),
    'snapshotSelection': 'explicit_committed_revision_excludes_in_progress_edits' if args.revision else 'clean_committed_project',
    'originalBaselineCommit': '7240e49430ef34b08cc1f0ac332fb7912e135a4d',
    'historical425TestsInherited': False,
    'reusedOriginalResourcesIncluded': any('/app/src/assets/' in f for f in files),
    'entireOriginalBaselineIncluded': False,
    'sourceCount': len(files),
}
args.destination.parent.mkdir(parents=True, exist_ok=True)
if args.destination.exists():
    raise SystemExit('Refusing to overwrite an existing checkpoint archive.')
with zipfile.ZipFile(args.destination, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name in files:
        data = subprocess.check_output(['git', 'show', f'{revision}:{name}'], cwd=repo)
        entry = {'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
        manifest.append(entry)
        archive.writestr(name, data)
    archive.writestr('CHECKPOINT.json', json.dumps(metadata, ensure_ascii=False, indent=2))
    archive.writestr('MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2))
    archive.writestr('README.txt', 'Emberwatch Reborn new reimplementation checkpoint.\nRead project README/eval and checkpoint-specific docs for passed, failed and unrun scope.\nRun npm test and npm run lint inside projects/EmberwatchReborn/app.\nOriginal0.4.7 resources are separately preserved and are needed for the original-integrity Python check.\nThis source archive does not inherit the lost-build425 test result and is not a published release.\nNo credentials, Git configuration or unrelated project data are included.\n')
with zipfile.ZipFile(args.destination) as archive:
    assert archive.testzip() is None, 'CRC mismatch'
    for entry in manifest:
        data = archive.read(entry['path'])
        assert len(data) == entry['bytes']
        assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['path']
result = {**metadata, 'archive': str(args.destination), 'archiveBytes': args.destination.stat().st_size, 'archiveSha256': hashlib.sha256(args.destination.read_bytes()).hexdigest(), 'crc': 'passed', 'fileHashes': 'all_passed'}
print(json.dumps(result, ensure_ascii=False, indent=2))
