# R2c — real-play pause/resume regression

Public R2b/version2 was played with ordinary desktop input on isolated qa-r2-live-20261009, Normal. New arrival waiting remained55/40/45 without enemy movement across observed snapshots about20s apart. Q/mace inputs released the wait and earned8kills,98XP,32gold; HP37/55,MP12/40,2potions. No state/XP/HP injection. This was two short combat segments separated by menus; not an uninterrupted campaign/time/fun acceptance.

While closing the menu and trying to return through the portal, an actual `Invalid step` error stopped the game. Root cause: requestAnimationFrame's timestamp could precede `performance.now()` saved by closePanel, yielding a negative delta. The loop now uses shared frameDelta(now,last), clamped0..0.05 with invalid inputs returning0. Five regression cases cover negative resume, zero, normal, stall and nonfinite clocks. Total105 tests pass, build/syntax pass. In-game menus, visibility loss and the source input reset continue to pause game state; actual repeated reopen/reload verification continues after deploying the fix.

Arrival waiting is now reported separately from active session play time. Earlier R2b menu measurements included input-wait time in play and must not be combined with the corrected category as a like-for-like timing measure. Actual visual/audio quality and full campaign remain unverified.
