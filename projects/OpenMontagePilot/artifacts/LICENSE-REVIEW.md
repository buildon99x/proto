# Source and installation review
OpenMontage pinned commit: see upstream.json. Reviewed AGENTS.md, AGENT_GUIDE.md, setup.py, requirements.txt and character-animation pipeline. No upstream installation shell script executed. Minimal Python wheels installed from configured PyPI into /workspace/openmontage-venv; exact versions captured in python-requirements.lock. No GPU/cloud packages, credentials or paid APIs configured.

HyperFrames package 0.8.157 from npm registry metadata points to https://github.com/heygen-com/hyperframes/tree/main/packages/cli and declares Apache-2.0. Inspected published scripts (dev/build/test), installed with --ignore-scripts. Apache license copy fetched from https://raw.githubusercontent.com/heygen-com/hyperframes/main/LICENSE. No cloud lambda/publish operation used. Telemetry disabled with HYPERFRAMES_NO_TELEMETRY=1 for render/QA.

GSAP 3.15.0 npm metadata declares Standard no-charge license: https://gsap.com/standard-license/ . It is not described here as MIT or Apache. Bundled unmodified minified JS retains copyright/license header. Use is local animation authoring/rendering, not a competing animation platform.

Noto CJK bold comes from the installed Debian fonts-noto-cjk package; subset used for self-contained Korean captions. SIL OFL included in Noto-FONT-LICENSE.txt. Existing Debian Chromium 151.0.7922.173 and FFmpeg 7.1.5 packages used; no binary downloaded from an unknown mirror. Python 3.12.14 and Node24.19.0 satisfy upstream ≥3.10/≥22 floors.
