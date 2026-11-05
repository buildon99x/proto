# Small Worlds — Harbor in a box
A project-local gallery with an actual Three.js still captured as a thumbnail that opens a single live harbor scene. Miniature, pixel, halftone and blueprint finishes. Locally bundled geometry, textures and renderer; no runtime CDN or APIs.

## Run
Requires Node 20+, npm, and WebGL 2 for the scene.
```sh
npm ci --ignore-scripts --prefix projects/diorama-gallery/.agents/skills/diorama-worlds
cd projects/diorama-gallery/app
npm test
npm run build
npm run dev
```
Open http://localhost:4173. Build produces `app/dist/index.html` (gallery) and `app/dist/harbor.html` (self-contained standalone world). The standard repo pipeline copies app/dist to launcher/public/runs/diorama-gallery.

## Controls
Select the harbor thumbnail. Pause, reset the scene moment, change finish, return to collection (or Escape). The fixed isometric camera preserves miniature composition. Reduced motion uses a still; offscreen/hidden scenes suspend. Returning to the gallery disposes the previous world before sequentially rendering and releasing still previews.

## Add a world
Create a definition using the vendored skill API and register it in app/src/main.js. The initial release ships one authored world. Avoid reference-photo thumbnails: derive previews from the world itself. Sequential disposal is required for all scene changes.

## Verification
See eval.md for actual results and blockers. `npm run test:browser` uses existing Chromium with sandbox enabled and no unsafe GPU override. It may be blocked by cloud OS restrictions; this does not establish visual fidelity or performance. Do not run upstream browser launch helpers with security-weakening defaults in restricted environments.

## Provenance
See notices/UPSTREAM.md and retained MIT/third-party notices. The supplied reference was inspected as art direction and is not included in the source. AAA quality is an aspiration, not a certification.

## Singapore / Garden City (0.3.0 candidate)
Second world: open the Singapore thumbnail, or append `?world=singapore` to the gallery URL. `singapore.html` is the offline standalone. A visible scene-time selector supports repeatable inspection; pause/reset and four finishes work for both worlds. No sound.

This is an authored stylized miniature, not a scale-accurate geographic map. CPU tests verify deterministic animation, resource ownership and bounds; they do not establish visual fidelity, mobile FPS or AAA quality. Original procedural meshes/textures; reference artwork is not embedded. Eight named landmarks, small rail/boat/Flyer motion, fountain and engraved map base.

## Dubai candidate (0.8.0)
Open the third rendered thumbnail, `index.html?world=dubai`, or offline `dubai.html`.
Warm atlas miniature with stepped Burj Khalifa, curved sail hotel, Palm Jumeirah, ribbed skyline, Dubai Frame, mall/fountain lake, metro, yacht, abra, palms, pedestrians, camel and gold car. Shared camera: drag to orbit, Shift/right drag to pan, wheel/pinch to zoom, arrows to orbit, Shift+arrows to pan, Home or 기본 보기 to reset. Mobile controls are inherited from Singapore; physical-touch and visual fidelity need actual device review.
No external textures, reference image upload, model CDN, paid service or new dependency. Motion is absolute-time; static details are batched and only train/boat/fountain roots update. Scene tests use a stub for canvas drawing and do not prove GPU appearance or performance.

The Dubai metro now follows a diagonal elevated route between visible beach and city stations. It brakes, dwells and reverses on the same track, without a foreground oval or hidden teleport. Coastal sand, sculpted palm canopies, shrubs and shaded plazas are procedural static details.

0.8 adds an open-crescent Palm Jumeirah with sandy fronds, villa streets and Atlantis, a denser layered city with subordinate skyline heights, stepped Burj wings and refined sea/shore detail. The diagonal metro and camera controls are unchanged. Preview remains subject to actual image review.

## Dubai formation timelapse (0.9 candidate)
Open `index.html?world=dubai-timelapse` or standalone `dubai-timelapse.html`. Opening/reset begins at the coast. Use the stage selector to jump to island reclamation, infrastructure, construction, gardens or the completed city; selecting a stage pauses playback. Resume with Play. The72-second artistic sequence deliberately rewinds from66s. It is not a dated historical reconstruction. Existing Dubai remains available separately.

### Formation weather and night
Use 날씨 to choose 맑은 날, 흐린 날, 비오는 날 or 모래폭풍. 낮과 밤 switches between 낮 and 밤 · 별과 달. These options do not change construction time, pause or playback rate. Reset returns the construction pose while retaining environment choices; reopening starts in clear daylight. Effects share the scene clock and reduced-motion behavior. Original worlds remain unchanged.

## Paris · The City of Light
Open `?world=paris-timelapse` in the gallery, or `paris-timelapse.html` standalone. A separate 72-second artistic formation sequence preserves all previous worlds. Pause, scrub, select a phase, change speed, orbit and zoom. The completed city uses warm windows, streetlights and landmark illumination by default. Weather offers clear, cloudy, rain and snow; day/night is independently selectable.

Reference-informed landmarks: Eiffel Tower, Notre-Dame, Louvre/glass pyramid, Arc de Triomphe and Sacré-Cœur, with Haussmann blocks, the Seine, masonry bridges and autumn trees. This is a stylized procedural interpretation, not a date-accurate reconstruction and not a verified 95%-similar reproduction. Ordinary WebGL2 support is required for interactive rendering. Offline review images, when supplied, are explicitly labeled and do not prove browser shader output, animation performance or device touch behavior.
