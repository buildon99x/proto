'use strict';const fs=require('node:fs'),path=require('node:path'),{validateDefinition}=require('../app/smg-state.js');
function buildSmgContent(destination=path.resolve(__dirname,'../app/smg-content.js')){const data=validateDefinition(JSON.parse(fs.readFileSync(path.resolve(__dirname,'../content/smg.json'),'utf8')));fs.writeFileSync(destination,'/* Generated from content/smg.json. */\n(function(root){root.DFSmgContent='+JSON.stringify(data,null,2)+';})(globalThis);\n');return destination;}
module.exports={buildSmgContent};if(require.main===module)console.log(buildSmgContent());
