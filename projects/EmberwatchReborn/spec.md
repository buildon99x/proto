# Reimplementation specification — initial work surface

R2a adds the first connected browser combat slice to the tested R1 foundation. It is not the full campaign. General-input QA, visual/audio review and high-tier content remain open.

## Required boundaries
- Separate Reborn project and save namespace. Never read/migrate/overwrite the original game's save by default.
- Future normal-input QA uses explicit isolated profiles and starts fresh. No import/debug injection may masquerade as actual earned progression.
- Keep reference catalogs immutable. Functional rules with evidence, unknown details and authored tuning live in distinct provenance records.
- Stateful operations validate before mutation and return explicit failure reasons. Reward receipts and saves must survive repeated input and interrupted transitions.
- Normal runtime commands, UI handlers and deterministic model tests use the same authoritative formulas/conditions.
- Bounded transient entities, telemetry and receipts. Bound losses are disclosed; truncated observations must not be counted as complete campaign timing.
- Whole-frame kill rewards precede a single death settlement. Travel, death and resume have explicit action/projectile cancellation/resumption contracts.
- Numeric UI previews show current→next effect and truthful costs, cooldowns, branch/trainer/level blockers. Equipment comparisons cover every supported stat and truthful units.

## Increment order
R0: canonical requirement trace, verified baseline identity, evidence and archive contract.
R1: source catalog/provenance and authored tuning foundation; real save/reward/progression failures and success, no visual completion claims.
R2: original-resource rendering and ordinary controls; connected first-entry combat/quest loop with real input QA.
R3: earnedAdept equipment/crafting/exploration and first multi-floor boss route; failure/reload/roundtrip coverage.
R4: connectedExpert/Master campaign with all required Warrior behaviors and recorded earned-XP economy paths.
R5: actual first→late play and difficulty/UX/economy iteration; campaign length/depth acceptance remains open until proven.

This increment plan does not defer mandatory canonical Warrior-slice content to other classes or redefine its acceptance criteria. Detailed canonical traceability is being restored separately from accessible Library reading; full byte-identical plan materialization is blocked by HTTP403.

## Visual/audio and publication acceptance (user extension, 2026-10-09)
Warrior actions require 16–24-frame anticipation/contact/recovery, differentiated expressive skill FX, synchronized fantasy RPG sounds and impactful hit/hurt/multi-kill/explosive responses. Enemy warnings, hero and loot remain readable. Screen-shake, flash intensity and master-volume controls plus bounded concurrent sounds are required. Tests cannot substitute for visual or listening review. Use existing resources first and archive any added source art/prompts/provenance/hashes. Whole ordinary-input play and repeated review precede a separate new public GPT Site, followed by public-status/URL and published-build QA; consider mobile access/control guidance.

## Dead-save startup contract
- Loaded death presentation runs before optional Web Audio startup and never awaits audio permission or sample decoding.
- Reconstructed dead encounters bypass arrival-wait presentation. A persisted lifeDown is already settled and must not emit another heroDead settlement.
- Living loaded encounters preserve their paid resource/recovery values and arrival safety until explicit movement/offense. Retry remains an explicit, durable command; failed saves retain the existing recovery gate.

## R7 Pass and expedition boundary
The Pass uses permanent reward receipts and a saved partial rune sequence; wrong-order input clears only transient sequence progress. Mandatory rewards are990XP normal/easy or840XP hard/serious and202G, authored Emberwatch values. Accepting the quest grants no XP/resources. Candidate namespace qa-r7 may explicitly copy earlier QA progress without touching its source. The expedition ledger is a pure detached foundation; its reward intent must never be applied outside the future atomic runtime transaction.

## R7a1 interaction and goal reading
- The shared F/HUD selector retains distance and LOS. Only the Pass/quarry locked return portal may yield to its explicit, currently actionable and prerequisite-ready rope/chain within the original76-unit reach. Commands still validate state; selection cannot unlock, travel, spend or award.
- Goal detail is reachable from the HUD and pause menu. Opening uses the ordinary panel lifecycle, clears held/deferred intent and pauses battle while reading. Region north/east/south/west correspond to screen upper-right/lower-right/lower-left/upper-left; movement keys remain screen-relative.
- Completed rescue/signal/shortcut views remove action buttons and explain the next available action without repeating unmet prerequisites. Clue rereading stays non-consuming and once-only for rewards.

R7a2: do not reconstruct the objective subtree on unchanged frame updates. Update it only when rendered objective, region or control labels change, preserving focus and a pending pointer click. Runtime-handler probes execute the actual source fragment and panel function against a minimal assignment probe; they do not replace browser testing.

## R7a3 UI input ownership
- Focused button/input/select/textarea/contenteditable (including nested children) and any open modal block gameplay routing. First Enter/Space use native activation; repeats are suppressed to avoid repeated clicks. Tab/Shift+Tab remain native. Binding capture remains authoritative before these checks.
- Focus-in and UI keydown clear held/pulsed/deferred game intent; keyup always releases old held tokens. Escape exits/opens safety pause without combat. Dialog close explicitly focuses the negative-tabindex canvas; canvas pointerdown restores game focus.
- Focused hotbar buttons are UI too. Mouse/touch pointer controls still use their existing handlers. No UI activation can synthesize an extra skill or potion use; normal keyboard bindings resume from canvas.

