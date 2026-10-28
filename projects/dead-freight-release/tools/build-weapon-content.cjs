'use strict';
const fs=require('node:fs'),path=require('node:path');
const project=path.resolve(__dirname,'..'),{validateDefinition}=require('../app/weapon-definitions.js');
function buildWeaponContent(destination=path.join(project,'app','weapon-content.js')){
 const directory=path.join(project,'content','weapons'),data={};
 for(const file of fs.readdirSync(directory).filter(f=>f.endsWith('.json')).sort()){
  const definition=validateDefinition(JSON.parse(fs.readFileSync(path.join(directory,file),'utf8')));
  if(data[definition.id])throw new Error('Duplicate weapon definition '+definition.id);data[definition.id]=definition;
 }
 const output='/* Generated from content/weapons/*.json. Do not edit balance here. */\n(function(root){\n\'use strict\';\nroot.DFWeaponContent='+JSON.stringify(data,null,2)+';\n})(typeof globalThis!==\'undefined\'?globalThis:this);\n';
 fs.writeFileSync(destination,output);return {destination,definitions:Object.keys(data)};
}
module.exports={buildWeaponContent};
if(require.main===module){const result=buildWeaponContent(process.argv[2]);console.log('Validated weapon content: '+result.definitions.join(', '));}
