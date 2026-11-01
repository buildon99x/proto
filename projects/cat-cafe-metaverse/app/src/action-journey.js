const ACTIONS = new Set(['pet', 'feather', 'ball']);
const IGNORED = Object.freeze({status: 'ignored', playSound: false});
const TIMEOUT_MESSAGE = '응답을 확인하지 못했어요. 동작이 이미 반영됐을 수 있어요. 상태를 확인한 뒤 다시 시도할 수 있어요.';

// UI acknowledgement tracking only: never sends/replays requests or owns server state.
export class ActionJourney {
  #pending = null;
  constructor({clock = Date.now, timeoutMs = 5000} = {}) {
    this.clock = clock;
    this.timeoutMs = Number.isFinite(timeoutMs) ? Math.max(1000, Math.min(10000, timeoutMs)) : 5000;
  }
  get pending() { return this.#pending ? {...this.#pending} : null; }
  begin({requestId, action, catId} = {}) {
    if (this.#pending) return {accepted: false, pending: this.pending, message: '서버 응답을 기다리고 있어요. 잠시만 기다려 주세요.'};
    if (typeof requestId !== 'string' || !requestId.length || requestId.length > 64 || !ACTIONS.has(action) || typeof catId !== 'string' || !catId.length || catId.length > 128) {
      return {accepted: false, pending: null, message: '고양이를 선택하고 다시 시도해 주세요.'};
    }
    const startedAt = this.clock();
    this.#pending = {requestId, action, catId, startedAt, deadline: startedAt + this.timeoutMs};
    return {accepted: true, pending: this.pending, message: '고양이에게 마음을 전하고 있어요. 서버 응답을 기다려 주세요.'};
  }
  settle(event) {
    const current = this.#pending;
    if (!current || event?.type !== 'actionResult' || event.requestId !== current.requestId || typeof event.ok !== 'boolean') return IGNORED;
    const timedOut = this.expire();
    if (timedOut) return timedOut;
    this.#pending = null;
    return {status: event.ok ? 'succeeded' : 'failed', requestId: current.requestId, action: current.action, catId: current.catId, reason: event.ok ? undefined : event.reason, playSound: event.ok};
  }
  expire(now = this.clock()) {
    const current = this.#pending;
    if (!current || now < current.deadline) return null;
    this.#pending = null;
    return {status: 'timed-out', requestId: current.requestId, action: current.action, catId: current.catId, message: TIMEOUT_MESSAGE, playSound: false};
  }
  clear() { this.#pending = null; }
}
