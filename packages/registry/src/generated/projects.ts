import type { ProjectMetadata } from "../schema";

export const projects = [
  {
    "id": "blacksmith-clicker",
    "name": "대장장이 클릭커",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
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
    }
  },
  {
    "id": "altok-dragon-hatchery",
    "name": "알톡! 드래곤 부화장",
    "status": "prototype",
    "type": "demo",
    "runtime": "static-artifact",
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
    }
  },
  {
    "id": "deep-lighthouse",
    "name": "Deep Lighthouse",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "summary": "A playable abyssal light-control prototype where players rotate a saving beam before pressure crushes the tower.",
    "tags": [
      "game",
      "roguelike",
      "prototype"
    ],
    "projectRoot": "projects/deep-lighthouse",
    "entry": {
      "kind": "iframe",
      "path": "/runs/deep-lighthouse/index.html"
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
      "dev": "pnpm --filter deep-lighthouse dev",
      "build": "pnpm --filter deep-lighthouse build",
      "test": "pnpm --filter deep-lighthouse test"
    }
  },
  {
    "id": "mirror-poker-court",
    "name": "Mirror Poker Court",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "summary": "A playable poker-court prototype where players flip evidence cards into verdict momentum while preserving jury trust.",
    "tags": [
      "game",
      "card",
      "prototype"
    ],
    "projectRoot": "projects/mirror-poker-court",
    "entry": {
      "kind": "iframe",
      "path": "/runs/mirror-poker-court/index.html"
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
      "dev": "pnpm --filter mirror-poker-court dev",
      "build": "pnpm --filter mirror-poker-court build",
      "test": "pnpm --filter mirror-poker-court test"
    }
  },
  {
    "id": "museum-heist-deck",
    "name": "Museum Heist Deck",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "summary": "A playable stealth-deck prototype about reading guard intent, spending tools, and escaping with cursed loot.",
    "tags": [
      "game",
      "stealth",
      "prototype"
    ],
    "projectRoot": "projects/museum-heist-deck",
    "entry": {
      "kind": "iframe",
      "path": "/runs/museum-heist-deck/index.html"
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
      "dev": "pnpm --filter museum-heist-deck dev",
      "build": "pnpm --filter museum-heist-deck build",
      "test": "pnpm --filter museum-heist-deck test"
    }
  },
  {
    "id": "origami-fleet",
    "name": "Origami Fleet",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "summary": "A playable fold-and-position fleet tactics prototype about building formation before paper hulls tear.",
    "tags": [
      "game",
      "tactics",
      "prototype"
    ],
    "projectRoot": "projects/origami-fleet",
    "entry": {
      "kind": "iframe",
      "path": "/runs/origami-fleet/index.html"
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
      "dev": "pnpm --filter origami-fleet dev",
      "build": "pnpm --filter origami-fleet build",
      "test": "pnpm --filter origami-fleet test"
    }
  },
  {
    "id": "sample-project",
    "name": "Sample Project",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
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
    }
  },
  {
    "id": "weather-market",
    "name": "Weather Market",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "summary": "A playable weather trading prototype where players sell bottled sun, rain, and fog without destroying public trust.",
    "tags": [
      "game",
      "management",
      "prototype"
    ],
    "projectRoot": "projects/weather-market",
    "entry": {
      "kind": "iframe",
      "path": "/runs/weather-market/index.html"
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
      "dev": "pnpm --filter weather-market dev",
      "build": "pnpm --filter weather-market build",
      "test": "pnpm --filter weather-market test"
    }
  }
] as const satisfies readonly ProjectMetadata[];
