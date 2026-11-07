import { describe, expect, it } from 'vitest';
import { shuttleContrast } from '../src/shuttle-contrast';

const flight = {
    cork: { x: 420, y: 45, z: 12 },
    tail: { x: 421, y: 48, z: 12 },
    height: 9,
    width: 844,
    viewportHeight: 390,
    rally: true,
    paused: false,
    contact: false,
};
describe('high shuttle silhouette', () => {
    it('anchors to the rendered cork rather than a clamped or predicted point', () => {
        const cue = shuttleContrast(flight);
        expect(cue).toMatchObject({ visible: true, opacity: 1, x: 420, y: 45 });
        expect(cue.angle).toBeCloseTo(161.565, 3);
    });
    it('never overlays an actual racket contact, low return, pause or resolved point', () => {
        for (const change of [
            { contact: true },
            { height: 3.4 },
            { paused: true },
            { rally: false },
        ])
            expect(shuttleContrast({ ...flight, ...change }).visible).toBe(false);
    });
    it('fades continuously as the shuttle approaches and removes itself when the real model is legible', () => {
        expect(shuttleContrast({ ...flight, height: 4.1 }).opacity).toBeCloseTo(0.5);
        expect(
            shuttleContrast({ ...flight, tail: { x: 420, y: 52.5, z: 12 } }).opacity,
        ).toBeCloseTo(0.5);
        expect(shuttleContrast({ ...flight, tail: { x: 420, y: 54, z: 12 } }).visible).toBe(false);
    });
    it('does not pin offscreen, behind-camera or invalid shuttle locations onto the viewport', () => {
        for (const cork of [
            { x: -1, y: 40, z: 12 },
            { x: 420, y: 45, z: -1 },
            { x: NaN, y: 45, z: 12 },
        ])
            expect(shuttleContrast({ ...flight, cork }).visible).toBe(false);
    });
});
