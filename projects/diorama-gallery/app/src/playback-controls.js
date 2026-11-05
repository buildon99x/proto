const RATES = [.25, .5, .75, 1, 1.5, 2, 3];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const stamp = seconds => {
 const rounded = Math.round(seconds);
 return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
};
const css = `.timelapse-controls{width:100%;max-width:1080px;min-width:0;margin:10px auto 0;padding:14px 16px;background:#f7f3e9;border:1px solid #c9c6ba;border-radius:6px;color:#30372e;font:12px Arial,sans-serif;box-sizing:border-box}.timelapse-heading,.timelapse-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px 16px}.timelapse-heading strong{font-size:12px;letter-spacing:.04em}.timelapse-time,.timelapse-progress{font-variant-numeric:tabular-nums}.timelapse-time{white-space:nowrap}.timelapse-timeline{display:block;width:100%;min-width:0;min-height:44px;margin:2px 0;accent-color:#9a5a34;cursor:pointer}.timelapse-speed-label{display:flex;align-items:center;gap:8px;font-size:12px}.timelapse-controls .timelapse-speed{min-width:80px;min-height:44px;padding:6px 10px;font:inherit;color:inherit;background:#fffdf7;border:1px solid #bbb5a6;border-radius:4px}.timelapse-controls :focus-visible{outline:3px solid #a65f36;outline-offset:3px}.timelapse-controls :disabled{cursor:default;opacity:.5}.timelapse-phase{flex:1;min-width:120px;color:#6b6b5b;line-height:1.5}.embedded .timelapse-controls{display:none}`;

/** Read the renderer's clock; never create a competing scene timer. */
export function attachPlaybackControls({container, runtime, definition, onSeek = () => {}, document = globalThis.document, requestFrame = callback => requestAnimationFrame(callback), cancelFrame = id => cancelAnimationFrame(id)}) {
 if (!definition.timeline) return null;
 const duration = definition.duration;
 const root = document.createElement('section');
 root.className = 'timelapse-controls';
 root.setAttribute('aria-label', '타임랩스 재생 조작');
 const style = document.createElement('style'); style.textContent = css;
 const heading = document.createElement('div'); heading.className = 'timelapse-heading';
 const title = document.createElement('strong'); title.textContent = '타임라인';
 const time = document.createElement('span'); time.className = 'timelapse-time';
 const timeline = document.createElement('input'); timeline.className = 'timelapse-timeline';
 timeline.type = 'range'; timeline.min = '0'; timeline.max = '1000'; timeline.step = '1'; timeline.value = '0';
 timeline.setAttribute('aria-label', '타임랩스 진행 위치');
 const footer = document.createElement('div'); footer.className = 'timelapse-footer';
 const progress = document.createElement('span'); progress.className = 'timelapse-progress';
 const phase = document.createElement('span'); phase.className = 'timelapse-phase';
 const label = document.createElement('label'); label.className = 'timelapse-speed-label'; label.textContent = '재생 속도';
 const speed = document.createElement('select'); speed.className = 'timelapse-speed'; speed.setAttribute('aria-label', '타임랩스 재생 속도');
 for (const rate of RATES) { const option = document.createElement('option'); option.value = String(rate); option.textContent = `${rate}×`; speed.append(option); }
 speed.value = '1'; label.append(speed); heading.append(title, time); footer.append(progress, phase, label); root.append(style, heading, timeline, footer); container.append(root);
 let disposed = false, frame = null;
 const setText = (element, value) => { if (element.textContent !== value) element.textContent = value; };
 function refresh() {
  if (disposed) return;
  if (!runtime) { timeline.disabled = speed.disabled = true; time.textContent = `— / ${stamp(duration)}`; progress.textContent = '—'; phase.textContent = '3D 사용 불가'; return; }
  const state = runtime.stats(), seconds = clamp(state.time, 0, duration), fraction = seconds / duration;
  const value = String(Math.round(fraction * 1000)); if (timeline.value !== value) timeline.value = value;
  setText(time, `${stamp(seconds)} / ${stamp(duration)}`); setText(progress, `${Math.round(fraction * 100)}%`);
  const moment = definition.moments?.findLast(item => item.time <= seconds);
  setText(phase, moment?.label ?? '');
  timeline.setAttribute('aria-valuetext', `${stamp(seconds)} / ${stamp(duration)}, ${Math.round(fraction * 100)}%`);
  if (speed.value !== String(state.speed)) speed.value = String(state.speed);
 }
 function seek() {
  if (!runtime || disposed) return;
  const value = Number(timeline.value); if (!Number.isFinite(value)) return;
  // The runtime wraps duration to zero. The slider endpoint means the last frame.
  runtime.setPaused(true);
  runtime.seek(Math.min(clamp(value, 0, 1000) / 1000 * duration, duration - .001));
  onSeek(); refresh();
 }
 function changeSpeed() {
  if (!runtime || disposed) return;
  const value = Number(speed.value); if (RATES.includes(value)) runtime.setSpeed(value);
  refresh();
 }
 function poll() { if (disposed) return; refresh(); frame = requestFrame(poll); }
 timeline.addEventListener('input', seek); speed.addEventListener('change', changeSpeed); refresh();
 if (runtime) frame = requestFrame(poll);
 return {timeline, time, progress, speed, refresh, dispose() {
  if (disposed) return; disposed = true; if (frame !== null) cancelFrame(frame);
  timeline.removeEventListener('input', seek); speed.removeEventListener('change', changeSpeed); root.remove();
 }};
}
