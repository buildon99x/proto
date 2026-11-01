# Release acceptance gates
| Gate | Required evidence | Current status |
|---|---|---|
| Coat surface | No protruding marking geometry; texture unit tests; real3D reference review | Surface-texture implementation +unit/source review PASS; actual MacBook Safari flat-coat review PASS |
| Cat response | Accepted pet/feather/ball reactions, expiry/reset; distance/cooldown rejection | Accepted-action reaction implementation +tests PASS; MacBook Safari pet/feather visuals PASS; actual Safari R3 separated ball and chasing response PASS |
| Sound | Gesture-gated muteddefault, volume/cleanup/voicecap; playback and listening | Gesture/mute UI and exact-source native OfflineAudioContext19cases PASS; no live-device listening pass |
| Solo preview | Explicit localmode,18cats/oneplayer, no fakeoccupancy; exit/reentry | Actual current local solo/action/toggle workflow PASS; prior candidate public solo UI PASS; current0.2.1 candidate deployment HTTP200 and Safari R3 solo visual checks PASS |
| Public realtime | Approved persistent host/TLS/origin/abuse controls, external2client room sync | 2026-11-01 Vercel + Free Redis public candidate7f6f49c: actual authority diagnostic and2browser sharedjoin/action/rooms passed, automatic same-origin WSS. Global6seat finite beta only; no paid service provisioned. Commercial abuse/capacity hardening remains OPEN. |
| Capacity | 3×100 sockets with measured tick/network; separate realdeviceFPS | Matched90%-moving delta benchmark:wire-38.5%,CPU-22.9%,RSS+7.5%;300retained. CompressionOFF. Not realuser/renderingquality |
| Desktop/mobile visual | WebGL rendering/coat/controls screenshots and boundedplay, mobiletouch/FPS | MacBook Safari18cats/coats/SDcontrols observed; Safari R2 selection and position fixes PASS; R3 toast/ball/keyboard PASS; help AX remained intermittent after same-build Safari A/B; rootcause unresolved. 0.2.3 owner-input70unit tests and5iframe layout measurements PASS; physical mobile/coarse-device/FPS and new Safari regression remain OPEN |
| Release operations | Restart/reconnect, health/log/alert/budget/rollback, privacy and abuse controls | Code-only strict production config, readiness/drain and bounded rawTCP/WS cleanup loopback tests PASS. Actual Vercel HTTPS/WSS and two25s last-exit/re-entry cycles PASS on7f6f49c; lazyreservation cleanup fixed and committedzero provider diagnostic PASS. Conservative daily/monthly appguards failclosed, noreset. Docker unbuilt;270s automaticrotation, sustained operations/alerts/edgeabuse controls remain OPEN |
| Candidate provenance | Fresh tests/build, exact pushed branch tree, verified deployment | Required each candidate; no mainmerge |

A candidate may improve independent items while other gates remain open. The limited public beta is testable, but is not a complete commercial release while device, scale and operational gates remain open.

The finite20-minute lifecycle soak passed on server baseline083d308 with natural zero cleanup and exit0. Final0.2.1 ball simulation changes are covered separately, not included retroactively in that soak. See server/SOAK.md.
