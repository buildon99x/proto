# Actual cloud Chrome public realtime checks

Source d20dcd742950b5ddcf5c8e868ad6d3bef3424a94, Preview dpl_5qL8GHxyzyUA3QsHrA3pTY57m7Co.
URL https://loop-5ew29sr3i-silentstacks-projects.vercel.app/runs/cat-cafe-metaverse/index.html
2026-11-01 04:40–04:42 UTC. Two independently opened tabs6/7 (not fabricated socket state).

- Both joined from the visible guest button without entering a server URL. Both showed realtime connected and sunroom2, garden0, moon0.
- First visitor selected nearest cat and successful pet response appeared. Timed second pet click→visible success text379ms including automation call overhead; this is one observation, not statistical serverRTT.
- D held1000ms: x0.0→3.6, z5.0 unchanged. Later A held1000ms: x3.6→0.0; tool elapsed1009ms. Visible authoritative coordinates, not inferred from nominaltick.
- Second visitor switched garden. Both showed sunroom1/garden1; response welcome confirmed room switch.
- First visitor reloaded, rejoined within reservation window and retainedx3.6/z5.0, with one seat in each room. No duplicate seat observed. Private session token was not read or logged.
- Second visitor clicked leave. First showed garden0/sunroom1. First then clicked leave; both displayed departed state, actions disabled. Empty-service restart observation follows separately.
- No runtime error logs found for this deployment during the observed window. Lack of logs alone is not proof of no requests/idle.
- WebGL2 was disabled in this cloud browser: these are actual network/UI checks, NOT new3D rendering/FPS/physicalphone/listening evidence.
- Separate Node WSS harness failed before upgrade (1006,0bytes); preserved as distinct inconclusive client-transport result, not silently discarded.

## Failed idle/re-entry and quota observation (not a completion pass)

- Last visitor left at approximately 04:42:09 UTC. After roughly 25 seconds, tab6 fresh join did not complete and entered reconnect attempts (3/8 then4/8). It was explicitly stopped at04:43:05.
- Tab7 fresh garden join succeeded at04:43:19 (garden1/sunroom0), demonstrating the failure was not a universal inability to start any visitor.
- Tab6 retried while tab7 was connected at04:44:03; immediate state was connecting. At04:46:10 BOTH tabs displayed the explicit free-server quota exhausted message with join disabled. No active visitor remained visible. Current exact counter/dimension needs separate bounded inspection; no quota reset/refill was done.
- Local deterministic source reproduction independently found last-close cleanup clearing a new visitor's reliable pending join after an awaited stop. Authority committed welcome while gateway dropped delivery. This is a proven source race, but the observed browser failure cannot be attributed exclusively to it because quota exhaustion also occurred.
- Branch-only live flag set0 at04:46; inactive candidate redeploy started. Immutable earlier deployment remains subject to its existing failclosed quota. Public readiness is NOT passed pending lifecycle repair and usable quota verification.
