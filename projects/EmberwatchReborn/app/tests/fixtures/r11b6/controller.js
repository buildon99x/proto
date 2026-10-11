import {clone, jsonSafe, createState, validateState, reduceRuntime, migrateState} from './state.js';
const fail = (code, reason) => ({ok: false, code, reason});
export function createController(store) {
  let state = null, revision = 0, blocked = null, queue = Promise.resolve();
  const listeners = new Set();
  const snapshot = () => state ? clone(state) : null;
  const enqueue = fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result; };
  const announce = event => { for (const listener of listeners) { try { listener(clone(event)); } catch { /* observer does not undo committed data */ } } };
  async function commit(next, events) {
    const check = validateState(next);
    if (!check.ok) return check;
    let saved;
    try { saved = await store.save(next, {expectedRevision: revision}); }
    catch { saved = fail('COMMIT_UNCERTAIN', '저장 결과를 확인할 수 없습니다. 다시 불러오세요.'); }
    if (!saved.ok) {
      const upgradeBlocked = typeof saved.code === 'string' && saved.code.startsWith('UPGRADE_');
      if (upgradeBlocked || ['CONFLICT', 'COMMIT_UNCERTAIN', 'CORRUPT'].includes(saved.code)) blocked = saved;
      announce({type: 'saveFailed', code: saved.code});
      return upgradeBlocked ? {...saved,blocked:true} : saved;
    }
    state = clone(next); revision = saved.revision;
    announce({type: 'committed', revision, events});
    return {ok: true, state: snapshot(), revision, events: clone(events)};
  }
  function load() { return enqueue(async () => {
    let loaded;
    try { loaded = await store.load(); } catch { loaded = fail('UNAVAILABLE', '저장 공간을 읽을 수 없습니다.'); }
    if (!loaded.ok) { blocked = loaded; return loaded; }
    if (loaded.state) { const check = validateState(loaded.state); if (!check.ok) { blocked = check; return check; } }
    state = loaded.state ? migrateState(loaded.state) : null; revision = loaded.revision; blocked = null;
    return {...loaded, state: snapshot()};
  }); }
  function start(options = {}) {
    if (!jsonSafe(options)) return Promise.resolve(fail('INVALID_OPTIONS', '새 게임 설정이 올바르지 않습니다.'));
    const intent = clone(options);
    return enqueue(async () => {
      if (blocked) return {...blocked, blocked: true};
      let loaded;
      try { loaded = await store.load(); } catch { loaded = fail('UNAVAILABLE', '저장 공간을 읽을 수 없습니다.'); }
      if (!loaded.ok) { blocked = loaded; return loaded; }
      if (state || loaded.state) return fail('GAME_EXISTS', '진행 중인 게임이 있습니다. 다른 QA 프로필을 사용하세요.');
      revision = loaded.revision;
      let next;
      try { next = createState(intent); } catch { return fail('INVALID_OPTIONS', '새 게임 설정이 올바르지 않습니다.'); }
      return commit(next, [{type: 'started', difficulty: next.difficulty}]);
    });
  }
  function dispatch(command) {
    if (!jsonSafe(command)) return Promise.resolve(fail('INVALID_COMMAND', '지원하지 않는 입력입니다.'));
    const intent = clone(command);
    return enqueue(async () => {
      if (blocked) return {...blocked, blocked: true};
      if (!state) return fail('NO_GAME', '먼저 새 게임을 시작하세요.');
      // Expert's quote is bound to the actual queued controller/store revision,
      // not T's independent puzzle token. Never silently refresh stale input.
      if(intent.type==='promoteExpert'){
        if(!Number.isSafeInteger(intent.expectedRevision)||intent.expectedRevision<0)return fail('REVISION_REQUIRED','현재 저장 버전으로 승급을 요청하세요.');
        if(intent.expectedRevision!==revision)return fail('STALE_REVISION','이전 승급 화면의 입력입니다. 최신 기록을 다시 확인하세요.');
      }
      let result;
      try { result = reduceRuntime(state, intent, {revision}); } catch { return fail('COMMAND_FAILED', '입력을 처리하지 못했습니다.'); }
      if (!result.ok) return result;
      return commit(result.state, result.events);
    });
  }
  return {load, start, dispatch, snapshot, revision: () => revision, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }};
}
