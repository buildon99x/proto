import {ambientPhase} from '../../shared/ambient.mjs';
import {featherPhase} from '../../shared/feather.mjs';

// One nanosecond only absorbs floating-point arithmetic at exact deadlines.
// It is shared by solo ownership, toys, cooldown, card and pose; live rules stay exact.
export function soloDeadlineReached(untilMs,nowMs){return Number.isFinite(untilMs)&&Number.isFinite(nowMs)&&untilMs-nowMs<=.000001;}

// App-only, deterministic taste. Nothing is persisted or added to live snapshots.
const PROFILES=Object.freeze([
 Object.freeze({key:'sleepy',preferred:'pet',clue:'쓰다듬기를 좋아해요',petEyes:.10,petNuzzle:.055,ballStep:.65}),
 Object.freeze({key:'observant',preferred:'feather',clue:'깃털을 오래 살펴봐요',petEyes:.35,petNuzzle:.020,ballStep:.80}),
 Object.freeze({key:'playful',preferred:'ball',clue:'공을 힘차게 쫓아요',petEyes:.25,petNuzzle:.035,ballStep:1})
]);
export function soloProfile(id){const i=Number(String(id).replace(/^cat-/,''))||0;return PROFILES[((i%3)+3)%3];}
const HUNTS={sleepy:[[800,'focus'],[1300,'stalk'],[1650,'pounce'],[4000,'pause']],observant:[[1500,'focus'],[2200,'stalk'],[2650,'pounce'],[4000,'pause']]};
export function soloFeatherPhase(id,untilMs,nowMs){
 const hunt=HUNTS[soloProfile(id).key];if(!hunt)return featherPhase(untilMs,nowMs);
 const elapsed=Math.round(nowMs-(untilMs-4000));
 if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=4000)return{phase:'idle',progress:0};
 let start=0;for(const [end,phase]of hunt){if(elapsed<end)return{phase,progress:(elapsed-start)/(end-start)};start=end;}
}
const ROUTINES=Object.freeze({
 'sunroom-stretch':Object.freeze({key:'sunroom-stretch',pose:'stretch',text:'햇살 아래 기지개 · 낮잠도 준비 운동부터'}),
 'sunroom-groom':Object.freeze({key:'sunroom-groom',pose:'groom',text:'햇살 아래 앞발 세수 · 낮잠 전 단장 중'}),
 'garden-watch':Object.freeze({key:'garden-watch',pose:'rest',text:'정원에서 쉬며 살펴보는 중',eyeOpen:1,headY:.81,bodyHeight:.39}),
 'garden-groom':Object.freeze({key:'garden-groom',pose:'groom',text:'정원에서 앞발 세수 · 수염까지 가지런히'}),
 'moonlight-rest':Object.freeze({key:'moonlight-rest',pose:'rest',text:'달빛 아래 눈을 가늘게 감고 쉬는 중',eyeOpen:.08,headY:.72,bodyHeight:.39})
});
// Only the first 3s of rest, plus the existing 5s groom / 3s stretch.
// Sleep, walks, ground positions and stationary headings remain shared ambient behavior.
export function soloRoutine(id,time,room){
 if(!Number.isFinite(time))return null;
 const phase=ambientPhase(id,time,room);
 if(!['rest','groom','stretch'].includes(phase))return null;
 if(phase==='rest'&&ambientPhase(id,time-3000,room)==='rest')return null;
 if(room==='sunroom')return ROUTINES[phase==='groom'?'sunroom-groom':'sunroom-stretch'];
 if(room==='garden')return ROUTINES[phase==='groom'?'garden-groom':'garden-watch'];
 return room==='moonlight'?ROUTINES['moonlight-rest']:null;
}
export function soloExperience(cat,time,room){
 const profile=soloProfile(cat.id),elapsed=(time-(cat.until-4000))/1000;
 const action=cat.owner&&['pet','feather','ball'].includes(cat.mode)&&Number.isFinite(elapsed)&&elapsed>=0&&!soloDeadlineReached(cat.until,time)?cat.mode:null;
 return{profile,action,elapsed:action?elapsed:0,hunt:action==='feather'?soloFeatherPhase(cat.id,cat.until,time):null,routine:action?null:soloRoutine(cat.id,time,room)};
}
