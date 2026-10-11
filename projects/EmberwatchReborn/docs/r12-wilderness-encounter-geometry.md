# W town access and keeper contract

## Scoped brief and specification

This is authored Emberwatch candidate content, not recovered Hammerwatch II
geometry, enemy data or measured balance. Preserve every legacy town target,
the town floor, all W rewards and enemy health. Repair only W-owned town
endpoints and define a separate keeper encounter using existing combat fields.
Shared campaign/save/controller registration belongs to the integration owner.

The two W arches must have separate 76-unit interaction circles, legal
radius-11 traversal and physical base endpoints, and nonoverlapping projected
atlas bounds with old portals, NPCs and seeded landmarks. Every existing target
must retain its center and inner 48-unit nearest-selection zone. Complete
separation from every existing 76-unit circle is not feasible in the unchanged
town; the anchor's remaining outer-circle overlap must be stated and tested.

The keeper uses a predictable locked fire-line, then radial close-range burst.
The line invites a lateral dodge; the burst requires distance rather than
circling behind the old B cone. Full windup and recovery remain vulnerable.
No new phase immunity, HP padding, lateral-step policy or extra route distance
is introduced. The existing generic fire-survivor response is retained.

## Focused evaluation plan

Execute real registered `createBattle`/`stepBattle`, radius-11 collision and
`selectInteractionTarget`. Cover locked/unlocked W visibility, legacy center
and inner-zone targeting, continuous movement, projected sprites/labels,
committed line and circle warnings, delayed line damage, radial hit/miss,
recovery vulnerability and stun/suppression. Keep prior W cases and update
only superseded detached-registration/keeper-copy assertions.

Scripted handler fixtures are not ordinary-input play, native pixels, tactical
quality, clear time, save/controller acceptance, aggregate or build evidence.
Normal/Hard invested/lower-investment play and native screen acceptance remain
open. No browser, import, publication, remote write or full suite is in scope.

## Implemented town geometry

- Entry `(80,168)`, anchor `(240,208)`. The centers are 164.924 world units
  apart, leaving 12.924 units between their 76-unit interaction circles.
- Entry-to-old-Pass distance is 155.332 units. Its whole reachable interaction
  circle remains exclusive. The old Pass stays at `(112,320)`; the seeded
  statue stays at `(80,80)`. No old portal, NPC, spawn, object or tile moves.
- Anchor-to-Bran, healer and B entry distances are respectively 118.697,
  117.745 and 122.115 units. These three outer interaction-circle overlaps
  remain. The nearest selector resolves them by actual distance and stable
  candidate-order ties, both before and after unlocking the anchor. Every old
  center and inner-48 sample keeps exactly its pre-W target. This does not
  claim that the old full-76 circles remain exclusive after W acceptance.
- The actual atlas uses a 110-unit-wide arch at zoom 1.26, hence 138.6 screen
  pixels. Atlas anchor and height, NPC statues, the seeded statue/pillar and
  all legacy arches are included in the projected bounds checks. The inverse
  projection of both arch base endpoints retains radius-11 floor clearance.
  Rendered props remain non-colliding; this does not invent an arch collider.
- Only W town labels shorten: `신호 황야 입구` and `황야 닻다리`. Their actual
  bundled WOFF advances at 12px are 71.616px and 57.888px, inside the existing
  120px background. New label and arch bounds do not cover legacy targets or
  each other. Native font fallback, camera/HUD occlusion and pixels remain open.
- W is hidden before acceptance. Acceptance reveals the entry and still-locked
  anchor; the anchor's own center selects it and truthfully rejects travel until
  the real anchor operation. Unlocking never changes geometry or nearest rules.
- Only W's paired return arrivals move with their endpoints: ordinary return
  lands at `(80,208)`, anchor return at `(240,248)`, each 40 units south of its
  own town arch. Immediate F therefore re-enters the same route, rather than
  sending an anchor return back to the southern foyer. The boss's Eda return
  and all older arrivals remain unchanged. Real main F/report/travel handlers
  check repeated two-way routing without resource or reward changes.

## Explicit keeper numerical provenance

All values below are **authored Emberwatch candidate values**. The keeper is
now explicitly declared rather than spread from B. HP 200, armor 6, speed 42,
Expert tier, living tag, boss classification, broken-ring signature and reward
280XP/40G are retained. Generic fire-survivor escape remains enabled. Neither
B lateral movement nor phase immunity is enabled. No shared combat hook changed.