## R8 signal-restoration candidate boundary
- S core is registered in world/state/campaign; no source-transform preview is needed. Its own guards, receipts, exact16 foes and two route flags remain authoritative.
- Orin's top quest card coexists with existing equipment supplies, purchases and inventory. Completing/reporting grants only authored once-only rewards. The next goal derives from durable S receipts before the completed Pass goal.
- Runtime dispatch synchronizes paid pools/recovery after S commands and recreates only map geometry for `signalChanged.mapChanged`, keeping active enemies and player state. Lever reset/next/chosen feedback is explicit. Object views remove completed actions; decoded information remains rereadable without reward.
- The explicit overlap-selector pair for S shortcut requires accepted+decoded and original76-unit reach/LOS. It never unlocks or travels itself. The optional shortcut does not require selected route, transmitter, receiver or report.
- `/qa-r8/` is public candidate code with its own save namespace. A visible explicit no-overwrite copy may bring a QA source from release or older candidates forward; main profiles, downgrade copy and implicit writes are rejected. No save-file import is involved.
- New map, XP, gold, materials, foe patterns and timing are authored Emberwatch adjustments. Original-rule provenance remains in reference catalogs; S numbers are not original-game measured values.

## R8a1 bounded post-play correction
Actual R8a east-route progression reached earned L12 with the exact1140XP/232G budget and retained depleted HP through save/reload. See docs/r8a-normal-input-east-qa.md. Fix town-to-S navigation wording, completed decode reward status, and the pause-menu region label when a pending travel commits. Preserve menu focus/navigation, no extra checkpoint/award, all existing profile namespaces and root R7a4. The13 new checks execute real handlers; west/death/quality review remains open. No new region or combat balance is claimed in this correction.

R8a1 normal-input west/death follow-up is recorded in docs/r8a1-normal-input-west-death-qa.md. Both approaches complete the same authored reward budget, optional-lift independence and depleted-resource persistence; role/threshold readability and deeper encounter choices remain open.

## R8a2 S readability correction
Add quiet static shape-based role signatures (double chevron / forked arrow / broad shield) and subtle body proportions only for S foes, plus inset floor marks and local wall cutaway only at actually open, seen passage tiles. Render below danger/loot/actors. No hitbox, reward, HP, input or save changes; reduced-flash remains honored. Menu/title/read-only status share one build label. Actual corrected visual QA remains required; this does not settle tactical depth.

## R8a3 observed floor contrast correction
Actual R8a2 mixed-enemy review at flash0 found static role glyphs merging with floor detail and actor shadows, although danger cones and shot lanes remained distinguishable. Preserve the existing glyph size/shapes and use a dark outer keyline plus light inner line, displaced below the foot shadow. Do not alter combat, rewards, collisions or open-passage marks. Actual corrected pixel review is required.

## R9 Furnace implementation work boundary
Connect completed Signal restoration to the authored compact Furnace plan (docs/r9-furnace-tactical-plan.md): one saved cover/channel choice, mixed5/6/6 enemies, explicit lens pickup, once-only reward receipts and physical floor/cover changes. Both side flanks remain usable. No HP/distance inflation, Expert/Master skill claim or live repeat-run acceptance. Current public root R7a4 and verified R8a3 build remain separate while this work is unverified.

## R9 save-navigation and presentation contract
- F command callbacks may refresh only the originating visible panel generation. Close, goal/menu navigation, death, title or newer panel must win over an older save completion. State/reward still commits exactly once; callbacks must not enqueue another checkpoint after dismissal. Initial F object checkpoint awaits obey the same generation guard.
- F town entry/lift is absent from render labels and interaction selection before accepted, and appears after actual acceptance. Core world/travel guards remain unchanged; hiding a marker cannot unlock a route.
- F-only low atlas masonry and open-floor bands are read-only presentations of the actual collision map. Combat warnings, actors and loot remain above them. No closed-tile path prediction or new asset provenance is claimed.

## R9a1 bounded role-readability correction
Furnace tender/nozzle/warden must share the established chaser double-chevron, ranged forked-arrow and guard shield presentation respectively, preserving Furnace body geometry and all non-F output. Existing renderer active/dead/floor-layer conditions remain authoritative. This is authored UI vocabulary, not an original-game rule.

## R10 next bounded work: Tomb and Expert handoff
Implement the design-only contract in docs/r10-tomb-expert-handoff-plan.md in small verified pieces: first19foe Tomb content/reducers, then region/save/UI integration and protected training-fee economics, then actual L15 promotion/Expert effects and a useful next battlefield. Report at Eda must not requireL15; reserve the report's existing120G inside total gold for training. All spending and death handlers must respect spendable gold. New core files alone are not live content. R9a1 normal-input cover/channel evidence remains separately preserved; public root staysR7a4 until approved promotion.

## R9a2 actual fire-footprint correction
Normal-input Trial by Fire purchase and E cast exposed that damage persisted between ticks without a persistent floor boundary. Pass live areas into the renderer and draw a quiet static friendly sector before loot/hostile warnings/actors. Match the existing range+10 center-point tolerance, angular bounds, wall LOS and actual lifetime. Flash0 retains the same boundary. No enemyHP, skilldamage, resource, duration or AI change. Ray-sampled visual edges are not a replacement collision system. Corrected ordinary-input screen review is still required.

## R9a3 observed footprint contrast refinement
Actual R9a2 flash0 casting confirmed persistent wall-clipped geometry but its thin dashed line blended into floor detail. Add a same-path static dark outer keyline plus warm inner line and modest11% floor fill. No extra pulsing, brightness or simulation changes. Preserve hostile warnings and actors above it.

