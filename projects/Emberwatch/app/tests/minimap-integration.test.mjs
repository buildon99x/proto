// Actual entrypoint with mocked Canvas/DOM; not browser play evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runtime} from './helpers/warrior-runtime.mjs';

for (const isometric of [false,true]) test(`minimap controls preserve save and visibility in ${isometric?'isometric':'fallback'} renderer`,()=>{
  const t=runtime();t.beginRun();if(isometric)t.visualStub();
  assert.equal(t.mapState().showMap,false);
  t.render();t.key('m');assert.equal(t.mapState().showMap,true);
  const before=JSON.stringify(t.read());t.render();assert.equal(JSON.stringify(t.read()),before);
  t.key('h');assert.equal(t.mapState().cleanView,true);t.render();
  t.key('h');t.key('m');assert.equal(t.mapState().showMap,false);t.render();
  t.persist();const saved=t.storage.get('emberwatch-save');
  const resumed=runtime(saved);resumed.resumeRun();resumed.key('m');resumed.render();
  assert.equal(resumed.read().run.floor,t.read().run.floor);
  assert.equal(resumed.read().p.x,t.read().p.x);
  assert.equal(resumed.read().p.y,t.read().p.y);
});

test('static and standalone packaging include the shared minimap without campaign activation',async()=>{
  const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');
  const standalone=await readFile(new URL('../scripts/build-standalone.mjs',import.meta.url),'utf8');
  const game=await readFile(new URL('../src/game.js',import.meta.url),'utf8');
  assert(build.includes("'minimap.js'"));
  assert(standalone.indexOf("inlineModule('minimap.js')")>standalone.indexOf("inlineModule('visual.js')"));
  assert.match(game,/import \{drawMinimap\} from '.\/minimap.js'/);
  assert(!/^import .*campaign\//m.test(game));
});
