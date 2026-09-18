import { useState } from "react";
import { MAP_BOOKMARK_CAP } from "../game/balance";
import type { SiteId } from "../game/types";

const KEY = "relic-king/bookmarks/v1";

function readBookmarks(): SiteId[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SiteId[]) : [];
  } catch {
    return [];
  }
}

function writeBookmarks(list: SiteId[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* 사생활 모드 등 — 무시 */
  }
}

/**
 * 거점 북마크(notes/world-map.md §7 — MAP_BOOKMARK_CAP=10). 게임 저장 상태가
 * 아니라 순수 UI 선호도라 World 스키마에 넣지 않고 별도 localStorage에 둔다.
 */
export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<SiteId[]>(readBookmarks);

  const toggle = (site: SiteId) => {
    setBookmarks((cur) => {
      const next = cur.includes(site)
        ? cur.filter((s) => s !== site)
        : cur.length >= MAP_BOOKMARK_CAP
          ? cur
          : [...cur, site];
      writeBookmarks(next);
      return next;
    });
  };

  return { bookmarks, toggle, isBookmarked: (site: SiteId) => bookmarks.includes(site) };
}
