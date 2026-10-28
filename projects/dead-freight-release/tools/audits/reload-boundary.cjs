'use strict';
const assert = require('node:assert/strict'), path = require('node:path');
const app = process.argv[2] || path.resolve(__dirname, '../../app'), { Mission } = require(path.join(app, 'core.js')), I = require(path.join(app, 'inventory.js')), { Bridge } = require(path.join(app, 'inventory-game.js'));
let checks = 0;
function setup(kind) { const inventory = I.starter(), stack = inventory.get('weapon:0'); Object.assign(stack, { rounds: kind === 'tactical' ? 5 : kind === 'chamber' ? 10 : 0, chamber: kind === 'tactical' ? 1 : 0 }); const world = new Mission(1, 1, 731, { world: false, rifleDefinitionId: 'r4' }); world.enemies = []; world.pickups = []; world.walls = []; world.rebuildSpatialIndex(); const bridge = new Bridge(world, inventory, { caches: false }); world.weaponActionBlocked = true; return { world, inventory, bridge }; }
function total(inv) { return inv.countItem('ammo-rifle') + inv.all().filter(e => e.stack.itemId === 'r4').reduce((n, e) => n + e.stack.rounds, 0); }
function advance(f, time, hz) { while (time > 1e-10) {
    const dt = Math.min(time, 1 / hz);
    f.bridge.beforeStep();
    f.world.tick(dt);
    f.bridge.afterStep(dt);
    time -= dt;
} }
for (const hz of [30, 60, 120])
    for (const kind of ['tactical', 'empty', 'chamber'])
        for (const delta of [-1e-6, 0, 1e-6])
            for (const operation of ['cancel', 'swap', 'holster', 'item', 'death']) {
                const f = setup(kind);
                advance(f, .6, hz);
                f.world.weaponActionBlocked = false;
                const initial = total(f.inventory), bagBefore = f.inventory.countItem("ammo-rifle"), magBefore = f.world.rifle.magazine, chamberBefore = f.world.rifle.chamber;
                assert(f.world.load());
                const plan = f.world.rifle.config.reload[kind], checkpoint = kind === 'chamber' ? plan.chamberAt : plan.transferAt;
                advance(f, checkpoint + delta, hz);
                const transferred = f.world.rifle.total;
                assert.equal(f.inventory.countItem("ammo-rifle"), bagBefore - (kind !== "chamber" && delta >= 0 ? f.world.rifle.config.magazineSize - magBefore : 0));
                if (kind === "chamber")
                    assert.equal(f.world.rifle.chamber, delta >= 0 ? 1 : chamberBefore);
                if (operation === 'cancel')
                    f.bridge.beforeWeaponChange('audit-cancel');
                if (operation === 'swap')
                    assert(f.bridge.equipWeapon(1).ok);
                if (operation === 'holster')
                    assert(f.bridge.holsterWeapon().ok);
                if (operation === 'item')
                    assert(f.bridge.requestUse('quick:1').ok);
                if (operation === 'death')
                    f.world.damage(1000);
                f.bridge.syncFromWorld();
                assert.equal(total(f.inventory), initial);
                for (let i = 0; i < 10; i++)
                    f.bridge.syncFromWorld();
                assert.equal(total(f.inventory), initial);
                assert.equal(f.inventory.get('weapon:0').rounds, transferred);
                checks++;
            }
console.log(JSON.stringify({ audit: 'reload commit boundary conservation', cases: checks, status: 'passed', frameRates: [30, 60, 120], deltas: [-1e-6, 0, 1e-6], operations: ['cancel', 'swap', 'holster', 'item', 'death'], modelOnly: true }));
