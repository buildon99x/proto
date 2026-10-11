# R11a1: bounded Expert save-input tolerance

## Observed defect and limits
Normal dot Chrome input in public v36 R11a accepted Expert promotion and purchases,
slot assignment, key remapping, reload, Banner in town and a short Onslaught hold.
In the first west-yard fight one enemy was defeated, then Expert2/3 inputs showed
the generic save/pause rejection toast and charged no resources. After returning
from the menu another2 hold also failed. That message conflated busy, pause,
blocked gate and pending safety cancellation: it does not measure store latency
or prove which condition caused the second rejection. Full B completion and
reaction-time/balance qualification are still open. See the first normal-input
QA report and externally preserved original screenshots.

## Authored policy, not a Hammerwatch/PoE measurement
- Use the existing Reborn150ms wall-clock save-input window, not the180ms
  animation-recovery buffer and not a cooldown or resource-wait queue.
- Capture one token/slot/skill plus controller, battle object, life, region,
  entire slot map and controls map. Never retarget a queued press after changes.
- A fresh competing action, including guard, movement, interaction, potion or
  another skill, replaces/cancels old pending Expert input. OS repeats do nothing.
- Held Onslaught must still be held when accepted: keyup cancels unpaid input.
  Finite Banner can survive normal keyup once; its released token is also cleared
  after delivery so the next fresh press is not swallowed.
- Pointer cancellation, modal, focus loss, hidden page, death, new battle/profile,
  assignment/control change, gate failure or age>150ms drops the intent. Automatic
  capture loss after an already-completed finite touch release is not a second
  cancellation. Mouse-only loss leaves independent keyboard input alone.
- Empty, already-requested safety cancellation drains synchronously on a new
  combat press. A live cancellation checkpoint must settle first; a newer press
  may use only the same short window and still passes all identity checks.
- Resources and cooldown are charged only by the existing action execution.
  Save failure never fabricates refund or success. Paid channel key release
  during save remains safety cancellation with no delayed Lance.
- Save waiting expires visibly with a fresh-press instruction. Holding or an OS
  repeat never extends the timer. No save payload or normal control is changed.

## Verification
The production main browser handlers, frame, real controller and store are
executed in focused tests; DOM/render/audio are boundary probes. Progression and
positions are fixtures, not human-like play. The120-test input set and218-test
broader main UI set passed before final copy/version integration; final aggregate
and actual published R11a1 results must be recorded separately. Raw intermediate
failures retained: one old reject-all expectation, then two test assertions used
an incorrect test field name (`mp` instead of actual `mana`); these were corrected
and the expired-input safety cases remain explicitly tested.

The small trainer correction displays unlearned/current/next/max-rank status
separately from the actual disabled purchase reason. It does not unlock anything.

Final focused input set129/129 passed after adding real delayed save conflict,
actual controls/slot commits, rebuilt battle, guard-toggle OSrepeat and finite
mouse/touch capture-loss cases. Independent read-only review found no blocking
issue and additionally exercised seven real-handler probes; retained production
regressions cover these boundaries. Focused sets overlap and are not summed.

Build and syntax passed;224 static local module links resolve. Required root
registry/Vercel commands were attempted again and failed at pnpm-home mkdir
ENOENT before registry/build. This is a sparse project worktree; root scripts and
launcher exist in Git but are not materialized here. The isolated static app
build is valid; the monorepo aggregate is not claimed to pass.

During pre-publication review the relocated entry still had old southeast prose
in battlefield guidance. Corrected it to the northern clearing and added a
content-to-guidance regression. The in-progress aggregate began before this text correction; its output is
retained as a pre-final run and cannot establish unchanged-final-source acceptance.
A fresh final aggregate follows the corrected source.

Final unchanged-source aggregate: **1827/1827 passed**, zero failures, skips,
cancellations or TODO,251.660s, Node24.19.0 serial runner. The pre-final run also
passed1826/1826 but began before the additional north-entry copy regression;
it is not substituted for this final run. Source/test hashes are retained.
Syntax, static build82 files plus manifest,224 import links, and original167
Gitblob/SHA256 comparisons passed. Registry/Vercel did not run beyond their
known setup failure. R11a1 corrected browser play is still pending at this
source checkpoint. Do not promote the public root from these tests alone.
