import { it, expect } from 'vitest';
import { Game } from '../src/game';
import { shotFeedback, pointDetail, pointPrompt } from '../src/feedback';
it('explains real scoring faults and retains the same one-point/winner service rule', () => {
    const g = new Game();
    g.start();
    g.phase = 'RALLY';
    g.hitter = 0;
    g.point('NET', { x: 0, y: 1, z: 0 });
    expect(g.points.at(-1)?.detail).toBe('YOUR SHOT HIT THE NET');
    g.point('NET', { x: 0, y: 1, z: 0 });
    expect(g.scores).toEqual([0, 1]);
    expect(g.server).toBe(1);
    const h = new Game();
    h.start();
    h.phase = 'RALLY';
    h.hitter = 1;
    h.rallyMiss = { actor: 0, reason: 'late' };
    h.point('GROUND', { x: 0, y: 0.025, z: -5 });
    expect(h.points.at(-1)?.detail).toBe('YOUR RETURN WAS LATE');
    h.serveReady();
    expect(h.rallyMiss).toBeNull();
    h.rallyMiss = { actor: 0, reason: 'early' };
    h.incomingWeak = true;
    h.v = { x: 20, y: -8, z: 0 };
    h.p = { x: 2, y: 0.025, z: -6 };
    h.start();
    expect(h.rallyMiss).toBeNull();
    expect(h.incomingWeak).toBe(false);
    expect(h.contactAt).toBe(Infinity);
    expect(h.p).toEqual({ x: 0.35, y: 1.1, z: -3.1 });
    expect(h.v).toEqual({ x: 0, y: 0, z: 0 });
    expect(h.points).toEqual([]);
    expect(h.scores).toEqual([0, 0]);
});
it('distinguishes actor, a genuine super hit and a legal safety fallback without inventing a stronger shot', () => {
    expect(shotFeedback(0, 'perfect', 'superSmash', null)).toBe('YOU · PERFECT · SUPER SMASH');
    expect(shotFeedback(1, 'good', 'block', null)).toBe('AI · GOOD · BLOCK');
    expect(shotFeedback(0, 'perfect', 'drop', 'NO_LEGAL_DESCENDING_ATTACK')).toBe(
        'YOU · DROP · SAFE RETURN, AIM DEEPER',
    );
    expect(shotFeedback(0, 'perfect', 'smash', 'NO_STRONGER_LEGAL_ATTACK')).toBe(
        'YOU · SMASH · SUPER ANGLE TOO TIGHT',
    );
    expect(pointDetail(0, 1, 'OUT', false, null)).toBe('AI SHOT LANDED OUT');
    expect(pointDetail(1, 1, 'GROUND', false, { actor: 0, reason: 'early' })).toBe(
        'YOUR RETURN WAS EARLY',
    );
    expect(pointDetail(0, 0, 'GROUND', false, { actor: 1, reason: 'reach' })).toBe(
        'AI RETURN WAS OUT OF REACH',
    );
});

it('preserves the real missed-window reason when a subsequent tap finds no remaining contact', () => {
    const g = new Game();
    g.start();
    g.phase = 'RALLY';
    g.receiver = 0;
    g.contactAt = Infinity;
    g.rallyMiss = { actor: 0, reason: 'late' };
    g.command({
        shotIntent: 'default',
        target: { x: 0, y: 0.025, z: 5.8 },
        issuedAt: g.time,
        pointerType: 'unit',
    });
    expect(g.message).toBe('TOO LATE');
    expect(g.rallyMiss?.reason).toBe('late');
    expect(g.shots).toHaveLength(0);
    expect(g.scores).toEqual([0, 0]);
});

it('routes a terminal point to results rather than promising another serve', () => {
    expect(pointPrompt(0, false)).toContain('YOUR SERVE NEXT');
    expect(pointPrompt(1, false)).toContain('RECEIVE NEXT');
    expect(pointPrompt(0, true)).toBe('MATCH WON · RESULTS NEXT');
    expect(pointPrompt(1, true)).toBe('MATCH LOST · RESULTS NEXT');
    expect(pointPrompt(0, true)).not.toContain('SERVE');
});