## R10 Tomb readability and candidate isolation
- Only signal_tomb opts into low solid-boundary masonry, exact opened-door floor bands and the five role shapes. Fog and active/living guards apply; the geometry remains the runtime map.
- World glyphs are crescent, split beam and ember; the carried ward is a static player-foot lozenge only while the living hero carries it. Hostile telegraphs, loot and actors remain above these quiet layers even at flash0.
- Whole-to-cracked boss presentation consumes only patternPhase.cue after the combat phase is actually committed. No hitbox or sprite scaling is changed.
- /qa-r10/ has a new isolated save namespace. Copy is explicit, forward-only, source-byte-preserving, checksum validated and refuses overwrite; root/main cannot be a source. Existing namespaces preserve their byte identity.

## R10a1 progress-copy contract
Keep the Eda T status card as the single current T explanation; retain the earlier patrol reward history without appending the same current objective a second time. Describe unvisited T neutrally, completed Pass without denying implemented later regions, solved glyphs without claiming they can reset, and cleared/carried/relayed/sealed/oath/reported objects according to retained state. No mutation, cost, reward, collision, input or save changes. Title/menu share R10a1 and explain the bounded completed Normal T QA, while Expert/Master/full campaign remain incomplete.

## R11 control/capture contract
Controls v3 adds expert1/expert2. New recommended profiles use2/3; all existingv1/v2 profiles migrate to unbound auxiliary rows while preserving old keys/options. Existing absent settings remain legacy. Slots hold only distinct learned, runtime-supported Banner/Onslaught. Resolve skill identity on accepted press; hold ownership is stable, original simultaneous aliases are reference-counted, and finite pulses never repeat. Release before first delivery cancels channel intent; normal release and safety cancellation remain separate, each once. Menu/blur/remap/assignment/death/store interruption cannot revive old input. Existing E/T/Q/Mouse0 and short action buffer semantics remain.

R11 safety coordinator: retain at most one scoped cancellation per live battle/controller/life/region. During busy persistence, never advance or cancel against a stale pre-reconciliation snapshot. Once available, cancel with a non-release reason, retain exact returned events, reset physical capture, checkpoint recovery, and require fresh input. Rebuild/load discards old scoped cancellation, never paying/refunding or releasing Lance. Failed persistence keeps the existing runtime gate closed.
## R11 Expert transaction boundary
The separate promoteExpert command quotes120G and supplies an explicit controller/store revision. The queued controller compares it before reduction; pure reducers require an independent revision context. A complete retained T report/oath and earlier promotion history, L15, a living current life and Bran reach/LOS are mandatory. Debit the protected reserve once without changing XP, SP, equipment or committed depleted pools/recovery. Historical v1/v2/v3 saves are validated before in-memory v4 migration; Expert state in an old envelope remains invalid. This slice adds no Expert skill behavior.

R11 persisted actionSlots1 uses exactly expert1/expert2/null or distinct learned supported skill IDs. assignActionSlot requires displayed current-value CAS, current store revision and current life; it changes no skill rank, point, equipment, resource, cooldown, RNG or economy. Trainer and slot panels pause before awaiting checkpoint and abandon stale modal/profile owners. QuoteAction supplies live temporary costs to the HUD.
## R11 battlefield content contract
- Require retained `r10:promote:expert`, current supported Expert tier and the complete validated Tomb report history; level15 alone does not qualify.
- Both independent six-foe device yards must settle and be operated before the boss corridor opens. Boss settlement, explicit beacon recovery and Eda's final report are separate durable transitions.
- New foes explicitly declare undead tags, weapon/spell attack families and allowlisted R11 negative-status producers; earlier Tomb enemies remain unchanged.
- One-time rewards, strict revision/life/reach/LOS/resource validation, both-direction receipt relationships and retained permanent defeats apply. Re-entry rebuilds living enemies; no dungeon reset is implemented or advertised.
- Authored enemy/objective budget:1320 base killXP +900 objectiveXP,326 gold,6 iron/4 wood/4 thread/4 ember shards and2 potions. Difficulty affects only killXP. No fee, chosen build or material is mandatory.

## R11a integrated candidate boundary
Connect the accepted Expert handlers and saved action slots to the authored Beacon Battlefield B route, using actual state/controller/travel and UI handlers. Capture objective revision and modal epoch; preserve living battle objects when the second device opens only the map. Both six-foe yards, explicit beacon collection and Eda report are distinct durable steps. QA namespace qa-r11 copies earned R10 profiles only through explicit forward UI, preserving original bytes. Earlier regional completion text must acknowledge connected Expert/B content without denying it or promising Master/final/repeat completion. App/project/build/title metadata use R11a / 0.11.0-reimplementation.1. Automatic fixture settlement, normal-input play, visual quality and duration remain separate evidence.

## R11a1 input contract
A new Expert press during a durable save may wait at most150ms in wall time,
bound to its exact controller/battle/life/region/skill/slot/controls. Hold release,
new action and safety transitions cancel it; finite normal release dispatches
once. Empty safety requests drain before capturing a fresh press. Actual action
execution alone pays resources; no cooldown/resource waiting. See
`docs/r11a1-save-input-correction.md` for complete authored cancellation rules.

