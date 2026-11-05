// Regression: production CI must still install pinned build tools.
import {mkdtemp,cp,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=await mkdtemp(join(tmpdir(),'harbor-clean-build-'));
try {
 await cp(resolve('..'),dir,{recursive:true,filter:source=>!source.split('/').some(s=>['node_modules','dist','.git'].includes(s))});
 const result=spawnSync(process.execPath,['setup.mjs'],{cwd:join(dir,'app'),env:{...process.env,NODE_ENV:'production',npm_config_cache:join(tmpdir(),'harbor-npm-cache')},encoding:'utf8'});
 if(result.status!==0)throw Error(result.stdout+result.stderr);
 await access(join(dir,'.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js'));
 const build=spawnSync(process.execPath,['build.mjs'],{cwd:join(dir,'app'),encoding:'utf8'});
 if(build.status!==0)throw Error(build.stdout+build.stderr);
 await access(join(dir,'app/dist/harbor.html'));
 console.log('PASS clean production-environment offline build, dev build tools installed');
} finally {await rm(dir,{recursive:true,force:true});}
