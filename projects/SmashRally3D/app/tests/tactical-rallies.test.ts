import { it, expect } from 'vitest';
import { Game } from '../src/game';
import { writeFileSync, mkdirSync } from 'node:fs';
it('replays ordinary command-driven tactical games and ignores an early air swing without a hit callback', () => {
    const games = [],
        kinds = new Set<string>();
    let earlyChecked = false;
    for (const level of ['EASY', 'NORMAL', 'HARD'] as const) {
        const g = new Game();
        g.difficulty = level;
        g.start();
        let last = -1,
            issued = 0,
            hits = 0;
        g.onHit = () => hits++;
        for (let i = 0; i < 24000 && g.phase !== 'RESULTS'; i++) {
            if (g.phase === 'SERVE_READY' && g.server === 0)
                g.command({
                    shotIntent: 'clear',
                    target: { x: 0, y: 0.025, z: 5.8 },
                    issuedAt: g.time,
                    pointerType: 'unit',
                });
            if (
                !earlyChecked &&
                g.phase === 'RALLY' &&
                g.receiver === 0 &&
                g.contactAt - g.time > 0.6
            ) {
                const before = hits;
                g.command({
                    shotIntent: 'default',
                    target: { x: 0, y: 0.025, z: 1.2 },
                    issuedAt: g.time,
                    pointerType: 'unit',
                });
                g.step();
                expect(hits).toBe(before);
                expect(g.actors[0].command).toBeNull();
                earlyChecked = true;
            }
            if (
                g.phase === 'RALLY' &&
                g.receiver === 0 &&
                last !== g.contactAt &&
                g.contactAt - g.time < g.inputLead('default') + 0.025 &&
                g.contactAt - g.time > 0.06
            ) {
                last = g.contactAt;
                const intent = (
                    ['clear', 'drop', 'default', 'default', 'clear', 'default'] as const
                )[issued % 6];
                g.command({
                    shotIntent: intent,
                    target: {
                        x: issued % 2 ? -1.8 : 1.8,
                        y: 0.025,
                        z:
                            intent === 'drop' || (intent === 'default' && issued % 3 === 0)
                                ? 1.2
                                : 5.8,
                    },
                    issuedAt: g.time,
                    pointerType: 'unit',
                });
                issued++;
            }
            g.step();
        }
        expect(g.phase).toBe('RESULTS');
        expect(hits).toBe(g.shots.length);
        g.shots.forEach((h) => kinds.add(h.technique));
        games.push({
            difficulty: level,
            scores: g.scores,
            issued,
            points: g.points,
            splitEvents: g.splitEvents.length,
            shots: g.shots.map(
                ({
                    actor,
                    p,
                    technique,
                    quality,
                    target,
                    recoveryBase,
                    balance,
                    preparation,
                    strokeReason,
                    velocity,
                }) => ({
                    actor,
                    p,
                    technique,
                    quality,
                    target,
                    recoveryBase,
                    balance,
                    preparation,
                    strokeReason,
                    velocity,
                }),
            ),
        });
    }
    expect(earlyChecked).toBe(true);
    expect(kinds.size).toBeGreaterThanOrEqual(4);
    const out = '../verification/tactics-20261015';
    mkdirSync(out, { recursive: true });
    writeFileSync(
        out + '/domain-tactical-scenarios.json',
        JSON.stringify(
            {
                method: 'Normal Game.start/command/step with precise domain contact-time scheduling; no state injection. This is NOT browser/human play.',
                games,
                techniques: [...kinds],
                earlyMissEmittedHit: false,
            },
            null,
            2,
        ),
    );
});