R11a1 Banner presentation follows the same live128-radius/LOS/lifetime boundary
with a static dark continuous casing and long warm dashes, below hostile tells.
Only the new B town entrance moves to(304,104), ordinary return to(336,160);
legacy anchors, saved positions, reach and rewards are unchanged. Both ranges
are separated from old gates. See the dedicated Banner/town correction evidence.
# R11B planned bounded calibration
Lance release scales both accepted physical/fire components by completed
channel pulses /4, capped at1; below the first paid pulse remains no Lance.
Maximum reference damage, geometry, shared critical roll, payment cadence,
cooldown and cancellation contracts stay unchanged. Store no new resumable
action fields. Show live percentage and full-power pulse threshold in preview.
B-only role changes must preserve locked windups, vulnerable finite movement,
stun/slow, outstanding recovery,13enemy IDs,2220NormalXP/326G and old-region AI.
These are authored calibration candidates, not confirmed HammerwatchII rules.

## R11B role movement contract
B-only role steps use fixed, swept radius11 legal endpoints and ordinary walk
speed, including Shackles slowdown. They never read hero input/aim/actions,
move a locked telegraph, skip recovery debt, heal or grant immunity. Each step
has a finite distance/time limit, at least six battle seconds between attempts,
and a released attack is required before another step. Boss movement requires
its first released attack and full recovery. Existing cover/map/save/objective
contracts and13foe/2220NormalXP/326G remain unchanged. Fire response is useful
only to surviving foes after exposure and locked recovery, never before E hits.

## R11b1 status feedback contract
Order the reported reason as unlearned/dead/stun/spell-silence/basic-disarm/cooldown/mana/stamina, using quoted live costs. Rejections consume nothing and do not create an action. Basic held input reports a status once and remains eligible to resume after expiry as before. The trainer explains cleansing at successful heal contact, with silence/stun preventing start. Original reference tables remain untouched.

## R11b enemy release presentation contract
- Capture the released telegraph's exact shape as a presentation-only FX snapshot.
- Line release is an open directional chevron, at most24 world units long and6
  units half-wide at projectile height. Its length never inherits attack range
  or travel range. The existing shot remains the only line attack damage carrier.
- Cone/circle release outlines use the committed center, radius and (for cones)
  facing/half-angle without generic sword-swing geometry, radius scaling or fill.
- One fading two-stroke canvas path remains visible at flash0; current hostile
  telegraphs and actors draw afterward. No glow, pulse, added particles or asset.
- Keep the existing0.25-second FX lifetime and all gameplay/state paths unchanged.

## R11b2 integration boundary
No enemy damage, AI, collision, reward, timing or save changes. Released projectile muzzle cues are at most24 world units; cone/circle release outlines match their committed shapes. Existing status feedback and saved Zeal/Protection branches remain. Late-route calculator stays documentation-only.

## Resource display precision contract
- HP retains integer ceiling so a living positive pool never reads0. MP/stamina
  amounts truncate to at most three fractional digits, with an explicit numeric
  comparison preventing floating-point rounding upward at a payment boundary.
- Costs use the exact finite nonnegative runtime quote with no display rounding.
  Current values in rejection feedback use the same formatter as the HUD.
- Unknown/non-finite/negative display inputs render `?`, never a usable numeric
  balance or cost. Formatting is read-only; it cannot repair or alter runtime
  pools, validation or eligibility. Existing explicit status priority is retained.
- Actual main HUD/hotbar/aria and rejection processing must agree just below, at
  and above37.5MP, Banner-discounted33.75MP and11.25/7.875stamina. Native readability,
  aggregate/build and archival gates remain separate from focused handler tests.

## R12 registered W boundary
Version5 owns W region/objective/tool/receipt records. Reject those records in
versions1–4 before migration; untouched old slots are read-only until an explicit
commit or candidate forward copy. W objectives require captured store revision
plus current trusted controller context and exact committed recovery/resources.
All live W reports, travel, retry and objectives retain their original epoch;
never refresh an old report token. Generic campaign settlement runs once, opens
the keeper gate after permanent approach defeats and preserves living actors.
The separate qa-r12 namespace supports explicit forward copying from qa-r11.

# R11b4 profile selection ownership
One local selection token spans copy, load and optional start. Capture the local
controller; check controller, selection and presentation ownership after each
await and before new persistence. Stale success/failure cannot replace a newer
session. Preserve every saved source profile and already-requested target write.
Current errors still render a title error. No combat/resource/XP/economy change.

## R11b5 historical save safety
- The first schema<4→4 commit requires a read-back-verified immutable raw backup.
  Failure does not overwrite existing committed slots and blocks continuation
  until explicit reload. Exact corruption/partial-stage limits are in the
  upgrade-backup contract, including already-corrupt original heads.
- One head write commits the upgrade and hides its old receipt from unchanged
  R7a4 fallback; the patched reader retains its recovery reference separately.
- Title recovery copies only to a different empty qa-* profile in the same
  namespace. The inspected backup checksum is fixed through the request.
  Existing source/latest progress and unrelated profiles are never overwritten.
- Standalone `/save-recovery/` is release-only; recognized candidate recovery
  pages use their own namespace. Unknown routes fail closed. No game loop,
  automatic load/restore, file import or network transmission runs there.
- Display the exact restoration point and limitation: later new-version
  progress is separate. A code downgrade cannot translate it to old format.
- Retain the R7a4 root plus independent recovery bundle as the immediate
  rollback publication before promoting the new root. New W stays separate.

## R11b6 recovery route normalization

