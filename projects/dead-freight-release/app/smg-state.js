/* Twin SMG validated data; common mechanical clocks live in mechanical-state.js. */
(function(root){'use strict';const M=root.DFMechanical||(typeof require==='function'?require('./mechanical-state.js'):null);
function validateDefinition(data){if(data?.id!=='smg'||data.cycleDelay!==0||data.cycleRecovery!==0)throw new TypeError('Invalid SMG mechanics');return M.validateDefinition(data);}
const definition=validateDefinition(root.DFSmgContent||(typeof require==='function'?require('../content/smg.json'):null));
class SMGState extends M.MechanicalState{constructor(options={}){super({...options,config:validateDefinition(options.config||definition)});}}
const api={SMGState,validateDefinition,definition};root.DFSMG=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;})(globalThis);
