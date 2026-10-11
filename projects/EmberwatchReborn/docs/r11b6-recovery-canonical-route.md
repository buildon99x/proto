# R11b6 exact recovery-address aliases

## Cause and bounded repair

R11b5 native QA observed public hosting redirect `/qa-r11/recovery.html` to `/qa-r11/recovery`. The latter failed the extension-specific allowlist, so it refused all storage access. R11b6 accepts the exact extensionless form for known candidates (R4..R11), plus exact release recovery aliases. It does not normalize arbitrary paths or infer an unknown namespace as release.

Independent review found no new source-overwrite, occupied-target overwrite, namespace-mixing, repeat-copy, or stale-completion blocker. It highlighted directory-relative script resolution: native public `/save-recovery` was observed redirecting to `/save-recovery/`, where the recovery-only UI and release namespace loaded successfully with the old R7a4 root. This actual host behavior will be checked again on the corrected candidate.

## Automatic regression

The new route cases expand the prior suite without removing tests. Existing save rollback fixtures, explicit original R7a4 module compatibility, browser-UI handlers, source/build version checks, and unknown path no-read/no-write assertions are retained. The R7 source argument first omitted `/dist`, returning ENOENT; that failed invocation is preserved as `r7-path-attempt.txt`. The corrected actual preserved module directory then passed 32 conditions in `r7-original-modules.txt`. No assertions were bypassed.

Runtime combat, rewards, growth, save backend, backup timestamps and checksums are unchanged from R11b5. This patch addresses the route only. Root promotion remains gated on public candidate normal-input recovery and the rollback-capable old-root Site preservation.

Final automatic checkpoint, 2026-10-10 09:52 UTC: full serial aggregate 2127/2127 passed, zero failure/cancel/skip/TODO, 259049.438821ms. All prior2116 retained, 11 route cases added. Syntax, default and recovery builds passed (90payloads plus manifest each,240local imports and all hashes). Original167files still match Gitblob/SHA256. Actual old R7a4 modules32conditions passed. Registry/Vercel attempts both exited1 due `/home/agent/.local/share/pnpm` ENOENT. Public native alias regression remains pending at this source checkpoint.

## Public normal-input result, Site v44

2026-10-10 09:53–09:55 UTC. Source Site commit `1df558d43038ca19736baad3e5bb6605a92630f3`; app source `d5f511e7eaf673a314d321d78a43a5c18af2fc60`. Deployment `appgdep_6aca0ae9ecf88191996a0a9b7940af31` succeeded at09:52:57.989685UTC. Root was visibly R7a4 throughout.

- The observed hosted redirect `/qa-r11/recovery.html` → `/qa-r11/recovery` now shows R11b6, qa-r11, recovery-only UI. It reads the existing L4 backup at original timestamp09:44:15.151Z and copies its schema3 record1, level4 XP42 to empty `qa-r11b6-standalone-l4-20261010`. The copy was deliberately not opened by the new game; it remains the explicit historical copy. The R11b5 game-UI restored copy had already passed actual continuation/inventory/reload.
- `/save-recovery` again redirects to `/save-recovery/` and loads R11b6 release recovery with the old R7a4 root. All relative scripts are served by the independent directory, not old-root modules. This is a usable prepared rollback version.
- Old earned R5 L6 QA copied through supported UI to empty `qa-r11b6-backup-l6-20261010`: L6Adept,295G,XP25.5/340,5SP,84HP,MP32.101/59,63stamina,onepot,37kills/1death,legacyE/Z/1/J and warm-heal11.9s. Save created a separate schema3→4 record1 backup at09:54:05.381Z. No free MP refill or cooldown reset.
- Existing already-v4 earned L18 profile correctly reported no historical backup. Its normal continue showed level18 XP725.5/900,1468G,16SP,181/184HP,97.731/98MP,104stamina,6pots,129kills/8deaths,expert2/3slots and B report. Banner6.1s vs preceding6.2s and MP96.985→97.731 correspond to the brief active frame interval, not a transition grant. Menu paused it and save/quit completed.
- `/` still displayed R7a4 with the original public description. No candidate state was copied to release. Own QA tab45 was closed after save.

No new combat balance, high difficulty, complete Expert skill roster, Master, live repeat expeditions, or whole-campaign acceptance is implied. Browser quota/corrupt-write/concurrency evidence remains automatic fixture coverage. The artifact rollback set is old R7a4 root files plus the independent R11b6 recovery build, with Sitev44 as a matching deployable baseline. It recovers the pre-upgrade checkpoint into an empty profile; it cannot turn later R11 progress into old-format progress.
