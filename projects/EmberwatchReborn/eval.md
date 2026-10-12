# Evaluation status — new reimplementation

## Current result — 2026-10-10 01:56 UTC
- Public Site v31 root remains R7a4 app0.7.0-reimplementation.5 (590 release checks plus actual L10/focus/save QA). Public `/qa-r8/` is R8a3 app0.8.0-reimplementation.4, source a58f785,698 checks. Normal-input role-mark comparison and L12 receiver save/reload passed; passage discoverability remains insufficient. See docs/r8a3-normal-input-visual-qa.md.
- Actual R8a ordinary-input EAST S route from an earned L10 copy reached L12,3975.5XP/860G,80kills/5deaths. Delta1140XP/232G matches the authored budget. Partial lever reload, repeat decode/report prevention, early lift round trip, equipment and final HP98/160 save/reload passed. See docs/r8a-normal-input-east-qa.md. Approx36combat seconds with long paused inspection is NOT a whole-region fun/depth/time acceptance.
- Published R8a1 app0.8.0-reimplementation.2:673/673 tests, zero failed/skipped (660retained+10pause-travel handler regressions+3guidance checks), syntax/build and original167-file integrity passed. Corrected decode/region-label UI, west-route normal-input completion, death-modal reload evidence and final L12 save/reload have now been verified separately; see docs/r8a1-normal-input-west-death-qa.md. Tactical/readability quality acceptance remains open. See docs/r8-pause-travel-refresh.md and docs/verification-r8a1/.
- R8a2 actual normal-input mixed combat at flash0 showed readable danger telegraphs but insufficient role-glyph floor/shadow separation. Title/menu label consistency passed. R8a3 adds only static keyline contrast/shadow offset;698/698 tests (695retained+3), syntax/build and original167-file integrity passed on the final R8a3 package. Actual corrected role marks were distinguishable at flash0 through normal mixed/keeper fights; north traversal passed but subtle passage cues remain insufficiently obvious. No whole-region depth acceptance follows from this bounded review.
- All new tests use actual production handlers with scripted fixture coordinates/kills and substituted browser boundaries; counts do not imply human play. Historical425 tests belong to lost source and are not inherited.
- Warrior25/53 functional nodes and2/4 tiers; Expert/Master, T continuation, ending, live repeat-run ledger, deeper gear/respec remain incomplete. Local R9a F core/save/UI handlers, tender fire-response and read-only low-cover renderer pass905/905 automated checks on the integration source. R9a app0.9.0-reimplementation.1 is published separately at /qa-r9/ as Sitev30. Normal-input copied earnedS state has passed cooling cover choice, death/reload/retry, lift round trip and working ring, reachingL14 during ignition combat. The cover path now completed all17kills, explicit ignition/lens/report and save/reload atL14 5265.5XP/1073G; delta1290XP and256G minus43death loss matches budget. The initial alternate-choice and native fire-escape observations were pending at v30; the later R9a1 paragraph records the completed alternate route. Actual F screenshots exposed absent role glyphs on the new kinds; LocalR9a1 adds the bounded glyph mapper and completed-S guidance correction, passing919/919 checks; R9a1 is now published as Sitev31 at /qa-r9/. Corrected shapes at flash0 and the alternate central route have passed bounded normal-input review through all17kills, explicit ignition/lens/report and reload atL14 5265.5XP/1085G, no additional death or potion use. See docs/r9a1-normal-input-channel-qa.md. Native fire escape remains unverified: Q Hammer is not the relevant Judgement/Trial by Fire area, so earlier attempts were not valid fire-response trials. See docs/r9a-normal-input-cover-qa.md. Ear-quality remains unverified. See docs/requirements/warrior-gap-update-r9.md and docs/r9-furnace-balance-calibration.md. Detached expedition ledger is excluded from runtime builds.
- Original0.4.7 preserved167files. Canonical Libraryv2 read as text; exact local byte materialization/hash blocked by403. Whole campaign, listening, mobile and AAA quality remain unverified.

## Historical initial R2a result
R2a passed99 automated tests and had not started browser QA at that time. Those initial observations are superseded by the dated current status above, not retroactively rewritten as full-game acceptance.

The historical425/425tests and normal-controlL8checkpoint belong to the lost source. They are not current implementation pass results. The old local commit IDs are not recoverable source without their missing objects.

## Evidence required per verified increment
Exact source commit/tree or file hashes; complete source and runnable checks; provenance of rules/tuning; passed/failed/not-run test inventory; fixture injection disclosures; actual-input observations and timing limitations; independent archive validation and confirmed Library ID. No original-source, gameplay-depth or release-complete claim from catalogs or screenshots alone.

## Open known findings from the lost-build play
Skill/action readability, complete equipment comparison units, early banked gold and fast simulation progression require reevaluation on new code. Hover target inspection must not obscure the player/telegraphs. These observations motivate tests/design checks; they are not defects reproduced in the as-yet-unimplemented runtime.

## Historical R0 release gate
The user requires whole-playthrough review and iterative improvement on the dot computer, followed by a separate fully public GPT Site. Before publishing: first entry, growth, dungeon/boss, death retry, save/re-entry and repeat play must be reviewed on a complete playable build. Preserve source/build archives in Library, verify the public URL and perform published-build QA. R0 is not such a build and has not been deployed. Previous blocked import/PNG actions remain out of scope.

## Current checkpoint publication
Latest user instruction requests immediate public deployment of R2a before complete campaign QA. The published development scope must be explicit. Whole-playthrough/visual/audio/AAA-quality acceptance remains open and is not replaced by deployment.

## R6a dead-save resume regression
Actual R6a browser QA reported HP0 with arrival guidance after reload/continue until a movement gesture. The actual `loadProfile` handler reproduced delayed death presentation when optional audio readiness stayed pending. Five of six new regressions failed against the old source; all six pass after the correction.

- Full suite: 488/488 passed (482 retained + 6 new); source/test syntax and isolated app build passed. `git diff --check` passed.
- New coverage: loaded dead battle/arrival state, no repeated settlement, actual startup with pending audio, late audio completion after retry, read-only repeated loads, explicit retry idempotency and earned progress, living arrival resource/recovery freeze, muted startup.
- The handler tests execute the production loader/death panel with browser boundaries substituted and scripted earned-route fixtures. They are not browser play, visual inspection, or proof of the observed browser audio state. Corrected-build normal-input browser regression later passed in R6a1/v18; see the publication-and-regression report for separate real evidence.
- Build ran in a separate temporary app copy; existing QA build output was left unchanged. Root `pnpm sync:registry` was blocked by the recovery environment (`ENOENT` for the pnpm home); this checkout also lacks the root registry script and launcher. That focused subtask did not publish; the owning integration subsequently committed, archived and deployed R6a1 as recorded above.

