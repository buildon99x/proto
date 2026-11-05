import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {build} from '../.agents/skills/diorama-worlds/node_modules/esbuild/lib/main.js';
import {buildWorld} from '../.agents/skills/diorama-worlds/scripts/build-world.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const kit=resolve(root,'../.agents/skills/diorama-worlds/kit/world.js');
await mkdir(resolve(root,'dist'),{recursive:true});
await build({entryPoints:[resolve(root,'src/main.js')],bundle:true,outfile:resolve(root,'dist/gallery.js'),alias:{'@diorama/worlds':kit},format:'iife',platform:'browser',target:['es2022'],minify:true,legalComments:'inline'});
await writeFile(resolve(root,'dist/index.html'),await readFile(resolve(root,'index.html')));
await buildWorld(resolve(root,'src/harbor.js'),resolve(root,'dist/harbor.html'),{visualModule:resolve(root,'src/visual-controls.js')});
await buildWorld(resolve(root,'src/singapore.js'),resolve(root,'dist/singapore.html'),{zoomModule:resolve(root,'src/zoom.js'),visualModule:resolve(root,'src/visual-controls.js')});
await buildWorld(resolve(root,'src/dubai.js'),resolve(root,'dist/dubai.html'),{zoomModule:resolve(root,'src/zoom.js'),visualModule:resolve(root,'src/visual-controls.js')});

await buildWorld(resolve(root,'src/dubai-timelapse.js'),resolve(root,'dist/dubai-timelapse.html'),{zoomModule:resolve(root,'src/zoom.js'),visualModule:resolve(root,'src/visual-controls.js'),playbackModule:resolve(root,'src/playback-controls.js'),environmentModule:resolve(root,'src/environment-controls.js')});


await buildWorld(resolve(root,'src/rome.js'),resolve(root,'dist/rome.html'),{zoomModule:resolve(root,'src/zoom.js'),visualModule:resolve(root,'src/visual-controls.js'),environmentModule:resolve(root,'src/environment-controls.js')});
await buildWorld(resolve(root,'src/rome-timelapse.js'),resolve(root,'dist/rome-timelapse.html'),{zoomModule:resolve(root,'src/zoom.js'),visualModule:resolve(root,'src/visual-controls.js'),playbackModule:resolve(root,'src/playback-controls.js'),environmentModule:resolve(root,'src/environment-controls.js')});

console.log('Built offline gallery and six standalone worlds, including Rome diorama and formation.');
