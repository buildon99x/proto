# Verification methods
- `pnpm --filter smash-rally-3d test`: independent physics/solver/contact/score tests, 1000 launch cases and 10 whole simulated matches. These are domain simulations, not UI play.
- `node projects/SmashRally3D/tools/browser-check.mjs`: existing Chromium, software WebGL, real UI mouse/touch actions; read-only diagnostics observe predicted timing. No game state writes. Automated precision assists are disclosed; this is not novice human usability testing.
- Root harness was read and attempted; its older SwiftShader flags did not initialize WebGL on Chromium151. Project-local runner uses current Angle/SwiftShader flags and isolated `.playtest` Puppeteer, avoiding changes to shared infrastructure.
- Inspect each screenshot; inspect console/page errors and record score, rally length, shots and pause/rematch.
- Physical PC/mobile frame budget, Safari, speakers/Bluetooth listening and physical touch latency remain separate device checks.