| Pattern, repeated in this order | Geometry and payload | Windup / recovery |
|---|---|---|
| W fire line | Start range 240; warning width 18; projectile speed 200, travel 320; fire 13, spell family, existing 3-second `r11_burn` | 1.15s / 0.9s |
| W radial signal burst | Start range 72; circle radius 72; physical 12, weapon family, no extra status | 1.2s / 1.65s |

The line has a narrower/shorter lane than B and a shorter recovery before the
radial decision. The burst replaces B's 100-range wide forward cone: a flank
inside the circle is still in danger, while any clear radial exit is viable.
The unchanged engine's center-to-hero contact tolerance is radius+8; the test's
96-unit retreat points all clear that tolerance within the actual keeper room.
Aim/origin/shape lock at windup. Both tell and recovery remain damageable and
stunnable. Silence interrupts the spell line, disarm interrupts the weapon burst.
The primary fire damage/range/timing fields mirror the first actual pattern.

Difficulty multipliers remain the existing cached reference, not new tuning:

| Difficulty | Keeper HP | Raw line hit | Raw burst hit |
|---|---:|---:|---:|
| Easy | 132 | 8.58 | 7.92 |
| Normal | 200 | 13 | 12 |
| Hard | 250 | 16.25 | 15 |
| Serious | 300 | 26 | 24 |

Raw damage is before existing armor, resistance, active/passive blocking and
invulnerability; burn remains the existing shared status rule. The focused
checks construct real Normal and Hard W battles; this table does not claim four
ordinary-input completions. Earlier non-keeper W roles still explicitly reuse
their unchanged B HP/patterns without its region-gated footwork.

## Known quality risk and mandatory comparison

The integration owner reports the legally earned native v40 L18 build with
18 Strength, 12 Intelligence, +1 mace/shield, invested Sundered Hammer and
Returning Hammer 1 dealt 143+150 to the 200HP B boss. That is legitimate outgoing
and returning damage, not a duplicate-hit bug. W keeps 200HP, so this new pattern
contract alone cannot establish a useful surviving tactical cycle or fix density.

Compare W using that same earned Returning-1 profile and a lower-investment legal
build on Normal/Hard, including line commitment, radial retreat, interruption,
recovery punish and the five required mixed groups. A fast legal clear must not
be hidden with added HP, forced immunity, walking or a mandatory skill/build.
Geometry/data/handler checks establish executable rules only; tactical usefulness,
fair pressure, native readability, pacing and whole-route depth remain unverified.

## Verification record

The initial serial run passed 23/26 in 28.968 seconds. Its three failures were
new fixture assumptions, retained in `verification-r12-wilderness-encounter/`:
the earned passive shield can fully block a valid circle hit, the base mace has
no stamina cost, and the base charge stuns with zero damage. Assertions were
corrected to those actual shared contracts without changing runtime behavior.

All prior W geometry cases remain. Exactly two old assertions change: registered
W now resolves instead of returning null; only the keeper's formerly identical
B patterns are now required to differ and cycle line/circle. The unchanged HP
and absence of B footwork assertions still apply to every W role. New all-stage
gating checks also examine every inactive W foe from acceptance through evidence,
not only the formerly reproduced pre-choice relay.

Final focused result: **29/29 pass**, 0 fail/cancel/skip/TODO, 30.757936186 seconds
serial. This comprises all nine retained W geometry/presentation cases and twenty
new town/keeper cases. Source and test syntax and scoped diff-whitespace checks
pass. The final log is `verification-r12-wilderness-encounter/final-focused.tap`;
the initial failed output is `initial-focused.txt` (blank trailing whitespace
only normalized). The all-stage test covers acceptance, entry, survey, anchor,
calibration, choice, relay route, approach clear, boss clear and evidence pickup.
It uses the registered map at each stage, floods reachable radius-11 tile centers,
checks every inactive foe's path and LOS, and verifies each active position joins
the reachable floor. Paired main-F roundtrips preserve exact pools/recovery and
XP/gold/receipts across repeated returns.

No shared combat handler, legacy content, original resources or reference table
was changed by this slice. Full aggregate, registry/build, production storage
fault coverage, ordinary-input/native qualification and external preservation
are integration-owner gates, not inherited passes from these focused checks.
