import type { Quality } from './physics';
import type { Technique } from './tactics';
export type RallyMiss = { actor: number; reason: 'early' | 'late' | 'reach' };
export const techniqueName = (technique: string) =>
    technique === 'superSmash'
        ? 'SUPER SMASH'
        : technique === 'netKill'
          ? 'NET FINISH'
          : technique.toUpperCase();
export function shotFeedback(
    actor: number,
    quality: Quality,
    technique: Technique,
    fallback: string | null,
) {
    const who = actor === 0 ? 'YOU' : 'AI';
    const detail =
        fallback === 'NO_STRONGER_LEGAL_ATTACK'
            ? 'SMASH · SUPER ANGLE TOO TIGHT'
            : fallback
              ? `${techniqueName(technique)} · SAFE RETURN, AIM DEEPER`
              : `${quality.toUpperCase()} · ${techniqueName(technique)}`;
    return `${who} · ${detail}`;
}
export function pointDetail(
    winner: number,
    hitter: number,
    reason: string,
    ownSide: boolean,
    miss: RallyMiss | null,
) {
    const actor = hitter === 0 ? 'YOUR SHOT' : 'AI SHOT';
    if (reason === 'NET') return `${actor} HIT THE NET`;
    if (reason === 'OUT') return `${actor} LANDED OUT`;
    if (ownSide) return `${actor} LANDED SHORT`;
    if (miss && miss.actor !== winner) {
        const who = miss.actor === 0 ? 'YOUR RETURN' : 'AI RETURN';
        return `${who} ${miss.reason === 'early' ? 'WAS EARLY' : miss.reason === 'late' ? 'WAS LATE' : 'WAS OUT OF REACH'}`;
    }
    return winner === 0 ? 'AI COULD NOT RETURN' : 'YOU COULD NOT RETURN';
}
