import type {V3} from './physics';
import {techniqueName} from './feedback';
import type {Hit,Intent} from './game';
// The fixed near-player camera looks along+Z: world+X is screen-left.
export function targetArea(p:V3){
    const depth=Math.abs(p.z)<2.1?'FRONT':Math.abs(p.z)>=4.8?'DEEP':'MID';
    const side=p.x>.65?'LEFT':p.x<-.65?'RIGHT':'CENTRE';
    return `${depth} ${side}`;
}
export function aimCopy(target:V3,intent:Intent){
    return `AIM ${targetArea(target)} · ${intent==='clear'?'CLEAR AIMS DEEP':intent==='drop'?'DROP AIMS SHORT':'AUTO RETURN'}`;
}
export function resultCopy(hit:Pick<Hit,'technique'|'quality'|'fallbackReason'|'target'> & Partial<Pick<Hit,'requestedShot'>>){
    const shot=techniqueName(hit.technique);
    const advice=hit.fallbackReason&&['smash','superSmash'].includes(hit.requestedShot??'')&&Math.abs(hit.target.z)<2.1?' · AIM DEEPER':'';
    return `YOU · ${hit.fallbackReason?(hit.fallbackReason==='NO_STRONGER_LEGAL_ATTACK'?`${shot} · SUPER ANGLE TIGHT`:`SAFE ${shot}`):`${hit.quality.toUpperCase()} ${shot}`} → ${targetArea(hit.target)}${advice}`;
}
