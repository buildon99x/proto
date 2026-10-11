import {cpSync,mkdirSync,readdirSync,readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const recovery=process.argv.includes('--recovery');
if(process.argv.slice(2).some(arg=>arg!=='--recovery'))throw new Error('Unsupported build argument');
const root=new URL('../',import.meta.url).pathname,src=join(root,'src'),dist=join(root,recovery?'dist-recovery':'dist');
mkdirSync(dist,{recursive:true});cpSync(src,dist,{recursive:true});
if(recovery)cpSync(join(src,'recovery.html'),join(dist,'index.html'));
// Pure future-run ledger tests remain in source, never shipped as live content.
for(const name of ['expedition-content.js','expedition-ledger.js']){const file=join(dist,name);if(existsSync(file))unlinkSync(file);}
const files=[];
function walk(path,rel=''){for(const e of readdirSync(path,{withFileTypes:true})){if(e.isDirectory())walk(join(path,e.name),join(rel,e.name));else if(e.name!=='build-manifest.json'){const bytes=readFileSync(join(path,e.name));files.push({path:join(rel,e.name),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
walk(dist);
for(const required of ['index.html','main.js','style.css','assets/motion-hero.png','assets/audio-fantasy.wav'])if(!existsSync(join(dist,required)))throw new Error('Missing '+required);
const manifest={version:JSON.parse(readFileSync(join(root,'package.json'))).version,kind:'R12a5 isolated Wilderness candidate; version5 W campaign and separate pre-v4/pre-v5 historical checkpoint recovery; automated verification and normal-input gameplay QA reported separately; Master, advanced gear, live repeat expeditions and whole campaign incomplete',files};
if(recovery)manifest.kind='R12a5 browser-local historical save recovery tool; no gameplay, auto-restore, profile overwrite or external transfer; empty same-namespace recovery copies only';
writeFileSync(join(dist,'build-manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({files:files.length,bytes:files.reduce((s,f)=>s+f.bytes,0),output:dist,gameplayAcceptance:'not_established_by_build'},null,2));
