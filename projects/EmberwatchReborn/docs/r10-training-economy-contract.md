# R10 protected training-gold integration contract

Authored Emberwatch policy, implementing §5 of `r10-tomb-expert-handoff-plan.md`.
This economic slice is not evidence of browser play, an earned Expert promotion,
Expert skill effects, a published build, or completed campaign progression.

## Ownership and validation boundaries

- `training-economy.js` checks only a plain optional reservation record with the
  single safe nonnegative integer `expert`, bounded by safe nonnegative `gold`.
  An absent record represents untouched pre-T state; malformed present records
  fail closed. No invalid value defaults to zero and no amount is reconstructed.
- T validation owns the semantic relationship: acceptance initializes `{expert:0}`;
  report grants its existing 120G and reserves exactly 120 in the same transition;
  reported Adept retains 120; actual Expert promotion leaves exactly zero.
  Report/commission/promotion receipt relationships must be checked both ways.
- Promotion owns the atomic 120G debit, lifetime spent ledger, reservation clear,
  Expert tier and fixed promotion receipt. Economy helpers never grant promotion.
- Global state/load validation must reject nonzero reservation data without the matching
  supported progression, including forged or partial T records. This helper alone
  does not make such a save legal. Untouched pre-T saves retain absent fields.

## Runtime behavior

All supported item purchases, recipes and enhancements use the same spendable
balance in their real quote and mutation path. Sales add ordinary spendable
income, keeping the protected allocation unchanged. Consumable use currently
spends potion inventory, not gold; no paid potion vendor, repair or respec exists.
Future gold consumers must check `trainingGoldBalances` and fail if it fails.
The UI integration must show total, spendable and reserved amounts before buying.

Death settles all current-frame kills first, then charges
`floor(spendableGold * 0.05)` once. Retry and later deaths never remove protected
funds. Pre-T state uses its complete gold balance, preserving the existing rule.
Malformed reservation must block before campaign cloning can hide invalid data.

`trainingGoldBalances(state)` returns `{ok:true,totalGold,reservedGold,spendableGold}`
or an `INVALID_TRAINING_GOLD` failure. `validateTrainingGold(state)` returns only
`{ok:true}` or that failure. Neither function mutates its input.

## Verified economic slice — 2026-10-10 UTC

- The new `training-economy.test.mjs` executes **79/79 passing** checks against
  production helpers, quotes, equipment runtime and campaign handlers. Coverage
  includes all eight shop items, all three recipes and both upgrade ranks at
  below/exact/excess spendable balances; successful command replay; malformed
  records/getters; sale; all free equipment command kinds; potion/rest; protected
  and legacy death; same-frame and later kill/death ordering; repeated retry;
  active-T travel token changes and overflow failure. Balance/progress fixtures
  here are explicitly synthetic, not globally earned T saves or gameplay.
- All **919 existing tracked tests were rerun and passed**, with zero failures or
  skips (28.9 seconds). The narrower existing equipment-model/equipment-runtime/
  campaign-combat selection also passed 80/80. No prior test was removed.
- `training-economy-tomb.test.mjs` adds 13 production global-reducer/save cases
  using the command-earned scripted T route. Syntax passed. Its representative
  L14/zero-gold report test currently stops at `acceptTombQuest: UNKNOWN_COMMAND`
  because state/world registration is still owned by the parent integration.
  These 13 are **pending**, not counted as passing. Do not install a test-only
  registration/loader or weaken the checks to obtain a pass.
- `pnpm sync:registry` was attempted and failed with the recovered environment's
  `ENOENT /home/agent/.local/share/pnpm`; no installation workaround or registry
  output is claimed. No browser, publication, Library or Git remote action ran.
- The integration owner still owns total/spendable/reserved UI, global semantic
  validation, actual Expert promotion, final-source full tests/build and release.

Successful campaign travel now routes `tomb_*` portal gates through the T
validator and calls `invalidateTombInput` on the candidate clone before commit.
Failure/overflow discards that clone; the source state and paid resources stay
unchanged. Untouched pre-T travel never invents a reservation or T revision.
