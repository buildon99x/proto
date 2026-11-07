# High-shuttle follow-up ·2026-10-17

Baseline runtime:bc1c206, same frozen rubric at../switch-benchmark-20261017/rubric.json (SHA256 acbd3311fa6e000b9c03d2b8d8a3736c35a377c89912c72a88b1e085aef5b438). Previous reviewed subtotal37/55;45unverified; overall null;98not achieved. The rubric and thresholds stay unchanged.

## Controlled rendering study

`study/study.json` contains naturally reached >9m apexes, then an explicit engine timeScale0 hold solely for rendering alternatives. No ball/actor/state injection. All four variants share the exact world time, position, velocity, camera and cork projection. Runtime play evidence is separate.

Baseline white shuttle, darker sky, dark cork material, and outlined silhouette were compared at1280×720,844×390DPR2 and390×844DPR2. `study/comparison.png` was directly inspected, as were full screenshots. `study/photometry.json` measures local pixels (median background at18–22CSSpx, contrast-qualified area within12CSSpx); this is not WCAG certification or an experience score.

The darker sky affects the entire field; dark cork becomes a tiny dot especially on mobile landscape. Local outline preserves the feather direction and bright arena. In mobile landscape the >=3:1 pixel area rises0→41.75CSSpx; maximum contrast1.50→7.37. Baseline/outline images have zero changed pixels outside the16CSSpx neighborhood. Outline was selected for these measured reasons. A trail-only solution cannot cover the required trail-OFF case; currentLOW non-attack flights intentionally omit trail segments even when enabled. The actual before/after clear rallies explicitly use trailOFF, preserving that preference instead of forcing trails on. No separate trail candidate was rendered or scored. This is one causal study with three alternative approaches, not three repeated failed parameter changes.

The production cue follows the rendered cork after the renderer has finalized camera projection. It fades only for small/high flights, never pins offscreen, and suppresses on low returns/actual contact/paused/dead frames. Pointer-events none and aria-hidden. No changes to physics, prediction, contact volume, rig, camera, AI or input grammar.

## Retained failures and corrections

- `attempts/update-projection`: actual UI six-return clear rally found max14.29CSSpx cue drift when projecting inside update before renderer finalization. Gate<=.5CSSpx was not relaxed. Position calculation moved to postrender to match the visible frame. No physics delay added.
- `attempts/dialog-menu-focus`: first keyboard audit caught Help close restoring menu default focus instead of its opener. The return-to-menu transition now restores the actual Help/Settings button. Initial failure remains.
- Compile caught an unused variable accidentally inserted into context-loss handling; removed before browser QA. Strict71unit tests passed independently.

## Other observable gap addressed

U3: existing select/checkbox-label/Pause targets now minimum44CSSpx. No extra gameplay controls. Native inert excludes background UI; Tab/Shift+Tab wraps in an overlay; Help/Settings Escape closes that dialog first; close/resume restores its opener. Scrollable body/card retained for short screens. `accessible` tests four frozen viewports. No screen-reader/full zoom/real-device claim.

Official alternative research and exact access limitations are in`references.json`. BWF ShuttleTime returned402 Payment Required; reported immediately and no retry or further Web research followed. Exact quota/billing cause is unconfirmed. No blocked video or unheard sound is claimed as reviewed. Recording retains actual WebAudio, with the same one-origin calibration limitation as previous captures.

## Final outcome

Runtime commit:`822073905c4a4266f8aae0d536aff3b99ba9263d`, pushed to`codex/smash-rally-3d`. Final71strict unit tests/12files, full`build:vercel` and14browser reports pass. Every final browser report and the rebuilt app share SHA256`464090a556c7f8fd2ba4c10cf0903f6295b5b73f42af5de337766bee2f079f15`. Native tap/up/down plus earned-tip completion/restart pass3independent repetitions, preserving the previous repetition count. Full actual evidence is in`qualification.json` and the individual reports; original failures are retained.

PC/landscape/portrait each achieve6real returns,0actor/shuttle clipping,0cue centers under the lesson card,0low-contact cue visibility and0pointer blocking. Maximum anchor errors:.020512/.022055/.021977CSSpx. Maximum actual aim errors:.000024/.493888/.542386CSSpx. Normal/HARD centre-soft defence:6physical AI returns,0immediate soft winners. Original pressure patterns:13returns,1PERFECT direct winner.

Actual EASY UI match:5–0,17physical contacts and17rendered-contact samples, maximum racket-centre error1.761e-7m,3normal smashes and2natural Super Smashes. The contrast cue is suppressed at all17contacts.17hit and5point WebAudio events are recorded; both counters0when muted. These are recorded event data, not listening or physical AV-latency proof.

Same frozen rubric:37→39/55reviewed,45weight unverified,overallScore null,98not qualified. Only V1(separation/high shuttle) and U3(adaptive controls/keyboard) rise3→4based on the directly inspected screenshots and keyboard flows. V2=3,V3=2,V4=3and every unknown remain unchanged. No subtotal normalization or gate-to-experience conversion.

## Deliverables

- [70-second wall-clock1x software before/after video](delivery/01-high-shuttle-review.mp4)
- [Before/after and controls](delivery/02-high-shuttle-before-after.png)
- [Same-rubric scorecard](delivery/03-scorecard.png)
- [Eight actual full-frame swing samples](delivery/04-swing-sequence.png)
- [Twelve consecutive actual CDP source frames](delivery/05-consecutive-contact-frames.png)
- [Current1065×606 reference composition](delivery/06-reference-composition.png)

Video:two35-second hard cuts,70.021s H264/AAC,640×360,20fps encoding holds the actual sampled frames without pose interpolation/time rescaling. Nine literal decoded frames and all image sheets were opened for inspection. This is frame inspection, not full-motion desktop viewing or actual listening. CPU scheduling is only a timing reference for the swing labels, not physical display/audio latency. Selected original JPEG frames and SHA256 values are retained under`play/swing-source-frames` and`delivery/swing-samples.json`; the report can reuse these if the temporary full capture is unavailable.

Library saving failed at the connection step before upload preparation;0files saved and the existing Library scorecard was not replaced. No retry or alternate write was made. The exact local deliverables are retained here and in the Git branch;`library-deliveries.json` records each unsaved file. This is separate from the completed shell/browser/build work.

The environment-disconnect follow-up was answered by successful current shell/filesystem commands and proven live process/log progress, recorded in`environment-recovery.json`. No process was duplicated or assumed to continue. The runtime checkpoint was then pushed successfully. All changes remain scoped to this project and the designated branch.

The final three-view rally audit additionally checks every visible cue cork center against the painted lesson-card bounds. Pointer transparency alone cannot prove freedom from visual obstruction. Any overlap is treated as a new defect rather than hidden by a passing in-viewport check.

Known product gaps also remain: simple grey character meshes/materials(V2), flat facade/tree environment(V3), and limited stroke polish(V4). Passing this follow-up is not completion of the98-point product goal. Access-limited human/device evidence and these observable art/motion gaps are distinct; neither is silently filled with maximum points.

`scene/camera-preservation.json` directly compares the prior and current four LOW serve-ready layouts: camera position/FOV max difference0, projected-target pixel difference0, spectators0. The1065×606 ready screenshot was opened directly; blue near court, white singles lines, purple apron, central large player and mid-height net remain. The original13013.jpg worker download failure is documented in`../../design-qa.md`; this follow-up does not invent a new direct viewing of that original. Parent-provided reference measurements remain the authority.
