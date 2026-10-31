// One local development process tree: static Vite app + isolated room server.
// No external tunnel, public binding, or online fallback.
import {fileURLToPath} from 'node:url';
import {createRoomServer} from '../server/index.mjs';
import {createServer} from 'vite';
const port=Number(process.env.PORT||4173);
const room=await createRoomServer({origins:[...new Set([4173,5173,43110,43120,port])].flatMap(p=>[`http://127.0.0.1:${p}`,`http://localhost:${p}`])});
let vite;
try {
 vite=await createServer({root:fileURLToPath(new URL('.',import.meta.url)),configFile:fileURLToPath(new URL('vite.config.js',import.meta.url)),server:{host:'127.0.0.1',port:Number(process.env.PORT||4173),strictPort:true}});
 await vite.listen();vite.printUrls();console.log(`Room server: ${room.url}`);
} catch(error) {await room.close();throw error;}
let stopping=false;
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,async()=>{if(stopping)return;stopping=true;await vite.close();await room.close();process.exit(0);});