## Next bounded implementation: T core
The design in docs/r10-tomb-expert-handoff-plan.md now enters unintegrated core implementation.19fixed foes and480objectiveXP/160G, persistent glyph prefix/ward relay, explicit oath and Eda report must preserve production reducer guards. L14 reporting remains legal; the existing120G report reward is reserved for Expert training, never extra minted gold. No T runtime, earned L15, Expert skill or next-field verification is claimed until integration and normal play.

## R9a2 bounded visual correction under test
Actual earned qa-r9-fire-20261010 learned Trial by Fire through Bran (16→14SP, E cost30→37.5), then E created genuine fire ticks against a native54HP tender. It died; escape is still unobserved. The runtime damages persistently but only emitted short slash effects at ticks, leaving the active footprint invisible between them. R9a2 adds a read-only area handoff and low-intensity wall-clipped boundary. No acceptance follows until automated and normal-input screen checks. T files are excluded from this isolated candidate worktree.

R9a2 isolated package passes936/936 checks (919 retained plus17 area geometry/render/handoff checks),0fail/skip, syntax and build. Original167 SHA256/Gitblob integrity passes. Registry/Vercel commands remain blocked by the recovered checkout tooling. All17 new cases are scripted renderer/geometry fixtures, not visual acceptance. Full-fidelity radius uses the existing+10center tolerance; curve samples<=3world units and wall rays share damage LOS traversal<=4units.

## R9a2 actual screen result → R9a3
Sitev32 /qa-r9/ actually restored earned fire-branch resources/CD and showed the persistent clipped area at flash0. Thin line contrast remained insufficient against detailed paving; docs/r9a2-normal-input-fire-qa.md records the bounded failure and images. R9a3 adds only static keyline/inner-line contrast and11% floor fill; corrected screen verification pending.

R9a3 isolated source passes938/938 (936retained+2static contrast regressions),0fail/skip; syntax/build and original167file integrity passed. This count excludes unfinished T changes in the main worktree. Corrected normal-input visual acceptance remains pending.

## R9a3 actual bounded screen acceptance
Sitev33 /qa-r9/ actual normal-input recasting on the learned fire branch now shows the static friendly boundary at flash0 against detailed paving, fixed world placement, expiry and visible hostile nozzle line above it. Existing HP/MP/CD/points/kill record survived candidate reload and resource-preserving town return. See docs/r9a3-normal-input-fire-qa.md. Native tender escape is still unobserved; a later screenshot foe is a nozzle. Source/scene counts do not certify audio, mobile, whole-region tactics or full campaign quality.

## R10 Tomb visual/candidate checks (before browser review)
Focused 86/86 pass, zero skipped/failed: actual renderer command fixtures for six gate-map stages, five role shapes, phase-commit boundary, glyph/ward layers, flash0, fog/death/region guards and immutable rendering; retained Furnace/fire checks; actual handler-produced F save copy to the new R10 namespace with source bytes and repeated/downgrade refusal. An initial syntax typo in WARD_LINES was found and corrected before this passing run. These are automated fixtures, not pixel inspection, an earned Tomb run, Expert promotion or campaign acceptance. Full aggregate check is still pending integration.

## R10a final integrated automatic gate
1237/1237 pass, zero skip/fail, 148.392s sequential. Source/test syntax, static build (71 hashed files;16,229,499 bytes before manifest),180 built import references and original167 file hashes pass. Registry/Vercel remain explicitly blocked by recovered pnpm home ENOENT. Full result and fixture qualifications: docs/r10a-integration-validation.md. Tomb normal-input QA and Expert/Master implementation remain open.

## R10a actual Normal route / R10a1 correction gate
Sitev34 app0.10.0-reimplementation.1 actual native inputs progressed an earned R9 copy through all19 T foes, clue/order, ward relay, controlled death/reload/retry, natural boss phase, explicit oath and Eda report. XP5265.5→6345.5, gold1085→1331 after one intentional58G death loss;120G is reserved within total. Reload retains L16/116kills/7deaths/resources/gear/controls. R9 original remains L14/5265.5XP/1085G/97kills/6deaths. No injected XP, damage, HP, inventory, flags, coordinates or save import. See docs/r10a-normal-input-tomb-qa.md.

806d61a fixes the observed copy findings and adds9 actual UI-handler regressions; related150/150 pass. R10a1 final full suite1246/1246 passes (1237retained+9new,140.547s,0fail/skip/cancel/todo). Source/test syntax, isolated build and original167file hashes pass. Registry/Vercel remain pnpm-home ENOENT-blocked. Corrected published-copy review is pending. Scripted tests and bounded Normal QA do not establish full campaign, difficulty balance, play duration, listening/mobile or AAA quality.

R10a1 published as Sitev35 at /qa-r10/. Actual earnedL16 reload/Eda/solved journal and a new explicit earnedR9 copy's first acceptance now show corrected prose and unchanged resources/points. Title/menuR10a1 agree. Intermediate ward copy is automatic-handler covered, not fully replayed in the a1 screen pass. See docs/r10a1-publication-copy-qa.md. RootR7a4 remains unchanged; no Expert source published.

## R11 input slice gate (not integrated or published)
Retain all previous controls tests, independent historicv1/v2 shapes, and add actual router-to-capture/strict slot tests for conflicts, old bindings, repeat, early release, multi-owner/late-owner identity, pointer cancel versus normal release, modal/blur and stale assignment. Pure capture tests do not establish actual UI/state/combat wiring or browser acceptance.

R11 safety coordinator acceptance includes same-life busy deferral, delayed commit, multiple safety causes, profile/region/life replacement, idempotent drains, actual recovery checkpoint before resume, and failed save. Pure coordinator cases must be followed by production main/controller/combat integration and ordinary-input QA; no substitute for these later gates.
## R11 Expert promotion slice, verified local transaction checkpoint
From806d61a in an isolated local worktree:1344/1344 final-source automated tests passed (1246 retained +98 new), zero failures/skips. New tests execute production reducer/controller/store promotion, stale/double requests, exact protected120G, save failures, legacy reloads, death/retry and genuine Expert ancestor portals. Syntax, isolated temporary app build, unchanged references and original167-file integrity passed. Root registry workflow was attempted and blocked by pnpm-home ENOENT. This slice enables only Expert promotion/history; the same25 nodes remain executable and Expert skills remain DATA_ONLY. Recovery-schema2/skill/UI integration, normal-input promotion, release and external preservation are not completed here. See docs/r11-expert-promotion-transaction.md and docs/verification-r11-promotion/. No browser, publication, remote push or Library action ran.

