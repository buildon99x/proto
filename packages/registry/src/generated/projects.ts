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
    "id": "msw-inc",
    "name": "MSW 주식회사",
    "status": "prototype",
    "type": "demo",
    "runtime": "static-artifact",
    "version": "1.8.0",
    "summary": "몬스터가 직원인 회사에 월드 매니저로 입사해, 몬스터를 진화시키고 던전을 이어 모험가(NPC)들이 레벨 1부터 70까지 즐겁게 올라가는 월드를 만드는 저관여 월드 매니지먼트. 메인 화면 \"월드 길\"은 가로축이 레벨이고, 던전은 자기 적정 구간 너비의 발판, 발판이 없는 땅이 빈틈이다. 핵심 결정은 \"지금 진화시킬까?\" — 진화하면 위가 열리지만 아래가 빈다. 5장(헤네시스→슬리피우드) 전부와 주니어 발록 엔딩, 완전 클리어(던전 19곳 ★3·도감 52)까지 돈다. 규칙 v1.2(선택 점검)로 어떤 선택도 월드를 멈추지 않게 했고, 규칙 v1.3(플레이 리뷰 뒤)으로 첫 세션 약 3분 안에 승진 발령·1장 결재 도장·새 지역까지 한 바퀴를 돌게 했고, 규칙 v1.4로 배속 없이 파티 도착·구간 개방·초반 사냥터로 첫 40분 동안 사건이 최장 20초마다(결정은 약 1분에 한 번) 일어나게 했다. 규칙 v1.5로 헤네시스·엘리니아 계열을 지역당 4종으로 늘려, 줄이 서면 자리 확장 대신 레벨이 다른 계열로 던전을 하나 더 열어 줄을 나누는 선택지가 생겼다. 규칙 v1.6으로 2장부터 사냥이 쌓이면 던전 앞에 드랍 상자가 떨어져, 줄·빈틈에 맞는 계열 채용권과 무료 이벤트권 가운데 하나를 고른다(월드에 하나, 쥔 권이 3장이면 쉰다). 3~5장에는 결재 막대 눈금 보상, 사냥이 쌓이면 나오는 엘리트, 장마다 한 번 찾아오는 필드 보스가 봉우리를 만든다. ▲ 진화 배지는 지금 해도 되는 것만 최대 3개. 규칙 v1.7로 사냥터마다 자리·층·식구가 있고 지역 다섯 곳이 다른 그림으로 읽히며, 떠난 손님이 풀에 남아 매니저가 복귀·신규 모객으로 다시 부른다(직원이 진화하면 손님이 돌아오는 승진 소식). 40판 모두 D24~36에 엔딩(표준 D31), 멈춘 월드 0.",
    "tags": [
      "game",
      "idle",
      "management",
      "maplestory-worlds",
      "simulation"
    ],
    "projectRoot": "projects/msw-inc",
    "entry": {
      "kind": "iframe",
      "path": "/runs/msw-inc/index.html"
    },
    "docs": {
      "brief": "brief.md",
      "spec": "spec.md",
      "eval": "eval.md",
      "readme": "README.md",
      "changelog": "changelog.md",
      "choiceAudit": "notes/choice-audit.md",
      "uxReview": "notes/ux-review.md",
      "playReview": "notes/play-review/index.html",
      "content": "notes/content.md",
      "decisions": "notes/decisions.md",
      "concept": "../../docs/concept/maple-idle/msw-inc/README.md",
      "improvementPlan": "notes/improvement-plan.md",
      "tempo": "notes/tempo-v14.md",
      "ladder": "notes/ladder-v15.md",
      "drop": "notes/drop-v16.md",
      "handoff": "notes/handoff.md",
      "plan": "notes/plan-v17.md",
      "guests": "notes/guests-v17.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter msw-inc dev",
      "build": "pnpm --filter msw-inc build",
      "test": "pnpm --filter msw-inc test",
      "pacing": "pnpm --filter msw-inc pacing",
      "audit": "pnpm --filter msw-inc audit",
      "smoke": "pnpm --filter msw-inc smoke",
      "shots": "pnpm --filter msw-inc shots",
      "playreview": "pnpm --filter msw-inc playreview",
      "playreview:ui": "pnpm --filter msw-inc playreview:ui",
      "playreview:v13": "pnpm --filter msw-inc playreview:v13",
      "cadence": "pnpm --filter msw-inc cadence",
      "checkin": "pnpm --filter msw-inc checkin"
    },
    "updatedAt": "2026-09-26T03:27:39+00:00"
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
    "version": "0.6.8",
    "summary": "실존 유물을 발굴·감정·소장해 3축 순위(자산·도감·명성) 종합 1위에 오르는 방치형. 유물의 현실 현존 개체 수가 그대로 게임 공급량이고, 세상에 하나뿐인 유물은 제보 레이스에서 먼저 도달한 쪽이 영구히 가진다. v0.6에서 첫 세션의 밀도를 다시 설계했다 — 첫 제보가 14분 30초에서 20초로, 첫 레이스 결과가 15분에서 1분 20초로, 첫 유일(T4) 조우가 '한 시간 안에 못 만남'에서 4분 35초로 당겨졌고, 첫 1분에 겪는 사건이 3종에서 5종, 첫 10분이 4종에서 12종이 됐다. 반복 대 의미는 7.14:1에서 1.30:1이다. 그 대가로 전체가 짧아졌다 — 엔딩이 140시간 36분에서 16시간 25분이 됐다(8.6배 압축). 제보 배너에는 반응 유예 30초가 붙어 창이 설계값(60~150초) 안으로 돌아왔고, 라이벌 적중률이 플레이어와 같은 28%가 되어 아무것도 안 누르면 반반, 집중 굴착을 누르면 60%가 된다. 도감이 차면 선점 승산이 오르고(안목), 소장고 정원 초과는 자동으로 처리된다. v0.5에서 플레이어끼리 겨룰 수 있게 됐다 — 내 상태를 200자 남짓 코드(기록패)로 구워 건네면 받은 쪽 세계에서 계속 자라는 상대가 된다(서버·런타임 네트워크 0). 지도는 Natural Earth 1:110m 육지를 빌드타임에 구운 실제 해안선이고, 12거점은 실존 도시 좌표에 찍힌다(경주·룩소르·폼페이·이스탄불…). 32×32 도트 아이콘이 shape 10종 안에서 실루엣 60종으로 갈라지고, 유일 12종은 손으로 찍은 전용 도트를 쓴다. 유물 2000종(검증 1,902종)은 메트로폴리탄 미술관 오픈액세스(CC0) 메타데이터로 만든 종 1,720개를 손으로 쓴 280종 위에 얹은 것이다. 5탭(발굴·소장고·시설·시장·도감) UI로 돌아가고, 화폐는 달러(흔한 유물 한 점 ≈ $1만)다. 소장고에서는 여러 종을 골라 한 번에 매각·경매 등록할 수 있다(v0.5.2). 클릭 0회 방치만으로 엔딩에 도달한다.",
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
      "pipeline": "scripts/README.md",
      "telemetry": "notes/play-telemetry.md",
      "firstTenHours": "notes/play-first-10h.md",
      "prompts": "prompts/v0.6-first-session-density.md",
      "firstTenMinutes": "notes/play-first-10h-v06.md"
    },
    "assets": {
      "cover": "assets/screenshots/cover.png"
    },
    "commands": {
      "dev": "pnpm --filter relic-king dev",
      "build": "pnpm --filter relic-king build",
      "test": "pnpm --filter relic-king test",
      "sim": "pnpm --filter relic-king sim",
      "smoke": "pnpm --filter relic-king smoke",
      "qa:sprites": "pnpm --filter relic-king qa:sprites",
      "sheets": "pnpm --filter relic-king sheets",
      "play": "pnpm --filter relic-king play",
      "playlog": "pnpm --filter relic-king playlog",
      "density": "pnpm --filter relic-king density"
    },
    "updatedAt": "2026-09-24T14:40:38+00:00"
  }
] as const satisfies readonly ProjectMetadata[];
