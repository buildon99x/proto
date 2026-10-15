import { it, expect } from 'vitest';
import { Game, type Intent } from '../src/game';

// Command-driven ordinary EASY return; no ball/actor injection or invented hits.
function reserved(intent: Intent = 'default') {
    const g = new Game();
    g.difficulty = 'EASY';
    g.start();
    while (g.phase !== 'SERVE_READY') g.step();
    g.command({
        shotIntent: 'clear',
        target: { x: 0, y: 0.025, z: 5.8 },
        issuedAt: g.time,
        pointerType: 'touch',
    });
    for (
        let n = 0;
        n < 5000 && !(g.phase === 'RALLY' && g.receiver === 0 && g.contactAt - g.time < 0.3);
        n++
    )
        g.step();
    expect(g.receiver).toBe(0);
    const cmd = {
        shotIntent: intent,
        target: { x: 0, y: 0.025, z: 5.8 },
        issuedAt: g.time,
        pointerType: 'touch',
        touchReservation: true,
        gestureId: 1,
    };
    g.command(cmd);
    while (!g.actors[0].locked && g.phase === 'RALLY') g.step();
    expect(g.actors[0].locked).toBe(true);
    return { g, cmd, a: g.actors[0] };
}
function hit(g: Game) {
    const before = g.shots.length;
    for (let n = 0; n < 1000 && g.shots.length === before && g.phase === 'RALLY'; n++) g.step();
    expect(g.shots.length).toBe(before + 1);
    return g.shots.at(-1)!;
}
for (const intent of ['clear', 'drop'] as const) {
    it(`late ${intent} classification before hit-frame changes only the reserved intention`, () => {
        const { g, cmd, a } = reserved();
        const start = a.swingAt,
            frame = a.hitFrame;
        while (g.contactAt - g.time > 0.04) g.step();
        expect(a.frameEmitted).toBe(false);
        const classified = { ...cmd, shotIntent: intent, touchReservation: false };
        g.command(classified);
        const accepted = a.command === classified;
        const remaining = g.contactAt - g.time;
        const unchangedClock = a.swingAt === start && a.hitFrame === frame;
        const h = hit(g);
        console.log(
            'MOBILE_BOUNDARY',
            JSON.stringify({
                intent,
                remaining,
                accepted,
                unchangedClock,
                actual: {
                    actor: h.actor,
                    shot: h.shot,
                    technique: h.technique,
                    time: h.time,
                    target: h.target,
                    quality: h.quality,
                },
            }),
        );
        expect(accepted).toBe(true);
        expect(a.swingAt).toBe(start);
        expect(a.hitFrame).toBe(frame);
        expect(classified.target).toEqual(cmd.target);
        expect(h.actor).toBe(0);
        expect(h.shot).toBe(intent);
        const count = g.shots.length;
        g.command(classified);
        for (let n = 0; n < 20; n++) g.step();
        expect(g.shots.length).toBe(count);
    });
}
it('first physical attempt freezes classification, even if it has not yet collided', () => {
    const { g, cmd, a } = reserved('clear');
    while (!a.frameEmitted && g.receiver === 0) g.step();
    expect(g.contactAttempts.at(-1)?.valid).toBe(false);
    const previous = a.command,
        shots = JSON.stringify(g.shots),
        motion = a.swingMotion;
    g.command({ ...cmd, shotIntent: 'drop', touchReservation: false });
    expect(a.command).toBe(previous);
    expect(a.swingMotion).toBe(motion);
    expect(JSON.stringify(g.shots)).toBe(shots);
});
it('post-contact classification and cancellation cannot rewrite or duplicate a hit', () => {
    const { g, cmd } = reserved();
    hit(g);
    const shots = JSON.stringify(g.shots),
        count = g.shots.length;
    g.command({ ...cmd, shotIntent: 'drop', touchReservation: false });
    g.cancelTouchCommand(cmd.issuedAt, cmd.gestureId);
    expect(JSON.stringify(g.shots)).toBe(shots);
    for (let n = 0; n < 20; n++) g.step();
    expect(g.shots.length).toBe(count);
});
it('owning pointer cancellation stops prepared contact before its hit-frame', () => {
    const { g, cmd, a } = reserved();
    const before = g.shots.filter((h) => h.actor === 0).length;
    g.cancelTouchCommand(cmd.issuedAt, cmd.gestureId);
    expect(a.command).toBeNull();
    expect(a.locked).toBe(false);
    for (let n = 0; n < 120; n++) g.step();
    expect(g.shots.filter((h) => h.actor === 0).length).toBe(before);
});
it('another gesture with the same simulation timestamp cannot classify or cancel the owner', () => {
    const { g, cmd, a } = reserved();
    g.command({ ...cmd, gestureId: 2, shotIntent: 'drop', touchReservation: false });
    g.cancelTouchCommand(cmd.issuedAt, 2);
    expect(a.command).toBe(cmd);
    expect(a.locked).toBe(true);
});
it('a held tap reserves immediately and emits one physical return without pointerup', () => {
    const { g, cmd, a } = reserved();
    expect(a.command).toBe(cmd);
    expect(hit(g).actor).toBe(0);
});
