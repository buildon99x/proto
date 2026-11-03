import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiagnosticRun, summarizeIntervals } from './frame-diagnostic.js';

// A controlled browser scheduler exercises the actual run controller without GPU or wall-clock timing.
function harness({ draw, visible = true } = {}) {
  let time = 0, sequence = 0, focused = true;
  const frames = new Map(), timers = new Map(), updates = [];
  const run = createDiagnosticRun({
    now: () => time,
    requestFrame: callback => { const id = ++sequence; frames.set(id, callback); return id; },
    cancelFrame: id => frames.delete(id),
    setTimer: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, at: time + delay }); return id; },
    clearTimer: id => timers.delete(id),
    isVisible: () => visible,
    getEnvironment: () => ({ visible, focused, dpr: 2 }),
    draw: draw ? () => draw({ advance: amount => { time += amount; } }) : null,
    onUpdate: value => updates.push(value),
  });
  return {
    run, frames, timers, updates,
    visible(value) { visible = value; },
    focused(value) { focused = value; },
    frame(at) { time = at; const first = frames.entries().next().value; assert.ok(first, 'a frame is scheduled'); frames.delete(first[0]); first[1](at - 7); },
    timer(at) { time = at; for (const [id, timer] of [...timers]) if (timer.at <= at) { timers.delete(id); timer.callback(); } },
  };
}

test('interval summary uses nearest-rank percentiles and preserves long visible hitches', () => {
  assert.deepEqual(summarizeIntervals([]), { samples: 0, p50Ms: null, p95Ms: null, maxMs: null });
  assert.deepEqual(summarizeIntervals([16, 16, 17, 1014]), { samples: 4, p50Ms: 16, p95Ms: 1014, maxMs: 1014 });
});

test('RAF baseline measures actual callback entry, does not invent draw samples, and never auto-starts', () => {
  const h = harness();
  assert.equal(h.frames.size, 0);
  h.run.start();
  h.frame(10); h.frame(26); h.frame(1040);
  const result = h.run.read();
  assert.equal(result.callbacks, 3);
  assert.deepEqual(result.raf, { samples: 2, retainedSamples: 2, p50Ms: 16, p95Ms: 1014, maxMs: 1014 });
  assert.equal(result.draw, null);
});

test('draw mode records successful return timestamps separately from callback entry timestamps', () => {
  let calls = 0;
  const h = harness({ draw: ({ advance }) => advance(++calls === 1 ? 2 : 7) });
  h.run.start(); h.frame(10); h.frame(26);
  assert.equal(h.run.read().raf.p50Ms, 16);
  assert.equal(h.run.read().draw.p50Ms, 21);
  assert.equal(h.run.read().draws, 2);
});

test('the 15 second deadline stops scheduling even if RAF never fires', () => {
  const h = harness(); h.run.start();
  h.timer(15000);
  assert.equal(h.run.read().status, 'complete');
  assert.equal(h.run.read().elapsedMs, 15000);
  assert.equal(h.run.read().raf.samples, 0);
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
});

test('a late RAF cannot draw or add measurements beyond the bounded window', () => {
  let draws = 0;
  const h = harness({ draw: () => { draws++; } });
  h.run.start(); h.frame(10); h.frame(15001);
  assert.equal(draws, 1);
  assert.equal(h.run.read().callbacks, 1);
  assert.equal(h.run.read().status, 'complete');
  assert.equal(h.frames.size, 0);
  assert.equal(h.timers.size, 0);
});

test('repeated Start is idempotent and Stop preserves samples while clearing work', () => {
  const h = harness(); h.run.start(); h.frame(5); h.frame(21);
  h.run.start();
  assert.equal(h.frames.size, 1);
  assert.equal(h.timers.size, 1);
  h.run.stop();
  assert.equal(h.run.read().status, 'stopped');
  assert.equal(h.run.read().raf.samples, 1);
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
  h.run.reset();
  assert.equal(h.run.read().status, 'idle');
  assert.equal(h.run.read().callbacks, 0);
  assert.equal(h.run.read().raf.samples, 0);
});

