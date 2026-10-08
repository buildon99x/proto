import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let count = 0;
async function checkDirectory(root){
  for(const entry of await readdir(root,{withFileTypes:true})){
    const url=new URL(entry.name+(entry.isDirectory()?'/':''),root);
    if(entry.isDirectory()){await checkDirectory(url);continue;}
    if(!entry.isFile()||!/[.]m?js$/.test(entry.name))continue;
    const result=spawnSync(process.execPath,['--check',fileURLToPath(url)],{stdio:'inherit'});
    if(result.status!==0)process.exit(result.status??1);
    count++;
  }
}
for(const directory of ['src','scripts','tests'])await checkDirectory(new URL(`../${directory}/`,import.meta.url));
console.log(`PASS: JavaScript syntax checks (${count} files); no static type checking is claimed`);
