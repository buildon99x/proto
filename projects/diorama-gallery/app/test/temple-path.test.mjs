import test from 'node:test';import assert from 'node:assert/strict';import {isTempleStairFootprint} from '../src/desert-bank.js';
test('pedestrian path excludes the staircase footprint and edge margin',()=>{assert.equal(isTempleStairFootprint(-1.6,6.9,.2),true);assert.equal(isTempleStairFootprint(-1.8,4,.2),false);});
