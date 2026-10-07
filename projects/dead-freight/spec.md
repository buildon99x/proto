# Specification

Desktop keyboard/mouse WebGL game, three weapons, optional manual firing cycle, finite ammunition and reload, destructible walls, alternate routes, AI combat, barrels, health/armor/ammunition pickups, a bounty target and return-to-start extraction. Pause, retry, repeated contracts and optional audio/CRT settings.

Runtime: locally vendored Three.js 0.160.1 (MIT), vanilla JavaScript and HTML. No runtime external requests, accounts, API keys or server endpoints. Build copies the app's source and vendor assets into app/dist for launcher packaging. Code uses localStorage only for a local best-record snapshot.

Controls: WASD, Shift, mouse, left click/F, right click/Q, R, E, 1–3, M and Escape; arrow keys support keyboard aim.

Non-goals: visual identity with HEADCUTTER, original campaigns/dialogue/crew, mobile gameplay, multiplayer. No game-source art or music is included.
