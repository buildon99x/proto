# Rome candidate verification — 2026-11-05

## Scope
Independent `codex/rome-city-timelapse` candidate from `bd755a9`. Existing harbor, Singapore, Dubai and Dubai-formation definitions remain unchanged. No main merge or production promotion.

The supplied Rome portrait was opened and inspected. The authored scene uses only procedural meshes/textures, never the reference image as output. The main composition includes Colosseum, St Peter's basilica and colonnade, Pantheon, Castel Sant'Angelo, Forum, Constantine arch, Spanish Steps, Villa Borghese and four Tiber bridges.

## Implemented
- Separate finished Rome and 84-second artistic formation. Completed hold before rewind at 76s; reduced-motion still at 68s.
- Clear, cloudy, rain and snow, independently combined with day/night. Initial lighting is night. Windows, arcades and lanterns have warm emission and authored point lighting.
- Shared pause, scrub, speed, phase, view orbit/pan/zoom/reset and gallery lifecycle.
- 224 small houses, up from the first pass's 110; physical tile ridges, facade cornices, basilica relief/side arcades, local stone bump grain, cypresses/pine crowns, open Colosseum hypogeum and varied window brightness.
- Opt-in camera refitting preserves the full atlas when orbiting at 100%, while intentional pan/zoom still work. Other worlds keep their previous framing behavior.
- Boat reversals are smooth; fixed passing lanes avoid centerline overlap. Foreground bridge approaches no longer cover the ROME title.

## Evidence and limits
- Full authored app suite: 81 tests passing on the release tree. Tests include actual construction matrices/bounds, arbitrary seek, seam-adjacent headings, lane separation, rotated camera projections, scoped environment state, resource disposal and legacy behavior.
- Upstream toolkit CPU-only suite: 7 passing. Seven browser-output cases were intentionally excluded, not passed.
- App offline bundle and syntax lint pass. Standalone Rome ~793 KiB, formation ~801 KiB before compression.
- Literal `pnpm sync:registry` and `pnpm build:vercel` stop at the environment's denied tsx IPC socket. Equivalent scripts via `node --import tsx`, all project build/copy steps and the launcher Next build pass. Existing unrelated project chunk-size warnings remain.
- Root aggregate tests stopped at the same msw-inc tsx socket issue and cancelled one concurrent Diorama test process. The complete Diorama suite was rerun separately; msw-inc's underlying simulation suite also passes through the non-IPC loader. No claim that the literal root aggregate command passed.
- Ordinary Chromium with its sandbox enabled fails before rendering: process socket creation is denied by the execution environment. No unsafe GPU/sandbox flags were added. Browser shader compilation, interactive screenshots, real frame rate and physical mobile input remain unverified.
- Source geometry was exported and rendered offline in Blender EEVEE, then night/day pixels were inspected. Release transitive bundle SHA-256: `9ac453e0cf05aaa78846e4b1e193141d7d8fe96c50efe61c97f15d4e2c92e2d8`. Completed snapshot contains 21,498 mesh instances, 37 geometries and 148 materials; these are CPU counts, not measured GPU draw calls/FPS.
- Offline render translates BRDF/light units and does not reproduce browser water GLSL, sky/weather planes, fog, Points/Line primitives or postprocessing. Its images are explicitly stamped “OFFLINE SOURCE GEOMETRY / NOT WEBGL”. They are not app screenshots.

## Independent review
Found and fixed orbit clipping, instantaneous boat turns, overlapping boat paths and an invalid 90-second phase option. Fixes have observed failing-then-passing regressions. Reviewer separately sampled bridge clearances and scene-material isolation. Later facade/density changes were covered by fresh full-suite runs and direct offline image inspection.

## Visual target remains open
This is an improved candidate, not a certified 95% likeness. The recognizable layout, warm atlas, roofs, landmarks and river are present. Remaining gaps include the reference's more irregular dense street pattern, sculptural/masonry detail, finely varied vegetation and photographic material/light response. The reference itself is daylight while the requested finale is night, so the geometry/layout and lighting are assessed separately. A numeric similarity score has not been measured. Actual WebGL inspection is still needed before a visual-quality pass.
