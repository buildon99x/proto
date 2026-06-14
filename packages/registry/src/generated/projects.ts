import type { ProjectMetadata } from "../schema";

export const projects = [
  {
    "id": "blacksmith-clicker",
    "name": "대장장이 클릭커",
    "status": "prototype",
    "type": "webapp",
    "runtime": "static-artifact",
    "summary": "클릭 제작, 랜덤 무기, 판매/분해/강화/보관, 업그레이드와 자동 제작을 체험하는 2D 대장간 클릭커 프로토타입.",
    "tags": [
      "game",
      "clicker",
      "phaser",
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
  }
] as const satisfies readonly ProjectMetadata[];
