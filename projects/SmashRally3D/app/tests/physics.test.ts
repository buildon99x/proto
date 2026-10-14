import { describe, it, expect } from 'vitest';
import {
    CFG,
    advance,
    clone,
    flight,
    inside,
    quality,
    chooseShot,
    solve,
    sweep,
} from '../src/physics';
import type { Shot } from '../src/physics';
import { Game } from '../src/game';
describe('authoritative drag physics', () => {
    it('sweeps fast net/ground and includes cork touching lines', () => {
        expect(sweep({ x: 0, y: 1, z: -1 }, { x: 0, y: 1, z: 1 })?.reason).toBe('NET');
        expect(sweep({ x: 0, y: 2, z: -1 }, { x: 0, y: 2, z: 1 })).toBeNull();
        expect(inside({ x: 2.59, y: 0.025, z: 6.7 })).toBe(true);
        expect(inside({ x: 2.7, y: 0.025, z: 6.7 })).toBe(false);
    });
    it('checks 1000 numerical launches against runtime flight and left/right aim', () => {
        let max = 0;
        for (let i = 0; i < 1000; i++) {
            const shot: Shot = ['clear', 'drive', 'drop', 'smash', 'superSmash'][i % 5] as Shot,
                start = {
                    x: Math.sin(i) * 1.5,
                    y: i % 5 >= 3 ? 2.7 : 1.7,
                    z: -1.5 - (i % 6) * 0.7,
                },
                target = {
                    x: Math.cos(i * 7) * 2,
                    y: 0.025,
                    z: shot === 'drop' ? 1.2 : 3 + (i % 4) * 0.9,
                },
                s = solve(start, target, shot),
                p = clone(start),
                v = clone(s.velocity);
            let actual = null;
            for (let k = 0; k < 720; k++) {
                const old = clone(p);
                advance(p, v);
                actual = sweep(old, p);
                if (actual) break;
            }
            expect(actual).not.toBeNull();
            expect(actual!.reason).toBe(s.prediction.reason);
            expect(
                Math.hypot(actual!.p.x - s.prediction.end.x, actual!.p.z - s.prediction.end.z),
            ).toBeLessThan(1e-9);
            if (s.prediction.reason !== 'NET') {
                max = Math.max(max, s.error);
                expect(s.error).toBeLessThan(0.08);
                expect(Math.sign(s.prediction.end.x - start.x)).toBe(Math.sign(target.x - start.x));
            }
        }
        console.log('1000 shots: max landing error', max);
    }, 30000);
    it('clear/drop/smash have different flight envelopes and smash decelerates', () => {
        const start = { x: 0, y: 2.7, z: -2.5 },
            clear = solve(start, { x: 1, y: 0.025, z: 5.8 }, 'clear'),
            drop = solve(start, { x: 1, y: 0.025, z: 1.2 }, 'drop'),
            smash = solve(start, { x: 1, y: 0.025, z: 4 }, 'smash');
        expect(clear.prediction.apex).toBeGreaterThan(drop.prediction.apex + 3);
        expect(clear.prediction.time).toBeGreaterThan(smash.prediction.time);
        const v = clone(smash.velocity),
            p = clone(start),
            speed = Math.hypot(v.x, v.y, v.z);
        for (let i = 0; i < 20; i++) advance(p, v);
        expect(Math.hypot(v.x, v.y, v.z)).toBeLessThan(speed);
    });
    it('quality and super-smash conditions remain independent', () => {
        expect([0, 0.1, 0.2, 0.4].map(quality)).toEqual(['perfect', 'good', 'weak', 'miss']);
        expect(chooseShot('default', 2.7, true, 10, 'perfect', true)).toBe('superSmash');
        for (const args of [
            [2.0, true, 10, 'perfect', true],
            [2.7, false, 10, 'perfect', true],
            [2.7, true, 20, 'perfect', true],
            [2.7, true, 10, 'good', true],
            [2.7, true, 10, 'perfect', false],
        ] as const)
            expect(chooseShot('default', ...args)).not.toBe('superSmash');
    });
});
describe('match and contact', () => {
    it('bounded travel, one event per actual contact, 10 full matches', () => {
        let maxRally = 0;
        for (let m = 0; m < 10; m++) {
            const g = new Game();
            g.difficulty = 'EASY';
            g.start();
            let hits = 0;
            g.onHit = () => hits++;
            let last = -1;
            for (let i = 0; i < 120 * 240 && g.phase !== 'RESULTS'; i++) {
                if (g.phase === 'SERVE_READY' && g.server === 0)
                    g.command({
                        shotIntent: 'clear',
                        target: { x: 0, y: 0, z: 5.4 },
                        issuedAt: g.time,
                        pointerType: 'test',
                    });
                if (
                    g.phase === 'RALLY' &&
                    g.receiver === 0 &&
                    g.contactAt - g.time < 0.14 &&
                    g.contactAt !== last
                ) {
                    last = g.contactAt;
                    g.command({
                        shotIntent: g.shots.length < 10 ? 'clear' : 'default',
                        target: { x: g.shots.length < 10 ? 0 : 2.2, y: 0, z: 5.6 },
                        issuedAt: g.time,
                        pointerType: 'test',
                    });
                }
                const before = g.actors.map((a) => clone(a.p));
                g.step();
                if (g.phase === 'RALLY')
                    g.actors.forEach((a, i) =>
                        expect(Math.hypot(a.p.x - before[i].x, a.p.z - before[i].z)).toBeLessThan(
                            CFG.speed * CFG.dt + 0.004,
                        ),
                    );
                maxRally = Math.max(maxRally, g.returns);
            }
            expect(g.phase).toBe('RESULTS');
            expect(Math.max(...g.scores)).toBe(5);
            expect(hits).toBe(g.shots.length);
            expect(g.points.reduce((n, p) => n + (p.winner === 0 ? 1 : 0), 0)).toBe(g.scores[0]);
        }
        console.log('10 simulated matches, max returns', maxRally);
    }, 30000);
    it('all AI profiles obey shared travel and contact reach',()=>{
        for(const difficulty of ['EASY','NORMAL','HARD'] as const){
            const g=new Game();g.difficulty=difficulty;g.start();let contacts=0,last=-1;
            g.onHit=h=>{contacts++;const a=g.actors[h.actor];expect(Math.hypot(h.p.x-(a.p.x+.35),h.p.z-(a.p.z-a.side*.3))).toBeLessThanOrEqual(CFG.reach);};
            for(let n=0;n<120*30;n++){
                if(g.phase==='SERVE_READY'&&g.server===0)g.command({shotIntent:'clear',target:{x:0,y:0,z:5.8},issuedAt:g.time,pointerType:'unit'});
                if(g.phase==='RALLY'&&g.receiver===0&&g.contactAt-g.time<.14&&g.contactAt!==last){last=g.contactAt;g.command({shotIntent:'clear',target:{x:0,y:0,z:5.8},issuedAt:g.time,pointerType:'unit'});}
                const phase=g.phase, before=g.actors.map(a=>clone(a.p));g.step();
                if(phase==='RALLY'&&g.phase==='RALLY')g.actors.forEach((a,i)=>expect(Math.hypot(a.p.x-before[i].x,a.p.z-before[i].z)).toBeLessThan(CFG.speed*CFG.dt+.004));
            }
            expect(contacts).toBeGreaterThan(2);
        }
    });
    it('pause freezes and unreachable commands do not invent hits', () => {
        const g = new Game();
        g.start();
        g.paused = true;
        for (let i = 0; i < 120; i++) g.step();
        expect(g.time).toBe(0);
        g.paused = false;
        g.phase = 'RALLY';
        g.receiver = 0;
        g.contactAt = Infinity;
        g.command({
            shotIntent: 'default',
            target: { x: 0, y: 0, z: 3 },
            issuedAt: 0,
            pointerType: 'test',
        });
        expect(g.shots).toHaveLength(0);
        expect(g.message).toBe('OUT OF REACH');
    });
});
