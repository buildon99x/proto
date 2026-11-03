// This page is an explicit, local measurement control. It never joins a room or sends results.
const RUN_MS = 15000;
const MAX_INTERVALS = 4096;

export function summarizeIntervals(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = fraction => sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? null;
  return { samples: sorted.length, p50Ms: at(.5), p95Ms: at(.95), maxMs: sorted.at(-1) ?? null };
}

function intervalStore() {
  let previous = null, samples = 0, maximum = null;
  const values = [];
  return {
    record(time) {
      if (!Number.isFinite(time) || (previous !== null && time < previous)) throw new Error('invalid-clock');
      if (previous !== null) {
        const interval = time - previous;
        values[samples % MAX_INTERVALS] = interval;
        samples++;
        maximum = Math.max(maximum ?? 0, interval);
      }
      previous = time;
    },
    read() {
      return { ...summarizeIntervals(values), samples, retainedSamples: values.length, maxMs: maximum };
    },
  };
}

// All timestamps are performance.now() readings, not the RAF callback's supplied timestamp.
// A deadline timer and a check before each callback/draw bound sampling to 15 seconds.
// Browser suspension can delay delivery of both RAF and timers; wallMs exposes that delay.
export function createDiagnosticRun({ now, requestFrame, cancelFrame, setTimer, clearTimer,
  isVisible, getEnvironment = () => null, draw = null, onUpdate = () => {} }) {
  let status = 'idle', reason = null, generation = 0, frameId = null, timerId = null;
  let startedAt = null, endedAt = null, startedEnvironment = null, endedEnvironment = null;
  let callbacks = 0, draws = 0, skippedCallbacks = 0, skippedDraws = 0, lastUpdate = 0;
  let focusChanges = 0, previousFocus = null;
  let raf = intervalStore(), returned = intervalStore();
  const read = () => {
    const wallMs = startedAt === null ? 0 : Math.max(0, (endedAt ?? now()) - startedAt);
    return { status, reason, callbacks, draws, skippedCallbacks, skippedDraws, focusChanges,
      elapsedMs: Math.min(RUN_MS, wallMs), wallMs, startedEnvironment, endedEnvironment,
      raf: raf.read(), draw: draw ? returned.read() : null };
  };
  const publish = () => onUpdate(read());
  const cancel = () => {
    generation++;
    if (frameId !== null) cancelFrame(frameId);
    if (timerId !== null) clearTimer(timerId);
    frameId = timerId = null;
  };
  const clearSamples = () => {
    raf = intervalStore(); returned = intervalStore();
    callbacks = draws = skippedCallbacks = skippedDraws = 0;
  };
  const observeEnvironment = () => {
    if (status !== 'running') return;
    const focused = getEnvironment()?.focused;
    if (typeof focused === 'boolean') {
      if (previousFocus !== null && focused !== previousFocus) focusChanges++;
      previousFocus = focused;
    }
  };
  const finish = (next, why = null, discard = false) => {
    observeEnvironment();
    cancel(); status = next; reason = why; endedAt = now(); endedEnvironment = getEnvironment();
    if (discard) clearSamples();
    publish();
  };
  const invalidate = why => finish('interrupted', why, true);
  const tick = token => {
    if (token !== generation || status !== 'running') return;
    frameId = null;
    if (!isVisible()) { invalidate('hidden'); return; }
    const entry = now();
    if (entry >= startedAt + RUN_MS) { skippedCallbacks++; finish('complete'); return; }
    try {
      raf.record(entry); callbacks++;
      if (draw) {
        draw(entry - startedAt);
        if (token !== generation || status !== 'running') return;
        const returnedAt = now();
        if (returnedAt >= startedAt + RUN_MS) { skippedDraws++; finish('complete'); return; }
        returned.record(returnedAt); draws++;
      }
    } catch (error) {
      if (error?.message === 'context-lost') invalidate('context-lost');
      else finish('error', error?.message === 'invalid-clock' ? 'invalid-clock' : 'draw-failed', true);
      return;
    }
    if (entry - lastUpdate >= 1000) { lastUpdate = entry; publish(); }
    frameId = requestFrame(() => tick(token));
  };
  return {
    read, observeEnvironment,
    get running() { return status === 'running'; },
    start() {
      if (status === 'running') return;
      cancel(); clearSamples();
      startedAt = now(); endedAt = null; lastUpdate = startedAt;
      startedEnvironment = getEnvironment(); endedEnvironment = null;
      focusChanges = 0; previousFocus = startedEnvironment?.focused ?? null;
      status = 'running'; reason = null;
      if (!isVisible()) { invalidate('hidden'); return; }
      const token = generation;
      timerId = setTimer(() => {
        if (token !== generation || status !== 'running') return;
        if (!isVisible()) invalidate('hidden'); else finish('complete');
      }, RUN_MS);
      frameId = requestFrame(() => tick(token));
      publish();
    },
    stop() { if (status === 'running') finish('stopped', 'user-stop'); },
    reset() {
      cancel(); clearSamples(); status = 'idle'; reason = null;
      startedAt = endedAt = startedEnvironment = endedEnvironment = null;
      focusChanges = 0; previousFocus = null;
      publish();
    },
    invalidate,
  };
}

