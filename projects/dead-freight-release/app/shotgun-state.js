/* shotgun data and per-instance mechanical owner; common clocks live in mechanical-state.js. */
(function(root){'use strict';const M=root.DFMechanical||(typeof require==='function'?require('./mechanical-state.js'):null);
function validateDefinition(data){if(data?.id!=='shotgun')throw new TypeError('Invalid shotgun definition identity');return M.validateDefinition(data);}
const definition=validateDefinition(root.DFShotgunContent||(typeof require==='function'?require('../content/shotgun.json'):null));
class ShotgunState extends M.MechanicalState{constructor(options={}){super({...options,config:validateDefinition(options.config||definition)});}}
const api={ShotgunState,validateDefinition,definition};root.DFShotgun=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;})(globalThis);
