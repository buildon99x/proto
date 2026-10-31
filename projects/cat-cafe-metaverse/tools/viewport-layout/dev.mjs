import {createServer} from '../../app/node_modules/vite/dist/node/index.js';
import {cp,mkdir} from 'node:fs/promises';
await mkdir(new URL('./after/',import.meta.url),{recursive:true});await cp(new URL('../../app/dist/',import.meta.url),new URL('./after/',import.meta.url),{recursive:true});
const server=await createServer({root:new URL('.',import.meta.url).pathname,server:{host:'127.0.0.1',port:Number(process.env.PORT||4173),strictPort:true}});await server.listen();server.printUrls();
