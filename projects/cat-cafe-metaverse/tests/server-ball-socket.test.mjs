import test from 'node:test';import assert from 'node:assert/strict';import {runBallSocketSmoke} from '../server/ball-socket-smoke.mjs';
test('post-fix ball preserves decoded clearance and socket reconnect/room isolation', {timeout:15000},async()=>{const result=await runBallSocketSmoke();assert.equal(result.passed,true);assert.ok(result.observedBallFrames>=50);});