R11 pre-B integration final:1647/1647 automatic checks passed,0fail/skip/cancel/TODO,185.117s serial. Existing tests retained; historical fixtures strip only later schema/control fields, and exact transition copy assertions reflect real walking-time regen.16 new production-frame/browser-handler tests exercise actual channel, safety-persistence, UI-focused inputs, finite touch, trainer fee quote and action-slot CAS. Syntax, static app build and all167 original Gitblob/SHA256 checks pass. Native Expert play, screen/audio quality, B route and release remain pending. Source checkpoint documentation: docs/r11-ui-input-integration.md.
## R11 battlefield verification plan
Run independent content/geometry and scripted production-settlement tests for both device orders, all difficulties, exact rewards, prerequisite/history corruption, repeat/stale/forged input, depleted pools, load/death/re-entry and boss/hero simultaneous settlement. Label synthetic fixtures and temporary R11 dependency overlays explicitly; they do not constitute ordinary-input combat or final integrated save/controller acceptance. Inspect broad boss sweep versus committed spell line, radius11 movement, closed boss LOS, safe arrivals, Banner pocket and lateral channel exits. Full visual/audio/play calibration, Expert gear progression, final integration, original integrity/build and external archival remain separate gates.

## R11a integrated candidate boundary
Connect the accepted Expert handlers and saved action slots to the authored Beacon Battlefield B route, using actual state/controller/travel and UI handlers. Capture objective revision and modal epoch; preserve living battle objects when the second device opens only the map. Both six-foe yards, explicit beacon collection and Eda report are distinct durable steps. QA namespace qa-r11 copies earned R10 profiles only through explicit forward UI, preserving original bytes. Earlier regional completion text must acknowledge connected Expert/B content without denying it or promising Master/final/repeat completion. App/project/build/title metadata use R11a / 0.11.0-reimplementation.1. Automatic fixture settlement, normal-input play, visual quality and duration remain separate evidence.

Final R11a integrated automatic run:1761/1761 passed,0 failures/skips/cancellations/TODO,251.556seconds,Node24.19.0 serial test runner. Syntax,222 static dependency links, static build81 manifest files, original167 file hashes and diff whitespace passed. The first aggregate1758/1761 had three obsolete continuation-copy expectations; those assertions were updated, not removed, and both raw runs are retained. Registry/Vercel remain blocked by the documented pnpm-home ENOENT. R11 ordinary-input gameplay is pending.

## R11a first live review and R11a1 correction gate
The first normal-input R11a review confirmed120G promotion, four purchases,
Protection/Zeal exclusion, explicit slot/key setup, reload persistence, town
Banner/short Onslaught, B safe entry and one-death retry. One west-yard foe was
killed. Expert input loss, weak Banner footprint and crowded B entry were found;
B completion, quality and ordinary-play duration remain open. First evidence:
Library QA libfile_2c13f34ead1881919f08c0b716243df0 v0. Fixes and full final aggregate
must pass before R11a1 candidate replaces R11a; live regression remains separate.

Final R11a1 automatic aggregate1827/1827 passed,251.660s serial, zero fail/skip/
cancel/TODO. Original167-file hashes, syntax,82-file isolated build plus manifest
and224 import links pass. Prior1761 tests retained; the old reject-all Expert
busy-input policy now has explicit short-window and expiry/cancellation cases.
Root registry/Vercel remain blocked at pnpm-home setup. Corrected normal-input
combat/footprint/new-town-entry QA remains the next gate; public root staysR7a4.

## R11a1 ordinary-input B loop and remaining quality gate
Site37 /qa-r11/ on Normal: paid Onslaught contacts and Banner at flash0, separated
town entry, both devices, fire-line/cone boss, explicit beacon and Eda report,
save/title/reload/no second report and completed-region re-entry were observed.
Earned L16→18,totalXP6345.5→8565.5,1477 finalG after promotion and earlier death;
HP131/184,gear and key bindings remain. Full detail and measurement limitations:
docs/r11a1-normal-input-battlefield-qa.md. All15 Expert nodes, other difficulty
curves, Master and live expeditions are not accepted by this bounded sample.

Depth gate FAILED/OPEN: east six foes fell in about7combat seconds and deliberate
boss offense took about5seconds with inherited rank4 Hammer. Source math must
first exclude duplicated damage; next compare B-only role spacing/fire-area
response and readable boss pressure using the same legitimately earned build.
Do not extend time via HP/walking alone or erase dominance over older regions.
Source1827 automated checks remain valid for unchanged executable code; this
post-play document update does not claim a new aggregate execution.

## R11B encounter validation plan
Run focused synthetic production-handler checks for bounded role motion,
immutable windups/recovery, slow/stun/suppression, walls/LOS, attack re-engagement,
fire survivors versus lethal initial E, and unchanged B/older-region contracts.
Preserve failed output and identify fixture repairs. Normal-input earned-build
pacing, visual motion and final integration/release remain separate pending gates.

R11B role-spacing slice final focused gate:204/204 pass (42new,162retained),
0fail/skip/cancel/TODO,52.866s serial on Node24.19.0. Syntax/diff-whitespace pass.
First82/84 and corrected84/84 logs are preserved; two new assertions had sampled
past the attack-release boundary and were repaired to stop exactly there.
See docs/r11b-battlefield-role-spacing.md. This is synthetic handler/geometry
coverage, not full aggregate/build, normal-input pacing, publication or visual
acceptance. Earlier1827pass counts are not inherited for changed source.

## R11b final automatic calibration gate
1924/1924 final-source checks pass,0fail/skip/cancel/TODO,251.355s serial. The
previous1923/1924 run retained one stale R11a1 title regex; its expected label
was corrected to the actual R11b identity, not removed, and both raw runs remain.
All1827 prior checks are retained. New role42 + Lance54 + actual UI1 =97 new.
Syntax,83hashed build files plus manifest,229local imports and original167
Gitblob/SHA256 pass. Registry/Vercel remain pnpm-home ENOENT-blocked. Tests use
explicit synthetic states/settlement reports and do not establish live quality.
R11b ordinary-input comparison,15 Expert nodes, alternate B order, Master and
live repeat expedition remain open. See r11b native comparison plan.

## R11b1 verification scope
The observed R11b Protection run is normal-input evidence. 585 focused handler/UI tests include 32 new cases; the final R11b1 aggregate passed 1956/1956, including the release metadata. The v39 native status/Zeal checkpoint is documented separately; no Master, all-Expert-node or full-campaign acceptance is implied.

## R11b enemy release correction verification plan
Use production createBattle/stepBattle handlers for the observed B boss line,
real cones/circles and older ranged attacks. Assert exact projectile payload,
speed, lifetime, delayed hit/status and wall/miss behavior; compare gameplay
state/events with the pre-fix handler while excluding only effects. Canvas
command checks must verify bounded directional line cues, exact cone/circle
outline geometry, flash0, warning layering and immutable presentation inputs.
Retain old tests and run a focused serial set only. Aggregate/build/publication,
Library preservation and native screen QA remain with integration ownership.

