# R2b published-build QA in progress —2026-10-09

Initial public version1 / R2a, browser ordinary inputs only, isolated profile qa-r2-live-20261009, Normal difficulty. No save import, XP/HP/level/rank injection or disabled AI.

Observed: start screen loaded original assets; new profile succeeded; WASD movement→trainer E→four free skills→elder E→patrol acceptance→portal E→road succeeded. UI showed55/40/45 resources,0XP/0gold,2potions and correct costs. Four starter skills persisted through first death and retry. First road arrival was followed by tool/screenshot inspection latency; the moving pack killed the unattended hero before the next combat input (0kills). This is not an isolated player-skill/difficulty verdict, but establishes the absence of a safe first-entry reading window.

Fix under review: road entry/resume explicitly waits until normal movement or attack. During this wait, AI/time/resource regeneration/cooldowns do not advance. No permanent invulnerability or reward is granted. A regression checks the pause and deliberate release. Source tests100/100 and build/syntax pass.

Actual retry: normal retry button returned to town with55/40/45, starter ranks and accepted patrol intact;2potions,0gold/XP,death1. Menu shows session play68s / combat7s / movement2s / menu177s at capture. These include tool/inspection delays, play categories overlap, and this is not a campaign-time/fun benchmark. First six kills, earned skill purchase, reload/arrival-fix regression and boss remain unverified at this point.

Screenshots captured separately: r2a-first-death.jpg and r2a-retry-state.jpg. Browser extension metadata warnings appeared in console; no app-origin error was observed in the inspected10-log sample. Audio output quality/listening has not been verified by screenshot/logs.
