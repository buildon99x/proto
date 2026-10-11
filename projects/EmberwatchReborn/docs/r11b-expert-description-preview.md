# R11b6 Expert trainer explanation correction

Date: 2026-10-10 UTC. Base: `17b13fa04fec8336d2c08f3c4603a0d2e8d00276`.
Isolated worktree: `emberwatch-expert-description-preview`.
Branch: `fix/expert-description-preview`. No version/namespace change.

## Observed defects and scope

The integration owner reported native public-root R11b6 trainer observations:

1. Without their base skills, Protection/Zeal Banner, Zealous Lance, Flaming
   Wrath and Guilt by Association showed only “효과 정보 없음” for the next effect.
2. Inner Flame omitted its known fire-resistance increase.
3. After Inner Flame was learned, Flaming Wrath still omitted its known spell-
   critical chance bonus, showing only damage/radius/cooldown.

Root causes:

- `previewSkill` deliberately retains `runtimeValues: null` when an augment's
  parent is unlearned, or the opposing exclusive branch is owned. This correctly
  avoids inventing usable runtime effects. The same preview already contains
  the selected rank's `referenceValues`, but the trainer did not pass those to
  its text formatter.
- `effectText` did not recognize `fireResistanceBonus` or
  `spellCriticalChanceBonus`. Both already existed in real derived runtime data.

Production UI projection changed only in `main.js`: the `effectText` body and
one next-effect call inside `showTraining`. No growth, reference, combat,
resource, save, profile-selection, input or W code changed. Whole-file comparison
is identical to the base after excluding exactly these two presentation seams.

## Presentation behavior

- Unavailable Expert next projections display `참조 랭크값 · 기반 기술 필요`,
  followed by only the existing selected reference values. Their runtime values
  remain null and purchases still fail with `BASE_SKILL`.
- With the opposite Banner branch selected, the explanation instead states
  `참조 랭크값 · 반대 배타 분기 선택으로 적용 불가`; the button and purchase remain
  `EXCLUSIVE`-blocked. Tier and other training conditions remain explicit.
- The applicable missing-base scope is nine Expert augments: Cleansing Touch,
  Turn Undead, both Banner branches, Zealous Lance/Shield, Flaming Wrath,
  Punish the Wicked and Guilt by Association. The existing eight Adept missing-
  base descriptions are deliberately outside this correction's scope.
- Known numeric fields retain their source units and rank values. Lance's
  unknown physical/fire split and range, plus Wrath/Guilt's unknown radius,
  display `미확인`. They are not converted to zero or synthesized from runtime
  tuning while their base is unlearned.
- Inner Flame adds fire resistance +20/+30/+40/+50 percentage points beside its
  existing fire-damage multiplier and duration. Flaming Wrath adds spell-
  critical chance +5/+10/+15 percentage points. The runtime's .05/.10/.15 values
  are converted only for readable percentage-point text, never changed.
- Once the required base is owned, actual current/next runtime effects retain
  their existing projection, including authored split/range/radius values.
  Existing “참조 랭크표 기반 … Emberwatch 조정값” qualification remains unchanged.
  No newly verified original-game fact or unknown value is claimed.

## Executed verification

Final focused serial command from the project root:

```
node --test --test-concurrency=1 app/tests/expert-description.test.mjs app/tests/expert-main-input.test.mjs app/tests/warrior-expert-specs.test.mjs app/tests/expert-effects.test.mjs app/tests/lance-charge.test.mjs app/tests/warrior-growth.test.mjs
```

**252/252 pass =212 retained +40 new**, zero fail/skip/cancel/TODO,
20,246.617203ms, Node24.19.0. No pre-existing test changed or was removed.
`verification-expert-description/focused-tests.txt` contains the result.

The40 new tests execute the actual formatter and trainer function with minimal
DOM/checkpoint probes, real preview/purchase reducers, derived runtime stats,
quotes and eligibility. They cover all nine missing-base rows; all27 ranks of
those augments plus Inner Flame; both exclusive locks; tier, insufficient points
and max-rank guards; unchanged Adept text; immutable projections and unknown
source fields. Every available next projection is compared with the successful
purchase's actual current effect and the derived Expert runtime projection.
Probability/percentage-point conversion and Banner/Lance/Guilt mappings are
checked against the retained reference rows and existing authored calculations.

Final40 new tests against base `main.js` in a separate temporary copy produce
**20 expected failures /20 passes**, exit1. This establishes regression
sensitivity to the actual UI, not merely new helper-only tests. Output:
`verification-expert-description/pre-fix-regression.txt`.

The first new-test run passed39/40; one synthetic test directly overwrote SP and
correctly failed the existing skill-point ledger during battle construction.
The fixture was corrected to spend through real purchases until the next
Banner was unaffordable. No production validation was weakened; no assertion
was removed. The39/40 output and subsequent40/40 output are retained in
`initial-fixture-failure.txt` and `new-tests.txt`. Do not add these reruns to final
counts. Stored console logs omit trailing whitespace only.

Changed source/test syntax and staged diff whitespace pass. Comparison verifies
that all other tracked runtime/reference/original files and pre-existing tests
remain unchanged. See `verification-expert-description/source-checks.txt`.
This comparison is not a new full167-file integrity/hash run.

## Remaining ownership and evidence limits

Fixtures use synthetic Expert tier/XP and scripted purchases, not native earned
campaign play or rendered pixels. The checkpoint boundary is substituted in the
new trainer probes; retained main-input tests exercise real controller/store
paths. No browser, publication, Library, remote Git, aggregate/build or registry
operation ran in this slice. Integration owns those gates and native trainer
readability review of the corrected candidate. The original17b checkout, public
root, saved profiles and separate W worktrees were not edited by this task.

The preserved requirements trace/source-status record was consulted; canonical
plan materialization remains previously HTTP403-blocked. No retry or new
canonical-source verification was performed.
