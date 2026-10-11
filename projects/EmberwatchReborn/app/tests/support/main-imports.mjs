// Resolve the actual production module dependencies for extracted-main tests.
// Handlers stay unchanged; DOM/audio/storage probes remain in each suite.
import {readFileSync} from 'node:fs';
const mainUrl=new URL('../../src/main.js',import.meta.url),source=readFileSync(mainUrl,'utf8');
export const mainImports={};
for(const row of source.matchAll(/^import\s*\{([^}]+)\}\s*from\s*'([^']+)'/gm)){
 const module=await import(new URL(row[2],mainUrl));
 for(const name of row[1].split(',').map(s=>s.trim())){
  if(!(name in module))throw new Error('Missing actual main dependency: '+name);
  mainImports[name]=module[name];
 }
}
