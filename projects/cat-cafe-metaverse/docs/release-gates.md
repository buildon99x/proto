# Release acceptance gates
| Gate | Required evidence | Current status |
|---|---|---|
| Coat surface | No protruding marking geometry; texture unit tests; real3D reference review | Surface-texture implementation +unit/source review PASS; real3D unavailable in dot |
| Cat response | Accepted pet/feather/ball reactions, expiry/reset; distance/cooldown rejection | Accepted-action reaction implementation +tests PASS; actual3D motion review OPEN |
| Sound | Gesture-gated muteddefault, volume/cleanup/voicecap; playback and listening | Gesture/mute UI +40frontend tests PASS; no listening pass |
| Solo preview | Explicit localmode,18cats/oneplayer, no fakeoccupancy; exit/reentry | Actual current local solo/action/toggle workflow PASS; deployed rerun required |
| Public realtime | Approved persistent host/TLS/origin/abuse controls, external2client room sync | BLOCKED: account/host authorization pending with parent |
| Capacity | 3×100 sockets with measured tick/network; separate realdeviceFPS | 90s loopback comparisons: compression saves58.8% wire but increases CPU/RTT; defaultOFF. Not realuser quality |
| Desktop/mobile visual | WebGL rendering/coat/controls screenshots and boundedplay, mobiletouch/FPS | OPEN: dot browser WebGL disabled |
| Release operations | Restart/reconnect, health/log/alert/budget/rollback, privacy and abuse controls | OPEN until actual host selected |
| Candidate provenance | Fresh tests/build, exact pushed branch tree, verified deployment | Required each candidate; no mainmerge |

A candidate may improve independent items while other gates remain open. It is not a completed public multiplayer release until all required gates have evidence.
