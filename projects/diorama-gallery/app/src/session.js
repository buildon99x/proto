/** Own exactly one GPU world; a thumbnail is a paused world, not a stock image. */
export function createSession(mount) {
  let current = null;
  const close = () => { const previous = current; current = null; previous?.dispose(); };
  return { open(...args) { close(); current = mount(...args); return current; }, close };
}
/** Capture synchronously after draw, before the framebuffer is discarded. */
export function captureThumbnail(runtime, still, readPixels) {
  try { runtime.seek(still); return readPixels(); }
  finally { runtime.dispose(); }
}
