#!/usr/bin/env python3
"""Static input verification only; no gameplay acceptance or old test inheritance."""
import hashlib
import json
import re
from pathlib import Path

project = Path(__file__).resolve().parents[1]
repo = project.parents[1]
manifest = json.loads((project / 'docs/original-0.4.7-manifest.json').read_text())
assert len(manifest) == 167
for entry in manifest:
    data = (repo / entry['path']).read_bytes()
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], entry['path']
    assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == entry['git_blob_sha1'], entry['path']
reference = (repo / 'projects/Emberwatch/app/src/campaign/reference-warrior.js').read_text()
reference_ids = re.findall(r"^  (?:node|augment)\('([^']+)'", reference, re.M)
checklist = (project / 'docs/requirements/warrior-completion-checklist.md').read_text()
listed_ids = re.findall(r'^\| 미검증 \| ([a-z_]+)(?: †)? \|', checklist, re.M)
assert len(reference_ids) == len(set(reference_ids)) == 53
assert len(listed_ids) == len(set(listed_ids)) == 53
assert set(listed_ids) == set(reference_ids)
status = json.loads((project / 'docs/requirements/requirements-source-status.json').read_text())
assert status['actualSha256'] is None
assert status['hashComparison'] == 'blocked_not_compared'
assert status['checklist']['previous425TestsInheritedAsPassing'] is False
print(json.dumps({
    'checkpoint': 'R0 requirements/provenance only',
    'originalFilesMatchedGitBlobAndSha256': len(manifest),
    'warriorReferenceIdsListedOnceAsUnverified': len(listed_ids),
    'checklistCheckboxItems': len(re.findall(r'^- \[ \]', checklist, re.M)),
    'checklistSha256': hashlib.sha256(checklist.encode()).hexdigest(),
    'canonicalFullFileHash': 'blocked_not_compared',
    'gameRuntimeTests': 'not_assessed_by_this_input_check',
    'browserPlay': 'not_assessed_by_this_input_check',
    'historical425TestsInherited': False,
}, ensure_ascii=False, indent=2))
