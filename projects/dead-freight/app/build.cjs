const fs=require('node:fs');const path=require('node:path');
const root=__dirname,dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
for(const f of ['index.html','game.js','core.js','weapon.js','motion.js','audio.js','world.js','world-view.js','render-style.js','rifle-state.js','rifle-audio.js','run-clock.js','save-state.js'])fs.copyFileSync(path.join(root,f),path.join(dist,f));
fs.cpSync(path.join(root,'vendor'),path.join(dist,'vendor'),{recursive:true});
fs.cpSync(path.join(root,'../assets/audio/rifle'),path.join(dist,'audio/rifle'),{recursive:true});
fs.copyFileSync(path.join(root,'../audio-provenance.md'),path.join(dist,'audio/rifle/CREDITS.md'));
fs.copyFileSync(path.join(root,'../assets/audio/provenance.json'),path.join(dist,'audio/rifle/provenance.json'));
console.log('DEAD FREIGHT static build complete');
