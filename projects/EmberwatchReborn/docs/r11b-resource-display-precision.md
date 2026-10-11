# Bounded resource display precision correction

Date: 2026-10-10 UTC. Base: `ce3c39eac08b09966d13250fea3deaf3808183cf`.
Worktree: `emberwatch-resource-precision`; local branch `fix/resource-display-precision`.
No release version or namespace change belongs to this slice.

## Observation and read-only correction

The integration owner reported native R11b2 QA displaying38 MP for an actual
fractional pool below the37.5 MP payment requirement. The action correctly
rejected, but HUD ceiling and toast integer flooring disagreed with each other
and with the useful precision of the quoted cost.

`resource-display.js` now supplies shared read-only formatting:

- HP retains integer ceiling: every finite positive HP value displays at least1;
  an actual zero displays0.
- Mana/stamina truncate conservatively to at most three fractional digits, with
  trailing zeros omitted. A rounded candidate is compared with the exact input
  before use, so even the adjacent representable number below37.5 displays
  `37.499`, never37.5 or38. No epsilon is added.
- Three digits are intentional: the real Armored Grace rank2 + Zealous Shield
  Onslaught quote is7.875. A two-digit display would imply insufficient funds
  at the exact payable amount. This was found during the bounded investigation,
  and the initial two-digit draft was expanded before the final checkpoint.
- Costs preserve the full finite nonnegative quoted number. No cost is rounded
  or recomputed. Maxima retain their exact displayed number as well.
- Invalid/non-finite/negative display inputs render `?` as text. This is not a
  runtime pool sanitizer, save migration or change to validation/bar geometry.

The actual main HUD uses the shared amount/cost formatter. Ready and blocked
hotbar text and existing accessible names use exact quoted costs. The actual
frame rejection toast uses the same current-amount formatter as the HUD.
The existing unlearned/dead/status/cooldown/resource priority remains unchanged.

`actionEligibility` uses exact `mana >= manaCost` and `stamina >= staminaCost`.
Its cooldown/status tolerances do not apply to resource payment. In particular,
33.7499999999 MP still rejects33.75, and displays33.749. Runtime resource amounts,
regen, quoted prices, payment, cooldown, save, input and difficulty are untouched.

## Executed verification

Final focused serial command from the project root:

```
node --test --test-concurrency=1 app/tests/resource-display.test.mjs app/tests/action-eligibility.test.mjs app/tests/expert-main-input.test.mjs app/tests/expert-channel.test.mjs app/tests/combat-intent.test.mjs
```

Result: **219/219 passed**, **177 retained +42 new**, zero fail/skip/cancel/TODO,
11,153.362326ms on Node24.19.0. All pre-existing tests remain unchanged.
Test output: `verification-resource-precision/focused-tests-three-decimals.txt`.

New42 cases execute the actual extracted main `updateHud` and frame rejection
loop against minimal DOM/audio probes, plus production quote/eligibility/payment
handlers. Real learned quotes cover37.5 MP, actual Banner-discounted33.75 MP,
shielded Onslaught11.25 stamina and Grace-discounted7.875 stamina. Each is checked
just below/exact/above, including adjacent floats and ±1e-10, visible/aria/low-
resource state, immutable HUD reads, unchanged rejection pools/CD and exact
accepted payment. Additional cases cover actual Banner expiry, empty/full/dead,
small living HP, invalid display values and unchanged status precedence. The
single numeric-boundary test includes120,000 exact/adjacent formatting assertions;
these assertions are not counted as separate gameplay tests.

Regression sensitivity: run the final42 new tests in an isolated temporary copy
with only `main.js` and `action-feedback.js` restored from the base commit. The
new helper remains available for its direct checks. **35 fail /7 pass**, expected
exit1; this confirms the production HUD/feedback integration is exercised.
Test output: `verification-resource-precision/pre-fix-regression.txt`.

Syntax for the three changed/new source files and new test file passes; diff
whitespace passes. Combat/growth/input/save/state/balance and original Emberwatch
paths compare unchanged with the base. This is not a fresh167-file integrity
hash run. Output: `verification-resource-precision/source-checks.txt`.
The initial two-decimal draft's35-new/212-focused results and28 expected pre-fix
failures remain separately named `draft-two-decimal-*` and are superseded by the
three-decimal final run. They must not be added to final counts.
Stored console logs omit trailing whitespace only; result content is unchanged.

## Evidence limits and remaining gates

These are synthetic skill/pool fixtures and production handler probes. XP/tier,
selected pools and target-free scenes are test inputs; no native key/browser
play, earned campaign run or pixel/a11y quality acceptance is claimed.

Integration owns review/cherry-pick, final full aggregate, complete syntax/build,
registry/Vercel, original integrity, source/build Library preservation and any
candidate version/publication. None ran in this slice. No remote push occurred.
Native QA must still verify readable fractional HUD values, visible and aria
cost consistency, below-cost rejection/exact-cost availability, live Banner
expiry and unchanged status priority on the corrected published candidate.
The parent checkout, existing Sitev40 `/qa-r11/`, public root and saved profiles
were not edited or published by this task.

The preserved requirements checklist/source-status record was read. Canonical
v1.1 plan materialization remains the previously documented HTTP403 limitation;
no new transfer, reference fact or canonical hash verification is claimed.
