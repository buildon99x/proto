# R11 input / training / durable slot integration

2026-10-10 UTC. Isolated unposted work in `codex/emberwatch-r11-integration`.
Public root remains R7a4; R10a1 candidate remains Sitev35. This source is not yet
an earned Expert browser run or a complete campaign/AAA quality result.

## Integrated seams

- Combat component8d6f540: all15 Expert effect handlers, strict recovery2 in
  state4, historical Adept/Expert promotion chain, accepted immutable action and
  proc-rank snapshots, durable combat RNG, payment/stop and failure boundaries.
- Control3 and actionSlots1 are separate. Existing v1/v2 bindings are preserved
  verbatim, adding empty Expert keys. Only new recommended controls use2/3.
  Learned Banner/Onslaught require explicit slot assignment; no free rank or
  silent auto-equip. Slots reject duplicates, unsupported/unlearned actions,
  stale life/revision/current-value and failed-save optimistic updates.
- Real main keyboard/mouse/touch handlers feed stable accepted capture IDs.
  Finite Banner survives ordinary down/up; undelivered Onslaught cancels on up.
  OSrepeat and busy Expert presses do not create delayed casts. Channel owners
  never transfer through remapping or an alias pressed later.
- Safety cancellation is scoped to battle/controller/life/region. Held input
  clears immediately; an in-flight save reconciles before live cancellation.
  Then a critical recovery checkpoint must complete before simulation resumes.
  Menu/blur/hidden/capture loss/busy release produce no Lance. Normal release
  after a paid pulse remains the combat release. Failed persistence closes the
  existing runtime gate rather than refunding or continuing the paid action.
- Trainer opens a paused loading panel, waits for outstanding commit/safety,
  checkpoints current pools and quotes the committed store revision and120G.
  The reducer independently checks both. Newer navigation cannot reopen a stale
  loading panel. Tier sections expose the current tier without a40-row wall.
- Action-slot UI captures slot CAS/revision from the actual displayed buttons.
  Touch remains available when an old profile has no bound auxiliary key.
- Renderer receives the independent live Banner. Static friendly geometry and
  accepted Flames90/Lance180 arcs are below hostile danger, including flash0.
  The placement ring is tagged to avoid a duplicate elevated glow. Actual new
  battlefield roles and normal-screen readability remain a separate increment.
- Tomb copy now says region transition itself does not refill resources/reset
  cooldowns. Ordinary active walking still advances regen and cooldown time.

## Verification boundary

New main tests execute the unmodified production frame and registered browser
handlers with real router/capture/combat/controller/store. Only DOM drawing,
requestAnimationFrame and audio are probes. Predecessor positions and defeat
reports are explicitly scripted settlement fixtures, not native screen inputs.
These tests do not establish touch ergonomics, perceived latency, readability,
fun, route duration, listening quality or difficulty balance.

Focused before aggregate:114 controls/capture/coordinator,138 slots+promotion+
retained migration,16 production-frame/input/training/slot regressions, and182
retained UI/navigation/startup cases passed. Counts overlap and are not summed.
Full final aggregate result belongs in verification-r11-ui-integration-tests.txt.

Historic fixtures were corrected to remove post-R10 control rows when building
literal v1/v2 shapes. Malformed-state assertions and test cases are retained;
current control defaults cannot masquerade as an authentic old save format.

## External component checkpoints already preserved

- Input80a995c: libfile_0404b96283f88191821be5c22d6605ee v0,
  ZIP SHA2562337a0d474a7a947192949ad6ab13c7e23872e49bb7163784b3b21b6d858ce45.
- Combat8d6f540: libfile_8dea4e3cfd4481919ac2c23b9623876e v0,
  ZIP SHA25611c0ebf8cfeaf4dccc662a6b907aa9ed926d658028e5f70c7a41627c304f9bba.

Both component ZIPs include source/tests/provenance/reused resources and passed
CRC plus every file hash. They are component checkpoints, not the pending final
integrated application or its browser acceptance.

The first aggregate run exercised1647 cases and found10 harness/old-fixture/copy
expectation failures (1637 passed). The corrected focused145/145 retains every
case: old versioned fixtures now remove future control/slot fields, the narrow
keyboard probe invokes the newly extracted production capture functions, and
transition-copy assertions distinguish ordinary walking regeneration. The full
unchanged-final-source rerun is separate and remains authoritative.

Final pre-battlefield UI checkpoint aggregate:1647/1647 passed,0 failures,
skips,cancellations or TODO,185.117s serial. Syntax and isolated static build
passed. Original167 baseline files match both SHA256 and Git-blob checks. No
published R11 candidate or native Expert UI/graphics/audio acceptance yet.
