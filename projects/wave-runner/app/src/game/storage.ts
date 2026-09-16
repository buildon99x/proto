import { EMPTY_META } from "./meta";
import type { Meta } from "./meta";

const KEY = "wave-runner/meta/v2";

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_META, presets: [...EMPTY_META.presets] };
    const p = JSON.parse(raw) as Partial<Meta>;
    return {
      cores: p.cores ?? 0,
      presets: Array.isArray(p.presets) && p.presets.length > 0 ? p.presets : ["neutral"],
      axisCap: p.axisCap === 3 ? 3 : 2,
      fullPool: Boolean(p.fullPool),
      clearedStages: Array.isArray(p.clearedStages) ? p.clearedStages : [],
      bestStageSec: p.bestStageSec ?? {},
      // v2 문자열을 그대로 읽는다 — 추가 항목은 양방향 호환이라 키를 올릴 이유가 없다
      bestStageProgress: p.bestStageProgress ?? {},
      bestStageSplits: p.bestStageSplits ?? {},
      bestDistance: p.bestDistance ?? 0,
      attempts: p.attempts ?? {}
    };
  } catch {
    return { ...EMPTY_META, presets: [...EMPTY_META.presets] };
  }
}

export function saveMeta(meta: Meta): Meta {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    // 저장 불가(프라이빗 모드 등)여도 플레이는 계속된다.
    // 영구 해금이 생긴 이상 이건 2단계의 알려진 부채다 — 내보내기/가져오기가 필요하다.
  }
  return meta;
}

/** 진행도를 사람이 옮길 수 있게 텍스트로 뽑는다. localStorage 단독 의존을 줄이는 최소 장치. */
export function exportMeta(meta: Meta): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(meta))));
}

export function importMeta(text: string): Meta | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(text.trim())))) as Partial<Meta>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      ...EMPTY_META,
      ...parsed,
      presets: Array.isArray(parsed.presets) && parsed.presets.length ? parsed.presets : ["neutral"]
    } as Meta;
  } catch {
    return null;
  }
}
