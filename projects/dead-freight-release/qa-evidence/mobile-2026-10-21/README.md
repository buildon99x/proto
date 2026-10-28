# Mobile browser QA — 0.15.2

Canonical base:5582261; final build:0.15.2. See verification.json and branch-e2e.json. Browser uses installed Chrome and bundled Playwright, chromiumSandbox=true, fresh isolated local-qa storage. No user profile copied and no game state injected.

Trusted touchscreen taps cover menu/start, buttons, weapon switching, utility selection, bag/pause/resume. Joystick/look/held actions and multi-pointer/cancel/blur tests dispatch synthetic browser events through production handlers; these do not establish physical multi-touch acceptance. Screenshots cover844x390,568x320 and390x844 (including portrait-first startup). Desktop test verifies mouse fire and pointer lock with no touch layer. Full legacy public-only prototype is not the deployment.

Not verified: physical Android, hardware safe-area behavior, long mobile sessions/FPS, device listening and complete raids using touch alone.
