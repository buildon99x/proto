# R12a registered wilderness candidate

2026-10-10 UTC. Isolated successor to `7e33e0e`, with detached W module
`b0b1db6` and corrected epoch/ancestry gate `87d3bae` applied first. This is
newly authored Emberwatch content, not source restoration or commercial-game
map/AI data. Canonical v1.1 / Library version2 remains the requirement authority;
its original-file materialization/hash gate remains blocked as recorded in
`requirements/requirements-source-status.json`. No retry or alternate transfer
was performed here.

## Runtime ownership

- `world.js` registers all W content, foes and two new town links. Earlier maps,
  target coordinates, combat parameters and original project files are preserved.
- `state.js` supports state version5. Any W region, visited region, defeated map,
  objective, receipt or tool in versions1–4 fails before migration. Existing B
  v4 and older legitimate states remain readable. Controller load migrates only
  an isolated in-memory clone; no source slot is rewritten without a commit.
- `save.js` and `candidate-profile.js` add `qa-r12`; explicit one-way QA copies
  can take a genuine qa-r11 profile forward, preserve its exact payload/source
  bytes and refuse existing target, backward or main-profile copying. This is
  implemented UI capability, not a performed browser copy/import.
- `controller.capture()` returns one synchronous committed state/revision pair.
  Commands are cloned on enqueue and the real controller supplies the trusted
  revision when dequeued. Any supplied `expectedStoreRevision` is validated;
  W objectives and every report/retry while W is active require it. Only after
  validation is the transport token removed for older exact-shape handlers.
- No W report is re-stamped. Objective fields bind exact committed pools and
  recovery as well as W objective/step and life tokens. A current store token
  attached to an old paid-resource snapshot fails `REPORT_NOT_COMMITTED`.
- Shared `campaign.js` owns W travel, combat settlement and retry once. It
  validates actual portal gates, invalidates W input on every region transition,
  and opens the keeper map gate only after all approach kills are permanent.
  `wildernessChanged.mapChanged` updates collision while preserving living
  actors, enemy damage, shots, areas and hero resources.
- The detached `reduceWildernessRuntime` is retained for its existing focused
  tests; the production dispatcher never also runs its generic settlement.
  Real W ancestry no longer substitutes a town location. All seven predecessor
  validators inspect the actual registered state.

## Content and explicit limits

W uses the combat-weighted proposal: required groups3/4/5/4/4 and one keeper,
800 distributed objective XP. Mandatory total at tested entry levels is3,280XP
Easy/Normal or2,660XP Hard/Serious,360G,6iron/4wood/4thread/2ember shards and2potions.
Each Expert kill reevaluates the unchanged source-backed tier/difficulty scaling;
objective XP is fixed once-only authored reward. No curve, skill rank, point,
Master fee/unlock, advanced recipe or final region is invented in this slice.

Eda accepts after real B report. Survey clue → free reusable hook pickup →
explicit anchor → saved receiver order → irreversible free pre-fight cover/channel
choice → relay → approach → keeper → separate evidence → Eda report is fully
registered. Optional scouts remain optional before or after main report. Eda
identifies Orin's future repair handoff, and Orin retains his existing shop with
explicit unavailable next content. All earlier report summaries acknowledge W.

Objectives, travel and report do not heal. Existing combat level-up25%-maximum
pool recovery and explicit death-retry rules remain unchanged and disclosed.
All same-frame kills precede one5% spendable-gold death fee. Duplicate reports,
uncertain save results or reload cannot grant speculative rewards.

Town coordinates, actual interaction and sprite/label bounds, and the distinct
W keeper line→short radial burst contract are in
`r12-wilderness-encounter-geometry.md`. W keeper HP remains200; B-only footwork
is not implicitly reused. Native tactical usefulness remains unverified.

## Test interpretation and changes to older checks

`wilderness-controller-save.test.mjs` runs actual state/controller/session/store
handlers from an explicitly synthetic earned B route. Positions and defeat
reports are scripted. There is no browser profile or save import and no AI
victory claim. The first run passed29/29 in47.85s. An additional malformed-v4
container/untrusted-context regression was subsequently added; final-source
results must supersede the initial result below.

Coverage includes both choices×all4difficulties, optional rescue before/after
report, exact budgets, existing B v4 reload/copy, duplicate kills/reports,
reverse stale ordering, queued immutable commands, head-write failure and
head-write-then-throw, conflicting controllers, paid recovery/prefix reload,
legacy-region roundtrip, dead load, same-frame keeper/death and once-only retry.

Existing scenario files remain. Narrow obsolete assertions change only:
current migrated version4→5; detached W registration→registered validity; keeper
exact B-copy→new authored W contract; title/app/build identity→R12a; preserved
legacy portal subsets and pre-W-visible B interaction candidates. Main extraction
harnesses import actual production dependencies (including the previously
missing resource-display helpers); assertions are retained. No prior count is
inherited as a pass for changed code.

The frontend worker's focused real main-handler/render checks and retained
failure output are in `verification-r12-wilderness-ui/`. These cover immutable
button payloads, modal epochs, safety-cancel/checkpoint ordering, delayed/failed
saves, owner/life guards, real dispatch, dead/reload/retry and actual map-only
reconciliation. Canvas command geometry checks do not constitute pixel review.

## Verification status

Initial controller/save:29/29pass,0fail/skip/cancel/TODO,47,850.53ms.
The later complete final run below supersedes the initial checkpoint: the added malformed-state case, full aggregate, syntax, static build/import/hash and original-integrity gates pass.
`pnpm sync:registry`: attempted, failed before registry work with
`ENOENT mkdir /home/agent/.local/share/pnpm`; raw output retained. It is not passed.

