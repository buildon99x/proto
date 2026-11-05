# Main integration verification — 0.11.0

## Scope
Published desert 7be6ac8, Dubai 8133060, Istanbul b4959da, Paris 952fdab and Rome visual 9eca224, on main b029484. Ten gallery and offline standalone scenes preserve harbor and Singapore. Unpublished Rome refinement 5d1e3ef is excluded because source bytes were unavailable; it was not reconstructed or published.

## Source and automated checks
- All 43 city-prefixed authored source files match their designated published branch source byte-for-byte.
- Full authored app test suite: 191/191 PASS after integration fixes.
- Shared runtime independent focused checks: 67/67 PASS; independent release reviewer subset: 13/13 PASS with no Critical/Important findings.
- App build and syntax lint: PASS. All ten standalone outputs plus gallery and desert inspector were built.
- Toolkit CPU-only invocation: 7/7 PASS. Full toolkit invocation additionally attempted seven browser cases; all seven blocked before rendering by Chromium's environment socket failure.
- EGL GLES 3.2 shader compile and link: extract, blur, output PASS. This validates shader programs in isolation, not Three.js WebGL output or performance.
- Registry synchronization and all 12 project metadata records: PASS with `node --import tsx`.
- Equivalent release pipeline: all 12 project artifacts built and copied, Next.js launcher production build PASS with 29 static pages. Existing unrelated large-bundle warnings remain.
- Literal `pnpm sync:registry` and `pnpm build:vercel`: blocked by the existing tsx CLI IPC `listen EPERM` limitation.
- Root aggregate `pnpm test`: blocked by existing msw-inc tsx IPC failure after 10 completed tasks; concurrent tasks were cancelled. This is not a full aggregate test pass.

## Integration corrections
The regression tests first exposed incomplete scene registration, duplicate standalone build targets, and null scene-background handling in the shared environment cache. Registration/build targets are unique, and both manual and automatic environments now preserve the exact null background/fog baseline during restoration. Published scene geometry was not modified.

## Visual limits
An ordinary sandboxed Chromium launch was attempted with no sandbox/GPU bypass. It failed before any page opened because process singleton `socket()` returned EPERM. Real WebGL pixels, UI interaction on the production browser, Original/Soft/Vivid appearance, reference likeness and physical mobile/GPU performance remain unverified. The prior 95% likeness target is not certified by this merge.
