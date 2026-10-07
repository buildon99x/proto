# QA — 2026-10-07

## Final result: blocked

The source build exists and all non-rendering tests pass. It is not visually verified or production-ready.

### Passed
- `node --check game.js`
- `node --check core.js`
- `node test-core.cjs`: 14 assertions/groups covering collision, manual fire/cock, finite reload, reload cancellation, headshots, damage immunity of solid walls, breakable walls, explosions, bounty pickup/extraction, death, healing, reset, alternate-route reachability and a long finite simulation
- Official Steam screenshot pixels inspected at full resolution, rather than inferred from search descriptions
- Third-party dependency pinned locally with license; no remote runtime asset dependency

### Blocked browser checks
- CUA rejected `file:` because only HTTP/HTTPS are allowed
- HTTP at `http://terminal.local:4173/` returned 502 / connection refused
- A subsequent server command visibly reported `Serving HTTP on 0.0.0.0 port 4173`; reloading still returned connection refused
- No security flags, browser-policy workarounds or headless-browser substitute were used
- No screenshot of the implementation exists; no rendered visual pass claimed

### Remaining important checks
1. Open standalone HTML in a normal WebGL-capable browser and verify first-frame render
2. Start, pause/resume and restart, including blur and pointer-lock denial
3. Confirm movement direction, camera orientation, gun placement and hitbox alignment
4. Confirm HUD and settings on desktop viewports; mobile is not a supported gameplay target
5. Complete a full bounty run, including destruction, headshots, pickups and extraction
6. Confirm repeated contracts and GPU resource use
7. Check browser console, audio output and frame rate

### Reference comparison limits
The reference has high-detail 2D character/gun sprites, grotesque illustrated portraits, strong CRT curvature, dense textured scenery and sophisticated debris. This build uses original low-poly 3D character/gun meshes, original simplified architecture, procedural textures, scanline/vignette overlay and particle fragments. The palette and broad first-person composition are informed by the screenshots, but fidelity is materially lower. Camera state matching and pixel-level comparison remain blocked.

### Sources
- Official Steam page: https://store.steampowered.com/app/4603230/HEADCUTTER/
- Official Steam public app metadata and four full-size screenshots, queried 2026-10-07
- Three.js official documentation: https://threejs.org/docs/
- Pointer Lock documentation: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API

## Monorepo integration validation
- Dependency installation succeeded with repository-pinned pnpm 9.15.4 and the existing lockfile; only the new dependency-free workspace importer was added
- Required `pnpm sync:registry` and `pnpm build:vercel` were attempted but the tsx CLI cannot create its IPC socket in this executor (`listen EPERM`)
- The same registry script and project metadata validator ran successfully through the supported Node tsx loader (`node --import tsx`), which does not need that CLI IPC service
- Existing registry project timestamps were preserved to avoid unrelated serialization-only changes
- Complete monorepo/Vercel release validation is not claimed; this is a source branch, not a main merge
- GPT Sites deployment succeeded privately for the account owner, independently of the monorepo release pipeline
