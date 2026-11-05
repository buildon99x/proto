# Dubai city formation timelapse

User requests a separate timelapse world; preserve existing Dubai. This is an artistic compressed development narrative, not a historical reconstruction or date-accurate map.

## Design
A 72-second repeatable sequence: coast/sand (0–8), reclamation and island (8–20), roads/infrastructure (16–30), floor-by-floor skyline (24–48), gardens/public life (40–56), completed moving city (56–66), then a deliberate soft reset (66–72). Existing camera controls, phase jumps, pause/reset and reduced-motion are retained. A separate actual-render thumbnail shows the completed city; opening starts at the beginning.

Use the original Dubai build unchanged as geometry source. Compile static meshes into owned instanced construction batches, retaining matrices and per-piece construction times. Update only batches that change; keep original moving train/boats/fountain separate. Buildings reveal individual slabs/facade pieces from the ground rather than stretching entire towers. Terrain/road pieces emerge before buildings; sand dunes settle as reclaimed land forms. No new assets or services.

## Plan
1. Test deterministic bounded phase schedule, phase jumps and loop reset first.
2. Build isolated time schedule and construction batching modules with matrix allocation/caching tests.
3. Add separate world wrapper and new gallery/standalone entry, metadata-driven phase selector and thumbnail time. Preserve existing world source hashes.
4. Full suite/build/registry checks, independent review, scoped branch Preview. Actual browser screenshots and playback must be reported independently of CPU tests.

## Constraints
Base f56899a4ffecaa087a695fee5775038178314635; separate codex/dubai-city-timelapse branch, no main/production promotion. Coordinate shared gallery files with parallel desert task. No history/year labels claiming accuracy. No security/GPU bypass. No private image uploads. Bound CPU updates and avoid per-frame geometry allocation.
