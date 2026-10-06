import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { act, canAfford, createGame, currentQuest, FACILITIES, getPlayerStats, getWorkLevel, ITEMS, loadGame, parseSave, QUESTS, RECIPES, SAVE_KEY, saveGame, serializeGame, SPECIES, tickEconomy, WORK_NAMES } from './model';
import type { Action, ActionResult, CardId, Facility, FacilityType, GameState, ItemId, Materials, Recipe, SpeciesId, WorkType } from './model';
import { World } from './world';
import type { TargetInfo, WorldCommand, WorldMode } from './world';
import { drawMonster } from './art';
import { playSound, setSound, unlockAudio } from './audio';

type Panel = 'book' | 'craft' | 'camp' | 'bag' | 'journal' | 'settings' | 'victory' | null;
type IconName = 'leaf' | 'explore' | 'book' | 'craft' | 'journal' | 'settings' | 'wood' | 'stone' | 'food' | 'card' | 'sword' | 'jump' | 'gather' | 'break' | 'partner' | 'heal' | 'bag' | 'camp' | 'close' | 'check' | 'star' | 'arrow' | 'chevronLeft' | 'chevronRight' | 'clock' | 'save' | 'download' | 'upload' | 'sound' | 'shield' | 'boots' | 'charm' | 'lock' | 'plus';
function Icon({ name, size = 22, className = '' }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    leaf: <><path d="M19 4C9 3 3 8 6 15c6 5 14-1 13-11Z"/><path d="M5 21 16 8M9 15l-1-5m5 1 4 1"/></>,
    explore: <><circle cx="12" cy="12" r="8"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/></>,
    book: <><path d="M12 6C8 3 5 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-2-1-5-2-9 1Z"/><path d="M12 6v14M6 8l3 1M15 9l3-1M6 12l3 1M15 13l3-1"/></>,
    craft: <><path d="m5 20 10-10m-3-6 3-1 5 5-1 3-3-2-3-3-1-2ZM4 16l4 4M4 4l5 5m7 7 4 4M3 4l1-1 4 3-2 2-3-4Z"/></>,
    journal: <><path d="M6 3h13v18H6c-3 0-3-4 0-4h13M6 3v14M9 7h6M9 11h5"/><path d="m15 3 0 5 2-1 2 1"/></>,
    settings: <><path d="m9 3-1 3-3 1 1 4-2 2 2 4 3-1 3 3 3-2 3 1 2-4-2-2 1-4-3-1-2-3-5-1Z"/><circle cx="12" cy="11" r="3"/></>,
    wood: <><path d="m7 5 10 4c5 2 1 12-3 10L4 15C0 13 3 3 7 5Z"/><ellipse cx="16" cy="14" rx="3" ry="5" transform="rotate(20 16 14)"/><path d="m6 8 7 3m-9 1 7 3"/></>,
    stone: <path d="m3 14 4-8 9-3 5 9-5 8-10-1-3-5Zm4-8 3 8 6 6m-6-6 11-2"/>,
    food: <><path d="M4 12h16c0 6-3 8-8 8s-8-2-8-8Zm-1 0h18M8 8c-3-3 2-3 0-6m5 6c-3-3 2-3 0-6m5 6c-3-3 2-3 0-6"/></>,
    card: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="m12 7 1.5 3 3.5 2-3.5 1.5L12 17l-1.5-3.5L7 12l3.5-2L12 7Z"/></>,
    sword: <><path d="m7 15 11-12 3 0 0 3-12 11m-5-4 7 7M5 18l-2 3M4 17l3 3"/></>,
    jump: <><path d="M12 19V5m-5 5 5-5 5 5M4 20h16"/><path d="m7 16 1 1m8-1 1-1"/></>,
    gather: <><path d="m12 20 0-13M12 13C5 13 4 10 5 6c5-1 8 2 7 7Zm0-4c0-5 4-6 8-5 0 5-3 7-8 5ZM6 20h12"/></>,
    break: <><path d="m14 2-9 12h7l-2 8 9-13h-7l2-7Z"/></>,
    partner: <><path d="M7 13c-4 1-3 7 1 6 3-1 5-1 8 0 4 1 5-5 1-6-4-4-6-4-10 0Z"/><ellipse cx="5" cy="8" rx="2" ry="3" transform="rotate(-25 5 8)"/><ellipse cx="11" cy="5" rx="2" ry="3"/><ellipse cx="18" cy="7" rx="2" ry="3" transform="rotate(25 18 7)"/></>,
    heal: <><path d="M9 3h6M10 3v5c-7 5-6 13 2 13s9-8 2-13V3M7 13h10"/><path d="M12 15v4m-2-2h4"/></>,
    bag: <><path d="M8 6V4c0-3 8-3 8 0v2M6 7h12l3 14H3L6 7ZM8 7v4m8-4v4M8 15h8v4H8z"/></>,
    camp: <><path d="M12 3 2 20h20L12 3Zm0 8-5 9m5-9 5 9M9 2l3 4 3-4"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    star: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    chevronLeft: <path d="m15 5-7 7 7 7"/>,
    chevronRight: <path d="m9 5 7 7-7 7"/>,
    clock: <><circle cx="12" cy="12" r="8"/><path d="M12 7v5l4 2"/></>,
    save: <><path d="M4 3h13l4 4v14H3V3h1Zm3 0v7h10V3M7 21v-7h10v7"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
    sound: <><path d="m4 9 4 0 5-5v16l-5-5H4V9Zm12-2c4 3 4 7 0 10m3-13c6 5 6 11 0 16"/></>,
    shield: <path d="M12 3 4 6v7c1 5 8 8 8 8s7-3 8-8V6l-8-3ZM12 7v9m-4-5 4 5 4-5"/>,
    boots: <path d="M8 3h8v10l5 3v5H5c-2-2-1-5 2-6L8 3Zm0 5h8M7 15l5 2"/>,
    charm: <><path d="m12 6 7 8-7 8-7-8 7-8Z"/><circle cx="12" cy="4" r="2"/><path d="m12 11 2 3-2 3-2-3 2-3Z"/></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
function itemIcon(id: string): IconName {
  if (id.toLowerCase().includes('card')) return 'card';
  if (['wood', 'plank'].includes(id)) return 'wood';
  if (['stone', 'ore', 'ingot', 'brick'].includes(id)) return 'stone';
  if (['sword', 'ironSword', 'guardianBlade'].includes(id)) return 'sword';
  if (id === 'armor' || id === 'hide') return 'shield';
  if (id === 'boots') return 'boots';
  if (id === 'charm' || id === 'crystal' || id === 'essence') return 'star';
  if (id === 'potion') return 'heal';
  if (id === 'herb') return 'leaf';
  return 'food';
}
const facilityIcon: Record<FacilityType, IconName> = { storage: 'bag', workbench: 'craft', logging: 'wood', farm: 'gather', quarry: 'stone', kitchen: 'food' };
function Thumbnail({ species, mini = false }: { species: SpeciesId; mini?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, 200, 170);
    drawMonster(ctx, species, 100, 145, 51, 0);
  }, [species]);
  return <canvas ref={canvas} width={200} height={170} aria-label={SPECIES[species].name} role="img" className={mini ? 'mini-thumbnail' : undefined} />;
}
function Ingredients({ materials, game }: { materials: Materials; game: GameState }) {
  return <div className="ingredients">{Object.entries(materials).map(([id, amount]) => <span key={id} className={game.inventory[id as ItemId] < amount! ? 'missing' : ''}>{ITEMS[id as ItemId].name} {game.inventory[id as ItemId]}/{amount}</span>)}</div>;
}
function bootstrap() {
  try {
    const loaded = loadGame(localStorage);
    let damaged: string | null = null;
    if (loaded.status === 'error') { try { damaged = localStorage.getItem(SAVE_KEY); } catch { /* Storage may be unavailable. */ } }
    return { ...loaded, damaged };
  } catch { return { status: 'error' as const, state: createGame(), error: '브라우저 저장소에 접근할 수 없어요. 임시 탐험은 파일로 내보낼 수 있어요.', damaged: null }; }
}
const panelTitles: Record<Exclude<Panel, null>, { en: string; ko: string; icon: IconName }> = {
  book: { en: 'Our little friends', ko: '몬스터북 · 서로 다른 재능을 가진 숲의 친구들', icon: 'book' },
  craft: { en: 'Made with care', ko: '제작 공방 · 작은 재료에서 시작되는 큰 모험', icon: 'craft' },
  camp: { en: 'A place to call home', ko: '나의 캠프 · 친구들과 함께 자라는 작은 집', icon: 'camp' },
  bag: { en: 'Ready for the wild', ko: '탐험 가방 · 오늘의 발견과 든든한 장비', icon: 'bag' },
  journal: { en: 'Little steps, big stories', ko: '탐험 일지 · 숲과 가까워지는 열 가지 이야기', icon: 'journal' },
  settings: { en: 'Make yourself at home', ko: '환경 설정 · 이 브라우저에 소중한 탐험을 저장해요', icon: 'settings' },
  victory: { en: 'The forest remembers', ko: '모험의 첫 장을 완성했어요', icon: 'star' },
};
export default function App() {
  const [initial] = useState(bootstrap);
  const [game, setGame] = useState<GameState>(initial.state);
  const gameRef = useRef(game);
  const [started, setStarted] = useState(false); const startedRef = useRef(false);
  const [panel, setPanelState] = useState<Panel>(null); const panelRef = useRef<Panel>(null);
  const [mode, setMode] = useState<WorldMode>('field');
  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [position, setPosition] = useState(130);
  const [gatherPrompt, setGatherPrompt] = useState('');
  const [card, setCard] = useState<CardId>('card'); const cardRef = useRef<CardId>('card');
  const [filter, setFilter] = useState<Recipe['category'] | 'all'>('all');
  const [buildSlot, setBuildSlot] = useState<number | undefined>();
  const [toasts, setToasts] = useState<{ id: number; message: string; error?: boolean }[]>([]);
  const toastId = useRef(0); const toastTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [saveError, setSaveError] = useState(initial.error ?? '');
  const [savedAt, setSavedAt] = useState('');
  const savesBlocked = useRef(initial.status === 'error'); const replacingSave = useRef(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<GameState | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null); const world = useRef<World | null>(null);
  const heldPointers = useRef<Map<number, 'left' | 'right'>>(new Map());
  const applyRef = useRef<(action: Action) => ActionResult>(() => ({ ok: false, message: '' }));
  const campRef = useRef<() => void>(() => {});
  const notify = useCallback((message: string, error = false) => {
    if (!message) return;
    const id = ++toastId.current;
    setToasts(old => [...old.slice(-2), { id, message, error }]);
    const timer = setTimeout(() => setToasts(old => old.filter(t => t.id !== id)), 4400);
    toastTimers.current.push(timer);
  }, []);
  const clearInput = useCallback(() => { world.current?.keys.clear(); heldPointers.current.clear(); }, []);
  const setPanel = useCallback((next: Panel) => {
    panelRef.current = next; clearInput();
    world.current?.setPaused(!startedRef.current || !!next || document.hidden);
    setPanelState(next);
    if (next !== 'settings') { setResetConfirm(false); setPendingImport(null); }
  }, [clearInput]);
  const persist = useCallback((state = gameRef.current): boolean => {
    if (replacingSave.current || savesBlocked.current || !startedRef.current) return false;
    try {
      const result = saveGame(localStorage, state);
      if (!result.ok) { setSaveError(result.error ?? '저장하지 못했어요'); return false; }
      setSaveError(''); setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })); return true;
    } catch { setSaveError('브라우저 저장소에 접근할 수 없어요. 파일로 내보내 주세요.'); return false; }
  }, []);
  const commit = useCallback((next: GameState, save = true) => { gameRef.current = next; setGame(next); if (save) persist(next); }, [persist]);
  const apply = useCallback((action: Action): ActionResult => {
    const next = structuredClone(gameRef.current);
    const result = act(next, action);
    commit(next);
    if (result.message) notify(result.message, !result.ok);
    result.events?.forEach(message => notify(message));
    if (result.ok) {
      if (action.type === 'capture') playSound('capture');
      else if (action.type === 'craft') playSound('craft');
      else if (action.type === 'gather') playSound('gather');
      else if (action.type === 'heal') playSound('heal');
      else if (action.type !== 'damage' && action.type !== 'encounter') playSound('success');
    } else playSound('error');
    if (action.type === 'boss' && result.ok) setPanel('victory');
    return result;
  }, [commit, notify, setPanel]);
  applyRef.current = apply;
  const goCamp = useCallback(() => {
    if (!startedRef.current) return;
    const result = apply({ type: 'camp' });
    if (!result.ok) return;
    world.current?.setMode('camp'); setMode('camp'); setTarget(null); setPanel('camp');
  }, [apply, setPanel]);
  campRef.current = goCamp;
  const explore = useCallback(() => {
    if (!startedRef.current) return;
    world.current?.setMode('field'); setMode('field'); setPanel(null);
  }, [setPanel]);
  const command = useCallback((action: WorldCommand) => {
    if (!startedRef.current || panelRef.current || document.hidden) return;
    unlockAudio(); world.current?.command(action);
  }, []);
  useEffect(() => {
    if (!canvas.current) return;
    const scene = new World(canvas.current, {
      state: () => gameRef.current,
      action: action => applyRef.current(action),
      damage: amount => {
        if (!startedRef.current || panelRef.current || document.hidden) return;
        const next = structuredClone(gameRef.current);
        next.hp = Math.max(0, next.hp - Math.max(1, amount - getPlayerStats(next).defense));
        if (next.hp <= 0) {
          next.hp = next.maxHp;
          scene.player.x = 130; scene.player.y = 485; scene.player.vy = 0; scene.player.vx = 0; scene.player.hurt = 3; scene.camera = 0;
          notify('모닥불의 온기로 다시 일어났어요 · 가방과 친구들은 안전해요');
        }
        commit(next);
      },
      restore: amount => { const next = structuredClone(gameRef.current); next.hp = Math.min(next.maxHp, next.hp + amount); commit(next); },
      notify: message => notify(message), sound: kind => playSound(kind),
      onTarget: info => setTarget(old => JSON.stringify(old) === JSON.stringify(info) ? old : info),
      onPosition: x => setPosition(Math.round(x / 10) * 10),
      onGatherPrompt: value => setGatherPrompt(value),
      card: () => cardRef.current, onCamp: () => campRef.current(),
    });
    world.current = scene; scene.setPaused(true);
    return () => { clearInput(); scene.destroy(); world.current = null; };
  }, [clearInput, commit, notify]);
  useEffect(() => {
    setSound(!game.settings.muted);
  }, [game.settings.muted]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (!startedRef.current || document.hidden || panelRef.current === 'settings' || panelRef.current === 'victory' || replacingSave.current) return;
      const next = structuredClone(gameRef.current); const messages = tickEconomy(next, .5);
      commit(next, messages.length > 0);
      messages.forEach(message => notify(message));
      if (messages.length) playSound('success');
    }, 500);
    const saveInterval = setInterval(() => persist(), 5000);
    const save = () => { clearInput(); persist(); };
    const visibility = () => { clearInput(); world.current?.setPaused(!startedRef.current || !!panelRef.current || document.hidden); if (document.hidden) persist(); };
    addEventListener('pagehide', save); addEventListener('blur', clearInput); document.addEventListener('visibilitychange', visibility);
    return () => { clearInterval(interval); clearInterval(saveInterval); removeEventListener('pagehide', save); removeEventListener('blur', clearInput); document.removeEventListener('visibilitychange', visibility); toastTimers.current.forEach(clearTimeout); };
  }, [clearInput, commit, notify, persist]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'escape') { event.preventDefault(); if (panelRef.current) setPanel(null); else if (startedRef.current) setPanel('settings'); return; }
      if (key === 'tab' && panelRef.current) {
        const controls = [...document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled), [role="dialog"] select, [role="dialog"] input:not([type="file"])')];
        if (controls.length) {
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))) { event.preventDefault(); first.focus(); }
        }
        return;
      }
      if (!startedRef.current || document.hidden) return;
      if ((event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (key === ' ' && panelRef.current) return;
      if ([' ', 'arrowup', 'arrowleft', 'arrowright', 'arrowdown'].includes(key)) event.preventDefault();
      if (!event.repeat) {
        const navigation: Record<string, Panel> = { i: 'bag', c: 'craft', t: 'craft', m: 'book', l: 'journal' };
        if (key in navigation) { setPanel(panelRef.current === navigation[key] ? null : navigation[key]); playSound(); return; }
        if (key === 'b') { if (panelRef.current === 'camp') setPanel(null); else goCamp(); return; }
      }
      if (panelRef.current) return;
      if (key === 'a' || key === 'arrowleft') world.current?.keys.add('left');
      if (key === 'd' || key === 'arrowright') world.current?.keys.add('right');
      const commands: Record<string, WorldCommand> = { ' ': 'jump', arrowup: 'jump', w: 'jump', j: 'attack', q: 'skill', e: 'gather', f: 'capture', r: 'partner', h: 'heal' };
      if (!event.repeat && commands[key]) { event.preventDefault(); command(commands[key]); }
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') world.current?.keys.delete('left');
      if (key === 'd' || key === 'arrowright') world.current?.keys.delete('right');
    };
    addEventListener('keydown', down, true); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down, true); removeEventListener('keyup', up); clearInput(); };
  }, [clearInput, command, goCamp, setPanel]);
  useEffect(() => {
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[role="dialog"] .close-button')?.focus());
    return () => { cancelAnimationFrame(frame); if (previous?.isConnected) previous.focus(); };
  }, [panel]);
  const start = () => {
    startedRef.current = true; setStarted(true); unlockAudio();
    const next = structuredClone(gameRef.current); next.flags.introSeen = true; commit(next);
    world.current?.setPaused(!!panelRef.current || document.hidden);
    if (initial.status === 'error') notify('이전 저장 파일을 보호하고 있어요. 임시 탐험은 설정에서 내보낼 수 있어요.', true);
    else if (initial.status === 'new') notify('어서 와요, 탐험가! 반짝이는 나무 곁에서 E로 목재를 모아 보세요');
    playSound('success');
  };
  const open = (next: Panel) => { if (!startedRef.current) return; setPanel(panelRef.current === next ? null : next); playSound(); };
  const press = (event: ReactPointerEvent<HTMLButtonElement>, direction: 'left' | 'right') => {
    if (!startedRef.current || panelRef.current) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); heldPointers.current.set(event.pointerId, direction); world.current?.keys.add(direction);
  };
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const direction = heldPointers.current.get(event.pointerId); heldPointers.current.delete(event.pointerId);
    if (direction && ![...heldPointers.current.values()].includes(direction)) world.current?.keys.delete(direction);
  };
  const assignWorker = (facility: Facility, monsterId: string) => {
    const wasFirst = !gameRef.current.flags.transportAssigned;
    const result = apply({ type: 'assign', facilityId: facility.id, monsterId: monsterId || null });
    if (result.ok && wasFirst && facility.type === 'storage' && monsterId && gameRef.current.facilities.some(f => Object.values(f.buffer).some(n => (n ?? 0) > 0))) {
      setPanel(null); notify('친구가 실제 목재를 보관함으로 옮기는 모습을 지켜봐 주세요');
    }
  };
  const stageDelivery = (facility: Facility) => {
    const result = apply({ type: 'stageDelivery', facilityId: facility.id });
    if (result.ok && facility.workerId) { setPanel(null); notify('맡긴 목재를 친구가 옮겨 줄 거예요'); }
  };
  const exportData = (raw: string, name: string) => {
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notify('저장 파일을 내려받았어요');
  };
  const importData = async (file?: File) => {
    if (!file) return;
    if (file.size > 500000) { notify('500KB 이하의 Wild & Craft 저장 파일을 선택해 주세요', true); return; }
    try { const parsed = parseSave(await file.text()); if (!parsed.ok) { notify('유효한 저장 파일이 아니에요. 현재 탐험은 그대로 보존했어요.', true); return; } setPendingImport(parsed.state); setResetConfirm(false); }
    catch { notify('파일을 읽지 못했어요. 다른 저장 파일을 선택해 주세요.', true); }
  };
  const replaceSave = (next: GameState) => {
    replacingSave.current = true; clearInput();
    try {
      const raw = serializeGame(next); if (!parseSave(raw).ok) throw new Error('invalid');
      const existing = localStorage.getItem(SAVE_KEY);
      if (existing !== null && !parseSave(existing).ok) localStorage.setItem(`${SAVE_KEY}.damaged-backup`, existing);
      localStorage.setItem(SAVE_KEY, raw);
      location.reload();
    } catch { replacingSave.current = false; notify('저장소를 변경하지 못했어요. 원본과 현재 탐험을 파일로 내보낸 뒤 다시 시도해 주세요.', true); }
  };
  const updateSetting = (setting: keyof GameState['settings']) => { const next = structuredClone(gameRef.current); next.settings[setting] = !next.settings[setting]; if (setting === 'muted') setSound(!next.settings.muted); commit(next); playSound(); };
  const quest = currentQuest(game); const playerStats = getPlayerStats(game);
  const speciesCount = new Set(game.monsters.map(m => m.species)).size;
  const workerCount = game.facilities.filter(f => f.workerId).length;
  const partner = game.monsters.find(m => m.id === game.partnerId);
  const locationName = mode === 'camp' ? '우리의 작은 캠프' : position < 1000 ? '헤네시스 외곽' : position < 2150 ? '속삭이는 숲' : '수호자의 정원';
  const questsDone = game.completedQuests.length;
  const totalBuffers = game.facilities.reduce((n, f) => n + Object.values(f.buffer).reduce((a, b) => a + (b ?? 0), 0), 0);
  const panelMeta = panel ? panelTitles[panel] : null;
  const hotkeys: { command: WorldCommand; key: string; label: string; icon: IconName; featured?: boolean; count?: number }[] = [
    { command: 'jump', key: 'SPACE', label: '점프', icon: 'jump' }, { command: 'gather', key: 'E', label: '채집', icon: 'gather' },
    { command: 'attack', key: 'J', label: '공격', icon: 'sword' }, { command: 'skill', key: 'Q', label: '브레이크', icon: 'break' },
    { command: 'capture', key: 'F', label: '포획', icon: 'card', featured: true, count: game.inventory[card] },
    { command: 'partner', key: 'R', label: '동행 능력', icon: 'partner' }, { command: 'heal', key: 'H', label: '회복', icon: 'heal', count: game.inventory.potion + game.inventory.food + game.inventory.feast },
  ];
  return <div className={`game-app ${game.settings.reducedMotion ? 'reduced-motion' : ''}`}>
    <header className="topbar">
      <button className="brand" onClick={() => started && explore()} aria-label="Wild & Craft 탐험으로"><span className="brand-symbol"><Icon name="leaf" size={36} /></span><span className="brand-copy"><strong>Wild &amp; Craft</strong><small>A LITTLE WORLD OF OUR OWN</small></span></button>
      <nav className="main-nav" aria-label="게임 메뉴">{([{ id: null, name: 'Explore', ko: '탐험', icon: 'explore' }, { id: 'book', name: 'Monster Book', ko: '몬스터북', icon: 'book' }, { id: 'craft', name: 'Craft', ko: '제작', icon: 'craft' }, { id: 'journal', name: 'Journal', ko: '일지', icon: 'journal' }] as const).map(tab => <button key={tab.name} className={`nav-item ${panel === tab.id && (tab.id !== null || mode === 'field') ? 'active' : ''}`} disabled={!started} onClick={() => tab.id ? open(tab.id) : explore()} title={tab.ko} aria-label={tab.ko} aria-current={panel === tab.id ? 'page' : undefined}><Icon name={tab.icon} size={21} /><span>{tab.name}<small>{tab.ko}</small></span></button>)}</nav>
      <div className="header-right"><span className="edition">FOREST EDITION</span><button className="icon-button" title="환경 설정" aria-label="환경 설정" onClick={() => open('settings')} disabled={!started}><Icon name="settings" size={18} /></button></div>
    </header>
    <main className="game-stage" aria-label="Wild & Craft 숲 탐험">
      <canvas ref={canvas} className="world-canvas" aria-label="키보드 또는 화면 버튼으로 탐험하는 숲과 캠프" />
      {started && <div className="game-hud">
        <div className="profile-card"><div className="portrait" /><div className="profile-details"><div className="profile-title"><strong>숲의 탐험가</strong><span>Lv. {game.campLevel * 2 - 1}</span></div><div className="health-track" role="progressbar" aria-label="체력" aria-valuenow={Math.ceil(game.hp)} aria-valuemin={0} aria-valuemax={game.maxHp}><i style={{ width: `${game.hp / game.maxHp * 100}%` }} /></div><div className="health-meta"><span>HP {Math.ceil(game.hp)} / {game.maxHp}</span><span>{partner ? `${SPECIES[partner.species].name}와 함께` : '오늘도, 한 걸음'}</span></div></div></div>
        <div className="location-badge"><small>{mode === 'camp' ? 'HOME, SWEET HOME' : 'THE WHISPERING WOODS'}</small><strong><Icon name={mode === 'camp' ? 'camp' : 'leaf'} size={13} />{locationName}</strong></div>
        <div className="resource-bar" aria-label="주요 자원">{(['wood', 'stone', 'berry', 'card', 'essence'] as ItemId[]).map((id, i) => <div className={`resource ${i > 3 ? 'extra-resource' : ''}`} key={id} title={ITEMS[id].name}><Icon name={itemIcon(id)} size={17} /><b aria-label={`${ITEMS[id].name} ${game.inventory[id]}`}>{game.inventory[id]}</b></div>)}</div>
        <button className="quest-card" onClick={() => open('journal')} aria-label="현재 목표와 탐험 일지"><div className="eyebrow"><Icon name="journal" size={12} />OUR LITTLE ADVENTURE</div><h3>{quest?.title ?? '숲과 함께하는 매일'}</h3><p>{quest?.description ?? '모든 이야기를 마쳤어요. 친구들과 캠프를 더 가꾸어 보세요.'}</p><div className={`quest-step ${!quest ? 'completed' : ''}`}><i />{quest?.hint ?? '탐험 일지 10 / 10 완료'}</div><div className="quest-progress"><span style={{ width: `${questsDone / QUESTS.length * 100}%` }} /></div></button>
        <div className="minimap-card"><div className="minimap-label"><span>WOODLAND MAP</span><Icon name="explore" size={11} /></div><div className="minimap"><span className="mini-tree a">♧</span><span className="mini-tree b">♧</span><span className="mini-tree c">♧</span><span className="mini-home"><Icon name="camp" size={16} /></span><span className="mini-dot" style={{ left: `${mode === 'camp' ? 9 : Math.max(8, Math.min(92, position / 3420 * 85 + 6))}%` }} /></div><div className="minimap-caption">작은 발견이 기다리는 곳</div></div>
        {target && mode === 'field' && <div className={`target-card ${target.boss ? 'boss-target' : ''}`}><div><strong>{target.name}</strong><span>{target.groggy ? '브레이크!' : target.boss ? '숲의 수호자' : '야생 친구'}</span></div><div className="target-health"><i style={{ width: `${Math.max(0, target.hp / target.maxHp * 100)}%` }} /></div><p>{target.boss ? '붉은 공격 예고를 피하세요' : `포획 확률 ${Math.round(target.chance * 100)}% · ${target.distance < 210 ? 'F 포획' : '조금 더 가까이'}`}</p></div>}
        <div className="hint-pill">{mode === 'camp' ? workerCount > 0 ? '친구들의 작은 발걸음으로, 캠프가 자라나요' : '빈 자리에 시설을 짓고 친구들의 재능을 발견해 보세요' : gatherPrompt || '바람을 따라 걷고, 작은 친구를 만나 보세요'}</div>
        <button className="corner-button left" onClick={() => open('bag')}><Icon name="bag" size={29} /><span><strong>탐험 가방</strong><small>POCKET FULL OF STORIES</small></span><kbd>I</kbd></button>
        <div className="hotbar" aria-label="탐험 행동">{hotkeys.map(skill => <button className={`skill-button ${skill.featured ? 'featured' : ''}`} key={skill.command} onClick={() => command(skill.command)} title={`${skill.label} · ${skill.key}`} aria-label={`${skill.label} ${skill.key}`} disabled={!!panel}><kbd>{skill.key}</kbd><Icon name={skill.icon} size={24} /><span className="skill-name">{skill.label}</span>{skill.count !== undefined && <span className="skill-count">{skill.count}</span>}</button>)}</div>
        <button className="corner-button right" onClick={mode === 'camp' ? () => open('camp') : goCamp}><Icon name="camp" size={30} /><span><strong>{mode === 'camp' ? '캠프 관리' : '캠프로 돌아가기'}</strong><small>HOME IS WHERE WE ARE</small></span><kbd>B</kbd></button>
        <div className="touch-controls" aria-label="이동 조작">{(['left', 'right'] as const).map(direction => <button key={direction} aria-label={direction === 'left' ? '왼쪽으로 이동' : '오른쪽으로 이동'} onPointerDown={event => press(event, direction)} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}><Icon name={direction === 'left' ? 'chevronLeft' : 'chevronRight'} size={23} /></button>)}</div>
        <button className="touch-jump" aria-label="점프 터치" onPointerDown={event => { event.preventDefault(); command('jump'); }}><Icon name="jump" size={23} /></button>
      </div>}
      {saveError && started && <div className="save-warning" role="status">{saveError} 설정에서 현재 탐험을 내보낼 수 있어요.</div>}
      {!started && <div className="title-shade"><section className="title-card"><span className="title-leaf"><Icon name="leaf" size={31} /></span><div className="title-flower"><Icon name="leaf" size={31} /></div><div className="eyebrow">WELCOME TO YOUR LITTLE WORLD</div><h1>A little wild.<br /><em>A little home.</em></h1><p>낯선 숲에서 친구를 만나고,<br />함께 모은 이야기로 작은 캠프를 지어요.</p><button className="primary-button" onClick={start}>{initial.status === 'loaded' ? '우리의 모험 이어가기' : initial.status === 'error' ? '임시 탐험 시작하기' : '숲으로 첫걸음'}<Icon name="arrow" size={16} /></button><p className="subtitle">{initial.status === 'loaded' ? `친구 ${game.monsters.length}마리 · 캠프 Lv.${game.campLevel}` : 'EXPLORE · BEFRIEND · BUILD · BELONG'}</p>{initial.status === 'error' && <p className="title-warning">이전 저장 파일을 보호하기 위해 자동 저장을 멈췄어요.<br />설정에서 원본 백업과 현재 탐험을 내보낼 수 있어요.</p>}<div className="controls-help"><span><b>A D / ← →</b> 이동</span><span><b>SPACE</b> 점프</span><span><b>E</b> 채집</span></div></section></div>}
      {panel && panelMeta && <div className="modal-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) setPanel(null); }}><section className={`panel ${panel === 'settings' || panel === 'victory' ? 'compact' : ''}`} role="dialog" aria-modal="true" aria-labelledby="panel-title"><header className="panel-header"><div className="panel-heading"><Icon name={panelMeta.icon} size={30} /><div><h2 id="panel-title">{panelMeta.en}</h2><p>{panelMeta.ko}</p></div></div><button className="close-button" aria-label="패널 닫기" onClick={() => setPanel(null)}><Icon name="close" size={15} /></button></header><div className="panel-body">
        {panel === 'book' && <><div className="section-title"><h3>숲에서 만난 친구들</h3><span>수집 {speciesCount} / 6 · 연구 {game.research}</span></div><div className="collection-grid">{Object.values(SPECIES).map((species, i) => { const owned = game.monsters.some(m => m.species === species.id); const seen = owned || game.encountered.includes(species.id); return <article className="species-card" key={species.id}><div className={`species-art ${!owned ? 'unknown' : ''}`}><span className="species-number">NO. {String(i + 1).padStart(2, '0')}</span><span className="species-badge">{owned ? <><Icon name="check" size={10} /> 함께하는 중</> : seen ? '발견했어요' : '아직 만나지 못했어요'}</span><Thumbnail species={species.id} /></div><div className="species-info"><h3>{species.name}</h3><p>{species.subtitle}<br />동행 능력 · {species.skill}</p><div className="work-tags">{Object.entries(species.work).map(([work, level]) => <span className="work-tag" key={work}>{WORK_NAMES[work as WorkType]} Lv.{level}</span>)}</div></div></article>; })}</div><div className="captured-list"><div className="section-title"><h3>나와 함께하는 친구들</h3><span>{game.monsters.length} / 60</span></div>{!game.monsters.length ? <div className="empty-state"><Icon name="partner" />첫 친구가 기다리고 있어요<br />야생 몬스터 곁에서 F를 눌러 포획해 보세요. 첫 포획은 확정 성공이에요.</div> : game.monsters.map(monster => { const facility = game.facilities.find(f => f.workerId === monster.id); const isPartner = game.partnerId === monster.id; return <div className="monster-row" key={monster.id}><div className="monster-mini"><Thumbnail species={monster.species} mini /></div><div className="monster-detail"><strong>{SPECIES[monster.species].name} · Lv.{monster.level}</strong><p>{monster.resting ? '회복을 위해 쉬는 중' : facility ? `${FACILITIES[facility.type].name}에서 일하는 중` : isPartner ? '함께 탐험하는 중' : '캠프에서 쉬는 중'} · 활력 {Math.floor(monster.vitality)}<span className="vitality-track"><i style={{ width: `${monster.vitality}%` }} /></span></p></div><button className="secondary-button" disabled={!!facility} onClick={() => apply({ type: 'partner', monsterId: isPartner ? null : monster.id })}>{isPartner ? '동행 해제' : '함께 탐험'}</button><button className="secondary-button" disabled={monster.vitality >= 100} onClick={() => apply({ type: 'feed', monsterId: monster.id })}>먹이 주기</button></div>; })}</div></>}
        {panel === 'craft' && <><div className="filter-tabs" aria-label="제작 분류">{([{ id: 'all', name: '모두' }, { id: 'equipment', name: '장비' }, { id: 'cards', name: '몬스터 카드' }, { id: 'food', name: '음식 · 회복' }, { id: 'materials', name: '가공 재료' }] as const).map(category => <button className={`filter-tab ${filter === category.id ? 'active' : ''}`} key={category.id} onClick={() => setFilter(category.id)}>{category.name}</button>)}</div><div className="craft-layout"><div className="recipe-list">{Object.values(RECIPES).filter(recipe => filter === 'all' || filter === recipe.category).map(recipe => { const levelLocked = game.campLevel < recipe.level; const missingFacility = !game.facilities.some(f => f.type === recipe.facility); return <article className="recipe-card" key={recipe.id}><div className="recipe-icon"><Icon name={itemIcon(recipe.id)} size={25} /></div><div className="recipe-info"><h3>{recipe.name}<span>{recipe.seconds}초</span></h3><p>{recipe.description}</p><Ingredients materials={recipe.ingredients} game={game} />{levelLocked && <p>캠프 Lv.{recipe.level}에서 해금</p>}{missingFacility && <p>{FACILITIES[recipe.facility].name} 필요</p>}</div><button className="secondary-button" disabled={levelLocked || missingFacility || !canAfford(game, recipe.ingredients) || game.queue.length >= 12} onClick={() => apply({ type: 'craft', recipeId: recipe.id })}>{levelLocked ? <Icon name="lock" size={13} /> : '제작'}</button></article>; })}</div><aside className="craft-sidebar"><div className="section-title"><h3>작은 공방의 하루</h3><span>{game.queue.length} / 12</span></div>{!game.queue.length ? <div className="empty-state"><Icon name="craft" size={26} />제작할 물건을 골라 주세요<br />친구가 없어도 손수 만들 수 있어요</div> : game.queue.map(job => { const ahead = game.queue.find(q => q.facilityId === job.facilityId)?.id !== job.id; return <div className="queue-card" key={job.id}><h4>{RECIPES[job.recipeId].name}<span>{ahead ? '대기' : `${Math.ceil(job.remaining)}초`}</span></h4><div className="progress-track"><i style={{ width: `${(1 - job.remaining / job.total) * 100}%` }} /></div><p>{ahead ? '앞선 제작이 끝나면 시작해요' : '정성을 담아 만드는 중…'}</p></div>; })}<p className="settings-info">재료는 제작 시작과 함께 사용해요. 완성품은 가방에 들어가고, 새 장비는 자동으로 장착돼요.<br /><br />제작·조리 적성의 친구를 배치하면 더 빨라져요.</p></aside></div></>}
        {panel === 'camp' && <><div className="camp-summary"><div className="summary-chip"><small>우리의 캠프</small><strong>Lv. {game.campLevel}<span>최대 Lv. 3</span></strong></div><div className="summary-chip"><small>함께 일하는 친구</small><strong>{workerCount}<span>/ {game.monsters.length}마리</span></strong></div><div className="summary-chip"><small>옮긴 자원</small><strong>{game.stats.transported}<span>개</span></strong></div></div><div className="panel-note">{!game.flags.transportAssigned ? '첫 보관함에는 보유 목재 일부를 맡겨요. 운반 적성의 친구를 배치하면 실제 목재를 옮기기 시작해요.' : '친구의 적성에 맞는 시설을 골라 주세요. 완성 자원은 시설에 쌓이고, 운반 친구가 가방으로 가져와요.'}</div><div className="section-title"><h3>우리의 여덟 자리</h3><button className="secondary-button" onClick={() => apply({ type: 'feed' })}><Icon name="food" size={13} />함께 식사하기</button></div><div className="camp-slots">{Array.from({ length: 8 }, (_, slot) => { const facility = game.facilities.find(f => f.slot === slot); if (!facility) return <button key={slot} className={`camp-slot empty ${buildSlot === slot ? 'selected' : ''}`} onClick={() => setBuildSlot(slot)} aria-label={`${slot + 1}번 빈 자리 선택`}><span className="slot-number">0{slot + 1}</span><Icon name={buildSlot === slot ? 'check' : 'plus'} size={25} /><p>{buildSlot === slot ? '이 자리에 지을게요' : '새로운 이야기를 위한 자리'}</p></button>; const definition = FACILITIES[facility.type]; const bufferCount = Object.values(facility.buffer).reduce((a, b) => a + (b ?? 0), 0); const worker = game.monsters.find(m => m.id === facility.workerId); const compatible = game.monsters.filter(m => getWorkLevel(m, definition.work) > 0 && m.id !== game.partnerId && !game.facilities.some(f => f.id !== facility.id && f.workerId === m.id)); return <article className="camp-slot" key={facility.id}><span className="slot-number">0{slot + 1}</span><div className="facility-icon"><Icon name={facilityIcon[facility.type]} size={25} /></div><h4>{definition.name}</h4><p>{WORK_NAMES[definition.work]} 적성 · {worker?.resting ? '친구가 쉬는 중' : worker ? '친구와 함께' : '친구를 기다려요'}</p><select aria-label={`${definition.name} 작업 친구`} value={facility.workerId ?? ''} onChange={event => assignWorker(facility, event.target.value)}><option value="">친구 배치하기</option>{compatible.map(m => <option key={m.id} value={m.id}>{SPECIES[m.species].name} · {WORK_NAMES[definition.work]} {getWorkLevel(m, definition.work)}</option>)}</select><div className="buffer-text">{bufferCount ? Object.entries(facility.buffer).filter(([, n]) => (n ?? 0) > 0).map(([id, n]) => `${ITEMS[id as ItemId].name} ${n}`).join(' · ') : facility.type === 'storage' ? '운반할 자원을 기다려요' : facility.type === 'workbench' || facility.type === 'kitchen' ? `제작 대기 ${game.queue.filter(q => q.facilityId === facility.id).length}개` : `완성품 ${bufferCount} / ${definition.capacity}`}</div>{worker && !['workbench', 'kitchen'].includes(facility.type) && <div className="progress-track"><i style={{ width: `${Math.min(100, facility.progress / definition.seconds * 100)}%` }} /></div>}<div className="slot-actions">{bufferCount > 0 && <button className="secondary-button" onClick={() => apply({ type: 'collect', facilityId: facility.id })}>자원 받기</button>}{facility.type === 'storage' && game.stats.transported === 0 && totalBuffers === 0 && <button className="secondary-button" onClick={() => stageDelivery(facility)}>목재 운반 맡기기</button>}{worker && <button className="secondary-button" disabled={worker.vitality >= 100} onClick={() => apply({ type: 'feed', monsterId: worker.id })}>먹이 주기</button>}</div></article>; })}</div><div className="section-title"><h3>작은 캠프를 가꾸는 일</h3><span>{buildSlot !== undefined ? `${buildSlot + 1}번 자리 선택됨` : '빈 자리에 자동 배치'}</span></div><div className="build-grid">{Object.values(FACILITIES).map(definition => <article className="build-card" key={definition.id}><div className="facility-icon"><Icon name={facilityIcon[definition.id]} size={26} /></div><div><h4>{definition.name}</h4><p>{definition.description}</p><Ingredients materials={definition.cost} game={game} /><button className="secondary-button" disabled={game.campLevel < definition.level || !canAfford(game, definition.cost) || game.facilities.length >= 8} onClick={() => { const result = apply({ type: 'build', facility: definition.id, slot: buildSlot }); if (result.ok) setBuildSlot(undefined); }}>{game.campLevel < definition.level ? `캠프 Lv.${definition.level} 필요` : '시설 짓기'}</button></div></article>)}</div><p className="settings-info">서로 다른 친구 2종을 모으면 캠프 Lv.2, 4종을 모으면 Lv.3이 돼요. 동행 중이거나 다른 시설에서 일하는 친구는 몬스터북 또는 해당 시설에서 먼저 해제해 주세요.</p><button className="primary-button" onClick={explore}><Icon name="explore" size={15} />숲으로 탐험 떠나기</button></>}
        {panel === 'bag' && <div className="bag-layout"><div><div className="section-title"><h3>오늘 모은 작은 보물</h3><span>{Object.values(game.inventory).reduce((a, b) => a + b, 0)}개</span></div><div className="inventory-grid">{Object.values(ITEMS).filter(item => game.inventory[item.id] > 0).map(item => <div className="inventory-item" key={item.id}><span>×{game.inventory[item.id]}</span><Icon name={itemIcon(item.id)} size={28} /><strong>{item.name}</strong></div>)}</div><div className="section-title" style={{ marginTop: 22 }}><h3>포획 카드 선택</h3></div><div className="filter-tabs">{(['card', 'enhancedCard', 'royalCard'] as CardId[]).map(id => <button className={`filter-tab ${card === id ? 'active' : ''}`} key={id} onClick={() => { setCard(id); cardRef.current = id; }} disabled={game.inventory[id] < 1 && card !== id}>{ITEMS[id].name} ×{game.inventory[id]}</button>)}</div><p className="settings-info">체력을 낮추고 Q로 브레이크하면 포획 확률이 높아져요. 실패해도 카드는 사용되며, 첫 포획은 반드시 성공해요.</p></div><aside className="equipment-panel"><div className="section-title"><h3>탐험가의 장비</h3></div>{[{ icon: 'sword' as const, label: '무기', name: ['아직 없어요', '탐험가의 목검', '숲지기의 검', '별빛 수호검'][game.equipment.weapon] }, { icon: 'shield' as const, label: '방어구', name: game.equipment.armor ? '숲지기의 조끼' : '가벼운 탐험복' }, { icon: 'boots' as const, label: '도구', name: game.equipment.tool ? '가벼운 탐험화' : '편안한 신발' }, { icon: 'charm' as const, label: '장신구', name: game.equipment.charm ? '탐험가의 부적' : '아직 없어요' }].map(equipment => <div className="equipment-row" key={equipment.label}><Icon name={equipment.icon} size={23} /><div><small>{equipment.label}</small><strong>{equipment.name}</strong></div></div>)}<div className="stat-list"><span>공격력 <b>{playerStats.attack}</b></span><span>방어력 <b>{playerStats.defense}</b></span><span>최대 체력 <b>{game.maxHp}</b></span><span>이동 속도 <b>{Math.round(playerStats.speed * 100)}%</b></span></div><div className="equipment-options">{(['food', 'potion', 'feast'] as const).map(id => <button key={id} className="secondary-button" disabled={game.inventory[id] < 1 || game.hp >= game.maxHp} onClick={() => apply({ type: 'heal', item: id })}><Icon name={itemIcon(id)} size={14} />{ITEMS[id].name} 먹기 ×{game.inventory[id]}</button>)}</div><p className="settings-info">새 장비를 만들면 자동으로 장착돼요. 이미 더 좋은 장비를 쓰고 있다면 그대로 유지해요.</p></aside></div>}
        {panel === 'journal' && <><div className="section-title"><h3>우리의 첫 번째 이야기</h3><span>{questsDone} / {QUESTS.length} 완료</span></div><div className="journal-list">{QUESTS.map((entry, i) => { const done = game.completedQuests.includes(entry.id); return <article key={entry.id} className={`journal-card ${done ? 'done' : quest?.id === entry.id ? 'active' : ''}`}><span className="journal-number">{done ? <Icon name="check" size={13} /> : String(i + 1).padStart(2, '0')}</span><div><h3>{entry.title}</h3><p>{entry.description}<br />{entry.hint}</p><small>{done ? '이야기를 마쳤어요' : `연구 +${entry.research} · ${Object.entries(entry.reward).map(([id, n]) => `${ITEMS[id as ItemId].name} ${n}`).join(', ')}`}</small></div></article>; })}</div></>}
        {panel === 'settings' && <><div className="setting-row"><div><strong>숲의 작은 소리</strong><p>채집, 포획, 제작의 효과음을 들어요</p></div><button className={`toggle ${!game.settings.muted ? 'on' : ''}`} role="switch" aria-checked={!game.settings.muted} aria-label="효과음" onClick={() => updateSetting('muted')} /></div><div className="setting-row"><div><strong>차분한 움직임</strong><p>장식 효과와 화면 움직임을 줄여요</p></div><button className={`toggle ${game.settings.reducedMotion ? 'on' : ''}`} role="switch" aria-checked={game.settings.reducedMotion} aria-label="동작 줄이기" onClick={() => updateSetting('reducedMotion')} /></div><div className="setting-row"><div><strong>탐험 저장</strong><p>{saveError || (savedAt ? `마지막 저장 ${savedAt}` : '중요한 순간과 5초마다 자동으로 저장해요')}</p></div><button className="secondary-button" disabled={savesBlocked.current} onClick={() => { const ok = persist(); notify(ok ? '탐험을 안전하게 저장했어요' : '저장하지 못했어요. 파일로 내보내 주세요.', !ok); }}><Icon name="save" size={14} />지금 저장</button></div><div className="settings-actions"><button className="secondary-button" onClick={() => exportData(serializeGame(gameRef.current), 'wild-and-craft-save.json')}><Icon name="download" size={14} />현재 탐험 내보내기</button><label className="secondary-button import-label"><Icon name="upload" size={14} />저장 파일 가져오기<input type="file" accept="application/json,.json" onChange={event => { void importData(event.target.files?.[0]); event.target.value = ''; }} /></label>{initial.damaged !== null && <button className="secondary-button" onClick={() => exportData(initial.damaged!, 'wild-and-craft-damaged-original.json')}>이전 원본 백업 내보내기</button>}<button className="danger-button" onClick={() => { setResetConfirm(true); setPendingImport(null); }}>새 탐험 시작</button></div>{pendingImport && <div className="confirm-reset"><p>친구 {pendingImport.monsters.length}마리 · 캠프 Lv.{pendingImport.campLevel} 저장 파일로 현재 탐험을 바꿀까요? 현재 탐험은 먼저 내보내 보관할 수 있어요.</p><div><button className="primary-button" onClick={() => replaceSave(pendingImport)}>가져오고 다시 시작</button><button className="secondary-button" onClick={() => setPendingImport(null)}>취소</button></div></div>}{resetConfirm && <div className="confirm-reset"><p>이 브라우저의 탐험을 처음부터 새로 시작할까요? 돌아오고 싶다면 현재 탐험을 먼저 내보내 주세요.{initial.damaged ? ' 읽을 수 없는 이전 원본은 별도 백업에 보관해요.' : ''}</p><div><button className="danger-button" onClick={() => replaceSave(createGame())}>처음부터 시작하기</button><button className="secondary-button" onClick={() => setResetConfirm(false)}>취소</button></div></div>}<p className="settings-info">이 게임은 개인 기기에 저장되는 싱글 플레이 체험이에요. 다른 기기로 옮길 때는 내보내기와 가져오기를 이용해 주세요. 설정 창과 숨겨진 브라우저 탭에서는 시간과 생산이 멈춰요.</p><div className="controls-help"><span><b>A D / ← →</b> 이동</span><span><b>SPACE</b> 점프</span><span><b>E</b> 채집</span><span><b>J</b> 공격</span><span><b>Q</b> 브레이크</span><span><b>F</b> 포획</span><span><b>R</b> 동행 능력</span><span><b>H</b> 회복</span><span><b>B</b> 캠프</span><span><b>ESC</b> 닫기</span></div></>}
        {panel === 'victory' && <div className="victory-body"><Icon name="star" size={55} /><h3>A forest full of friends.</h3><p>낯설었던 숲이, 이제 우리의 집이 되었어요.<br />숲의 수호자가 건넨 결정으로 다음 이야기를 준비해 보세요.</p><div className="victory-stats"><span><strong>{speciesCount}</strong>함께한 친구 종류</span><span><strong>{game.facilities.length}</strong>캠프 시설</span><span><strong>{game.stats.transported}</strong>친구들이 옮긴 자원</span></div><button className="primary-button" onClick={() => setPanel(null)}>우리의 이야기 계속하기<Icon name="arrow" size={15} /></button></div>}
      </div><footer className="panel-footer"><span>{panel === 'settings' || panel === 'victory' ? '잠시 쉬어가는 시간 · 모든 진행 일시 정지' : '메뉴를 보는 동안 친구들과 공방은 계속 일해요'}</span><span>ESC · 닫기</span></footer></section></div>}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">{toasts.map(toast => <div className={`toast ${toast.error ? 'error' : ''}`} key={toast.id}>{toast.message}</div>)}</div>
    </main>
    <footer className="bottom-status"><div className="status-group"><span><i className="live-dot" />나만의 작은 세계</span><span className="status-extra">숲의 친구 {speciesCount}/6</span><span className="status-extra">연구 {game.research}</span></div><div className="footer-controls"><span><b>A D</b> 이동</span><span><b>SPACE</b> 점프</span><span><b>E</b> 채집</span><span><b>F</b> 포획</span></div><span>{saveError ? '임시 탐험 · 파일 백업 권장' : started ? '탐험을 자동 저장하고 있어요' : 'Take a breath. Make a little home.'}</span></footer>
  </div>;
}