Supported root aliases: `/recovery`, `/recovery.html`, `/save-recovery`, `/save-recovery/`, `/save-recovery/index`, `/save-recovery/index.html`. Supported candidate aliases: `/qa-rN/recovery` and `/qa-rN/recovery.html` only for the existing candidate allowlist N4..11. All other paths fail closed without a storage read/write. Hosting's observed `.html` redirect must preserve candidate namespace, never fall back to release.

## R12a1 dual historical checkpoint contract
- Controller load remains read-only. A first actual schema1–4 to5 commit captures
  and verifies immutable raw head/slots plus the selected receipt under the same
  profile lock before live writes. Pre-v4 keys/format/history remain unchanged.
- A v5-specific head receipt, unknown to the preserved R11 reader, fences old
  writers atomically. Existing previousCommit and upgradePreviousCommit cannot
  expose the retained older slot at that first committed boundary.
- Backup failure blocks current/queued/future commands until explicit reload.
  W report/store epochs and profile-selection owner guards remain authoritative.
- Restore is an explicit checksum-bound selection of pre-v4 or pre-v5 into an
  empty same-namespace QA profile. Head, either slot, or either sidecar makes a
  target occupied, including corrupt bytes. Candidate copies obey that check too.
- Unmodified R11 cannot open qa-r12 even after restoring a v4 payload. Historical
  R11 fence tests use known namespaces on isolated adapters; namespace rejection
  is not fence evidence. qa-r11 source bytes remain independently preserved.


## Expert preview explanation contract
- Unavailable Expert runtime projections remain null. A separate text fallback
  uses the preview's existing reference rank values, labeled as reference-only
  and requiring the base/selection conditions. Exclusive denial stays explicit.
- Known percentage bonuses carry truthful units; runtime probability .05 is a
  +5 percentage-point spell-critical bonus, not .05% or5x. Inner Flame's known
  fire-resistance bonus is shown alongside its existing fire-damage multiplier.
- Unknown source range/radius/physical-fire split remain explicitly unknown.
  Existing authored Emberwatch scope labels and all live effects remain intact.
- No preview may change skills, points, derived stats, eligibility, costs, pools,
  cooldowns, save/profile/input handlers, combat or the separate W worktree.

## R12 Wilderness scene visibility contract
Use one read-only scene snapshot of the live collision map's player-connected
floor and actual encounter gates. Accessibility does not mean aggro or current
line of sight: reachable idle actors remain visible and active hostile tells
survive a LOS break. In-W return props and canvas labels additionally require
the existing portal view's allowed result. Completed hideWhenCompleted pickups
are absent from both props and labels. Town's accepted-but-locked anchor remains.
Nonessential W landmark labels use short names, local distance and LOS, and are
suppressed during living active combat or residual hostile shots/tells. Full
interaction hint and modal copy remain unchanged. No state mutation, map opening,
AI filtering, targetability, reward, balance or storage change is permitted.

The optional scout panel explicitly labels its counter `남은 적 N/4명` before
instructing the player to finish the rescue. Keep claim gating/rewards unchanged.
## Trainer purchase view ownership
A purchase may refresh only its original visible trainer panel, controller, profile, battle, life and region. Await the checkpoint-backed final trainer render before restoring expanded groups and card-relative scroll. Restore keyboard focus only while it remains owned through both awaits; never focus a newly disabled button or revive held/deferred input. Close, newer navigation, save blocking and superseded sessions invalidate restoration.

## R12a3 input and record contract
Mace windup/contact remain planted. Only subsequent fired-action recovery segments accept normalized collision-resolved walking, retaining action object/spec/angle/cast and full recovery. Detached locomotion measurement updates actual moving/distance bookkeeping without advancing recovery footsteps or replacing the action animation. Frame walk-time keeps the existing coarse convention. Menu, dead/blur, queued skills and commit/reload retain their previous safety contracts. Public qa-r12 namespace and version5 save are unchanged. Portable JSON format1 is unchanged; the UI's displayed hash is canonical metadata+payload SHA256, not whole-file bytes. Whole-file SHA remains an archive/download verification value.

## R12a4 guidance and rejection contract
Read-only Pass/Signal projection distinguishes missing prerequisites, partial kills, ready activation, partial sequence, final activation and report. Preserve action visibility, reducer gates, exclusive route choice, unique receipts and reward amounts. Position-only checkpoint failures keep INVALID_REPORT and original save untouched; stale life, bad recovery/vitals or dead/mixed failures retain the previous generic reason. The public schema5 qa-r12 namespace and portable-v1 format are unchanged.

## Current priority update: R14 POE-oriented controls (2026-10-10)

Balance and R13 progression expansion are paused by user direction. Follow the specified full combat-controls document under docs/poe2-input and the source-confirmed vs authored distinction. R14a2 integrates explicit controls5 eight-slot assignment, independent movement/aim, contextual click approach and living actor collision, while preserving existing saves/keys until explicit selection. Immediate input start, contact timing, per-skill cancellation/repeat, fancy FX, danger visibility and flash0 need separate real-input/visual review. See docs/poe2-input/r14a2-integration.md for current contracts and unfinished acceptance. Earlier counts are historical, not this candidate's pass count.

## R14a6 recovery-notice ownership
Only recovery-too-early toasts carry a skill ID. An actual actionStarted with that skill ID dismisses the current owned notice; another skill cannot. Any newer generic toast removes that ownership. Input safety boundaries and expiry retire the owned notice. Rejected taps retain the normal 3.3-second lifetime unless a matching accepted action or safety boundary makes the notice obsolete. No scheduling, combat state, resource, cooldown, recovery, or persistence contract is changed.

