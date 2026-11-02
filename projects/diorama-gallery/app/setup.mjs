// The vendored skill intentionally is not a workspace package. Bootstrap its
// committed exact lock for clean CI clones, without dependency lifecycle scripts.
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../.agents/skills/diorama-worlds/',import.meta.url));
if(!existsSync(`${root}node_modules/three/package.json`) || !existsSync(`${root}node_modules/esbuild/package.json`)) {
 const result=spawnSync('npm',['ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
