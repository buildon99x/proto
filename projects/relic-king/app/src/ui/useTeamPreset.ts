import { useState } from "react";

const KEY = "relic-king/team-preset/v1";

export type TeamPreset = { workers: number; gearLevel: number };

function readPreset(): TeamPreset | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TeamPreset) : null;
  } catch {
    return null;
  }
}

function writePreset(preset: TeamPreset | null) {
  try {
    if (preset) localStorage.setItem(KEY, JSON.stringify(preset));
    else localStorage.removeItem(KEY);
  } catch {
    /* 사생활 모드 등 — 무시 */
  }
}

/**
 * 발굴단 꾸리기 "빠른 설정" 프리셋(notes/ux-v02.md §3, G55.11이 미구현으로 남긴
 * 것을 마무리 패스 G56에서 닫는다). 게임 저장 상태가 아니라 "다음에 새 팀을
 * 만들 때 인원·장비를 얼마로 시작할지"에 대한 순수 UI 선호도라, 북마크·
 * 온보딩-본적있음 플래그와 같은 패턴으로 World 스키마 밖 별도 localStorage에 둔다.
 */
export function useTeamPreset() {
  const [preset, setPreset] = useState<TeamPreset | null>(readPreset);
  return {
    preset,
    save: (p: TeamPreset) => {
      writePreset(p);
      setPreset(p);
    },
    clear: () => {
      writePreset(null);
      setPreset(null);
    }
  };
}
