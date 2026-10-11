# R11 battlefield visual connection

Bounded authored presentation on top of Expert visual10edd4b and battlefield
content0192015 (locally cherry-picked as4588c80). Only beacon_battlefield opts
into reused low masonry, actual opened-door paving and non-color role marks.
This is unintegrated source work, not earned play or visual/AAA acceptance.

## Contract

- Reuse the existing lowwall atlas style and production `lowCoverSegments` /
  `openedDoorFloors`. Every segment borders real solid/open tiles; every paving
  tile belongs to the actual fully-open central door. Live map and fog win over
  alleged quest flags. No tactical hints create decorative paths or fake doors.
- Match `battlefieldPresentationHints().roleShapes` through the immutable B foe
  catalog. Reuse Tomb/Signal glyph lines without importing body-height/scaling
  changes. Add a small side-skull only for explicit B undead tags, never names,
  sprite appearances or earlier-region enemies.
- Draw catalog threat names below foot glyphs. Real Expert disabling-status
  hints remain above the head/HP bar, so an attack's potential poison/silence
  is separated from the actor's currently applied disarm/silence.
- Live, active, on-screen, seen actors only. Static dark keyline/light glyphs
  and text survive flash0. All low walls, paving, glyphs and threat/status labels
  remain below hostile warning paths and actor sprites in the draw order.
- Existing regions keep their architecture, cues, body dimensions and render
  command behavior. Content, collision, HP, patterns, rewards and state are not
  changed. Parent owns main/state/campaign integration and final aggregate QA.

## Evidence boundary

Automated tests record actual production Canvas commands and geometry with
scripted scene fixtures. No browser, pixels, engine, build, remote Git or Site
write is performed. Real-screen contrast, clustered labels, danger readability,
opened-lane discoverability and full ordinary-input combat remain unverified.

## Verification, 2026-10-10 UTC

- Related scope:183/183 pass,0fail/skip,5.188s. Nineteen new B renderer/geometry
  tests plus164 retained Expert/Furnace/Tomb/Signal/fire/readability checks.
- A separate direct comparison imported the committed10edd4b renderer and
  compared actual Canvas command streams/metrics for all9 previous regions,
  each at regular and flash0 settings:18/18 exact matches. No renderer source
  transformation changes gameplay; only module URLs were resolved for that
  read-only baseline import. This remains an automated scene fixture.
- Source/test syntax and scoped diff whitespace checks pass. No full suite was
  rerun for this extension; the parent owns final integrated regression.
- Required registry command was retried once after these source changes and
  again stopped at existing pnpm-home ENOENT, before any registry generation.
  No installation workaround, build, engine, browser, remote or deployment.

Final extension owns only battlefield-readability.js, visual.js, its dedicated
battlefield-readability.test.mjs and this document. The content cherry-pick is a
read dependency; the parent should cherry-pick only the final visual extension.
