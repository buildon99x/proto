const fs=require('node:fs');const path=require('node:path');
const root=__dirname,dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
for(const f of ['index.html','game.js','core.js','weapon.js'])fs.copyFileSync(path.join(root,f),path.join(dist,f));
fs.cpSync(path.join(root,'vendor'),path.join(dist,'vendor'),{recursive:true});
console.log('DEAD FREIGHT static build complete');
