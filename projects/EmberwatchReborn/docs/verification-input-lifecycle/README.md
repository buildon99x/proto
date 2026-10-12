# Input lifecycle follow-up on v69 source

Baseline `7a539febc3ede7521825391de4a0c1773a77e79d`, branch `codex/emberwatch-rebuild`. Runtime source remains isolated from cb-ll, original Emberwatch and published defaults. No save/serialization/a19/balance changes.

## Confirmed independent defect

Combat-button pointercancel called full clearInput only when the pointer owned a channel. Finite/non-channel input therefore retained keyboard movement and an already accepted battle.skillIntent. In controls4 a short touch attack/charge during an existing delayed commit also retained the base router's unpaid pulse and started it after cancellation. Controls5's capture removed its deferred finite pulse, but independent held movement remained.

Six baseline tests failed: controls4/5 × touch attack/charge during delay, plus controls4/5 pending keyboard Q after touch mace. The corrected baseline red log is retained. After adding `name==='pointercancel'` to the existing clearInput condition, all6 pass. Runtime diff is one condition in main.js; it reuses existing safety coordination and touches no writer/serializer/state field or timer.

Explicit pointercancel is now the same safety boundary as canvas pointercancel. Normal pointerup and subsequent lostpointercapture keep their established finite-tap semantics. No inactivity timeout or Ctrl/Alt/Meta-trigger cancellation is introduced. Pointercancel clears input/queue and requests existing safety handling; it does not invent a new pause or cancel/refund an already paid finite contact.

## Delivered-event evidence, not native focus acceptance

26 new tests execute production main handlers with earned-state fixtures and mock DOM/render/audio boundaries:

- Explicit touch cancellation6 cases above.
- Controls4/5 × blur, hidden visibilitychange, document.hasFocus frame fallback, editable focusin, canvas pointercancel, combat-button pointercancel and menu: missing-keyup D/mace plus pending Q clear; visible/resume/canvas focus and OS repeat cannot replay; a fresh press works.
- Keyup delivered from UI with Ctrl/Alt/Meta releases movement/attack; modified Q creates no edge.
- Controls4/5 ordinary touch up followed by capture loss during delay preserves one finite Q and independent keyboard movement.
- Negative control: Ctrl+L with NO keyup, blur/hidden delivery or false hasFocus leaves the legitimate D+J holds active. Delivering blur afterward clears them.

`focused.tap`:26/26 passed, zero failure/skip/cancel. The negative control is an event-delivery boundary, not proof of a browser defect. Runtime cannot distinguish an intentionally held key from a lost keyup when all focus queries/events continue reporting the game active. Cloud tab-switch logs showing no blur/visibility therefore do not establish product blur-handler failure.

Actual registered focus paths: window blur logs timestamp/safety epoch and pauses; document hidden visibilitychange does the same; visible visibilitychange logs but does not auto-resume. Document focusin clears for UI/dialog focus. There is no window focus auto-resume handler; explicit closePanel clears again. Each frame checks document.hidden and hasFocus. Window keyup is unconditional with respect to target/modifiers. Canvas pointercancel clears globally; ordinary mouseup/lostcapture remain distinct. Touch movement buttons remove their own virtual movement token on up/cancel/capture loss.

Coordinator-reported candidate v69 QA established movement-heading Q in town/combat, three held-J repeats and roll-to-Q reservation, then restored aim-direction setting. Those reports apply to baseline v69, not this changed pointercancel candidate. They do not measure physical latency, AAA motion or audio. This checkpoint has not been deployed or played in a native dot browser. No isolated Chromium/nativeCanvas retry is performed.

## Native QA needed

Use the candidate ZIP's qa-r14 entry and record actual event delivery before diagnosing tab switching. Hold D+J, then send a supported real blur/hidden transition; verify logs and safe pause, return with a fresh press. Compare normal UI keyup, deliberate touch pointercancel and normal pointerup/capture loss; no canceled unpaid Q/attack should appear later. Test keyboard/mouse/touch independently, and repeat while a normal checkpoint is naturally active. Precise browser focus, complex timing, listening and full-play acceptance remain open.

Original launcher root-vs-qa-r14 entry mismatch is preserved; direct QA payload is qa-r14/index.html. Public deployment/main merge remain coordinator-owned.


## Fresh final checks

Full suite4539/4539 passed, zero failures/skips/cancellations. Project lint, original sync:registry and original build:vercel passed; Next compiled/checked types/generated29 pages. Existing other-project Vite chunk warnings remain nonfatal and unsuppressed. All125 payload hashes match the launcher copy;124 copied source hashes match. Only main.js changed;125 other tracked runtime files and all167 original Emberwatch manifest files are byte-identical. Generated registry was retained as evidence and restored; no shared source or lockfile changes are committed.