## R14a7 bounded QA observability
Contact tracing and frame observation are opt-in, default OFF, memory-only and candidate-menu-only. They never change saves or simulation, expose no hidden unreachable enemy, and reset on profile/title/reload/region boundaries. Contact markers derived from geometry are explicitly inferred, engine-last-slice paths are not whole-display-frame paths, and body rings use actual ground radii. Frame rAF intervals, synchronous step/render/HUD spans, suspension/transition/bad-clock exclusions and retained last-active windows are separate from GPU, physical input and audible timing. Normal first-combat evidence motivates a compact desktop toast; message content/expiry and mobile behavior remain intact.

## R14a8 HUD lifecycle contract
Death takes priority over dodge/sprint posture and potion count/cooldown in the action surface. No dead actor may be represented as ready by those buttons or accessible labels; normal retry must remove the dead-state disabling without resetting unrelated state. This is presentation consistency, not a new invulnerability or recovery rule.


## R14a9 responsive presentation contract

Visible HUD actions determine a balanced grid from available width (88px minimum target width, 72px height, unchanged keyboard handlers). Main pause actions precede profile/statistics and optional details. Continue remains first focus; existing save, settings, leave and recovery gates are unchanged. Key help remains one button away. Actual pixels are verified separately after publication.


## R14a10 dialog focus contract

Help navigation actions appear before long guidance. Modal Tab/Shift+Tab wrap only eligible visible controls; focus follows native scrolling and cannot remain behind a visible modal. Preserve key-capture Tab assignment and Escape-to-cancel behavior. On ordinary dismissal restore the original connected usable trigger, otherwise canvas. Nested panels must not overwrite that original trigger. Keep the save-recovery gate and no-resume-on-death unchanged.

## R14a11 personal town portal
Optional saved portal state is atomic with the living resource/recovery report, current region/life, controller revision, and controller-supplied time. P is collision-safe and remappable; HUD remains available. Opening has immediate pending feedback and commits one active marker with the authored60-second deadline. Existing V/custom interaction enters only a current, nearby, visible marker. No auto-entry, consumable, combat restriction, healing, reward, door unlock, or return-to-origin endpoint. Walking keeps the marker; region travel/death clears only the marker; rest/retry/reload cannot reset the deadline. Preview ownership, duplicate/stale commands, save errors and the existing150ms input boundary must remain safe. Renderer stays below warnings/actors and supports flash0. Existing a10 focus work and separate public/save namespaces are retained. See docs/verification-r14a11.


## R14a12 hitstop intent clock and hammer heading
The single latest queued skill still requires readiness and at most .18 seconds of current recovery. Opt-in PoE controls 4/5 decrement its .18 remaining lifetime with exactly the same scaled time as recovery, and convert the expiry split to active time using that rate. With the existing .35 hitstop floor its finite maximum is .18/.35 = .5142857143 active seconds; hitstop cannot refresh the queue. Legacy retains .18 active-frame expiry. Fresh commands, guard, allowed dodge, menu/blur/life/region/rebind safety clears and execution-time resource/cooldown checks remain unchanged. Current recovery duration/contact/cost/damage are unchanged. These are Emberwatch-authored buffer rules, not PoE2 measured timings.

Hammer impact FX use the actual projectile velocity at each outward/return contact through an optional presentation-only impactAngle; zero-velocity fixtures and all other hit sources retain the current facing fallback. Do not alter hit identity, RNG order, collision, trajectory, damage, or procs. R14a11 portal semantics and state/schema/controls are byte-preserved except the public candidate label. Actual post-publication short-tap, hold/release, interruption, directional FX, danger readability and sound quality remain separate gates.

## R14a13 presentation integration contract
Enemy reaction metadata is presentation-only; dead-only attack fields are cleared without changing the existing .7-second retirement or reward timing. Directional effects follow contact vectors and independently launched hammer contacts survive allowed action cancellation. Audio ownership distinguishes cast preparation, hero movement, enemy attack and resolved hit identities; nominal charge actionContact is not its swept impact. Warrior presentation must read actual traveled distance and authoritative action elapsed/contact without writing combat state. Build labels advance together while the qa-r14 save namespace and schema remain unchanged. Integration uses separate hunks, not whole shared-file replacement. See docs/verification-r14a13 for exact final evidence and the inherited standalone-audio approval cancellation.


## R14a14 safety-stop containment — 2026-10-11

Independent copy of frozen a13. Safety-origin pauses require an explicit choice before exposing ordinary menu actions. Voluntary pause, keyboard/focus access, the >500 ms threshold, cancellation and gameplay/save/art contracts remain unchanged. This addresses incidental later clicks entering a full menu; QA did not observe an actual allocation change. The cause of observed long rAF gaps is still under investigation and this change is not a claimed rendering fix. Final verification is recorded separately in docs/verification-r14a14.

Final a14 automatic verification: 4,338/4,338 tests (4,312 prior + 26 new), zero failures/skips/cancellations; lint and build passed. Build 124 files / 16,729,021 bytes, 123 source-copy hashes verified. All rendering/audio/gameplay/timing models and 14 original assets remain byte-identical to a13. Native a14 browser acceptance and coordinated Git/archive/publication are pending.


