// Dependencies added by the production R14a2 main input pipeline. Extract the
// actual handlers so legacy UI fixtures exercise the same immediate-input path;
// no combat, locomotion, timing or feedback behavior is replaced by a stub.
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {mainImports} from './main-imports.mjs';
const source=readFileSync(new URL('../../src/main.js',import.meta.url),'utf8');
function productionFunction(name){
 const match=new RegExp(`(?:async )?function ${name}\\(`).exec(source);
 if(!match)throw Error('Missing production input handler: '+name);
 for(let end=source.indexOf('}',match.index);end>=0;end=source.indexOf('}',end+1)){
  const body=source.slice(match.index,end+1);
  try{new Script('('+body+')');return body;}catch(error){if(!(error instanceof SyntaxError))throw error;}
 }
 throw Error('Incomplete production input handler: '+name);
}
const declarations=source.slice(source.indexOf('const actionSkill='),source.indexOf('const tierLabel='));
const combinedCapture=source.split('\n').find(line=>line.startsWith('const allSkillCapture='));
// Each legacy harness supplies its own expert capture probe. Bind the real
// safety coordinator to both captures, exactly as the current main does.
export const mainInputSource=[declarations,combinedCapture,
 'expertSafety=createActionSafety({capture:allSkillCapture,cancel:cancelBattleAction});',
 ...['showInputFeedback','clearInputFeedback','currentPoeAim','sampledCombatInput','deliverCombatEvents','flushFreshCombatInput','flushDeferredSkills','interactionCandidates','contextSceneVisibility','contextProjection','contextIsVisible','contextHasLabel','beginContextOrGroundClick','stepContextClick','showSkillSlots','showQaObservations','showInputObservations'].map(productionFunction)].join('\n');
export function createMainInputFixture(){
 return {...mainImports,expertCapture:mainImports.createExpertInputCapture(),skillCapture:mainImports.createSkillLoadoutInput(),contextClick:mainImports.createContextClickIntent(),contextSuppressHeld:false,locomotionIntent:mainImports.createLocomotionIntent(),poeFeedback:mainImports.createPoeFeedback(),inputLatency:mainImports.createInputLatency(),contactTrace:mainImports.createContactTrace(),frameObservation:mainImports.createFrameObservation(),inputFeedback:null,releasedAimBySkill:{},input:{pointerScreen:null},performance,queueMicrotask};
}
export function tracedInputRouter(onClear){
 const router=mainImports.createInputRouter({captureAttackTap:true}),clear=router.clear;
 return {...router,clear(options){onClear(options);return clear(options);}};
}
