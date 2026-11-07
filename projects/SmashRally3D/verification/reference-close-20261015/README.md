# Parent-measured close reference correction

Rejected baseline: c15a7e6785aaea6f300528857266027154985e18. Corrected implementation:8a5eb7e (full SHA in git history).

The parent directly inspected13013.jpg and the rejected screenshots, then supplied measured acceptance targets. The original image remains inaccessible in this worker: three official downloads failed with `library file transfer failed: download failed`. The work below uses the parent's direct comparison and measured instructions; it does not claim that this worker opened the source pixels.

## Actual1065×606 ready projection

- Net span66.5% of the viewport (target65–75%); tape height51.1% (target45–59%).
- Athlete head50.9% and foot81.5% down the screen; full visible height30.6% (targets50–55%,80–85%,about30%).
- Blue practice surface extends through both lower edges. Near-baseline/court cropping is intentional; the full-court zoom-out acceptance is superseded.
- Original club facade, canopy, windows and planted trees replace the empty upper region. No seating, spectators, copied buildings, characters or logos.

The wider8.6m blue practice apron and10.416m net are presentation geometry. The5.18m white legal singles lines, world-space athletes/shuttle, aim clamps, physics solver, contact gates and AI parameters are unchanged. This stages the wider reference proportions without stretching characters or decoupling visible racket contact from physics. It is not a claim of regulation net dimensions.

## Individual Library images

[Before — rejected composition](https://chatgpt.com/api/library/files/libfile_9b960e60f0548191beebe71f4ed093bf/download)

[After — measured close composition](https://chatgpt.com/api/library/files/libfile_722c1d4e9594819195cac87caeab6386/download)

[Smash — ten actual phase samples](https://chatgpt.com/api/library/files/libfile_43f4a5542c1081918b78caf2cee2cc02/download)

These are individual original PNGs, rather than an archive. The saved after PNG has been compared pixel-for-pixel with the final build ready screenshot and is identical. Matching original bytes are preserved under delivery. The prepared helper failed during tools/list before preparing any uploads (`hosted apps tools/list request failed: network`); the available official Codex host-upload batch saved both files successfully, including local Library identity metadata.

## Motion and camera

Additional shoulder coil and cross-body release are zero throughout the unchanged physical contact window. The pre-contact coil is nearly twice as pronounced; smash shoulders visibly turn over75° during loading and over63° in follow-through. The arm follows farther across/down before smoothly returning. Finite arm lengths and the orthonormal racket frame remain enforced; actual physical contact snapshots continue to drive the impact render.

Camera tracking follows bounded lateral/backward athlete travel and lifts the view by at most8° for high flight. It holds while the player is choosing aim in the visible window, then smoothly recovers after an accepted command, whose world target remains fixed. Camera easing is capped for slow software-rendered frames. Event-time projected input coordinates verify picking even if the camera moves after the command.

The final attack gallery includes intermediate follow-through samples, with exact render timestamps. Full PNGs and pose/contact records remain in attack; detail sheets use a consistent crop and do not synthesize poses. Domain/unit fixtures remain distinct from ordinary visible-cue UI play.

## Verification

56 tests pass after final hair/sole calibration (tests-mesh-final.txt), including unchanged physics/input/AI regressions and new assertions for the measured projection and visibly stronger body rotation. See tests-mesh-final.txt. Full root build, final browser reports and limitations are consolidated below after the serial suite completes. Earlier attempts are isolated under attempts and do not certify the final tracking refinement.

Representative paired gallery: [1065×606](comparison-reference.png), [PC](comparison-pc.png), [landscape](comparison-landscape.png), [portrait](comparison-portrait.png). [Actual smash detail](swing-smash-detail.png).

Direct source-image fidelity remains for the parent to compare with its already opened original. Browser evidence uses Chromium151/ANGLE SwiftShader and touch emulation; no physical-device FPS, Safari or human-feel certification.


## Final software results

All six final browser reports pass with zero runtime errors and one source bundle SHA256: 41f396854f1f5819a11d67e94e3a709177a6ed3406de927c1f7ff19b4d35ffe4.

- pc: 6 returns; actor/shuttle clipping 0/0; aim error 0.000026px; apex 9.763m
- mobile-landscape: 6 returns; actor/shuttle clipping 0/0; aim error 0.155296px; apex 9.670m
- mobile-portrait: 6 returns; actor/shuttle clipping 0/0; aim error 0.339681px; apex 9.641m

DPR2 MEDIUM live rotation and trusted native up/down gestures pass. The actual smash gallery contains ten rendered phase samples including mid/peak follow-through and complete return, with zero racket centre/basis mismatch. NORMAL/HARD centre-soft windows each observe three real AI contact returns and zero immediate soft winners. These are contact-return windows, not a human win-rate claim.

The first960×600 defence run ended after240s with two settled returns and a third unresolved flight, without runtime errors. It is retained under attempts. Final defence uses640×400 LOW with a420s observation budget while retaining the same three-settled-return and zero-immediate-winner gates. No physics, AI, timing, gesture or success criteria were changed.

The final calibration correctly projects the actual hair/sole offsets; earlier head-centre measurements are superseded. Both updated Library files preserve their existing identities and now have version1. Source access remains the same three failed downloads; parent measurements are the source authority.


Final complete monorepo build: PASS (root-build-final.txt), after all mesh calibration changes. Final project build and56 tests: PASS (build-final.txt,tests-mesh-final.txt). All source and evidence changes remain inside projects/SmashRally3D; generated registry changes are restored. No main merge or manual deployment.
