import {createServer} from '../../app/node_modules/vite/dist/node/index.js';
import {copyFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await copyFile(new URL('../../app/src/audio.js',import.meta.url),new URL('./public/verified-audio.js',import.meta.url));
console.log('Exact production audio SHA256:',createHash('sha256').update(await readFile(new URL('./public/verified-audio.js',import.meta.url))).digest('hex'));
const server=await createServer({root:new URL('.',import.meta.url).pathname,server:{host:'127.0.0.1',port:4173,strictPort:true}});await server.listen();server.printUrls();
