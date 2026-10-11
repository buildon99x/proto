# R11b5 / Site v43: explicit upgrade recovery QA

2026-10-10 09:36–09:46 UTC, dot Chrome, normal visible controls only. No file import, localStorage injection, fixture XP/HP, or imported user save. Source ce07c12a91c8dd27806c9c120cec302035e041ab; Site source 0f5ee7fdde3e71dd38d24a432cc711f64e488170. Public root stayed R7a4. Candidate was `/qa-r11/`.

## Automatic evidence

Full 2116/2116, unchanged old tests retained. Preserved actual R7a4 modules passed 32 compatibility/fence conditions, including first-upgrade old-reader write prevention and explicit copied-profile reading. These are controlled storage fixtures, not observed browser quota/corruption events. The frozen original module hashes are recorded in app/tests/fixtures/r7a4. Registry/Vercel checks remain environment-blocked by missing pnpm, not passed.

## Normal-input observations

- On the old live root, made new `qa-r11b5-rollback-seed-20261010`: moved normally, talked to Brann, accepted free four-skill training, saved and quit. Level1, 0XP/100, 0G, 0SP, 55HP,40MP,45stamina,2potions, no kills/deaths. It is a new earned root QA checkpoint for later rollback validation; the ordinary main profile was untouched.
- In candidate R11b5, copied preserved release QA `qa-r2-live-20261009` to a previously empty `qa-r11b5-backup-l4-20261010` using the explicit candidate UI. Level4 XP42/250,124G,8SP,36/76HP,46MP,57stamina,25kills/1death and legacy E/Z/1/J labels were preserved. Saved through the menu and returned to title.
- Visible backup inspection showed namespace qa-r11, schema3→4, original record1, level4 XP42, timestamp 2026-10-10T09:44:15.151Z. This is the candidate's copied pre-upgrade checkpoint, not the release profile's original revision number.
- Restoring to the source name was rejected. Explicit copy to empty `qa-r11b5-restored-l4-20261010` succeeded. Repeating it to the now-existing target was rejected, retaining the typed name and immutable backup timestamp.
- Explicitly continued the restored profile: same L4 XP/currency/HP/MP/stamina/counters and legacy key labels. Equipment inventory showed +0 mace, +1 shield, +0 hood, iron3/wood0/thread3,2potions; no free healing or currency changes. Saved and reloaded, then separately continued original candidate: its state was also intact.
- `/save-recovery/` showed release namespace, no game/canvas. Asking for the same candidate-only profile name correctly showed no release backup. No automatic restore or cross-space copying was observed.

## Discovered and pending

Hosting canonically redirects `/qa-r11/recovery.html` to `/qa-r11/recovery`. The R11b5 strict path allowlist rejected the extensionless route safely, so candidate standalone recovery was unavailable. The main game's explicit backup UI and independent release recovery page worked. R11b6 narrowly adds exact extensionless aliases with the same namespace and unknown-path rejection tests; this must be rechecked after publication.

Native storage quota failure, malformed/torn writes, old-tab concurrent writing, and all Expert skills are not claimed as actual play observations. R11b5 adds no combat balancing. Root promotion remains held pending corrected independent recovery QA and a preserved rollback-capable old-root version.

Evidence images/text are archived separately. Local browser QA tab43 was closed after safe save. No browser data was uploaded in source/build archives.
