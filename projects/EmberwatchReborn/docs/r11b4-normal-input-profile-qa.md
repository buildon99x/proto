# R11b4 published profile regression

2026-10-10, 09:08–09:12 UTC. Dot Chrome, public `/qa-r11/`, Site v42,
app R11b4 / 0.11.0-reimplementation.7. Executable source
`a2ef667ff7f636b11a1471ade412e7128737ee60`; Sites source
`a8df609a4b8c6a9b6c07194867bd828442aa4dab`.
The basic public root remains R7a4. This is a reimplementation, not recovered lost source.

## Ordinary-input observations

- Existing earned `qa-r11b1-zeal-20261010` opened as Expert L18: 1468 G,
  XP 725.5/900, 16 SP, HP181/184, MP67.348/98, stamina104/104,
  6 potions, Banner12.9s. Menu identity, 129 kills/8 deaths, attributes
  18/5/12, 50 unused attribute points and flash0 persisted. No battle was run.
- After six active town seconds before pausing, MP was96.313 and Banner6.4s.
  This is ordinary regeneration/cooldown elapsed time, not exact-byte equivalence.
- New `qa-r11b4-fresh-20261010` started untrained at L1, 0G/XP/SP/potions,
  55HP/40MP/45stamina. Save-to-title, actual browser reload, and Continue
  restored that untrained state. Normal W movement and F interaction reached Brann.
- The visible free-training button unlocked four rank1 skills and 2 potions.
  The next objective changed to Eda. Browser reload without clicking manual save
  restored trained skills and exactly2 potions. No XP, gold or ability was injected.
- Root QA `qa-r2-live-20261009` was explicitly copied with the title UI to
  new `qa-r11b4-l4-20261010`. Observed L4,124G,36/76HP,46MP,57stamina,
  XP42/250,8SP,25kills/1death and 2 potions. E interaction, Z hammer, 1 potion
  survived. Gear screen showed mace+0, shield+1, hood+0, iron3/wood0/thread3.
- Previous R5 QA `qa-r5a-adept-20261009` was explicitly copied to
  new `qa-r11b4-l6-20261010`. Observed Adept L6,295G,XP25.5/340,5SP,
  84HP,MP32.649/59,stamina63,1potion,37kills/1death,STR2/INT2 and21unused points.
  Warmth11.8s remained active; Condemnation37.5MP was visibly unavailable.
  Save/title/reload/Continue preserved the state, with MP33.926 and cooldown11.6s
  after the small real active interval. The old source was not loaded for gameplay
  or overwritten. Exact source-byte preservation is an automated-store claim.
- Repeating copy into that existing candidate was rejected with the visible
  no-overwrite message. The title reset name/source selectors to defaults; this is
  a minor existing usability follow-up, not data loss. QA explicitly reselected
  the intended profile after this message.
- Finally the original earned L18 candidate was loaded again. Identity,
  1468G/725.5XP/16SP/6potions/129kills/8deaths/181HP and specialist slots remained.
  MP96.985 and Banner6.2s reflected only active time since its preceding save.
  Saved to title and closed only the owned QA tab41 at09:12 UTC.

## Limits and incidental observations

The asynchronous ownership defect is tested by22 automatic real-handler/store
checks with delayed responses/WebLocks. No browser latency or save mutation was
injected to manufacture the race. These ordinary UI checks validate normal
first-entry/copy/reload/profile selection, not a forced live race reproduction.

Equipment Back closes its panel to gameplay, not to the earlier menu; the QA
sequence mistakenly tried the old menu button, got no-match, then read the actual
DOM and reopened Escape. No game-state fault resulted. A first screenshot save
target directory was missing; the captured bytes were subsequently saved in the
dedicated QA folder. Neither event is counted as a game defect.

Console sampled errors were browser-extension metadata messages at
`chrome-extension://…/content-script.bundle.js`, not a demonstrated game error.
The sample limit does not prove absence of every possible console warning.

Current full automated source suite2044/2044 and unchanged original167-file
integrity remain the build evidence. No new content, combat acceptance, audio
listening, mobile pass, Master or complete campaign claim is made here. Expert
Guilt/Protection/Wrath/Lance/InnerFlame isolated effect gaps remain open.

QA files are named `r11b4-*`; JPEGs retain their real encoding and text snapshots
record the visible menu state. Source/build and this QA are separately versioned
Library checkpoints; local development-branch fast-forward is not a GitHub push.
