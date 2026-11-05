const WEATHER = [['clear', '맑은 날'], ['cloudy', '흐린 날'], ['rain', '비오는 날'], ['sandstorm', '모래폭풍']];
const TIMES = [['day', '낮'], ['night', '밤 · 별과 달']];
const css = `.environment-controls{display:flex;align-items:center;flex-wrap:wrap;gap:10px 20px;width:100%;min-width:0;max-width:1080px;margin:10px auto 0;padding:12px 16px;background:#f2f3ed;border:1px solid #c9c6ba;border-radius:6px;color:#30372e;font:12px Arial,sans-serif;box-sizing:border-box}.environment-controls .environment-label{display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-width:0;max-width:100%;width:auto}.environment-controls select{min-width:44px;min-height:44px;max-width:100%;padding:6px 10px;font:inherit;color:inherit;background:#fffdf7;border:1px solid #bbb5a6;border-radius:4px}.environment-controls :focus-visible{outline:3px solid #a65f36;outline-offset:3px}.environment-controls :disabled{cursor:default;opacity:.5}.environment-status{color:#6b6b5b;line-height:1.5}.embedded .environment-controls{display:none}`;

/** Environment choices redraw the current scene without operating its playback clock. */
export function attachEnvironmentControls({container, runtime, definition, document = globalThis.document}) {
 if (!definition.environment) return null;
 const root = document.createElement('section'); root.className = 'environment-controls'; root.setAttribute('aria-label', '날씨와 낮과 밤');
 const style = document.createElement('style'); style.textContent = css; root.append(style);
 function choice(labelText, options) {
  const label = document.createElement('label'); label.className = 'environment-label'; label.textContent = labelText;
  const select = document.createElement('select'); select.setAttribute('aria-label', labelText);
  for (const [value, text] of options) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
  label.append(select); root.append(label); return select;
 }
 const weather = choice('날씨', WEATHER), timeOfDay = choice('낮과 밤', TIMES);
 const status = document.createElement('span'); status.className = 'environment-status'; status.setAttribute('role', 'status'); root.append(status); container.append(root);
 let disposed = false;
 function refresh() {
  if (disposed) return;
  const state = runtime?.stats().environment;
  const available = Boolean(state && runtime?.setEnvironment);
  weather.disabled = timeOfDay.disabled = !available;
  weather.value = state?.weather ?? 'clear'; timeOfDay.value = state?.timeOfDay ?? 'day';
  status.textContent = available ? '장면의 시간과 별도로 바꿀 수 있어요.' : '3D 사용 불가 · 날씨와 낮과 밤을 바꿀 수 없어요.';
 }
 function changeWeather() {
  if (disposed || weather.disabled) return;
  if (WEATHER.some(([value]) => value === weather.value)) runtime.setEnvironment({weather:weather.value});
  refresh();
 }
 function changeTimeOfDay() {
  if (disposed || timeOfDay.disabled) return;
  if (TIMES.some(([value]) => value === timeOfDay.value)) runtime.setEnvironment({timeOfDay:timeOfDay.value});
  refresh();
 }
 weather.addEventListener('change', changeWeather); timeOfDay.addEventListener('change', changeTimeOfDay); refresh();
 return {weather, timeOfDay, status, refresh, dispose() {
  if (disposed) return; disposed = true;
  weather.removeEventListener('change', changeWeather); timeOfDay.removeEventListener('change', changeTimeOfDay); root.remove();
 }};
}
