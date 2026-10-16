require('../tools/build-weapon-content.cjs').buildWeaponContent();
require('../tools/build-pistol-content.cjs').buildPistolContent();
require('../tools/build-shotgun-content.cjs').buildShotgunContent();
require('../tools/build-smg-content.cjs').buildSmgContent();
const fs=require('node:fs');const path=require('node:path');
const root=__dirname,dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
for(const f of ['index.html','liquid-metal.js','liquid-metal-view.js','game.js','core.js','shot-resolver.js','player-projectiles.js','weapon.js','motion.js','audio.js','world.js','regions.js','world-view.js','render-style.js','rifle-state.js','rifle-audio.js','run-clock.js','save-state.js','inventory.js','inventory-game.js','workshop.js','stash-profile.js','inventory-ui.js','storage-profile.js','stash-ui.js','weapon-content.js','weapon-definitions.js','ammo-ledger.js','mechanical-state.js','pistol-content.js','pistol-state.js','shotgun-content.js','shotgun-state.js','smg-content.js','smg-state.js','input-router.js','loadout-action.js','item-action.js','item-view.js','melee.js','muzzle-ballistics.js','audio-preparation.js'])fs.copyFileSync(path.join(root,f),path.join(dist,f));
fs.cpSync(path.join(root,'vendor'),path.join(dist,'vendor'),{recursive:true});
fs.cpSync(path.join(root,'../assets/audio/rifle'),path.join(dist,'audio/rifle'),{recursive:true});
fs.copyFileSync(path.join(root,'../audio-provenance.md'),path.join(dist,'audio/rifle/CREDITS.md'));
fs.copyFileSync(path.join(root,'../assets/audio/provenance.json'),path.join(dist,'audio/rifle/provenance.json'));
fs.copyFileSync(path.join(root,'../assets/audio/utility-provenance.json'),path.join(dist,'audio/rifle/utility-provenance.json'));
console.log('DEAD FREIGHT static build complete');
// Stable artifact identity: a deployed candidate can be checked without trusting a label.
const crypto=require('node:crypto'),files={};
function collect(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(directory,entry.name);if(entry.isDirectory())collect(file);else if(entry.name!=='build-manifest.json')files[path.relative(dist,file).split(path.sep).join('/')]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}}
collect(dist);fs.writeFileSync(path.join(dist,'build-manifest.json'),JSON.stringify({project:'dead-freight',version:require('./package.json').version,files},null,2)+'\n');
