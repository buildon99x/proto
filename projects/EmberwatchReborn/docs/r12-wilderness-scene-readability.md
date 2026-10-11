# R12 Wilderness scene readability correction

2026-10-10 UTC. Presentation-only correction based on the R12a1 native main-route
review, from integration source `e76a197be6a456056661edd52f59bb604d64fc97`.
These are authored Emberwatch presentation choices, not recovered source rules.
The canonical v1.1 / Library version2 source-transfer limit remains recorded in
`requirements/requirements-source-status.json`; no new original-source claim.

## Observed problem and bounded repair

The recorded `anchor-first-shot.jpg` exposes inactive receiver bodies across the
void and an unavailable anchor arch. `relay-lancer-punishment.jpg` exposes future
keeper bodies/return text and several verbose completed landmarks during combat.
`keeper-entry.jpg` puts the unavailable return's long text across the player/boss.
Those are real prior native screenshots. They are not after-fix evidence.

- `wilderness-scene-visibility.js` builds a transient four-neighbor connected-floor
  mask from the **live** W collision map and player tile. An enemy also needs its
  actual encounter gate (including the gate's minimum). This is accessibility,
  not `active`: reachable unaggroed bodies remain visible. Actor LOS is deliberately
  not a filter, so a committed active warning and its caster survive a LOS break.
- Main passes the same snapshot to the renderer and its canvas-label overlay.
  The renderer uses filtered local arrays only. The battle's enemy/object/map
  collections, hit targets, actor activation, projectiles and AI are untouched.
  W inaccessible floor pixels and their props disappear together; the existing
  floor cache already keys its visible tile membership and refreshes on opening.
- In-W return props, labels and F candidates require the existing cached
  `wildernessPortalView(...).allowed`. Its underlying gate validator and travel
  reducer are unchanged. The accepted-but-locked town anchor remains visible,
  targetable and explanatory. Every non-W region takes the original path.
- Hook and evidence honor `hideWhenCompleted` using the actual view's completed
  flag, never the lack of actions. Durable completed devices remain visible.
- W canvas landmark names are short, at most160world units away, and LOS-valid.
  Full names/instructions stay in the F hint, interaction modal and journal.
  The opened keeper return still says `귀환 · 기록핵 미회수` until evidence pickup.
- All nonessential W landmark overlays are suppressed while a reachable living
  actor is active or a hostile projectile/release/area tell remains. Existing
  enemy-role floor labels, warnings, status cues and their ordering are unchanged.
  Quiet label rectangles also skip the player silhouette rather than painting
  over the hero while approaching a device. The F hint remains available.

## Verification

The new tests use production scene helper, actual renderer, extracted unchanged
main selector/label/frame fragments and command-earned progression. Actor placement
and prior kill reports are explicit fixtures, not ordinary-input combat victories.
See `verification-r12-scene-readability/` for current focused results.

Covered cases: all eight real gate stages; a closed encounter gate despite an
artificially open map; before/after keeper body leak; reachable idle keeper; active
LOS-broken line caster in normal/flash0 rendering; completed hook/evidence art;
keeper return art/F before and immediately after defeat; anchor-return lock/open;
town locked-anchor F/labels; short/near/LOS labels and full F/modal name; combat
and residual hostile suppression; quiet player overlap; actual frame wiring;
frozen state/battle/map/attacks nonmutation. The old town test harness only gains
the new production import and accepts drawLabels' optional snapshot argument.
No previous assertion is removed or weakened and no historical fixture changes.

## Native before/after checkpoints for integration

Use the existing earned profile/normal input and the same viewport. Do not inject
state, refill pools, replace the player's build, or present Node fixtures as play.

1. Revisit the anchor route before taking the hook/operating the anchor on an
   eligible preserved profile. Compare `anchor-first-shot.jpg`: receiver floor,
   bodies and locked anchor return are absent; local fighting bodies/tells remain.
   Once the room is quiet, approach the hook for the short label and full F hint.
   Take the hook: its statue/label vanish, while the anchor device remains. After
   actual anchor operation the return arch/F appear immediately.
2. Before relay connection compare `relay-lancer-punishment.jpg`: locked approach/
   keeper floor/bodies/return vanish. During a live lancer exchange no device/glyph
   completion text overlays combat. Circle real retained cover: existing active
   body and tell remain visible despite losing LOS. Role labels stay below tells.
3. Enter the unlocked keeper room and compare `keeper-entry.jpg`: the keeper is
   visible even before aggro; the unearned return arch/F is absent; combat suppresses
   evidence/other landmark labels. After a genuine defeat the arch and nearby
   missing-evidence return label/F appear. Evidence pickup removes its crystal.
4. In town, use the accepted-but-not-yet-anchored stage to confirm the old locked
   anchor explanation; after report walk back through unlocked W to confirm quiet
   landmarks are still readable and no rewards/pools/save behavior changed.
5. Repeat the threat/label comparison with flashes0. Preserve actual native after
   screenshots separately; this worktree has not opened a browser or generated them.

## Known limits and remaining gates

This is connected-room presentation, not discovery fog or a per-frame actor LOS
system. Accessible idle bodies can be seen across internal cover; that is deliberate
so reachable foes never become invisible merely because they have not aggroed.
Existing active-state lifetime can suppress quiet labels while a distant living
foe remains engaged; full F hints/modal text still supply the objective details.
Current W tile widths support the four-neighbor mask; a future non-tile/one-way
navigation system would need a matching presentation reachability contract.

Node rendering records calls, not actual pixels. Native visual quality, continuous
combat readability, device/mobile/font and full aggregate/build acceptance remain
with integration. No balance, movement, HP, skill, XP, reward, storage or gameplay
schema change is included. No build output, root release, qa-r11, Site, Git remote
or Library publication is changed or claimed here.

## Recorded final focused result

- `final-focused.txt`:102/102passed,19new +83retained,0failed/cancelled/skipped/TODO,
 69,350.335191ms serial. Command: `node --test --test-concurrency=1` with
 `wilderness-scene-visibility`, `wilderness-readability`,
 `wilderness-geometry-presentation`, `wilderness-town-keeper`,
 `wilderness-ui-integration`, `battlefield-readability`, and `combat-readability`
 test files under `app/tests/`.
- Earlier `initial-new-tests.txt`:18/18passed; `focused-tests.txt`:76/76passed;
 `frame-wiring.txt`:1/1passed. These are retained intermediate runs, not totals
 to add to the final count.
- Changed source/test syntax and diff whitespace pass. Original Emberwatch has
 no Git diff against the starting source. Independent read-only review found no
 blocking correctness or scope finding. Browser quality/full-frame performance
 are still unverified here. Registry/build are delegated to integration under
 this worker's focused-Node-only boundary, rather than claimed to have run.

## Small scout-counter copy follow-up

The parent observed the actual optional-rescue panel at zero remaining enemies:
claim was enabled, but `적 0/4명 처치 후` read like zero completed kills. The single
presentation string now says `남은 적 N/4명. 모두 처치한 뒤 네리와 구조를 마무리하세요.`
No condition, command, reward or reducer changed. Two production-view tests use
real settlement fixtures with one/four recorded scout defeats and verify3/4
remaining with no claim, and0/4 remaining with the exact existing claim command.
Both assert unchanged state/economy/receipts. Focused2/2passed,0failure/skip/cancel/
TODO,2,762.069108ms; changed-file syntax and whitespace pass. The prior102-check
run predates this one-string follow-up and is not presented as rerun afterward.

The parent also observed that a first F could show its modal only on a subsequent
DOM inspection while MP/cooldowns stayed unchanged. That can be consistent with
the existing paused asynchronous checkpoint/modal path; it is not established
input loss. This copy-only follow-up neither diagnoses nor changes input timing.