R11b enemy-release slice passes24/24 new tests and185/185 focused related
checks (161 retained),0fail/skip/cancel/TODO,25.904s serial. Historical handler
parity passes48 scenarios and9,156 full-state/event comparisons excluding only
FX; combat source equality holds after the single release-FX substitution.
Syntax and diff whitespace pass. Registry remains pnpm-home ENOENT-blocked.
Initial fixture failures and all outputs are retained; no old test was removed.
See docs/r11b-enemy-release-geometry.md. No full suite, native corrected pixel
QA, build, deployment, push or Library operation is claimed by this slice.

## R11b2 integration verification
R11b1 v39 normal-input status rejection and Zeal east checkpoint are recorded in docs/r11b1-zeal-status-normal-input-qa.md. Run all retained checks plus24 enemy-release checks against final R11b2 metadata. Geometry parity and budget calculations are separate supporting checks, not gameplay-test counts or native acceptance. Corrected visual QA remains pending.

R11b2 final integrated source passes1980/1980,0fail/cancel/skip/TODO,
254220.877814ms serial. All1956previous tests retained plus24release cases.
Syntax passed;84hashed payload files plusmanifest,230relative module links,
all build hashes and167original files' SHA256/Gitblob IDs passed.
Registry and Vercel both exit1 before work with pnpm-home ENOENT; neither passed.
Budget576subset +1088boundary calculations passed separately and do not add to
1980runtime/UI checks. Normal corrected release pixels remain pending publication.

R11b2 Sitev40 native checkpoint: title/menu identity and exact paid L17 save
restore passed; representative west caster/true cone/circle and boss fireline/
sweep release pixels reviewed at flash0. West six kills/device settled once.
Returning Hammer trained normally, but only its first143rounded boss damage
was observed; return hit remains open. Deliberate boss death charged69G once;
dead-save reload immediately showed retry; explicit retry restored town without
another charge. See docs/r11b2-normal-input-visual-death-qa.md. Native boss
completion/report and named Expert effect-isolation gates remain open.

## Resource display precision focused verification plan
Retain existing checks and add real main HUD/rejection handler probes around
37.5MP, discounted33.75MP and11.25/7.875stamina, using actual skill quotes and runtime
acceptance/payment. Exercise adjacent floating-point values, empty/full/dead,
positive fractional HP, read-only formatting and non-finite display fallbacks.
Run only a focused serial set in the isolated correction worktree. These
synthetic tests do not establish native screen acceptance, full aggregate,
build, publication, remote push or Library preservation.

Resource display slice final focused gate:219/219 pass (177 retained +42 new),
0fail/skip/cancel/TODO,11,153.362326ms serial on Node24.19.0. Three decimal places
also cover the actual Grace-discounted7.875stamina quote. The final42 new cases
fail35/pass7 against pre-fix main/feedback in an isolated copy, as expected.
Changed-file syntax/diff whitespace pass; no pre-existing test was altered.
Full aggregate/build/native/publication/Library gates remain with integration.
See docs/r11b-resource-display-precision.md and its raw output inventory.

## R12 registered W verification plan
Retain all existing tests. New actual controller/store tests cover version4 B
load/migration without rewriting bytes, explicit forward-only candidate copy,
old-envelope W rejection, captured epochs, duplicate defeats, queued/stale and
uncertain-save paths, all required objectives, both choices, optional rescue
before/after report, depleted-resource title/load, death/retry and transitions.
Real main-handler tests cover pause/busy/safety ordering and immutable buttons.
Only focused serial tests run during integration. Full aggregate/build/original
integrity, native play/visual/audio, archival and publication remain separate.


## R12a final registered automatic gate
2,169/2,169pass,0fail/skip/cancel/TODO,387,390.173403ms serial on Node24.19.0.
All2,022retained checks remain; new W module46, actual controller/save30,
main/render29, additional town/keeper20 and generic profile-owner22 total147new.
First full2,143/2,147 output is preserved; its4obsolete namespace/content-list/
source-extraction expectations were narrowly updated, with4/4focused confirmation.
Final syntax,89-payload static build +manifest,264module imports, every payload
hash and all167original Gitblob/SHA256 identities pass. Registry/Vercel remain
pnpm-home ENOENT-blocked. The independent inherited profile-load/copy race is
corrected by a separate W/schema-independent guard and real delayed-handler
regressions; native exploitation is not claimed. Native W Normal/Hard comparisons,
all campaign/Master/final content, visual/audio/mobile acceptance, external archive
and publication remain open. See docs/r12-wilderness-runtime-integration.md.


R11b2 v40 continuation subsequently verified Returning Hammer's two separate
contacts in a normal boss windup, explicit boss/relic/report rewards, unchanged
completed yards after retry and exact final town reload. See the continuation
in docs/r11b2-normal-input-visual-death-qa.md; earlier pending statements above
describe the earlier checkpoint and are superseded only for those named gates.
R11b3 integrates the display-only precision slice. Final2022/2022 aggregate,
syntax,85payload hashes +manifest,232local imports and167original file hashes
passed. Registry/Vercel remain ENOENT-blocked. Corrected native presentation
acceptance awaits publication. See docs/r11b3-integration-validation.md.

R11b3 Sitev41 subsequently passed the bounded desktop normal-input presentation
probe in docs/r11b3-normal-input-precision-qa.md: paid L18 restore, below33.75
rejection, fresh above-cost execution, fractional stamina, outside/expired
Banner quote and fractional save continuation. Exact floating-point boundaries
remain automatic evidence; native regen elapsed between observations is explicit.
# R11b4 backport gates
Run copied production title click/load functions and real store/controller with
explicit delayed WebLock boundaries, plus all retained tests. Cover new/copy A
then continue B, old success/failure, title dismissal, overlapping same profile,
copy source bytes, controller-report binding and actual Escape/close boundaries.
Native checks use ordinary isolated new/copy/continue flows; no forced browser
lock or storage injection. Delayed fixtures are not a demonstrated live exploit.
After final build, preserve source/build, publish only qa-r11 and revisit paid
L18/legacy profiles before considering any root promotion.

R11b4 final backport aggregate:2044/2044 pass,0fail/cancel/skip/TODO,255448.969374ms. Standalone syntax/build/integrity pass; registry/Vercel remain ENOENT-blocked. Native publication/revisit remains pending at this source checkpoint.

Subsequent R11b4 Sitev42 normal-input checks passed for earned L18, untrained
exit/reload, free-training automatic save, L4/L6 isolated forward copies and
duplicate-copy rejection. See docs/r11b4-normal-input-profile-qa.md. This did not
establish safe reverse schema compatibility for a root rollback.