function createControl(canvas, mode) {
  if (mode === 'raf') return { draw: null, dispose() {} };
  if (mode === 'canvas2d') {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D를 사용할 수 없습니다.');
    return {
      draw(elapsed) {
        if (context.isContextLost?.()) throw new Error('context-lost');
        context.fillStyle = '#142a31'; context.fillRect(0, 0, 640, 360);
        context.fillStyle = '#e6b97b';
        context.fillRect(260 + Math.sin(elapsed / 1000) * 60, 120, 120, 120);
      },
      dispose() {},
    };
  }
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) throw new Error('WebGL2를 사용할 수 없습니다. 다른 API로 대체하지 않습니다.');
  const shaders = [], buffers = [], programs = [];
  const dispose = () => {
    for (const buffer of buffers) gl.deleteBuffer(buffer);
    for (const program of programs) gl.deleteProgram(program);
    for (const shader of shaders) gl.deleteShader(shader);
    buffers.length = programs.length = shaders.length = 0;
  };
  try {
    const shader = (type, source) => {
      const value = gl.createShader(type);
      if (!value) throw new Error('WebGL2 셰이더를 만들 수 없습니다.');
      shaders.push(value); gl.shaderSource(value, source); gl.compileShader(value);
      if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error('WebGL2 셰이더 컴파일 실패');
      return value;
    };
    const vertex = shader(gl.VERTEX_SHADER, `#version 300 es
      in vec2 position; uniform float offset;
      void main() { gl_Position = vec4(position.x + offset, position.y, 0.0, 1.0); }`);
    const fragment = shader(gl.FRAGMENT_SHADER, `#version 300 es
      precision mediump float; out vec4 color;
      void main() { color = vec4(0.902, 0.725, 0.482, 1.0); }`);
    const program = gl.createProgram();
    if (!program) throw new Error('WebGL2 프로그램을 만들 수 없습니다.');
    programs.push(program); gl.attachShader(program, vertex); gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('WebGL2 프로그램 연결 실패');
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('WebGL2 버퍼를 만들 수 없습니다.');
    buffers.push(buffer); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.3, -.4, .3, -.4, 0, .4]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const offset = gl.getUniformLocation(program, 'offset');
    gl.viewport(0, 0, 640, 360); gl.clearColor(.078, .165, .192, 1);
    return {
      draw(elapsed) {
        if (gl.isContextLost()) throw new Error('context-lost');
        gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(offset, Math.sin(elapsed / 1000) * .2);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}

const MODE_NAMES = { raf: 'RAF만', canvas2d: 'Canvas 2D', webgl2: 'WebGL2 삼각형' };
const STATUS_NAMES = { idle: '대기', running: '측정 중', complete: '완료', stopped: '수동 중지 · 미완료', interrupted: '중단 · 표본 초기화', error: '오류 · 표본 초기화', unavailable: '실행 불가 · 표본 없음' };
const REASONS = { hidden: '페이지 숨김', pagehide: '페이지 이탈', 'context-lost': '그래픽 컨텍스트 손실', 'user-stop': 'Stop', 'draw-failed': '그리기 호출 실패', 'invalid-clock': '시계 역행/오류', 'initialization-failed': '그래픽 초기화 실패' };
const number = value => value === null || value === undefined ? '—' : value.toFixed(2);
const environmentText = value => value ? `visibility ${value.visible ? 'visible' : 'hidden'} · focus ${value.focused ? 'yes' : 'no'} · DPR ${number(value.dpr)}` : '—';

export function setupDiagnosticPage(document, host) {
  const byId = id => document.getElementById(id);
  const select = byId('diagnostic-mode'), start = byId('diagnostic-start'), stop = byId('diagnostic-stop');
  const reset = byId('diagnostic-reset'), stage = byId('diagnostic-stage'), message = byId('diagnostic-status');
  let run = null, control = null, currentMode = null, activeCanvas = null;
  const environment = () => ({ visible: document.visibilityState === 'visible', focused: document.hasFocus(), dpr: host.devicePixelRatio });
  const updateEnvironment = () => {
    run?.observeEnvironment();
    byId('diagnostic-environment').textContent = environmentText(environment());
  };
  const release = () => { control?.dispose(); control = null; };
  const update = (mode, result) => {
    const panel = byId(`result-${mode}`);
    panel.querySelector('[data-status]').textContent = STATUS_NAMES[result.status];
    panel.querySelector('[data-detail]').textContent = `${(result.elapsedMs / 1000).toFixed(2)}초 측정 창 / ${(result.wallMs / 1000).toFixed(2)}초 실제 경과 · 포커스 변경 ${result.focusChanges}회 · 콜백 ${result.callbacks}회 · 그리기 반환 ${result.draws}회 · 창 밖 제외 ${result.skippedCallbacks} 콜백 / ${result.skippedDraws} 반환${result.reason ? ` · ${REASONS[result.reason] ?? result.reason}` : ''}`;
    panel.querySelector('[data-environments]').textContent = `시작: ${environmentText(result.startedEnvironment)}\n종료: ${environmentText(result.endedEnvironment)}`;
    for (const kind of ['raf', 'draw']) {
      const values = result[kind];
      const row = panel.querySelector(`[data-metric="${kind}"]`);
      row.querySelector('[data-count]').textContent = values ? `${values.samples} / ${values.retainedSamples}` : '해당 없음';
      for (const key of ['p50Ms', 'p95Ms', 'maxMs']) row.querySelector(`[data-${key}]`).textContent = number(values?.[key]);
    }
    const running = result.status === 'running';
    select.disabled = start.disabled = running;
    stop.disabled = !running;
    if (!running) release();
    message.textContent = `${MODE_NAMES[mode]} · ${STATUS_NAMES[result.status]}${result.reason ? ` · ${REASONS[result.reason] ?? result.reason}` : ''}`;
    updateEnvironment();
  };
  const interrupt = reason => {
    if (run?.running) run.invalidate(reason);
    // Completed earlier modes stay as explicitly labeled historical results; no interrupted run survives.
  };
  const onStart = () => {
    if (run?.running) return;
    release(); currentMode = select.value;
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
    canvas.setAttribute('aria-label', `${MODE_NAMES[currentMode]} 제어 화면`);
    activeCanvas = canvas; stage.replaceChildren(canvas);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); if (activeCanvas === canvas) interrupt('context-lost');
    });
    canvas.addEventListener('contextlost', () => { if (activeCanvas === canvas) interrupt('context-lost'); });
    try { control = createControl(canvas, currentMode); }
    catch (error) {
      run = null;
      const empty = createDiagnosticRun({ now: () => 0, draw: currentMode === 'raf' ? null : () => {} }).read();
      update(currentMode, { ...empty, status: 'unavailable', reason: 'initialization-failed', startedEnvironment: environment(), endedEnvironment: environment() });
      message.textContent = `${MODE_NAMES[currentMode]} · 실행 불가: ${error.message}`;
      return;
    }
    const mode = currentMode;
    run = createDiagnosticRun({ now: () => host.performance.now(),
      requestFrame: callback => host.requestAnimationFrame(callback), cancelFrame: id => host.cancelAnimationFrame(id),
      setTimer: (callback, delay) => host.setTimeout(callback, delay), clearTimer: id => host.clearTimeout(id),
      isVisible: () => document.visibilityState === 'visible', getEnvironment: environment,
      draw: control.draw, onUpdate: result => update(mode, result) });
    run.start();
  };
  const onReset = () => {
    run?.reset(); run = null; release(); activeCanvas = null;
    for (const mode of Object.keys(MODE_NAMES)) {
      const empty = createDiagnosticRun({ now: () => 0, draw: mode === 'raf' ? null : () => {} });
      update(mode, empty.read());
    }
    stage.replaceChildren(); message.textContent = '초기화했습니다. 모드를 고르고 Start를 눌러 주세요.';
  };
  start.addEventListener('click', onStart);
  stop.addEventListener('click', () => run?.stop());
  reset.addEventListener('click', onReset);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') interrupt('hidden'); updateEnvironment(); });
  host.addEventListener('pagehide', () => { interrupt('pagehide'); release(); activeCanvas = null; });
  host.addEventListener('pageshow', updateEnvironment);
  host.addEventListener('focus', updateEnvironment); host.addEventListener('blur', updateEnvironment);
  host.addEventListener('resize', updateEnvironment);
  onReset();
}

if (typeof document !== 'undefined' && document.getElementById('frame-diagnostic')) setupDiagnosticPage(document, window);
