# R14a12 · Accepted combat input and projectile-contact direction

2026-10-11. Independently copied from the frozen R14a11 town-portal project. The directly verified a11 remote base is `d9c397951f5944fe74365728e54e909bf5339247`, tree `6b50a863f0d7487b7d84db5e9eda8c8fef51e03d`. Its a10 ancestor is `c1cd560833a4b0c40e6ae8cfd038ddb93cffd57c`. The frozen a11 source is preserved. The authorized a12 Git checkpoint follows the completed local verification; its remote receipt is recorded separately. The reviewed combat source patch applies without conflict.

## Input contract

Only opt-in PoE controls 4/5 change accepted-intent lifetime: the existing single latest-skill intent and .18 recovery acceptance window stay intact, while remaining lifetime now advances with the exact scaled `t` of action recovery. The outer step converts expiry using the same rate. The existing .35 hitstop floor gives a finite .18/.35 = .5142857143 active-second maximum without a new explicit press. Legacy retains .18 active-frame expiry. Ready-at-press and execution-time resource/CD checks, fresh-command replacement, guard/dodge priority, menu/blur/region/death/rebind safety clears, and latest queued aim are preserved. No attack/contact time, speed, cooldown, resource cost, damage or balance is changed. These timings are authored Emberwatch policy, not measured PoE2 constants.

The production reproduction starts hammer, advances .34 seconds, accepts a short mace tap, and lets the airborne hammer strike a stationary target. The old code loses this accepted input at 30/60/120 Hz while empty space works. The corrected code starts it once after recovery in both cases. Repeated real hits and deliberately sustained hitstop remain bounded.

## Contact FX contract

Hammer impacts pass the projectile's current velocity angle to presentation-only `impactAngle`. Outward and returning contacts now retain their own direction even if the hero later turns. Other hit sources keep their existing facing fallback; stationary synthetic projectiles retain a finite fallback. Trajectory, position, collision, hit identity, damage/procs and RNG order are unchanged. This improves directional accuracy and does not itself establish visual spectacle, clarity or sound quality.

## Preserved portal/accessibility work

The a11 portal's reducer/controller/input/cooldown/persistence/renderer semantics remain unchanged. Its 57 reducer, 11 runtime and11 region tests are byte-identical to the frozen a11 source. All existing app source/tests except the reviewed combat file and candidate label/label assertions are byte-identical. main.js differs only in BUILD_LABEL. a10 dialog-focus and owned art/audio are preserved. `preservation-check.json` records hashes and scope.

## Verification

New unique cases: 41 hitstop-intent + 16 impact-direction. Original combat.js with these final suites yields 28 and 12 failures respectively; their before logs are retained. Targeted legacy+new suites independently passed 95/95 again on this final integrated candidate. Portal+combat focused tests include 174 cases, all covered again by the final aggregate. Focused counts must not be added to aggregate counts.

The final unique whole-suite count, lint/build receipts, built-source hash verification, and independent audit status are recorded in final-summary.json. Version metadata and label tests use 0.14.0-reimplementation.12 / R14a12. Existing historical evidence remains untouched. These automatic results do not imply Git or Sites publication; those receipts remain separate.

## Remaining actual-play gate

Native-browser short taps through actual contact hitstop, hold/release transitions, menu/death cancellation, opposite-aim airborne/returning hammer contact direction, portal flow alongside combat, danger/actor visibility with flash0, and audible/subjective responsiveness require separate post-publication review. Automatic handler/DOM/Canvas checks do not replace those observations. Campaign completion and balance remain outside this change.

Final R14a12: **4,138/4,138 unique tests**, 0 fail/skip/cancel, 118393.823682ms; app lint and static build passed (120 files, 16,697,741 bytes), with every built source hash verified. Includes the a11 baseline 4,081 plus 57 new (41 hitstop-intent, 16 impact-direction). The portal 79 and combat 95 focused counts are included, not added again. Actual native-browser/input/FX/audio acceptance, Git and public Site publication remain separate.

The required monorepo commands were attempted again in an independent a12 monorepo copy. Both pnpm commands are initially blocked by the missing pnpm home directory. The same npm-script fallbacks confirm missing tsx/dependencies for registry sync and an absent corepack cache/home for the Vercel build. No root registry or other-project content was edited to bypass those checks. App tests/lint/build remain the separately verified pass; root command logs are preserved in the a12 verification folder.