## R14a15 long-gap diagnosis contract
- Keep normal-frame observer's historical >=500ms exclusion separate from the unchanged runtime strict >500ms guard. New incident retention is strict >500ms in observed rAF interval or runtime reference interval. A rAF gap may be observed while already paused; do not call every gap an actual safety pause.
- Capture previous/current rAF timestamps and the runtime last reference independently, because closePanel resets runtime last to performance.now(). Capture the actual callback safety branch and entry hidden/focused/visibility state plus focus-event epoch. No profile, URLs, input tokens or arbitrary context strings enter the records.
- Capture callback entry before frame context/preparation, end immediately before observer bookkeeping and rAF scheduling. Preserve previous completed callback and current callback costs separately. Null/invalid phases and failed or invalid-clock frames must not become zero costs. Derived between-callback elapsed is null unless both callback clocks are valid.
- New disjoint phases: safety flush/queued dispatch, sampled input/aim, event delivery including audio requests/synchronous save entry, scene visibility/objects/contact preparation, audio.tick. Existing step/render/HUD brackets remain. Other equals valid observed total minus valid nonoverlapping phases. Async save continuations, other event handlers, browser scheduling, GC attribution, compositor/GPU and speaker output are not separately measured.
- Memory bound: existing 240-frame active tail/all-context default ring plus a separate 12-pair incident ring and one previous completed callback. Expose last six incidents on explicit panel open/refresh; no automatic UI refresh, JSON serialization, DOM/canvas readback, unbounded logging or telemetry in frame recording. Manual clear/OFF/profile/travel/reload retain existing reset boundaries.
- Existing safety dialog still owns all input. New QA refresh is candidate-only and cannot bypass the safety dialog's explicit full-menu acknowledgement. No gameplay timing/input/AI/FX/audio/render/save model changes.


## R14a16 modal background and postmortem observation
- Menu button rejects all open-dialog background activation and any lifeDown, battle.dead or live HP <= 0 marker. showMenu independently rejects those death markers. Death click handling permits only currently contained Retry, Reload and read-only diagnostic refresh/back controls; change events cannot mutate settings while dead.
- panel remembers its opener before focus transfer, focuses the dialog, then saves and applies HUD/canvas inert and aria-hidden. Nested panels must not overwrite the original snapshot. A valid close removes blockers before restoring opener/canvas focus. Direct alive profile-load also releases blockers; blocked/dead resume retains them.
- Existing toast notices are mirrored into a modal-owned polite status region, because hidden/inert HUD notices are not accessible. This includes Retry failure while diagnostics are open and Reload failure. Save failure classifications and transactions are unchanged.
- Candidate death UI adds frame-record access only if observation was already ON. The view is read-only: refresh and back-to-death only, no recording toggle/clear/menu/leave/resume. Reading changes no saved state, revision, death count, inventory, gold or life. Normal retry retains its existing rebuild/reset and increments life only after successful commit.
- frame-observation.js, frame loop, scene/input/combat/render/audio and save/death/retry models remain byte-identical to a15. No new durable format, telemetry or death bypass. DOM tests do not prove native AX or screen-reader acceptance.

## R14a17 canonical scene validation cache
- Main installs a detached, deeply frozen descriptor-only plain copy after each successful dispatch, profile load or reload. The controller API and saved JSON stay mutable/unchanged for their callers.
- Private canonical-copy provenance, not Object.isFrozen alone, authorizes memo eligibility. External frozen objects and Proxies are uncached; failed/mutable/noncanonical inputs execute the original validators each call.
- Wilderness ancestry and progress validator bodies are unchanged. A first canonical read executes them normally; only subsequent same-root reads reuse immutable internal results. Returned validation objects are fresh copies, preventing caller mutation of future decisions.
- Main wilderness view caching has the same provenance boundary. In-place changes to arbitrary mutable test/external states cannot reuse stale views. New save/profile identities cannot collide on objective revision.
- Frame loop, strict >500ms safety, diagnostics, input policies, renderer/audio/models and save validation are unchanged. The a16 death/AX features remain integrated.

## R14a18 head-first normal save candidate

The normal load validates the head-selected slot first and avoids one unused alternate-slot validation when its receipt matches. All three raw reads, decoder decisions, fallback recovery, CAS, locks, readbacks, upgrade fences, busy/input atomicity and 150 ms expiry remain intact. The same immutable-freeze scene optimization and death accessibility from a17 remain. No fix to actual browser input expiry is claimed. See docs/verification-r14a18 for release-label checks and docs/verification-head-first-save for the original 4,483-test full pass, retained initial unexplained file-process failure, 50 new checks and bounded paired timings. No validation-reuse second phase is included.


## R14a18 independent recovery-feedback copy

Presentation only: existing recovery-too-early toast says “후딜 중 · 동작이 끝나기 직전에 다시 누르세요.”. Retain matching-skill start, safety dismissal, 3.3-second lifetime and status region. Existing same-sequence save-wait condition displays “저장·안전 처리 대기 상태 관측 · 대기 시간 미측정”; explain that waiting observations and input-link termination reasons are separate. No new persisted fields or rule changes.


## Independent queued-charge heading consistency

The selected existing chargeDirection setting must resolve queued shield-charge headings the same way as immediate starts. A pending movement-directed charge uses the latest finite chargeAngle supplied by the production router; cursor/default and no-last-movement fallback remain existing live cursor behavior. Once shield-charge starts, heading is locked by its unchanged skill policy. Preserve .18-second recovery acceptance, recovery-clock TTL with .35 hitstop floor, 150ms save tolerance, fresh-input safety, costs/CD/contact/travel and all saves.


## Input lifecycle follow-up

