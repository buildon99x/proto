// Cross-run persistence (spec §8.5): run-bests + Blockipedia + settings.
import type { RunBests } from "./types";

const BESTS_KEY = "stackflow:bests";
const PEDIA_KEY = "stackflow:blockipedia";
const SETTINGS_KEY = "stackflow:settings";

export const EMPTY_BESTS: RunBests = {
  chain: 0,
  clear: 0,
  perfectClears: 0,
  act: 0,
  stage: 0,
};

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadBests(): RunBests {
  try {
    const raw = storage()?.getItem(BESTS_KEY);
    return raw ? { ...EMPTY_BESTS, ...JSON.parse(raw) } : { ...EMPTY_BESTS };
  } catch {
    return { ...EMPTY_BESTS };
  }
}

export function saveBests(b: RunBests): void {
  try {
    storage()?.setItem(BESTS_KEY, JSON.stringify(b));
  } catch {
    /* private mode etc. */
  }
}

export function loadDiscovered(): Set<string> {
  try {
    const raw = storage()?.getItem(PEDIA_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : ["normal"]);
  } catch {
    return new Set(["normal"]);
  }
}

export function saveDiscovered(s: Set<string>): void {
  try {
    storage()?.setItem(PEDIA_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

export interface Settings {
  reduceMotion: boolean;
  sound: boolean;
  keys: Record<string, string>;
}

export const DEFAULT_KEYS: Record<string, string> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  down: "ArrowDown",
  rotateCw: "ArrowUp",
  rotateCw2: "KeyX",
  rotateCcw: "KeyZ",
  rotate180: "KeyA",
  lock: "Space",
  hold: "KeyC",
};

export function loadSettings(): Settings {
  try {
    const raw = storage()?.getItem(SETTINGS_KEY);
    const s = raw ? JSON.parse(raw) : {};
    return {
      reduceMotion: !!s.reduceMotion,
      sound: s.sound !== false,
      keys: { ...DEFAULT_KEYS, ...(s.keys ?? {}) },
    };
  } catch {
    return { reduceMotion: false, sound: true, keys: { ...DEFAULT_KEYS } };
  }
}

export function saveSettings(s: Settings): void {
  try {
    storage()?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
