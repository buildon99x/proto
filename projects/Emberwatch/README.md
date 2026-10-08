# Emberwatch: Crown of Cinders

An original, dependency-free Canvas 2D solo dungeon-crawler prototype. Choose a hero, explore six generated floors, gather equipment and relics, fight three guardians, and rebuild a persistent refuge.

**Status: Warrior-first development checkpoint, version 0.4.1. Actual browser gameplay and visuals remain unverified.** See [eval.md](./eval.md) for evidence and blockers.

## Run and build

From the repository root:

```sh
pnpm --filter emberwatch dev
pnpm --filter emberwatch lint
pnpm --filter emberwatch test
pnpm build:project -- emberwatch
pnpm --filter emberwatch standalone
```

The development server listens on port 4173 by default (`PORT=4174` to override). The launcher build places the game at `/runs/emberwatch/index.html`; the launcher run page is `/projects/emberwatch/run`. The standalone command generates `app/dist/Emberwatch.html`. Build output is ignored by Git.

The project itself has no npm dependencies. Direct use from `projects/Emberwatch/app` also works with Node.js:

```sh
node scripts/build.mjs
node scripts/serve.mjs
node tests/data.test.mjs
node tests/growth.test.mjs
node tests/runtime.test.mjs
```

## Controls

- WASD / arrow keys: move; mouse: aim; hold left click: attack; J: nearest-target attack
- Space: dodge; Q/E: class abilities; F: interact; R: potion
- Tab: inventory; K: training; C: unlocked specialization technique; Escape: pause
- On-screen touch controls are experimental and have not been tested on a real device

## Source and evidence

- `app/src/`: HTML, styles, definitions/map generation, and game runtime
- `app/scripts/`: static build, preview server, standalone packager, and syntax check
- `app/tests/`: deterministic data tests and isolated mock-runtime checks
- `brief.md`, `spec.md`, `eval.md`: goals, implementation contract, and verification status
- `docs/QA.md`: the source-stage test record and manual acceptance checklist
- `docs/review.html`: Korean feature-by-feature comparison and research sources (also built as `/runs/emberwatch/review.html`)
- `docs/source-notes.md`: detailed source implementation notes

Save data is stored only in the current browser's local storage under `emberwatch-save`. There is no cloud account, server API, multiplayer, or cross-device synchronization. Clearing site data can remove progression.

Hosted styles optionally load Google Fonts; the standalone edition removes that request and uses system fonts. The runtime includes optional, read-only WebMCP progress registration, which remains unverified in a supported browser.

This is an original genre-inspired prototype. It does not include commercial game assets or claim full feature parity, production balance, or release readiness.

## 0.2.0 development revision

This revision expands skill/attribute growth, rank-gated Training Grounds, forging, elemental equipment, skill spheres, combat feedback, and map layouts. Dedicated growth tests and refreshed reports are included. The first found item requires explicit Equip; rank-3 skills evolve their behavior; legacy expeditions preserve their old map generator. The permanent development warning remains visible, and real browser gameplay/visual verification is still blocked at the private site’s sign-in screen. Follow `eval.md` for the current evidence and acceptance gates.


## 0.3.0 visual revision

The game now uses original generated transparent PNG art for a teal/violet ruined citadel, torchlight, and four-direction actors. H toggles a cinematic view. Movement and mouse targeting are transformed into the isometric scene. Four poses per direction provide idle, two-frame walking and attack. Class-specific skills remain intact, but playable classes currently share one armored-hero appearance; enemies share guardian art with scale/tint differences.

The standalone generator embeds all three images and visual modules. Local source tests cover projection, facing, animations, bounds and anchoring in addition to existing gameplay logic. Offscreen evidence is in `assets/screenshots/visual-0.3.0`; see `docs/QA.md` for the separate browser-testing blocker. This is a development checkpoint, not 99% visual equivalence or release readiness.

## 0.4.0 Warrior-first development checkpoint

The Warrior now uses ten24-pose articulated clips in four directions. Three sword attacks, Whirling Axes, War Cry, dodge, hurt and death align to simulation contacts. This is cutout/skeletal animation built from original generated art, not24 independently hand-drawn source pictures. Short actions retain responsive timing rather than forcing every authored sample to appear at60fps.

Basic attacks can chain to skills during recovery. An attack after the initial dash commits to a forward dash strike and gives up the remaining dash invulnerability. Dodging through a hit opens a brief stronger counterattack. Directional hit effects, grounded trails, generated spinning axes, practice-target feedback and reduced-FX controls are integrated.

Audio is a55-clip original PCM sample bank made from layered noise, resonant transients and processed foley-like synthesis. Sword/contact/material/heavy sounds, footsteps, axes and War Cry replace the former oscillator beeps. Swish peaks are scheduled at contact and canceled when interrupted; impacts occur only on confirmed hits. Opt in with Sound. `assets/audio-audition.html` is an explicit listening page, not proof that a listening review passed.

The new monster framework remains disabled while the first Warrior actual-play gate is open. Existing enemy behavior remains playable; no other character or monster is represented as completed.

Project lint/tests/static and standalone packaging pass. Motion proofs and integration stills are offscreen evidence. Supported dotcloud preview still returns502; private Site sign-in is not approved. Normal-control play, subjective feel/mix, device persistence and browser60FPS remain unverified. The build is not claimed to match or exceed Hades.

## 한국어 개발 빌드0.4.1

화면·기술·장비·성장·보상·재도전 안내가 한국어로 표시됩니다. 한글 서체를 포함해 오프라인 단일HTML에서도 외부 글꼴 요청 없이 표시합니다. WASD/J/Q/E 등은 물리키를 사용하므로 한글 자판에서도 같은 위치의 키로 조작할 수 있습니다. M은 탐색 지도입니다.

보상 선택을 중단하거나 이어하기로 돌아와도 선택 기회와 제안 목록을 유지합니다. 저장 실패는 전투 중에도 경고합니다. 첫 무기→장착→기술 습득→진화·수호자 단계의 다음 목표를 표시하며, 원정 결과에서 남는 성장과 다음 도전을 확인할 수 있습니다.

실제 브라우저 플레이와 장기 반복 플레이의 체감·밸런스는 미검증입니다. 관련 테스트와 게임 화면 렌더는 각각 모의 실행·오프스크린 증거로 구분합니다. 공유 레지스트리 경로 수정 승인이 남아 있어 전체런처 통합과새Site 배포는 진행하지 않았습니다.
