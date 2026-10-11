# R12 W main UI and presentation integration

2026-10-10 UTC. Authored Emberwatch continuation; no commercial assets added.
This work changes the candidate source, not the public root or an existing Site.

## Live UI contract

- Actual nearest-object interaction mounts W survey, free reusable hook, explicit
  anchor, receiver glyphs, one-use cover/channel choice, relay, separate record
  core and optional scout rescue. The hook and core disappear from target choice
  only after their committed pickup; completed other objects stay readable.
- Eda acceptance and report pause a placeholder first, wait for an existing save,
  drain action-safety cancellation and its durable save, and checkpoint live
  resources. The object panels follow the same `checkpointPanel` ordering.
- `controller.capture()` supplies one committed state/revision pair. Buttons
  serialize the complete position/life/vitals/recovery/objective revision/step/
  choice/store revision command from that snapshot. The real click handler
  dispatches those captured bytes unchanged. It never reconstructs a report or
  restamps an old command at click time. Owner, life, battle and modal-epoch
  changes prevent a pending panel from reopening in a newer interaction.
- Live `report()` captures its original committed base epoch synchronously and
  checks life/region. Combat and safety checkpoints bind their base epoch only
  when an actual checkpoint exists, avoiding a full state clone on idle frames.
  Retry captures its epoch when requested. Implicit life zero remains supported
  for a new, untrained profile's manual save/title flow.
- W map-only commits replace collision geometry and reset enemy path timers,
  while keeping existing actor identity/HP, hero pools, projectiles and areas.
  No reward, map, success copy or vitals are applied before confirmed storage.
- Journal retains the readable survey order and partial prefix. Portal labels
  warn if the boss return is used before collecting the record core. Guidance
  puts W ahead of completed B and states that optional rescue can follow report.
- Orin keeps his existing shop. The next repair/recipe handoff is explicitly
  unimplemented, with no fake accept/purchase action. Master and full-campaign
  completion remain open. Main title/help label is R12a and the isolated R12
  copy selector includes explicit R11 forward-copy; source bytes stay protected
  by the existing copy handler and the parent's namespace contract.

## Presentation

`wilderness-readability.js` reuses the established B/T/S non-color role glyphs,
owned low-wall atlas and floor paving. Explicit foe tags own the side-skull and
undead label; W's living flanker does not inherit the undead skull. Map tiles
own every wall edge and opening, including the pre-choice receiver door and
six-tile cover/channel difference. Fog and proximity are honored. Static role
marks and labels remain unchanged at flash0, below hostile warnings and actors.
Committed-snapshot view caches avoid revalidating every W object every frame.

## Verification scope

New tests execute real, unchanged `main.js` handlers, controller, store and
reducers with minimal DOM/audio probes; separate tests execute the production
renderer against a recording Canvas2D boundary. Earlier progression is earned
through handlers. Test positions and defeated-enemy reports are scripted
settlement fixtures, not real AI victories or normal-input play.

The first focused pass was 24/24, 25.04 seconds, with zero failures, skips,
cancellations or TODOs; original output is retained in
`verification-r12-wilderness-ui/initial.txt`. Additional safety/owner/pretraining
checks and affected existing suites were then verified as described below.

Existing UI suites keep all scenarios and assertions. Their extracted-handler
harnesses now resolve the actual main module imports, fixing stale dependency
lists including the previously missing resource formatters. Only superseded
release-title/version text expectations are advanced to R12a; test counts are
not inherited as proof of this candidate.

Remaining gates: parent full regression/registry/build/archive, actual native
Normal/Hard W loops and invested/lower-investment builds, actual enemy tactical
usefulness, flash0/labels/mobile/audio review, depleted-resource title/re-entry
and ordinary-input failure paths. No publication, Git push, external backup,
duration, full campaign or quality acceptance is claimed by these checks.

## Final focused results

- `focused-regression.txt`: 280/285. Three preexisting stale-life UI cases
  exposed the new report guard throwing before normal reducer feedback; the
  correction preserves the captured stale life so the real controller returns
  `STALE_LIFE` without writes. One old Pass continuation expectation was
  superseded by the parent's connected W text. One newly added untrained fixture
  expected `null` where the unchanged runtime intentionally stores no vitals.
- `focused-regression-final.txt`: **285/285 pass**, 63.91 seconds, zero failures,
  skipped, cancelled or TODO tests. This comprises **29 new W UI/render checks**
  and 256 retained affected UI/render checks, not an inherited full-suite total.
- The new safety case starts a paid Onslaught, delays its checkpoint, opens Eda,
  and verifies that the busy snapshot and cancellation checkpoint settle before
  the command is exposed. The paid stamina/cooldown persist and no release
  attack is created. New-profile ownership, actual interaction target selection,
  wrong-NPC rejection and untrained manual-save/title cases also pass.
- Source/new-test syntax and scoped diff whitespace checks pass. There was no
  browser use, native playback, aggregate build, remote write or publication.
