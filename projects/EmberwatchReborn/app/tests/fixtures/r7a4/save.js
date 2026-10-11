import {STATE_SCHEMA, validateState} from './state.js';

export const SAVE_LIMIT = 2 * 1024 * 1024;
const integer = x => Number.isSafeInteger(x) && x >= 0;
const fail = (code, reason) => ({ok: false, code, reason});
// FNV is accidental-corruption detection, not security or tamper resistance.
export function checksum(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
export function profileKeys(profile = 'main', namespace = 'release') {
  if (typeof profile !== 'string' || !/^(main|qa-[a-z0-9][a-z0-9-]{0,47})$/.test(profile)) throw new Error('Invalid profile; QA profiles must start qa-');
  if(!['release','qa-r4','qa-r5','qa-r6','qa-r7'].includes(namespace)||namespace!=='release'&&profile==='main')throw new Error('Invalid save namespace/profile');
  const prefix = namespace==='release'?`emberwatch-reborn.reimplementation.v1.${profile}`:`emberwatch-reborn.candidate.${namespace.slice(3)}.v1.${profile}`;
  return {head: `${prefix}.head`, slots: [`${prefix}.slot0`, `${prefix}.slot1`], lock: `${prefix}.writer`};
}
function receiptMatches(receipt, entry) {
  return receipt && [0, 1].includes(receipt.slot) && entry && receipt.revision === entry.revision && receipt.checksum === entry.checksum;
}
function decode(raw) {
  try {
    if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > SAVE_LIMIT * 2) return null;
    const e = JSON.parse(raw);
    if (!e || e.schema !== STATE_SCHEMA || !integer(e.revision) || e.revision === 0 || typeof e.payload !== 'string' || new TextEncoder().encode(e.payload).length > SAVE_LIMIT || e.checksum !== checksum(e.payload)) return null;
    const state = JSON.parse(e.payload);
    return validateState(state).ok ? {state, revision: e.revision, checksum: e.checksum, previousCommit: e.previousCommit ?? null} : null;
  } catch { return null; }
}

// The synchronous primitive is for isolated adapters/tests. Browser writers use
// createSession so every tab shares a profile-specific Web Lock.
export function createStore(storage, {profile = 'main', namespace = 'release'} = {}) {
  const keys = profileKeys(profile,namespace);
  function load() {
    try {
      const rawHead = storage.getItem(keys.head);
      const raws = keys.slots.map(k => storage.getItem(k));
      const slots = raws.map(decode);
      let head;
      try { head = JSON.parse(rawHead); } catch { /* attempt last committed receipt */ }
      if (receiptMatches(head, slots[head?.slot])) return {ok: true, ...slots[head.slot], slot: head.slot, recovered: false};
      // Do not promote uncommitted staged data by selecting the largest revision.
      const receipts = [head?.previousCommit, ...slots.map(x => x?.previousCommit)];
      const recoverable = receipts.filter(r => receiptMatches(r, slots[r?.slot])).map(r => ({...slots[r.slot], slot: r.slot})).sort((a, b) => b.revision - a.revision);
      if (recoverable.length) return {ok: true, ...recoverable[0], recovered: true};
      if (rawHead !== null || raws.some(x => x !== null)) return fail('CORRUPT', '저장 기록이 손상되었습니다. 덮어쓰지 않습니다.');
      return {ok: true, state: null, revision: 0, slot: null, recovered: false};
    } catch { return fail('UNAVAILABLE', '브라우저 저장 공간에 접근할 수 없습니다.'); }
  }
  function save(state, {expectedRevision} = {}) {
    const validation = validateState(state);
    if (!validation.ok) return validation;
    const payload = JSON.stringify(state);
    if (new TextEncoder().encode(payload).length > SAVE_LIMIT) return fail('TOO_LARGE', '저장 용량 한도를 넘었습니다. 이전 기록을 유지합니다.');
    if (!integer(expectedRevision)) return fail('REVISION_REQUIRED', '예상 저장 버전이 필요합니다.');
    const previous = load();
    if (!previous.ok) return previous;
    if (previous.revision !== expectedRevision) return fail('CONFLICT', '다른 창에서 진행이 변경되었습니다. 최신 기록을 다시 불러오세요.');
    if (previous.revision === Number.MAX_SAFE_INTEGER) return fail('REVISION_LIMIT', '저장 버전 한도에 도달했습니다.');
    const previousCommit = previous.slot === null ? null : {slot: previous.slot, revision: previous.revision, checksum: previous.checksum};
    const slot = previous.slot === 0 ? 1 : 0, revision = previous.revision + 1, hash = checksum(payload);
    const envelope = JSON.stringify({schema: STATE_SCHEMA, revision, checksum: hash, previousCommit, payload});
    try {
      const oldHead = storage.getItem(keys.head);
      storage.setItem(keys.slots[slot], envelope);
      if (storage.getItem(keys.slots[slot]) !== envelope) return fail('WRITE_FAILED', '저장 데이터 확인에 실패했습니다.');
      if (storage.getItem(keys.head) !== oldHead) return fail('CONFLICT', '저장 중 다른 창의 변경을 감지했습니다.');
      const head = JSON.stringify({slot, revision, checksum: hash, previousCommit});
      storage.setItem(keys.head, head);
      if (storage.getItem(keys.head) !== head) return fail('COMMIT_UNCERTAIN', '저장 완료 확인에 실패했습니다. 다시 불러와 확인하세요.');
      return {ok: true, revision, slot};
    } catch {
      // A storage adapter may throw after writing. Never allow an in-memory retry
      // to overwrite an uncertain commit; controller blocks until explicit load.
      return fail('COMMIT_UNCERTAIN', '저장 결과를 확인할 수 없습니다. 다시 불러와 확인하세요.');
    }
  }
  return {load, save, keys};
}
export function createSession(storage, locks, options) {
  const store = createStore(storage, options);
  return {...store, async save(state, options) {
    if (!locks || typeof locks.request !== 'function') return fail('LOCKS_UNAVAILABLE', '안전한 저장 잠금을 사용할 수 없습니다.');
    let entered = false;
    try { return await locks.request(store.keys.lock, {mode: 'exclusive'}, () => { entered = true; return store.save(state, options); }); }
    catch { return fail(entered ? 'COMMIT_UNCERTAIN' : 'LOCK_FAILED', entered ? '저장 결과를 확인할 수 없습니다. 다시 불러오세요.' : '저장 잠금을 얻지 못했습니다.'); }
  }};
}
