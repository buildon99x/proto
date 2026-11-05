# Dubai manual weather verification · 0.12.2

## Scope
Based on candidate 9ad9151. Automatic weather transitions are removed only from Dubai formation. Clear weather is the initial default; manually selected weather stays fixed through playback, seeks, loops, day/night edits, mode changes and track reset. The day/night timeline remains [0 day,55 day,80 night,84 night,89.99 day]. Automatic 55–80s nightfall, staggered lights, Milky Way and meteors are preserved. Other worlds use their existing defaults.

A narrowly opted-in weatherTimeline:false capability is used by Dubai's environment and shared controls. Mode labels and track editor now describe only day/night, with one marker lane and no weather event choices. Existing runtime APIs, toolkit, main page and standalone builder need no changes. Mixed legacy tracks discard valid weather events after validation; invalid times, IDs, types or sparse arrays still fail atomically. This keeps old tracks loadable without hidden weather changes.

## Verified so far
- Three new regression tests failed on baseline behavior, then passed after implementation.
- Full app suite: 209/209 passed. Tests include real environment+controls, real runtime with only GPU I/O stubbed, 67.5s fractional dusk preservation, manual/automatic mode changes, all four manual weather states, track reset and mixed-track filtering, invalid track atomicity, seek/loop and 0.25–3x playback rates.
- App build, lint and all source syntax checks pass. Ten standalone scenes and gallery are generated.
- The old opt-in test assumed at least six events for both cities. Dubai now correctly has five day/night keys; desert's automatic weather assertion remains intact.
- Ordinary sandboxed Chromium was attempted in the fresh environment and failed before opening a page with process-singleton socket EPERM. No browser/GPU bypass was attempted. Actual WebGL pixels, browser interaction rendering and FPS remain unverified.

- Independent review found no Critical, Important or Minor issues. Its focused run passed 51 environment, UI, runtime, opt-in and timeline tests; diff whitespace checks were clean.
- Registry sync and all 12 metadata validations pass through node --import tsx. Release-equivalent builds copied all 12 project artifacts and produced the Next.js launcher with 29 static pages.
- The literal pnpm build:vercel command remains blocked by tsx IPC socket listen EPERM in this environment. This is reported separately from the successful equivalent build; no sandbox or security restrictions were bypassed.

Only the existing candidate branch is published. No main merge or production promotion.
