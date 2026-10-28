'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), app = process.argv[2] || path.resolve(__dirname, '../../app'), { Mission } = require(path.join(app, 'core.js')), B = require(path.join(app, 'muzzle-ballistics.js'));
let cases = 0;
const eye = { x: 0, y: 1.62, z: 0 }, muzzle = { x: .22, y: 1.44, z: -.7 }, target = { x: 0, y: 1.12, z: -20 };
for (const hz of [30, 60, 120])
    for (const weapon of [0, 1, 2, 3])
        for (const thickness of [.0001, .01, .2])
            for (const reverse of [false, true]) {
                const w = new Mission(1, 1, 731, { world: false, rifleDefinitionId: 'r4' });
                w.player.x = 0;
                w.player.z = 0;
                w.enemies = [{ id: 0, x: 0, y: 0, z: -20, alive: true, hp: 1000, armor: 0, helmet: 0, alert: false, attack: 1000, homeX: 0, homeZ: -20 }];
                w.pickups = [];
                w.walls = [];
                w.rebuildSpatialIndex();
                w.switchWeapon(weapon);
                for (let i = 0; i < Math.ceil(.6 * hz); i++)
                    w.tick(1 / hz);
                const near = w.wall(.20, -2, .18, thickness, 2.5, 'steel'), far = w.wall(.18, -4, .18, thickness, 2.5, 'steel');
                if (reverse) {
                    const candidates = w.wallCandidates.bind(w);
                    w.wallCandidates = (...args) => Array.from(candidates(...args)).reverse();
                }
                assert.equal(B.trace(w, eye, target), null);
                const q = B.resolve(w, eye, muzzle, target);
                assert(!q.blocked);
                assert.equal(q.hit.wall.id, near.id);
                const hp = w.enemies[0].hp, ammo = w.ammo[weapon], config = w.shotConfig(), d = { x: target.x - muzzle.x, y: target.y - muzzle.y, z: target.z - muzzle.z };
                if (weapon === 3)
                    assert(w.requestTrigger());
                assert(w.fire(null, { ballistic: { origin: muzzle, directions: Array.from({ length: config.pellets }, () => ({ ...d })) } }));
                for (let i = 0; i < hz; i++)
                    w.tick(1 / hz);
                assert.equal(w.enemies[0].hp, hp);
                assert.equal(w.ammo[weapon], ammo - 1);
                assert.equal(w.hits, 0);
                assert.equal(w.kills, 0);
                assert.equal(w.playerBullets.log.length, config.pellets);
                assert(w.playerBullets.log.every(c => c.kind === 'wall' && c.id === near.id));
                assert.notEqual(near.id, far.id);
                cases++;
            }
console.log(JSON.stringify({ audit: 'camera-clear muzzle-cover first contact', cases, status: 'passed', frameRates: [30, 60, 120], weapons: [0, 1, 2, 3], wallThickness: [.0001, .01, .2], candidateOrder: ['forward', 'reverse'], modelOnly: true }));