## R11b5 root-upgrade gate
An actual unchanged R7a4 reader/controller reproduced the first-v4-save stale
writer hazard. New immutable backup/fence/restore and fixed25-file old-runtime
fixtures cover quota, malformed/partial writes, uncertain commits, duplicate
attempts, token mismatch, existing targets, profile separation and old-reader
compatibility. Title/standalone recovery handlers additionally cover namespace,
duplicate click, stale success/failure and no automatic gameplay/restore.
Integrated focused72/72 and direct old-runtime32conditions pass; full aggregate
passed2116/2116 (256039.332557ms; no failed, skipped, cancelled or TODO cases). Native recovery and a preserved rollback+recovery publication remain
release gates. No W, new economy, complete campaign or AAA-quality claim.

## R11b6 recovery canonical-address regression

Observed public R11b5 candidate standalone failure after `.html` canonical redirect; release standalone and in-game recovery passed. Added exact extensionless aliases, route-isolation/no-automatic-write tests, and unknown-prefix/extra-segment rejection. Full aggregate and corrected public native QA are recorded in docs/verification-r11b6 and the follow-up QA document when complete. This is no claim of new combat or campaign completion.

## R12a1 integration work started
R11b6 source17b13fa and W source ddee4c0 are separate verified baselines, not an
automatically qualified union. Retain actual frozen R7 and R11 readers and their
historical v4 assertions; add v5 writer/recovery/fault/race tests, then run the
complete serial aggregate, syntax and both local build/import/hash checks.
No browser, Site, Library or Git remote action is part of this work surface.
Native W quality, same-investment Normal/Hard comparison and full campaign remain
open. Earlier counts are historical until the final combined run is recorded.


## Expert description focused regression plan
Execute the actual main formatter and trainer handler with real preview/purchase
reducers. Check missing-base and exclusive rows, reference unknowns, all ranks
of omitted resistance/critical bonuses, and next-preview versus actual purchase
results. Preserve all existing tests and use focused serial verification only;
full aggregate/build, native review, publication and Library stay with integration.

Expert description final focused gate:252/252 passed (212 retained +40 new),
0fail/skip/cancel/TODO,20,246.617203ms serial on Node24.19.0. New tests cover real
trainer/formatter, all affected ranks, actual purchase equivalence and intact
unlearned/exclusive/cost guards. Base main.js fails20/40 as expected. One initial
invalid-SP fixture was corrected through real purchases; old tests are unchanged.
Only effectText and one trainer-description call differ in executable code.
See docs/r11b-expert-description-preview.md. Native/aggregate/release gates remain
with integration; this is not published or full-campaign acceptance.

## R12a1 final safe integration — 2026-10-10 10:35 UTC
Final serial2,446/2,446 passed,0failure/skip/cancel/TODO,399540.152311ms.
Initial2,405/2,406 preserved one obsolete R12a title expectation; corrected to
R12a1 without dropping the other assertions, then integrated the parent-approved
Expert-description40 checks and reran the entire suite. Source/test syntax, both
95-payload builds,272relative imports each,allhashes and original167Git/SHA256
identities pass. Registry/Vercel remain pnpm-home ENOENT blocked. Separate
pre-v4/pre-v5 originals, actual frozen R11 fence/controller recovery, profile
ownership, W upgrade failure and unsupported qa-* route rejection are covered.
No native W acceptance follows. See docs/r12a1-safe-integration.md and
docs/verification-r12a1/final-summary.json. Parent R11b7 native training/reload
evidence is preserved separately, without treating it as W play.

R12a1 final wording follow-up: parent requested “지역 전환 자체는…” instead of
“이동은…” in W reentry guidance; ordinary-walking regeneration text remains.
The2,446full pass above predates this one-string correction. The existing actual
portal/hints test with new precise assertions passed1/1, then source/test syntax,
both95-payload builds and272imports/allhashes each were rerun successfully.
No full aggregate rerun after this string change is claimed. Final artifacts
and source/tree identities are in verification-r12a1/final-summary.json.

R12a1 partial normal-input QA (Sitev47): earned reported-B copy, actual pre-v5 backup/empty-profile historical restore, no fabricated pre-v4, survey/anchor seven kills and exact1020XP/92G, free hook/separate anchor, immediate same-anchor roundtrip and reload with spent MP/CD preserved. See docs/r12a1-native-anchor-checkpoint.md. This is not whole-W completion or continuous timing/quality acceptance; later route and death tests remain open.

## R12 Wilderness readability focused plan
Add production-helper, actual-renderer and extracted-main Node checks for gated
lock/unlock, reachable unaggroed bodies, LOS-broken active tells, completed hook
and evidence, keeper return before/after defeat, nearby short labels, combat
suppression, non-W/town compatibility, and frozen-input nonmutation. Retain prior
W tests; update only obsolete long canvas-label expectations. Browser/full suite,
registry/build, screenshots and publication remain with integration. Native QA
references are keeper-entry.jpg, anchor-first-shot.jpg and
relay-lancer-punishment.jpg; no new native pixel result is claimed by this slice.

R12 scene readability final focused result:102/102passed (19new +83retained),
0failed/cancelled/skipped/TODO,69,350.335191ms serial. The selected suites cover
W geometry/readability/main UI/town/keeper plus B/combat renderer regressions.
Changed-source/test syntax and diff whitespace pass; original Emberwatch has no
Git diff against e76a197. Read-only review found no blocking scope/correctness
issue. See docs/r12-wilderness-scene-readability.md and its verification folder.
No browser, engine launch, full aggregate, registry/build, Site/remote/Library
operation ran in this bounded worker; integration still owns those gates.

Scout copy follow-up: focused real-view checks cover three remaining foes after
one recorded defeat and zero remaining with the claim enabled. Preserve exact
commands, economy and state; this is not a combat or async-input timing change.

Scout-counter follow-up passed2/2new focused production-view checks,0failure/skip/
cancel/TODO,2,762.069108ms; changed-file syntax and diff whitespace pass. Only one
presentation string changes. The preceding102-check run is historical for this
follow-up, not claimed as rerun. No browser/full-suite/build/publication action.
R11b7 native candidate description QA passed on Sitev46: prior earned checkpoint preserved; disabled augment reference preview readable; InnerFlame1 and Wrath1–3 ordinary purchases with exact11SP cost; save/reload labels/resources retained. See docs/r11b7-native-description-qa.md. Quantitative individual combat effects remain open; lower trainer purchase scroll reset is recorded. Root remains R11b6.

## Trainer position focused regression plan
Run new tests through the actual document click, trainer, panel, dispatch, controller and store handlers with explicit delayed saves and a DOM geometry probe. Cover repeated purchases, layout changes, disclosure state, focus, disabled/max/points/exclusive rows, ordinary failure, critical failure, close/menu/profile/life/region changes at both await boundaries and input clearing. Retain existing suites unchanged. Focused serial and syntax checks are local evidence; native layout and complete integration remain separate gates.

