'use strict';
const assert = require('node:assert/strict'), path = require('node:path'), app = process.argv[2] || path.resolve(__dirname, '../../app');
const { Mission } = require(path.join(app, 'core.js')), I = require(path.join(app, 'inventory.js')), { Bridge } = require(path.join(app, 'inventory-game.js')), { timings } = require(path.join(app, 'item-action.js'));
let cases = 0;
function setup(id) { const world = new Mission(1, 1, 731, { world: false, rifleDefinitionId: 'r4' }); world.enemies = []; world.pickups = []; world.walls = []; world.rebuildSpatialIndex(); world.player.hp = 30; const inventory = I.starter(), bridge = new Bridge(world, inventory, { caches: false }), location = id === 'frag' ? 'quick:1' : 'quick:0'; assert(bridge.requestUse(location).ok); return { world, inventory, bridge, location }; }
function advance(f, time, hz) { while (time > 1e-10) {
    const dt = Math.min(time, 1 / hz);
    f.bridge.beforeStep();
    f.world.tick(dt);
    f.bridge.afterStep(dt);
    f.bridge.stepUse(dt, { yaw: 0, pitch: 0 });
    time -= dt;
} }
for (const hz of [30, 60, 120])
    for (const id of ['frag', 'bandage'])
        for (const delta of [-1e-6, 0, 1e-6])
            for (const operation of ['cancel', 'damage', 'death', 'pause', 'weapon']) {
                const f = setup(id), before = f.inventory.countItem(id), t = timings[id];
                advance(f, t.lower + t.present, hz);
                if (id === 'frag') {
                    assert(f.bridge.triggerUse({ input: 'KeyF' }));
                    advance(f, .1, hz);
                    assert(f.bridge.releaseUse('KeyF'));
                }
                advance(f, t.commit + delta, hz);
                assert.equal(f.inventory.countItem(id), before - (delta >= 0 ? 1 : 0));
                if (operation === 'cancel')
                    f.bridge.cancelUse('audit');
                if (operation === 'damage')
                    f.world.damage(1);
                if (operation === 'death')
                    f.world.damage(1000);
                if (operation === 'pause') {
                    f.world.setPaused(true);
                    f.bridge.stepUse(1 / hz);
                    f.world.setPaused(false);
                }
                if (operation === 'weapon') {
                    f.bridge.cancelUse('weapon-select');
                    assert(f.bridge.equipWeapon(1).ok);
                }
                advance(f, 3, hz);
                assert.equal(f.inventory.countItem(id), before - (delta >= 0 ? 1 : 0));
                const effect = id === 'frag' ? 'throw' : 'heal';
                assert.equal(f.world.events.filter(e => e.type === effect).length, delta >= 0 ? 1 : 0);
                if (operation === 'death')
                    assert.equal(f.world.player.hp, 0);
                cases++;
            }
for (const hz of [30, 60, 120])
    for (const order of ['cancel-release', 'release-cancel', 'damage-release', 'release-damage', 'death-release', 'release-death']) {
        const f = setup('frag'), before = f.inventory.countItem('frag');
        advance(f, timings.frag.lower + timings.frag.present, hz);
        assert(f.bridge.triggerUse({ input: 'KeyF' }));
        advance(f, .1, hz);
        for (const action of order.split('-')) {
            if (action === 'release')
                f.bridge.releaseUse('KeyF');
            if (action === 'cancel')
                f.bridge.cancelUse('audit');
            if (action === 'damage')
                f.world.damage(1);
            if (action === 'death')
                f.world.damage(1000);
        }
        advance(f, 3, hz);
        assert.equal(f.inventory.countItem('frag'), before);
        assert.equal(f.world.events.filter(e => e.type === 'throw').length, 0);
        cases++;
    }
console.log(JSON.stringify({ audit: 'item commit and release interruption races', cases, status: 'passed', frameRates: [30, 60, 120], modelOnly: true }));
