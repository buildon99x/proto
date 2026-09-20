import type { ProjectMetadata } from "../schema";

export const projects = [
  {
    "id": "deck-building",
    "name": "Deck Building",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "version": "0.1.1",
    "summary": "Deck Building prototype.",
    "tags": [
      "prototype"
    ],
    "projectRoot": "projects/deck-building",
    "entry": {
      "kind": "iframe",
      "path": "/runs/deck-building/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter deck-building dev",
      "build": "pnpm --filter deck-building build",
      "test": "pnpm --filter deck-building test"
    },
    "updatedAt": "2026-07-15T15:28:50+00:00"
  },
  {
    "id": "retro-bowling",
    "name": "Retro Bowling",
    "status": "prototype",
    "type": "demo",
    "runtime": "static-artifact",
    "version": "0.1.1",
    "summary": "도트 그래픽 8비트 볼링 게임. 원근 레인을 배경으로 파워 미터·스핀(훅) 미터·조준으로 공을 굴려 10프레임 표준 볼링을 즐긴다. 실시간 2D 핀 물리로 스트라이크·스페어·스플릿이 자연스럽게 발생하고, 칩튠 사운드와 CRT 스캔라인 연출을 입혔다.",
    "tags": [
      "game",
      "bowling",
      "retro",
      "pixel-art",
      "8bit",
      "canvas",
      "arcade",
      "prototype"
    ],
    "projectRoot": "projects/retro-bowling",
    "entry": {
      "kind": "iframe",
      "path": "/runs/retro-bowling/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter retro-bowling dev",
      "build": "pnpm --filter retro-bowling build",
      "test": "pnpm --filter retro-bowling test"
    },
    "updatedAt": "2026-07-15T15:28:50+00:00"
  },
  {
    "id": "sample-project",
    "name": "Sample Project",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "version": "0.1.1",
    "summary": "Prototype Lab Monorepo의 기본 샘플 프로젝트입니다.",
    "tags": [
      "sample",
      "prototype"
    ],
    "projectRoot": "projects/sample-project",
    "entry": {
      "kind": "iframe",
      "path": "/runs/sample-project/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter sample-project dev",
      "build": "pnpm --filter sample-project build",
      "test": "pnpm --filter sample-project test"
    },
    "updatedAt": "2026-07-15T15:28:50+00:00"
  },
  {
    "id": "stackflow",
    "name": "Stackflow",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "version": "0.3.1",
    "summary": "Korean-localized clone of the Steam block-placement roguelike Stackflow: chain-cascade scoring, a rising tide that raises the floor every move, 3 acts x 10 stages, bosses, shop and advantages.",
    "tags": [
      "reverse-planning",
      "roguelike",
      "puzzle",
      "game",
      "korean"
    ],
    "projectRoot": "projects/stackflow",
    "entry": {
      "kind": "iframe",
      "path": "/runs/stackflow/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter stackflow dev",
      "build": "pnpm --filter stackflow build",
      "test": "pnpm --filter stackflow test"
    },
    "updatedAt": "2026-07-15T15:28:50+00:00"
  },
  {
    "id": "wave-runner",
    "name": "Wave Runner",
    "status": "prototype",
    "type": "demo",
    "runtime": "static-artifact",
    "version": "0.8.0",
    "summary": "원버튼 지그재그 회피 로그라이트. 홀드=상승/릴리스=하강 하나뿐인 문법은 고정하고, 갈림길을 지날 때마다 한 축이 오르고 다른 축이 내리는 교환으로 기체의 각도·속도·편향을 조립한다. 기체 4종은 축을 늘리는 대신 눈금을 계수로 옮기는 곡선이 달라 같은 스테이지가 기체마다 다른 문제가 되고, 한 판 53초의 수제 섹터 18개로 큐레이션한 Stage와 끝이 없는 Endless가 같은 엔진을 쓴다.",
    "tags": [
      "game",
      "one-button",
      "arcade",
      "dodge",
      "roguelite",
      "procedural",
      "canvas",
      "prototype",
      "runner"
    ],
    "projectRoot": "projects/wave-runner",
    "entry": {
      "kind": "iframe",
      "path": "/runs/wave-runner/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md",
      "plan": "notes/runner-variation.md",
      "handoff": "notes/handoff.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter wave-runner dev",
      "build": "pnpm --filter wave-runner build",
      "test": "pnpm --filter wave-runner test"
    },
    "updatedAt": "2026-09-17T12:08:02+00:00"
  },
  {
    "id": "blacksmith-clicker",
    "name": "대장장이 클릭커",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "version": "0.1.1",
    "summary": "Click to forge random fantasy weapons, then sell, salvage, enhance, or collect them to grow an automated blacksmith shop.",
    "tags": [
      "game",
      "clicker",
      "prototype"
    ],
    "projectRoot": "projects/blacksmith-clicker",
    "entry": {
      "kind": "iframe",
      "path": "/runs/blacksmith-clicker/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter blacksmith-clicker dev",
      "build": "pnpm --filter blacksmith-clicker build",
      "test": "pnpm --filter blacksmith-clicker test"
    },
    "updatedAt": "2026-07-15T15:28:50+00:00"
  },
  {
    "id": "altok-dragon-hatchery",
    "name": "알톡! 드래곤 부화장",
    "status": "prototype",
    "type": "demo",
    "runtime": "static-artifact",
    "version": "0.1.1",
    "summary": "드래곤 알을 클릭해 부화시키고, 수집한 드래곤의 자동 생산으로 성장하는 2D 클릭커 프로토타입.",
    "tags": [
      "game",
      "clicker",
      "collection",
      "prototype"
    ],
    "projectRoot": "projects/altok-dragon-hatchery",
    "entry": {
      "kind": "iframe",
      "path": "/runs/altok-dragon-hatchery/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter altok-dragon-hatchery dev",
      "build": "pnpm --filter altok-dragon-hatchery build",
      "test": "pnpm --filter altok-dragon-hatchery test"
    },
    "updatedAt": "2026-07-15T15:28:50+00:00"
  },
  {
    "id": "dragon-danmaku",
    "name": "용린난무 龍鱗亂舞",
    "status": "prototype",
    "type": "demo",
    "runtime": "static-artifact",
    "version": "0.1.1",
    "summary": "도돈파치 계보의 연환(체인) 스코어링 종스크롤 탄막 슈팅에 드래곤·동양 신화 테마를 입힌 웹 게임. 샷/레이저 이원 무기, 봄/각성, 6스테이지 + 영구 성장 메타.",
    "tags": [
      "game",
      "danmaku",
      "shmup",
      "bullet-hell",
      "dragon",
      "prototype"
    ],
    "projectRoot": "projects/dragon-danmaku",
    "entry": {
      "kind": "iframe",
      "path": "/runs/dragon-danmaku/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter dragon-danmaku dev",
      "build": "pnpm --filter dragon-danmaku build",
      "test": "pnpm --filter dragon-danmaku test"
    },
    "updatedAt": "2026-07-15T15:28:50+00:00"
  },
  {
    "id": "relic-king",
    "name": "유물왕",
    "status": "prototype",
    "type": "demo",
    "runtime": "static-artifact",
    "version": "0.3.1",
    "summary": "실존 유물을 발굴·감정·소장해 3축 순위(자산·도감·명성) 종합 1위에 오르는 방치형. 유물의 현실 현존 개체 수가 그대로 게임 공급량이고, 세상에 하나뿐인 유물은 제보 레이스에서 먼저 도달한 쪽이 영구히 가진다. 12거점 세계지도를 발굴단이 회차제로 원정하고, 감정소·보관소·박물관·경매장·암시장까지 갖춘 5탭(발굴·소장고·시설·시장·도감) UI로 돌아간다. v0.3에서 유물이 280종 → 2000종(검증 1,902종)으로 늘었다 — 메트로폴리탄 미술관 오픈액세스(CC0) 메타데이터를 거점·연대·유물종류로 갈라 만든 종 1,720개를 손으로 쓴 280종 위에 얹었고, 국보·유일 등급은 사람이 판정한 손글씨 쪽에만 둔다. 유물 획득 주기도 20초 → 8초로 줄였다. 클릭 0회로 약 141시간 방치만으로 엔딩에 도달한다. v0.3.1은 소장 중인 유물에 희귀도 조건을 걸어 중복분만 자동으로 파는 기능을 더했다 — 종당 1점·전시 중·국보·유일은 설정과 무관하게 남고, 기본값은 꺼짐이다(켜면 자산 축이 실제로 내려간다).",
    "tags": [
      "game",
      "idle",
      "incremental",
      "collection",
      "artifact",
      "pixel-art",
      "prototype"
    ],
    "projectRoot": "projects/relic-king",
    "entry": {
      "kind": "iframe",
      "path": "/runs/relic-king/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md",
      "mda": "notes/mda.md",
      "dataset": "notes/artifacts-dataset.md",
      "decisions": "notes/decisions.md",
      "economy": "notes/economy.md",
      "worldMap": "notes/world-map.md",
      "staff": "notes/staff.md",
      "uxV02": "notes/ux-v02.md",
      "pipeline": "scripts/README.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter relic-king dev",
      "build": "pnpm --filter relic-king build",
      "test": "pnpm --filter relic-king test",
      "sim": "pnpm --filter relic-king sim",
      "smoke": "pnpm --filter relic-king smoke"
    },
    "updatedAt": "2026-09-19T10:00:41+00:00"
  }
] as const satisfies readonly ProjectMetadata[];
