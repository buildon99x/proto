import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for (const [from,to] of [['index.html','index.html'],['../renders/final.mp4','final.mp4'],['../renders/poster.png','poster.png']]) await copyFile(from,`dist/${to}`);
