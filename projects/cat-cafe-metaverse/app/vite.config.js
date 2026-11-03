import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:'./',server:{host:'127.0.0.1',proxy:{'/ws':{target:'ws://127.0.0.1:8787',ws:true}}},build:{target:'es2022',rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url)),diagnostics:fileURLToPath(new URL('./diagnostics.html',import.meta.url))}}}});
