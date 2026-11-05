# Dubai evening preview verification · 0.12.0

## Scope and sequence
Based on published main 4f97f8c. Only Dubai formation changes; static Dubai, other cities, shared controls and renderer remain unchanged. The loop is 90 seconds: day until 55, smooth nightfall from 55 to 80, completed night city until 84, then rewind until 90. The extra ten seconds preserve the full requested transition instead of resetting at 80.

Twenty metro lamps follow the existing curved viaduct and have cantilever brackets below the train envelope. Building facades and lamps use 70 owned emissive materials with deterministic grouped onset, driven by the same sampled night weights as the sky. The procedural Milky Way and three seeded meteors respect weather attenuation. Meteor start times are 66.458, 70.539 and 74.796 seconds. Manual controls, edited tracks and Dubai-specific reset remain authoritative.

## Evidence
- Baseline app suite: 191/191 passed before changes.
- Final app suite: 201/201 passed. Focused tests cover 55/80/84/90 boundaries, completed instance matrices, seek/repeat, 0.25–3× clock equivalence, manual/edited/reset controls, material ownership/disposal, geometry bounds and lamp attachment.
- App offline build, all source syntax checks and lint pass. Gallery and all ten standalone worlds are generated.
- Toolkit CPU-only suite: 7/7 pass. Browser-output cases are not counted as passed.
- New Milky Way and all three meteor shader programs compile and link in isolated EGL GLES 3.2 Mesa. Existing extract/blur/output shaders also compile and link. These are compiler checks, not browser rendering.
- Registry sync and all 12 project metadata validations pass through the Node loader invocation. Equivalent release pipeline builds/copies all 12 artifacts, followed by a successful Next.js launcher build with 29 static pages. Unrelated large-bundle warnings remain.
- Literal corepack pnpm build:vercel remains blocked at the existing tsx IPC socket listen EPERM. Aggregate root tests complete 13 tasks, then msw-inc's existing tsx IPC failure cancels remaining work. This is not a full aggregate-test pass.
- Independent source review verified real-city materials, completed 80/84-second construction, deterministic seeks, manual/edited/reset controls, 70/70 material disposal, train clearance and exact station-triangle clearance. One Important finding, floating lamp bases, was fixed with structural brackets and a failing-then-passing regression. No other Critical/Important findings; no deferred minors.

## Regression corrections
Paris imports the historical constructionTime export from dubai-timeline.js. Initial duration work changed that behavior and caused a large assertion diff that killed the Paris test process. The legacy 72-second function is preserved byte-for-byte; Dubai now uses a separate 90-second function. The direct regression failed before this fix, and all original Paris tests pass afterward.

## Visual limits
An ordinary sandboxed Chromium attempt failed before a page opened because process-singleton socket creation returned EPERM. No browser/GPU bypass was used. Actual WebGL screenshots, sky composition, perceptual fade quality and GPU/mobile FPS remain unverified. This is a tested implementation candidate for preview, not visual acceptance or production promotion.
