# Release acceptance gates
| Gate | Required evidence | Current status |
|---|---|---|
| Coat surface | No protruding marking geometry; texture unit tests; real3D reference review | Surface-texture implementation +unit/source review PASS; actual MacBook Safari flat-coat review PASS |
| Cat response | Accepted pet/feather/ball reactions, expiry/reset; distance/cooldown rejection | Accepted-action reaction implementation +tests PASS; MacBook Safari pet/feather visuals PASS; actual Safari R3 separated ball and chasing response PASS |
| Sound | Gesture-gated muteddefault, volume/cleanup/voicecap; playback and listening | Gesture/mute UI and exact-source native OfflineAudioContext19cases PASS; no live-device listening pass |
| Solo preview | Explicit localmode,18cats/oneplayer, no fakeoccupancy; exit/reentry | Actual current local solo/action/toggle workflow PASS; prior candidate public solo UI PASS; current0.2.1 candidate deployment HTTP200 and Safari R3 solo visual checks PASS |
| Public realtime | Approved persistent host/TLS/origin/abuse controls, external2client room sync | Team access approved08:13UTC; no existing attached realtime backend found. Hosting path/monthly budget pending with user; no paid service provisioned. |
| Capacity | 3×100 sockets with measured tick/network; separate realdeviceFPS | Matched90%-moving delta benchmark:wire-38.5%,CPU-22.9%,RSS+7.5%;300retained. CompressionOFF. Not realuser/renderingquality |
| Desktop/mobile visual | WebGL rendering/coat/controls screenshots and boundedplay, mobiletouch/FPS | MacBook Safari18cats/coats/SDcontrols observed; Safari R2 selection and position fixes PASS; R3 toast/ball/keyboard PASS; help AX remains OPEN, nonmodal A/B pending. 0.2.3 owner-input70unit tests and5iframe layout measurements PASS; physical mobile/coarse-device/FPS and new Safari regression remain OPEN |
| Release operations | Restart/reconnect, health/log/alert/budget/rollback, privacy and abuse controls | Code-only strict production config, readiness/drain and bounded rawTCP/WS cleanup loopback tests PASS. Docker recipe unbuilt; actual TLS/host, proxy/edge abuse controls, budget/alerts and external lifecycle OPEN |
| Candidate provenance | Fresh tests/build, exact pushed branch tree, verified deployment | Required each candidate; no mainmerge |

A candidate may improve independent items while other gates remain open. It is not a completed public multiplayer release until all required gates have evidence.

The finite20-minute lifecycle soak passed on server baseline083d308 with natural zero cleanup and exit0. Final0.2.1 ball simulation changes are covered separately, not included retroactively in that soak. See server/SOAK.md.