Trainer position final focused gate:367/367 passed (324 retained +43 new),
0fail/skip/cancel/TODO,41494.16296ms serial on Node24.19.0. The final new cases
fail19/pass24 against unchanged base main.js, exposing the real asynchronous
restore defect and stale-owner boundaries. Syntax/whitespace pass; all prior
tests are unchanged. Registry remains pnpm-home ENOENT-blocked. No full-suite,
build, browser, publication or Library gate was run in this isolated slice.
See docs/trainer-purchase-position.md and its verification directory.

R12a1 native Normal main route and optional/death/reload checkpoints are recorded in docs/r12a1-native-main-route.md and docs/r12a1-native-optional-retry.md. These apply only to runtimea93ed23/Sitev47 with one earned build. R12a2 integrates presentation visibility, remaining-counter clarity and trainer position restoration; native acceptance is pending. Root R11b6 is unchanged.

R12a2 initial full integration:2505/2510 passed,5 failed,0 skipped/cancelled/TODO. All five failures were real-render-handoff extraction fixtures seeking the removed literal drawLabels(); terminator. They now extract drawLabels(sceneVisibility); and supply the production helper's non-W result rather than a generated preview. All original area/map/role/ward/state assertions remain. Full rerun is required; this failed run is retained.

## R12a3 post-incident earned replay and R12a4 candidate checks
Actual Normal fresh-game continuation reached L12 through Pass and Signal West, with native actions, one potion used in S,16 kills,1140XP/232G across real kills/objectives and unchanged build investment. See docs/requirements/warrior-completion-checklist.md for Library references. S receiver/report save-title-page-reload retained progress. Fragmented HUD session counters are not continuous campaign duration. Transparent wall bases and locked-next-room enemies remain readability defects.
R12a4 focused final41/41 pass (13 position-message/store cases +8 Pass +19 Signal +1 existing release-label case). Initial test adapter imported nonexistent session.js; failed28/29 raw log is retained, corrected to production save.js, no assertion removed. Full-suite result is stored separately under docs/verification-r12a4 and must be read before claiming a pass.

## Current priority update: R14 POE-oriented controls (2026-10-10)

Balance and R13 progression expansion are paused by user direction. Follow the specified full combat-controls document under docs/poe2-input and the source-confirmed vs authored distinction. R14a2 integrates explicit controls5 eight-slot assignment, independent movement/aim, contextual click approach and living actor collision, while preserving existing saves/keys until explicit selection. Immediate input start, contact timing, per-skill cancellation/repeat, fancy FX, danger visibility and flash0 need separate real-input/visual review. See docs/poe2-input/r14a2-integration.md for current contracts and unfinished acceptance. Earlier counts are historical, not this candidate's pass count.

## R14a6 isolated notice candidate (not published)
See docs/verification-r14a6/README.md and its fresh logs. Tests execute actual main.js toast, event delivery, input and frame handlers with real combat/store/safety dependencies; DOM classes, audio and rendering are probes. Scripted earned progression is test setup, not native browser or campaign acceptance. The original-code negative cases reproduce the stale recovery toast after successful held-mace action start. Focused checks are not an inherited full-suite pass; final integrated lint/build/full regression and actual candidate QA remain with the integrating task.

## R14a7 current acceptance scope
The new source is unpublished and has not run in a visible browser. `docs/verification-r14a7` holds exact test evidence and known infrastructure limits. Separate v58 normal first-entry→training→6kills→Eda report→L2 selected export is real play, while scripted actual-handler tests and synthetic timing/canvas probes are not. Collision centreline, new diagnostic display, new toast layout, actual frame costs, a5+ flashy FX and listening remain open. No aggregate historical count or AAA completion is inherited.

R14a7 final automated checkpoint:3,923/3,923 unique tests,0fail/skip/cancel,113877.982352ms; lint/build passed. Counts include prior3,853 plus70 new (32 contact,32 frame,6 integrated); overlapping focused runs are not added. Actual a7 browser/FX/frame/voice review remains unverified and no deployment occurred.

## R14a8 acceptance scope
Observed defect: public v58 R14a4, normal earned L3 profile, first-boss retry. Source/fixture checks must exercise actual main HUD/update paths, dead-input rejection and normal retry restoration. a8 browser acceptance remains unverified while candidate publication is blocked and local preview is unavailable. No a7/a8 frame-cost, physical latency or audio claim may be inferred from automated assertions.

Final R14a8 automated check: **3,940/3,940 unique tests**, 0 fail/skip/cancel, 115268.864147ms; lint and build passed. This includes the existing 3,923 plus 17 new lifecycle tests. Actual a8 browser/FX/contact/frame/audio acceptance remains unverified; no deployment occurred.


## R14a9 verification plan

Execute production HUD and menu handlers with compact/full layouts and lifecycle states; preserve pause/resume/save/failure and repeated navigation tests. Run the entire unique test suite, syntax check and static build. No browser/visual pass is claimed from these checks; published 889×562 initial focus and six-button alignment remain an explicit gate.

Final R14a9: **3,963/3,963 unique tests**,0 fail/skip/cancel,117023.812816ms; app lint and static build passed. Includes existing3,940 plus23 new. Monorepo aggregate checks are blocked by absent dependencies; actual a9 browser QA and Sites publication remain separate.


## R14a10 verification plan

Write and run production-handler regressions against untouched a9 first, then implement and run focused plus full unique tests, syntax lint and static build. Test initial focus scrolling, semantic dialog labeling, both Tab boundaries, hidden/disabled/collapsed controls, nested panels, trigger loss, Escape, capture mode and save gates. Browser visual/focus acceptance remains a separate post-publication gate; no a9 anonymous-hash retry is part of this task.

Final R14a10: **4,002/4,002 unique tests**, 0 fail/skip/cancel, 121563.5436ms; app lint and static build passed (118 files). Includes existing 3,963 plus 39 new. Local monorepo aggregate checks remain blocked by unavailable dependencies/corepack cache; exact-commit remote CI is recorded separately. Actual a10 browser QA and Sites publication remain separate.

## R14a11 verification
The new portal is covered by real reducers/controller storage, actual main input/open/interact handlers, Canvas command probes, and earned scripted routes through all ten non-town regions plus unfinished Wilderness. Source remains separate from a10. Regression harnesses were extended with real new dependencies; the controller supplies portal time only to its new commands, leaving strict existing trusted-context contracts intact. Final unique test/lint/app-build results are in docs/verification-r14a11/final-summary.json. Native browser, published-site, visual/audio and touch checks are not inferred from the automated suite. Monorepo-required registry and build commands are attempted separately, with exact dependency blockers retained.

