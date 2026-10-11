# R11b3 precision integration

Version0.11.0-reimplementation.6, public candidate labelR11b3. Component9ae3df3 was integrated as7e33e0e; the following release metadata and harness wiring are integration changes. No W/Master feature is shipped. RootR7a4 and458other served files stay unchanged.

The new helper formats only presentation. HP uses integer ceiling, MP/stamina conservative at-most3decimals, quoted costs keep exact precision. This preserves the actual7.875stamina Grace quote and never advertises a rounded-up pool as payable. Runtime resources, costs, eligibility, RNG, skill behavior, difficulty, saves and input policy are unchanged.

## Validation log
- New component42checks plus177retained focused checks passed219/219 before integration.
- Initial full run:2022reported,1939pass/83fail,250610.53017ms. The extracted real-main T UI harness omitted the two new formatting imports;82cases raised ReferenceError plus the file's asynchronous failure. Production main already imported both. This is retained as first-full-harness-dependency-failed.txt, not a successful run.
- Repaired only that harness's import/environment bindings to use the real formatter; all88existing T/BUI cases pass unchanged in19934.634572ms. No assertion or scenario was removed. Final unchanged-source aggregate then passed2022/2022,0fail/cancel/skip/TODO,255963.406593ms serial; all1980prior scenarios and42new checks retained.
- Syntax and build pass.85payload hashes plus manifest and232relative imports pass. Original167file SHA256/Gitblob integrity passes; canonical plan full hash remains the already documented unavailable comparison.
- pnpm sync:registry and pnpm build:vercel each fail before work because /home/agent/.local/share/pnpm is unavailable (ENOENT); neither is a passed deployment gate. The standalone static game build is separate.

All source counts are newly executed reimplementation checks. Browser tests from v40 describe only that version; corrected fractional UI acceptance awaits R11b3 publication. No continuous campaign-time/DPS, all15Expert, Master, advancedgear, repeated expedition, mobile/audio or whole-quality acceptance is inferred.
