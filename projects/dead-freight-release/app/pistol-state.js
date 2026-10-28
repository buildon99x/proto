/* pistol data and per-instance mechanical owner; common clocks live in mechanical-state.js. */
(function(root){'use strict';const M=root.DFMechanical||(typeof require==='function'?require('./mechanical-state.js'):null);
function validateDefinition(data){if(data?.id!=='pistol')throw new TypeError('Invalid pistol definition identity');return M.validateDefinition(data);}
const definition=validateDefinition(root.DFPistolContent||(typeof require==='function'?require('../content/pistol.json'):null));
class PistolState extends M.MechanicalState{constructor(options={}){super({...options,config:validateDefinition(options.config||definition)});}}
const api={PistolState,validateDefinition,definition};root.DFPistol=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;})(globalThis);