Final R14a11: **4,081/4,081 unique tests**, 0 fail/skip/cancel, 117874.756099ms; app lint and static build passed (120 files, 16,697,398 bytes), with every built source hash verified. Includes existing4,002 plus79 new. Root registry/build commands remain blocked by absent dependencies/corepack cache. Actual native-browser QA and public Site publication remain separate.


## R14a12 integrated candidate — final automatic verification
This separate copy integrates the reviewed accepted-intent and projectile-impact patch onto frozen R14a11. New coverage consists of 41 hitstop-intent and 16 impact-direction production-handler checks, with the existing 79 portal checks and 38 legacy intent checks preserved. Original combat source with the new suites produces 28 and 12 failures respectively; patched focused tests passed before integration. The new full aggregate, lint and app build have completed successfully; exact receipts are under docs/verification-r14a12. The final total was newly executed for this candidate. Normal-input native-browser, screenshot/audio and subjective acceptance are not established; these automatic results do not imply Git or Sites publication; exact remote receipts are recorded separately.

Final R14a12: **4,138/4,138 unique tests**, 0 fail/skip/cancel, 118393.823682ms; app lint and static build passed (120 files, 16,697,741 bytes), with every built source hash verified. Includes the a11 baseline 4,081 plus 57 new (41 hitstop-intent, 16 impact-direction). The portal 79 and combat 95 focused counts are included, not added again. Actual native-browser/input/FX/audio acceptance, Git and public Site publication remain separate.

The required monorepo commands were attempted again in an independent a12 monorepo copy. Both pnpm commands are initially blocked by the missing pnpm home directory. The same npm-script fallbacks confirm missing tsx/dependencies for registry sync and an absent corepack cache/home for the Vercel build. No root registry or other-project content was edited to bypass those checks. App tests/lint/build remain the separately verified pass; root command logs are preserved in the a12 verification folder.

## R14a13 verification boundary
Final integrated tests/lint/build passed. Fresh terminal logs, production-handler reaction/audio cross-checks, 144 paired baseline gameplay/RNG comparisons and protected-file hashes are recorded under docs/verification-r14a13. Standalone audio full-test/lint runs previously ended with automatic approval review cancellation; those results are incomplete and are not retried or inherited. The final combined candidate is a new verification target. No native-browser, real listening, subjective quality, publication or Git success is implied by local automatic tests.

Final R14a13: **4,312/4,312 unique tests**,0fail/skip/cancel,122355.118341ms; lint/app-build passed (124files,16,727,884bytes),123built source hashes verified. This newly executed count is the prior4,138 suite plus174 new tests; focused subsets are not added again. Initial7 expectation failures are retained with exact corrections. No native-browser or listening, Git/remote-CI/publication, or external backup acceptance is inferred.


## R14a14 safety-stop containment — 2026-10-11

Independent copy of frozen a13. Safety-origin pauses require an explicit choice before exposing ordinary menu actions. Voluntary pause, keyboard/focus access, the >500 ms threshold, cancellation and gameplay/save/art contracts remain unchanged. This addresses incidental later clicks entering a full menu; QA did not observe an actual allocation change. The cause of observed long rAF gaps is still under investigation and this change is not a claimed rendering fix. Final verification is recorded separately in docs/verification-r14a14.

Final a14 automatic verification: 4,338/4,338 tests (4,312 prior + 26 new), zero failures/skips/cancellations; lint and build passed. Build 124 files / 16,729,021 bytes, 123 source-copy hashes verified. All rendering/audio/gameplay/timing models and 14 original assets remain byte-identical to a13. Native a14 browser acceptance and coordinated Git/archive/publication are pending.


## R14a15 diagnostic evaluation
The final regression set adds 22 unique cases: 13 observer cases and 9 extracted production-main/handler cases. The exact final cases fail 22/22 against unchanged a14 source and pass after the patch. Synthetic clocks and boundary stubs validate clock separation, bracket attribution, bounded retention, failure evidence and model/input/store parity; they are not native performance measurements. The initial main test failure arose from fixture async-save settling, function identity comparison and a nonexistent test-only router.sample call; the test harness was corrected without changing gameplay or weakening data parity.

The independent review identified invalid between-callback duration after a rejected current entry/previous backwards clock. The patch now leaves this derived duration null unless both observed callbacks have valid work clocks, with a new regression. Native stalls and their causes remain unverified in a15. Final aggregate/lint/build and preservation results are recorded in docs/verification-r14a15/final-summary.json.

Initial R14a15 aggregate 4,358/4,360 found two unchanged scene source-extraction checks whose `audio.tick` line anchor had moved into the diagnostic bracket line. Restoring the original separate audio.tick line fixed both focused checks, without changing their assertions or runtime semantics. The final aggregate runs after this format correction and the strengthened real right-click accepted-cast precondition.


## R14a16 verification
18 new unique cases cover production menu/death/dialog handlers, read-only postmortem return, background attribute lifecycle, real controller/store retry success/failure, pending retry followed by diagnostics, uncertain retry and failed/dead reload, stale setting/action rejection, and direct alive profile-load restoration. Against frozen a15, 17 defect cases fail and the normal retry-preservation case already passes; after the patch all 18 pass. The selected focused-new run includes those 18 plus two existing startup guards, for 20/20. Existing modal/death/profile boundary suite passes 135/135.

Initial boundary failures came from three legacy startup probes lacking the newly required candidate flag; the legacy dead-action fixture additionally needed a real current-modal containment boundary. These DOM/dependency probes were updated without weakening existing assertions. Initial logs remain. Independent final static review found no blocking issue; its 17-case run predates only the additional alive-profile-load invariant, not any source edit. Native AX/focus/layout and frame-stall root cause remain unverified by this worker. Final aggregate/lint/build receipts are in docs/verification-r14a16/final-summary.json.

Initial full aggregate was 4,372/4,378. Three stale-dead UI tests expected a reducer HERO_DOWN response; the new guard deliberately rejects before dispatch, so they now demand unchanged command/outcome counts as well as the prior unchanged state/revision/reward assertions. Three legacy Retry cases needed the real current-modal contains boundary. A partial-state backup probe also exposed an unsafe optional-world read; the new death guard now safely reads state?.world?.lifeDown. The six affected production-handler cases pass after those corrections. Their initial full log is retained, and final aggregate runs against all final source/test changes.

Negative-control quality follow-up: the stale-dead-action regression now asserts that the death dialog is unchanged immediately after each attempted action. Its frozen-a15 negative run fails on the first actual menu escape ("dead dialog unchanged after menu"), before any missing fixture dependency; strengthened green run passes. See red-stale-guard-strengthened.log and green-stale-guard-strengthened.log. The final whole-suite run includes this strengthened assertion.

