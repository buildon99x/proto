# Release acceptance gates
| Gate | Required evidence | Current status |
|---|---|---|
| Coat surface | No protruding marking geometry; texture unit tests; real3D reference review | Surface-texture implementation +unit/source review PASS; actual MacBook Safari flat-coat review PASS |
| Cat response | Accepted pet/feather/ball reactions, expiry/reset; distance/cooldown rejection | Accepted-action reaction implementation +tests PASS; MacBook Safari pet/feather visuals PASS; focused regression retest pending |
| Sound | Gesture-gated muteddefault, volume/cleanup/voicecap; playback and listening | Gesture/mute UI +40frontend tests PASS; no listening pass |
| Solo preview | Explicit localmode,18cats/oneplayer, no fakeoccupancy; exit/reentry | Actual current local solo/action/toggle workflow PASS; prior surface/audio candidate actualpublic UI PASS; delta candidate deployment check pending |
| Public realtime | Approved persistent host/TLS/origin/abuse controls, external2client room sync | Team access approved08:13UTC; no existing attached realtime backend found. Hosting path/monthly budget pending with user; no paid service provisioned. |
| Capacity | 3×100 sockets with measured tick/network; separate realdeviceFPS | Matched90%-moving delta benchmark:wire-38.5%,CPU-22.9%,RSS+7.5%;300retained. CompressionOFF. Not realuser/renderingquality |
| Desktop/mobile visual | WebGL rendering/coat/controls screenshots and boundedplay, mobiletouch/FPS | MacBook Safari18cats/coats/SDcontrols observed; position/help/selection fixes need same-device retest. Mobile/FPS remain OPEN |
| Release operations | Restart/reconnect, health/log/alert/budget/rollback, privacy and abuse controls | OPEN until actual host selected |
| Candidate provenance | Fresh tests/build, exact pushed branch tree, verified deployment | Required each candidate; no mainmerge |

A candidate may improve independent items while other gates remain open. It is not a completed public multiplayer release until all required gates have evidence.
