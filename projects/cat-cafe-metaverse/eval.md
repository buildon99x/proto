# Evaluation plan
- Unit/integration: three-room isolation, near/far actions, concurrent action leases, malformed/nonfinite/missing inputs, move speed/bounds, duplicate sequences, 101st admission, atomic switches, reconnect token ownership/expiry, capacity reservations, backpressure.
- Synthetic load: 3 rooms ×50 then ×100 sockets, CPU/RSS/tick p95/p99, ping/action RTT, traffic, duration and host context. Never label as real-user/mobile performance.
- Browser: desktop keyboard/mouse, touch joystick/drag/actions at mobile viewport, all three cat interactions, room switching, interrupted connection, clear offline state, WebGLfallback; meaningful screenshots and bounded five-minute play.
- Root registry/build: pnpm sync:registry, build:vercel, verify --project cat-cafe-metaverse. List failures and skipped stages honestly.
- Verify remote branch commit, keep public main unchanged. Public static preview does not imply live multiplayer backend.

## Actual results · 2026-10-31 UTC
- Frontend9/9 tests pass, server17/17 pass incl realWebSocket, maxcapacity/reservation/expiredtoken, duplicates/races/proximity, malformed/oversized/flood, backpressure testdouble, idledeadline, portstartup failure. Independent read-only reviewer reran both suites.
- Final20Hz synthetic inputs,3rooms×100clients30.00s:300connected,598ticks/19.933Hz. Tick work p95=11.05ms,p99=11.64ms; actual tick intervals p95=50.90ms,p99=54.06ms,0 intervals>75ms. ActionRTT p95=43.99ms,p99=46.19ms. CPU43.90% of onecore/RSS209.21MiB are COMBINED server+generator. Outbound21.60MiB/s aggregate (~74KiB/s/client),0 dropped snapshots/slowclosures. This is loopback capacity for30s, NOT live Internet or300renderedusers quality. Earlier10Hz/fullJSON evidence retained rather than hidden.
- Crowd source budget: all100visitor positions represented,99remote avatars in2InstancedMesh batches without shadows,1local detail. Shared cat/decor geometries. Source-level budget tests pass; no actualGPU/FPS claim.
- Actual supported dot browser: welcome, trueWebSocket connection viaVite /ws proxy, two independent tabs2occupants, room switch, nearby-cat selection and server-accepted pet/ball actions. Settings→offline regression verified actionsdisabled and other tabcount2→1.
- Browser WebGL2 context creation failed with GL_VENDOR=Disabled / BindToCurrentSequence failed. Fallback actually rendered. Browser capabilities expose no supported renderer switch. 3D appearance/animation, visualfive-minuteplay and actualmobile/crowdFPS are NOT verified. Screenshot webgl-fallback-connected.jpg is a limitation record, not a3D success screenshot.
- `pnpm verify --project cat-cafe-metaverse`: lint/build pass; playtest fails while harness triesPuppeteer installation due missing /home/agent/.npm. No alternate browser install attempted; used supported dotbrowser instead.
- Literal `pnpm sync:registry` / `pnpm build:vercel`: tsx CLI IPC listen EPERM before checks. Equivalent `node --import tsx scripts/sync-launcher-registry.ts`, all12 `node --import tsx scripts/build-project.ts <id>`, and `pnpm --filter launcher build` PASS. Same production scripts/checks, no suppressed assertions; ordinary orchestrator command remains environmentblocked. Registry retained unrelatedprojectrecords unchanged.
- Root `pnpm test`:12/16 tasks passed before existing msw-inc tsx IPC EPERM stopped run. Not a fullroot suitepass. Project tests above passed separately.
- OhMyGame pinnedsource, isolatedno-key750dependency install: actualexisting-folder creation, sourceAPIread and daemonrestart persistence PASS (`docs/ohmygame-integration.json`). No AIprovider invocation.

## Remaining release gates
WebGL-capable browser desktop/mobile render/play validation; realnetwork/mobiledevice profiling; longer dedicatedserver soak; bandwidth optimization/productionWSS/origin/abuse controls before any publicly accessible rooms. No public roomhost/payment/mainmerge was performed. This is a working-branch candidate, not a publicdefaultrelease.

### 90-second follow-on soak
3×100,20Hzinput:300/300connected,1788ticks/19.866Hz; tickinterval p95=51.01ms,p99=54.88ms,1interval>75ms; tickworkp99=11.81ms, actionRTTp95=40.42ms,p99=44.21ms; no dropped snapshots or slowclosures. CombinedCPU50.17%, peakRSS264.48MiB;21.76MiB/s. Other independent tests/builds overlapped part of this run, so it is not an isolatedCPUbenchmark. PeakRSS and90s do not prove absence of memoryleaks. Raw `server/load-soak-20hz.jsonl`.

OhMyGame additionally launched the actual project via its official preview API (`node app/dev.mjs`), served the real 햇살냥 HTML, and retained the registered workspace after restart. Cross-working-directory launcher regression failed first, then passed after explicit app-root resolution. Browser graphics limitations above still apply to OhMyGame preview too.