test('hidden or context-loss invalidation clears samples, stops, and never auto-resumes', () => {
  const h = harness({ draw: () => {} });
  h.run.start(); h.frame(5); h.frame(21);
  h.run.invalidate('context-lost');
  assert.equal(h.run.read().status, 'interrupted');
  assert.equal(h.run.read().reason, 'context-lost');
  assert.equal(h.run.read().raf.samples, 0); assert.equal(h.run.read().draw.samples, 0);
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
  h.run.start(); h.frame(40); h.visible(false); h.frame(1040);
  assert.equal(h.run.read().status, 'interrupted');
  assert.equal(h.run.read().reason, 'hidden');
  assert.equal(h.run.read().callbacks, 0);
  h.visible(true);
  assert.equal(h.frames.size, 0);
});

test('Start while hidden is rejected without starting timers or RAF', () => {
  const h = harness({ visible: false }); h.run.start();
  assert.equal(h.run.read().reason, 'hidden');
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
});

test('a failed draw clears the contaminated run and exposes an error without rescheduling', () => {
  let fail = false;
  const h = harness({ draw: () => { if (fail) throw new Error('draw failed'); } });
  h.run.start(); h.frame(10); h.frame(26); fail = true; h.frame(42);
  assert.equal(h.run.read().status, 'error');
  assert.equal(h.run.read().reason, 'draw-failed');
  assert.equal(h.run.read().raf.samples, 0); assert.equal(h.run.read().draw.samples, 0);
  assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
});

test('a restarted run ignores an already queued callback from its predecessor', () => {
  const h = harness(); h.run.start();
  const stale = [...h.frames.values()][0];
  h.run.stop(); h.run.start(); stale();
  assert.equal(h.run.read().callbacks, 0);
  assert.equal(h.frames.size, 1);
});


test('bounded interval storage keeps total counts and whole-run maximum when its window wraps', () => {
  const h = harness(); h.run.start(); h.frame(0); h.frame(1500);
  for (let i = 1; i <= 5000; i++) h.frame(1500 + i);
  const result = h.run.read();
  assert.equal(result.raf.samples, 5001);
  assert.equal(result.raf.retainedSamples, 4096);
  assert.equal(result.raf.p50Ms, 1);
  assert.equal(result.raf.maxMs, 1500);
});

test('environment snapshots distinguish the start and end of a run', () => {
  const h = harness(); h.run.start(); h.frame(12); h.visible(false); h.focused(false); h.run.invalidate('hidden');
  assert.deepEqual(h.run.read().startedEnvironment, { visible: true, focused: true, dpr: 2 });
  assert.deepEqual(h.run.read().endedEnvironment, { visible: false, focused: false, dpr: 2 });
});

// Only browser scheduling, DOM and graphics APIs are replaced. The real page wiring runs.
async function pageHarness() {
  const { setupDiagnosticPage } = await import('./frame-diagnostic.js');
  const { readFile } = await import('node:fs/promises');
  class Element extends EventTarget {
    constructor() { super(); this.nodes = new Map(); this.children = []; this.textContent = ''; }
    querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element()); return this.nodes.get(selector); }
    replaceChildren(...children) { this.children = children; }
    setAttribute() {}
  }
  const html = await readFile(new URL('../diagnostics.html', import.meta.url), 'utf8');
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new Element()]));
  const frames = new Map(), timers = new Map(), contexts = [];
  let sequence = 0, time = 0, available = true, drawCalls = 0, networkCalls = 0;
  const document = new EventTarget();
  document.visibilityState = 'visible'; document.hasFocus = () => true;
  document.getElementById = id => elements.get(id);
  document.createElement = () => {
    const canvas = new Element();
    canvas.getContext = type => {
      contexts.push(type);
      if (!available || type !== '2d') return null;
      return { fillRect() { drawCalls++; } };
    };
    return canvas;
  };
  const host = new EventTarget();
  host.devicePixelRatio = 1.5; host.performance = { now: () => time };
  host.requestAnimationFrame = callback => { const id = ++sequence; frames.set(id, callback); return id; };
  host.cancelAnimationFrame = id => frames.delete(id);
  host.setTimeout = callback => { const id = ++sequence; timers.set(id, callback); return id; };
  host.clearTimeout = id => timers.delete(id);
  host.fetch = () => { networkCalls++; throw new Error('No network allowed'); };
  host.WebSocket = class { constructor() { networkCalls++; throw new Error('No room connection allowed'); } };
  Object.defineProperty(host, 'localStorage', { get() { throw new Error('No persistent results allowed'); } });
  elements.get('diagnostic-mode').value = 'raf';
  setupDiagnosticPage(document, host);
  return { elements, document, host, frames, timers, contexts,
    unavailable() { available = false; },
    get drawCalls() { return drawCalls; }, get networkCalls() { return networkCalls; },
    click(id) { elements.get(id).dispatchEvent(new Event('click')); },
    mode(value) { elements.get('diagnostic-mode').value = value; },
    frame(at) { time = at; const [id, callback] = frames.entries().next().value; frames.delete(id); callback(at); },
    value(mode, metric, selector) { return elements.get(`result-${mode}`).querySelector(`[data-metric="${metric}"]`).querySelector(selector).textContent; },
  };
}

