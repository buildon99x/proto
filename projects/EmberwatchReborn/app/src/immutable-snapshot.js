// This certifies canonical-copy provenance, never gameplay/save validity.
// Frozen caller objects can still be Proxies with dynamic missing properties,
// so only plain copies constructed here may be reused by validation caches.
const certified = new WeakSet();
const reserved = new Set(['__proto__', 'prototype', 'constructor']);
const own = (value, key) => Object.hasOwn(value, key);

function copyTree(root) {
  const active = new Set(), copies = new Map();
  let remaining = 250000;
  const invalid = () => { throw new TypeError('Expected an owned plain JSON snapshot'); };
  function copy(value, depth) {
    if (--remaining < 0 || depth > 40) return invalid();
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : invalid();
    if (typeof value !== 'object' || active.has(value)) return invalid();
    if (copies.has(value)) return copies.get(value);
    const array = Array.isArray(value);
    if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) return invalid();
    // Inspect descriptors instead of reading values, so getters never run.
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(key => typeof key !== 'string')) return invalid();
    const entries = keys.filter(key => !(array && key === 'length'));
    if (array && (!own(descriptors, 'length') || !own(descriptors.length, 'value') ||
      entries.length !== descriptors.length.value || entries.some((key, index) => key !== String(index)))) return invalid();
    if (entries.some(key => reserved.has(key) || !own(descriptors[key], 'value') || !descriptors[key].enumerable)) return invalid();
    active.add(value);
    const result = array ? [] : {};
    for (const key of entries) Object.defineProperty(result, key, {value: copy(descriptors[key].value, depth + 1), enumerable: true, configurable: true, writable: true});
    active.delete(value);
    Object.freeze(result);
    copies.set(value, result);
    return result;
  }
  try { return copy(root, 0); }
  catch { return invalid(); }
}

/** Only roots constructed by freezeOwnedSnapshot have canonical provenance.
 * Deep-freezing an external object is insufficient, including a frozen Proxy. */
export function isImmutableSnapshot(value) {
  return value !== null && typeof value === 'object' && certified.has(value);
}

/** Return a detached, deeply frozen plain copy without executing getters.
 * The caller must use the return value; its input and external aliases stay
 * mutable. Controller snapshots and save validation keep their old contracts. */
export function freezeOwnedSnapshot(snapshot) {
  if (snapshot === null) return null;
  if (isImmutableSnapshot(snapshot)) return snapshot;
  const result = copyTree(snapshot);
  if (result !== null && typeof result === 'object') certified.add(result);
  return result;
}
