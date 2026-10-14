"""Build a read-only local gallery from approved source artifacts."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
dist=root/'app/dist';dist.mkdir(exist_ok=True)
shutil.copy2(root/'app/index.html',dist/'index.html')
shutil.copytree(root/'assets/samples',dist/'samples',dirs_exist_ok=True)
print(f'Gallery: {dist}/index.html')
