import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
function check(path){for(const e of readdirSync(path,{withFileTypes:true})){const p=join(path,e.name);if(e.isDirectory())check(p);else if(/\.m?js$/.test(e.name)){const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8'});if(r.status!==0){process.stderr.write(r.stderr);process.exit(r.status||1);}}}}
check(join(root,'src'));check(join(root,'tests'));console.log('Source/test syntax passed; no gameplay acceptance implied.');