## R14a17 integrated validation
Use docs/verification-r14a17/final-summary.json and final logs, not the arithmetic sum of worker test counts. New performance checks exercise canonical-copy trust, Proxy and malformed shape rejection, mutable in-place invalidation, result mutation, profile/save identity, all wilderness views and 12 deterministic non-consuming model/event/RNG-state pairs (combatDraws=0). Five new behavior/optimization checks fail against an isolated a15 negative control and pass after the fix. Initial focused failures were newly introduced harness omissions (rest needed healer position, reload needed canvas focus stub), fixed without changing old assertions. An initial strict patch context conflict at an a16-modified test tail was resolved by appending only the new test; the incomplete merge probe was retained as a negative log. Final aggregate/native acceptance are tracked separately.

Final R14a17: 4,433/4,433 unique tests passed, fail/skip/cancel0; lint/build exit0. Build125 files/16,743,770 bytes. Independent baseline comparison matched741 full view calls across19 earned stages and12 non-consuming model/event/RNG-state simulations of90 frames each (combatDraws=0; these do not prove consumed RNG parity). Final integrated cold benchmark including copy:168.6–182.8ms→10.6–14.7ms median; native-browser acceptance remains open.

R14a17 supplemental boundary evidence: verify-consuming-combat-parity.mjs reuses the existing close 1-HP integration target with the unchanged production combat engine at30/60/120Hz for attack/hammer. Six baseline-versus-canonical pairs matched every frame and event, each caused positive damage and one defeat, and consumed9 combat RNG draws total (attack2/hammer1 per rate). This separate synthetic engine check is not wilderness-view equality, loot RNG coverage, native play or browser acceptance. Combat/state/controller source byte preservation is independently verified. It adds no cases to the4433 aggregate because it is a separate verification script.

## R14a18 head-first normal save candidate

The normal load validates the head-selected slot first and avoids one unused alternate-slot validation when its receipt matches. All three raw reads, decoder decisions, fallback recovery, CAS, locks, readbacks, upgrade fences, busy/input atomicity and 150 ms expiry remain intact. The same immutable-freeze scene optimization and death accessibility from a17 remain. No fix to actual browser input expiry is claimed. See docs/verification-r14a18 for release-label checks and docs/verification-head-first-save for the original 4,483-test full pass, retained initial unexplained file-process failure, 50 new checks and bounded paired timings. No validation-reuse second phase is included.


## R14a18 independent recovery-feedback copy

Run production-handler regression for waiting/rejection sequence isolation, unchanged state/revision, existing notice dismissal/expiry, key repeat and status markup. Run full Node suite, syntax and app build; attempt existing registry command without installation. Native dot browser visibility, focus/AX and listening remain unverified. QA: near an enemy, RMB hammer → Q → Space → hold A+J; read the recovery notice, verify later mace start clears its own notice and its contact is observed separately, and check diagnostic rows independently. Also check blur/menu, rapid input and screen-reader announcement frequency.


## Independent queued-charge heading consistency

Add a red-to-green production combat test matrix for mace-recovery and dodge-to-charge at30/60/120Hz, v4/v5 and trackingON/OFF; assert heading, real motion, no pre-start payment, one start/contact/payment and active heading lock. Add real main keyboard handler repro for v4/v5, retaining held-mace restart. Run existing aim, queue/hitstop, mobility, held-repeat, save input/safety and full suite, lint, registry and build:vercel. Automated fixtures do not establish dot browser timing/visual/listening acceptance; coordinator owns candidate deployment.


## Input lifecycle follow-up

Use production main handlers with precise event sequences: D+J and pending Q, missing keyup followed by blur/visibility/UI focus/canvas pointercancel/menu/frame-focus; keyup from UI with modifiers; touch pointercancel versus ordinary up/lostcapture during an existing delayed commit. Report injected handlers separately from browser focus delivery. Run full suite and build; inventory next skill-motion/action-chain and three-melee-build implementation gaps without inventing unspecified build definitions.


## Current-phase action footwork

Red-to-green production-handler matrix:30/60/120Hz, controls4/5, repeated mace and mace→queued Judgement; reproduce aggregate movement with new planted windup, assert action legs rather than run and read-only render state. Verify walking hammer/heal/banner and mace/Judgement recovery gait stay available, with charge/dodge behavior unchanged. Full suite/lint/registry/build and byte preservation; native footwork/action-chain visual QA is separate and requires before/after candidate replay.


## First crusher combat-loop candidate

Execute production handlers from legal earned fixtures: direct hits/primed/heavy/wave/reset, geometry, miss/unprimed/death/movement/LOS/immunity/duplicate events, heavy timer not consumed, old armor break independent, resource/recovery constraints and classic-mode equivalence. Test actual menu selection and no profile/revision change, region carry/new-profile reset, weapon eligibility, visual marker/real-event wave probes; full suite/lint/build and original assets/save module hashes. Normal QA: train starter, earn Adept, learn Judgement, select crusher in town, prime live target with legal mace hits then aim and press current Judgement key. Native timing/visual/listening/AAA quality remain separate.


## Crusher focus-safety selection follow-up

Red-to-green real focusin then menu/selection click with no intervening frame: unlearned message and basic mode reachable, learned choice works. Preserve active finite action, actual channel-cancellation recovery debt, real delayed-save pending and stale choice guards. Run full suite, lint, registry/build and preservation hashes; native v72 rerun remains required.


## Storm staff and bell candidate

Exercise actual enemy-hit accumulation and anti-duplicate/whiff/self-bell cases; invalid placement no Combo/mana/CD spend; cap3,expiry,direct-hit throttling,perfect vs late dash,actual swept LOS/wall geometry,once-per-enemy across multiple explosions,contact/expiry competition. Actual menu focus/input/frame handler tests and staff/bell Canvas probes; full suite/lint/registry/build/hash preservation. Native loop/visual/audio quality unverified until coordinator QA.


## Magma shield defence-counter candidate

Production incoming attacks plus actual input/frames: active vs rear/passive block, stamina insufficiency, duplicate attack after invulnerability, timely/late release, fully charged spray once, secondary recursion prevention, blockers/LOS, attack/dodge cancel, menu/blur/hidden/capture loss, death/region/reload, no saved-field leak. Distinct shield rig/FX probes; full/lint/registry/build and source/original preservation. Native acceptance separate; storm QA fixes take precedence.


## Apprentice graph training UI

Assert9 nodes/5 authoritative edges, current/next/lock descriptions, read-only selection, rank/point updates via real UI purchase, stale/repeat/parallel clicks, delayed save close/back/profile guards, graph/list toggle and actual explicit eight-slot assignment. Preserve old list/card/focus checks. Full/lint/registry/build/hash and original167; native visual/AX acceptance separate. Return v75 safety measurement findings separately without relaxing >500ms guard.