test('actual page stays idle until Start, resets repeated runs, and terminates on hidden without network calls', async () => {
  const p = await pageHarness();
  assert.equal(p.frames.size, 0); assert.equal(p.contexts.length, 0);
  p.mode('canvas2d'); p.click('diagnostic-start');
  assert.equal(p.elements.get('diagnostic-mode').disabled, true);
  p.click('diagnostic-start'); assert.equal(p.frames.size, 1);
  p.frame(10); p.frame(26);
  p.click('diagnostic-stop');
  assert.equal(p.value('canvas2d', 'draw', '[data-count]'), '1 / 1');
  assert.match(p.elements.get('result-canvas2d').querySelector('[data-status]').textContent, /미완료/);
  assert.equal(p.drawCalls, 4);
  p.click('diagnostic-start'); p.frame(40); p.frame(56);
  p.document.visibilityState = 'hidden'; p.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(p.frames.size, 0); assert.equal(p.timers.size, 0);
  assert.equal(p.value('canvas2d', 'draw', '[data-count]'), '0 / 0');
  p.document.visibilityState = 'visible'; p.document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(p.frames.size, 0);
  p.click('diagnostic-reset');
  assert.equal(p.elements.get('diagnostic-stage').children.length, 0);
  assert.equal(p.networkCalls, 0);
});

test('failed graphics initialization clears a previous result rather than presenting stale measurements', async () => {
  const p = await pageHarness(); p.mode('canvas2d'); p.click('diagnostic-start');
  p.frame(10); p.frame(26); p.click('diagnostic-stop');
  assert.equal(p.value('canvas2d', 'draw', '[data-count]'), '1 / 1');
  p.unavailable(); p.click('diagnostic-start');
  assert.equal(p.value('canvas2d', 'draw', '[data-count]'), '0 / 0');
  assert.match(p.elements.get('result-canvas2d').querySelector('[data-status]').textContent, /실행 불가/);
  assert.equal(p.frames.size, 0); assert.equal(p.timers.size, 0);
});

test('a late context-loss event on a removed canvas cannot cancel a new run', async () => {
  const p = await pageHarness(); p.mode('canvas2d'); p.click('diagnostic-start');
  const oldCanvas = p.elements.get('diagnostic-stage').children[0];
  p.click('diagnostic-stop'); p.click('diagnostic-start'); p.frame(10);
  oldCanvas.dispatchEvent(new Event('contextlost'));
  assert.equal(p.frames.size, 1);
  assert.equal(p.elements.get('diagnostic-stop').disabled, false);
});

test('WebGL2 unavailability is explicit with no WebGL1 fallback or measurement loop', async () => {
  const p = await pageHarness(); p.mode('webgl2'); p.click('diagnostic-start');
  assert.deepEqual(p.contexts, ['webgl2']);
  assert.match(p.elements.get('diagnostic-status').textContent, /WebGL2.*실행 불가/);
  assert.equal(p.frames.size, 0); assert.equal(p.timers.size, 0);
});


test('mid-run blur and refocus remain disclosed even when both endpoint snapshots are focused', () => {
  const h = harness(); h.run.start(); h.frame(10);
  h.focused(false); h.run.observeEnvironment();
  h.focused(true); h.run.observeEnvironment();
  h.frame(26); h.run.stop();
  const result = h.run.read();
  assert.equal(result.focusChanges, 2);
  assert.equal(result.startedEnvironment.focused, true);
  assert.equal(result.endedEnvironment.focused, true);
  h.run.start(); assert.equal(h.run.read().focusChanges, 0);
});