No native W gameplay, normal-input difficulty/build comparison, visual/audio/
mobile acceptance, full campaign/duration claim, remote write, source upload,
Library archive or publication is claimed here. Parent owns those remaining
release gates and preservation. Public root and existing candidates are untouched.

## Required native invested-build comparison

Parent's v40 ordinary-input evidence: legitimately earned L18, +1 mace/shield,
strength18/intelligence12, invested sundering Hammer and Returning Hammer1 made
one Q contact the200HP B boss for143 then150. This is legal purchased output,
not a duplicated-damage defect. W keeper still has200HP and may fall during one
such cast. Its new locked line→radial burst is an executable candidate contract,
not evidence that the invested player will see or care about that cycle.

Before any depth acceptance, compare W using that same actual earned profile
and a lower-investment legal build, with Normal and Hard. Record target/cover/
position/skill choices, danger clarity, burst opportunities, retreat and optional
rescue. Keep travel/menu/tool waiting separate from combat time. Do not inflate
HP/walking, force invulnerability or suppress earned older-region power simply
to make a duration number rise. Full Warrior/Master/campaign quality remains open.

## Initial complete integrated run and retained corrections

`aggregate-initial.tap`:2,143/2,147pass,4fail,0skip/cancel/TODO,
388,806.55ms serial. All earlier2,022tests remain; added W module46, actual
controller/save30, main/render29 and town/keeper20 account for125new checks.
Whitespace-only TAP diagnostic lines were normalized; names, values, failures and timings remain intact. The failures were retained expectations/wiring, not removed scenarios:

1. Two old candidate-profile checks still classified `/qa-r12/` as unsupported.
   The negative boundary is now `/qa-r13/`; real R12 forward/duplicate/backward
   and payload-preservation cases are covered by the new controller suite.
2. The fire-response allow-list omitted the eight explicitly registered W foes.
   It now names each W opt-in; existing Furnace/B actor behavior is unchanged.
3. Lance's formatter-only source extractor searched for synchronous `showNpc`,
   which is now async. The corrected boundary isolates the same production
   `effectText` function and additionally asserts that it captured no NPC handler.

The exact4corrected cases pass4/4 in1,778.27ms, with no skipped cases.
Final full-source aggregate remains pending the independently reviewed profile
selection ownership correction described below; initial results are not inherited.

## Independent profile ownership finding

Read-only source review found inherited `loadProfile` code could reconcile a
late profileA startup over newer profileB UI while retaining B's controller.
The ordinary title offers both choices, but the scheduling counterexample has
not been reproduced in a live published browser. A deterministic delayed-store
harness and bounded selection-intent/owner correction are being implemented in
a separate W/schema-independent checkpoint, including delayed candidate-copy
completion. Until that correction is tested, profile report ownership is an
open integration gate. This is not a claim of an observed R11 live exploit.

### Profile selection correction and reach qualification

Independent runtime commit `7dafd9f` binds the local controller owner and original
selection intent across load/start/candidate-copy awaits. A superseded preflight
cannot start a new save; an already-requested start/copy may finish only its own
slot and cannot replace newer UI or emit a stale error. Tests/docs follow-up
`e852a53` adds exact title input coverage without another runtime change.

22targeted cases pass. Before the runtime fix,15of18initial cases failed. The
additional title cases start/copy through the actual click handler with delayed
WebLocks, then exercise Escape and C. The title already clears the prior
battle/state, so simulation stays stopped. Direct closePanel and stale-close
clicks are defensive probes: no Close button is shown on the title. The separate
menu Reload does not call loadProfile. A delayed direct loadProfile call while
old gameplay is active is broader harness scope, not an established ordinary
input path; no unnecessary shared loading-UI redesign was added.

This correction is W/schema-independent for separate R11 backport. It remains
automated handler evidence, not a demonstrated published exploit or native
browser timing acceptance. Final R12 aggregate will include22new generic cases,
bringing the expected total to2,169with all earlier cases retained.


## Final R12a automatic verification — 2026-10-10 09:07 UTC

- `aggregate-final.tap`: **2,169/2,169 pass**, 0fail/skip/cancel/TODO,
  **387,390.173403ms**, Node24.19.0, serial `--test-concurrency=1`, exit0.
  Count reconciliation:2,022retained +46W module +30controller/save +29main/render
  +20additional town/keeper +22profile ownership. Earlier runs are retained.
- Final source/test syntax passes. No existing scenario was removed.
- Static build is version`0.12.0-reimplementation.1`, R12a:89hashed payload
  files +build manifest,16,437,139payload bytes; every hash matches and all
  264relative JavaScript module targets exist. Future expedition runtime remains
  excluded. The build is local only and establishes no gameplay acceptance.
- All167original files match both recorded SHA256 and Gitblob IDs. No changes
  outside `projects/EmberwatchReborn` exist relative to integration base7e33e0e.
- `pnpm sync:registry` and `pnpm build:vercel` both stop before their project work
  with pnpm-home ENOENT. They are blocked, not passed. Final raw outputs and
  exit statuses are retained.
- Source/test/provenance archival, candidate publication, ordinary-input Normal/
  Hard invested/lower-investment W comparison, real town/label/flash0/audio/mobile
  review and full campaign/Master/finale remain parent-owned unfinished gates.

This is a verified local code-registration checkpoint. Automated completion of
scripted settlements, broad adversarial saves and production input handlers does
not establish actual W victories, tactical enjoyment or campaign duration.