Explicit pointercancel is a safety boundary for combat buttons, including non-channel v4/v5 skills. It must clear base-router pending pulses, held movement and existing battle skillIntent; normal pointerup/lostcapture must retain established finite-tap behavior. Other blur, hidden, editable focus, menu and frame-focus paths are verified without speculative timeouts or modifier-trigger cancellation.


## Current-phase action footwork

Presentation only: distance-driven running legs require actor.moving and a positive existing skillMovementFactor for the CURRENT action. Guard/no action keeps existing locomotion; charge/Onslaught keep their authored poses. The aggregate p.moving flag, collision-resolved walk counter and all gameplay phase/timing/aim/cost data remain unchanged. No blanket skill movement stop or new animation lock.


## First crusher combat-loop candidate

New explicit candidate config: valid primary mace hit=1 buildup unit;2 units=Primed. This is a hit-count prototype, not verified PoE2 damage-scaled stun/rarity thresholds; no hidden timer consumption. Heavy duration reuses WARRIOR_BALANCE.charge.stunSeconds; strike timing/cost/CD/damage and wave damage/radius use existing Judgement values. One valid live/in-range/LOS chosen target at contact; no payoff for missing/unready/immune/dead target or an already-heavy-stunned actor. One cast may produce one wave with nonrecursive secondary packets; primary not hit twice by wave. Death/heavy-expiry/region reset clears ephemeral state. No saved build field or writer change.


## Crusher focus-safety selection follow-up

Only crusher menu and choice routes drain existing action safety before reading idle conditions. Owner/life/region, busy/blocked, active action and recovery checks remain; no simulation time advancement, direct pending reset, saved field or writer changes.


## Storm staff and bell candidate

Use a separate Combo counter, not p.combo or Power Charges. Authored tests: four valid swing casts per bell,12-second life,two contacts at existing mace contact and twice that contact,.18-second post-second-contact charge-start window. Source0.5: active bell cap3,.3-second wave interval,perfect dash explosion,once-per-enemy-per-dash. Damage/cost/CD/range/charge movement reuse current quotes. Empty mainhand + existing learned actions + explicit PoE controls permit a runtime training staff; real staff gear/2H writer changes excluded.


## Magma shield defence-counter candidate

Authored charge3s and block-to-release0.18s window. No Block Chance buff/Endurance Charge/Tower Shield Daze. Existing active block cost/reduction, mace Bash quote, charge stun, hammer fire spray value and mace cone reused. Same incoming attack ID handled once in this selected mode; passive/rear/unknown/non-root blocks do not arm payoffs. Normal held-shield release consumes one token; other input/safety/death/region clears it. Stored shield mode/charge fields prohibited.


## Apprentice graph training UI

Read-only graph projection of WARRIOR_REFERENCE and previewSkill; node selection does not buy. Dedicated purchase carries UI epoch/rank and reuses purchaseTrainingSkill/purchaseSkill. Native buttons support keyboard/mouse; existing repeat-key and double-click suppression remains. Eight-slot conversion/assignment uses existing controls5/revision/life API. Other tiers remain existing lists; Master stays unimplemented. Safety threshold, dt clamp and frame observer unchanged.


## Full implemented skill graph

Graph defaults to all40 nodes; apprentice/adept/expert filters project existing metadata. Hidden bases remain named requirements, never fabricated edges. Locked nodes stay selectable; only the authoritative preview enables purchase. Exclusive alternatives are labelled and drawn separately from dependencies. Preserve keyboard focus, both scroll axes and stale purchase tickets. No save/writer/respec/balance/frame-safety changes.


## Read-only timing feedback and Master gate audit

Read current magma token remaining and storm lastTimedContact/time using existing rule constants/predicate. Draw a steady shrinking line and instruction near the hero only while alive, unpaused and in the relevant selected mode. No timers/events/queues/state writes, numeric combat changes or guaranteed eligibility claim. Safety dialog explicitly requests release and fresh press after resume. Master purchase/validation/tier/slots remain untouched.


## Crusher ground feedback integration

Read only existing crusherShockwave ring records. Keep visible outer boundary at actual damage radius from first contact; interior fracture lines/rings are decorative, not delayed hit propagation. Same0.3s lifetime and all cast/target/wave/audio/save contracts. Honor flashScale0/reduced options. No new assets, skill ranks, weapon schemas or a19 writer work.


## Cloud crusher contrast follow-up — 2026-10-13
Each existing ground contour and decorative fracture receives a dark outer stroke then its existing inner stroke on identical geometry and alpha. Reduced/zero-flash retains one static true-radius path with two contrast strokes, without decorative paths. No new hit, lifetime, sound, save field, item or rank. Ordinary UI is the only progression/equipment path used in QA; a19 protected changes remain blocked.


## Read-only input observations initial focus — 2026-10-13
After the existing input-observation panel renders, focus its already focusable dialog container with preventScroll and start its scroll at0. Do not override the protected save-error panel when the runtime gate is blocked. Tab still reaches Back, Escape/return behavior remains owned by the existing dialog system, and no serialized or observation field changes.

## Crusher floor-layer contract — 2026-10-14
Consume the same real crusherShockwave ring exactly once beneath loot, hostile telegraphs/ground hazards and living sprites. Preserve project coordinates, true radius,0.3s life, contrast strokes and reduced/zero-flash behavior. Do not replay it in the airborne/general effect pass; expired confirmed records must not become generic rings. Other effects retain existing order. No runtime/payment/AI/save change or new assets.
