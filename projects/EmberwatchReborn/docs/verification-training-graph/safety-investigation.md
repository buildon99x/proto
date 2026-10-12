# Separate read-only investigation: native v75 safety stop

Source: coordinator report in thread `01a118dd-eabe-71a4-936e-7866130d6003`, not a replay by this code agent. Shield selection/posture/lava percentage/ready text and charge while moving without holding guard were observed. Holding only B facing a foe still took damage, killed an enemy (XP295.5→330.5,297G→301G), and showed stamina54/60. Instant spray FX, release Bash, exact0.18 timing, one-effect behavior and front/rear differences were not native confirmed.

Menu charge reset affected observation. A “화면 처리가0.5초 이상 중단됨” stop occurred; delayed return was followed by one extra death. Tool latency versus game/browser cost and exact death ordering were not established. Current ordinary profile was restored to basic in town: Lv6 XP330.5/340,286G,HP104/104. Do not turn these observations into native verification of the automatic-only counter claims.

## Existing safety path, unchanged

`runtime-clock.js` clamps delta to0..0.05s and requests suspension only for finite rAF timestamps with `now-last > 500ms`. Exactly500ms does not trigger runtime safety. The observer's legacy statistical exclusion uses >=500 and is a separate classification, not the game's stop predicate.

In `frame`, while not already paused, hidden/unfocused/strict long gap enters `showMenu(...,{safety:true})` before combat stepping. The panel pauses, clears input/intent and queues existing action safety. The normal checkpoint/save gate remains. `canStep` requires unpaused, focused, visible and not busy/blocked; paused safety frames do not simulate enemy damage. Safety shows only Continue or explicit Full Menu acknowledgement. Save failure can replace it with reload-required protection.

Continue checks the durable gate/alive state, clears input again and resets the runtime `last` to `performance.now()`. Previous held keys do not automatically re-arm guard. Mage token/charge/raised defence is cleared by safety drain; fresh B input is required after returning. When a save is in flight, cancellation waits for existing reconciliation and cannot bypass that commit. Finite accepted counter debt is kept, while a cancelled Bash's future contact is suppressed.

This source rules out applying an unseen large combat delta as the intended safety behavior. It does **not** prove the reported death occurred during pause: it may have happened before the detected stop or after Continue with cleared guard/fresh ticks. The coordinator's timeline/current save alone cannot settle that. No safety threshold/cap/input clear/guard semantics were removed or relaxed for QA.

## Existing measurement surface and limits

Candidate menu → **QA 접점 / 프레임 관측** → enable frame recording **before** the attempt. It defaults OFF and is memory-only, not a stored/network log. It retains240 general samples, the last active tail and12 strict-long-gap pairs; the UI shows the latest6 pairs. A long gap alone is distinct from an actual `safetyStop` branch. Invalid/unobserved clocks stay null/status-labelled.

Pairs include previous/current recorded rAF stamps, the actual runtime reference and interval, callback entry/end/total, previous callback end→current entry separation, mode, hidden/focus/visibility state and focus epoch. Named synchronous phases are step, render/labels, HUD, scene preparation, audio.tick, event/synchronous save entry, safety and input/aim. Audio requests are not speaker onset; render CPU brackets are not GPU/display timing. Other handlers, asynchronous work, tool interactions, browser scheduling/GC and any unbracketed work can contribute to the separation; it is not an attribution to idle/GPU/tool time.

Read the **previous** callback costs as well as the gap/current callback. Expensive current safety/save work occurs after the detected gap and cannot retroactively explain it; it may affect later intervals. A cheap prior callback plus a large outside-callback separation leaves the cause unresolved. A high measured render/scene/save phase supports locating synchronous page work, but is still not proof of the entire stall cause. Observer overhead is included in its own recorded region.

Opening menus resets Mage charge, so enable observation first, then close/resume, release stale keys and start the gameplay attempt fresh. After a safety stop keep it paused, explicitly open Full Menu and inspect/refresh diagnostics before retry/travel/reload. General/menu wrap does not erase the independent incident ring, but recording OFF/manual clear/profile load/region or retry rebuild/reload reset it. The town save contains no frame traces; past cause cannot be recovered from its HP/XP/gold.

For a controlled follow-up, compare the same short native encounter with observation enabled and otherwise identical conditions, first with no repeated remote screenshot/read actions during active combat, then with those actions marked by coordinator wall-clock times. Retain raw UI phase/context numbers and before/stop/after ordering. Treat differing gaps as a lead, not a causal proof. Existing public UI provides no persistent export of these internal samples; a native browser trace/long-task capture would need separately authorized tooling. No isolated Chromium/nativeCanvas retry is part of this investigation.
