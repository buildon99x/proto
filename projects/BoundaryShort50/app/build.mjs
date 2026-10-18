import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const name of ['BoundaryShort50-preview-narration-pending.mp4','thumbnail.png']) await copyFile(`../renders/${name}`,`dist/${name}`);
await copyFile('index.html','dist/index.html');
