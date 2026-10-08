#!/usr/bin/env python3
"""Obtain the exact recorded Pixabay sources for a local DEAD FREIGHT rebuild.
Downloads are subject to https://pixabay.com/service/terms/ . Keep original MP3s private,
outside this repository. Never use this script from the browser/game at runtime.
"""
import argparse, hashlib, json, subprocess
from pathlib import Path
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir', type=Path, required=True)
args = parser.parse_args()
directory = args.source_dir.resolve()
# Reject every location inside the repository, including sibling projects.
repo = ROOT.parents[1]
if directory.is_relative_to(repo):
    raise SystemExit('Choose a private source cache outside the repository.')
directory.mkdir(parents=True, exist_ok=True)
records = json.loads((ROOT/'assets/audio/provenance.json').read_text())['sources']
for record in records:
    url = record['download']
    if urlparse(url).scheme != 'https' or urlparse(url).hostname != 'cdn.pixabay.com':
        raise SystemExit('Source must be the verified public Pixabay CDN URL.')
    target = directory/(record['id']+'.mp3')
    if target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == record['sha256']:
        print(record['id'], 'already verified')
        continue
    temporary = target.with_suffix('.part')
    # No cookies, credentials, login, CAPTCHA solving, or automatic redirects to other sites.
    subprocess.run(['curl','--fail','--silent','--show-error','--max-time','60',url,'-o',str(temporary)],check=True)
    if hashlib.sha256(temporary.read_bytes()).hexdigest() != record['sha256']:
        raise SystemExit(f"Source {record['id']} changed. Re-review its asset page/license before using it.")
    temporary.replace(target)
    print(record['id'], record['title'], 'verified')
