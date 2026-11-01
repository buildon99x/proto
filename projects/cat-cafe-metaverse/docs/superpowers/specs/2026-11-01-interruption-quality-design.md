# Existing control and interruption quality

User asks continued quality improvement, not new features. Preserve art, rooms, physics, wire protocol, authority version2, resource budgets and current public URLs. No paid resources or new access.

## Proven defects and chosen minimal corrections
1. Pointer move rotates before the existing8px tap/drag threshold: apply the same threshold before camera rotation; keep latest delta, pointer ownership and joystick independence.
2. Actual-main traces show held movement and old-room actions continue during room switch; rejected switch leaves picker stale. Centralize bounded room transition, stop input, block actions/movement until acknowledgement or denial, restore picker on rejection.
3. Open WebSocket has no welcome deadline: a silent server can leave connection UI indefinitely pending. Bound join acknowledgement separately from transport open and clean all timers.
4. Nonmodal help survives leaving/reentering and keeps movement blocked: reset help on session transitions without stealing focus.
5. Solo simulation clock stops/slows under hidden-tab throttling while presentation clock continues: skip hidden simulation/render/input/DOM work; explicitly rebase solo presentation on return without catch-up or recreating meshes. Live authority time remains unchanged.

Approach: reuse existing handlers and small testable helpers; no new renderer, auto-navigation, camera redesign or server schema. Tests run actual main against simulated browser/device boundaries, plus deterministic clock/gesture traces. Actual3D human play remains unverified because cloud WebGL is unavailable and local Mac execution is usage-limited.

Background live socket policy is considered separately after review; no foreground inactivity kick or assumed indefinite position preservation.

## Approved hidden-only resource policy
Stop hidden input/render/solo work immediately. A single30-second hidden timer closes the live socket without explicit leave, retaining the existing resume token. Existing20-second server reservation may preserve position; after expiry the existing fresh-join fallback can restart at entrance. Visible/pageshow resumes once; manualleave cancels. pagehide pauses promptly. Browser throttling makes30seconds a target, not a guaranteed deadline. No foreground inactivity kick, no new server lifetime or quota/reset semantics.
