from pathlib import Path
import hashlib
import json
import re

root = Path(__file__).resolve().parents[2]
record = json.loads((root / "data/source/archive-manifest.json").read_text())
for item in record["files"]:
    path = root / item["path"]
    assert path.resolve().is_relative_to(root.resolve()), item["path"]
    data = path.read_bytes()
    assert len(data) == item["bytes"], item["path"]
    assert hashlib.sha256(data).hexdigest() == item["sha256"], item["path"]
    print("PASS recovered original bytes:", item["path"])
text = (root / "docs/source/e2e-design-v1.0.md").read_text()
assert len(re.findall(r"^# \d+\.", text, re.M)) == record["numbered_design_sections"] == 66
print("PASS 66 design sections; both published source documents retain original hashes")
