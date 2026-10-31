# Cat Café Release Quality Implementation Plan

> **For agentic workers:** Use subagent-driven-development with separate renderer/audio/server ownership and independent review.

**Goal:** Improve coat realism, responsive cat play and safe original sound while meeting explicit release gates without pretending the public backend exists.
**Architecture:** Keep Three.js static client and authoritative Node/ws room server. Surface color maps replace marking meshes. A bounded gesture-gated WebAudio controller receives only acknowledged user actions. Solo preview remains explicitly isolated. Public service requires an actual approved host and operational checks.
**Tech Stack:** Existing Three.js, Vite, Node/ws; native WebAudio; no paid assets, new credentials or global platform changes.
**Spec:** ../../../spec.md and user's release-quality request.

## Global Constraints
- Preserve the existing café layout, doubled area and chibi silhouettes.
- No fake users/online connection; no paid hosting or credentials; no main merge.
- Public hosting is requested, but current account/host authorization is unresolved by parent.
- Synthetic tests, actual rendering, audio playback and human listening are separate evidence categories.

## Five-question review loop
1. **What would an expert do unasked?** Prevent accidental autoplay/loud sounds; restore muted state safely; cap audio voices; honor reduced-motion when feasible; test disconnect/reconnect; measure traffic; document privacy/abuse/operational limits before public opening.
2. **Which primary evidence first?** User's actual protruding-coat observation, existing procedural geometry/materials, authoritative action acknowledgements, actual deployed browser console/capabilities, raw load logs, official host/runtime/audio APIs.
3. **Methods/tools?** Small test-first source changes, pure deterministic samplers/envelopes, WebSocket integration tests, supported browser interaction/screenshot, independent read-only review, exact Git trees and Vercel deployment status. No security bypass to enable graphics.
4. **Independent validation?** Regression tests that fail before fix, another reviewer, actual public candidate UI/gesture checks, backend capacity/security/load tests, WebGL-capable real-device visual and audio-listening checks before release approval.
5. **Blind spots?** Dot WebGL disabled; real mobile thermal/FPS and touch quality; browser audio policies/hearing comfort; external latency/cost/abuse; sustained300human load; account authorization; visual texture placement not proven by pixel sampler tests. Keep these open instead of declaring launch-ready.

## Review Focus
- Missing/invalid host never implies live availability; public launch requires successful two-client external room interaction.
- Sound stays silent until gesture, no reconnection burst; mute/volume0/hidden/leave dispose voices.
- Fur patterns change color only, never silhouette; six palettes fit body/head UVs.
- Cat feedback corresponds to accepted action, resets after expiry, rejects distance/cooldown.
- Solo/live transitions clear pending audio actions and don't leak state or occupancy.

## Tasks
- [ ] Renderer: pure coat sampler + cached DataTexture on original meshes; remove all patch/stripe geometry; tests samples/cache/bounded response and independent review.
- [ ] Audio/UI: mute-first gesture-only controller, voice cap/envelopes/cleanup, volume/prefs; match live action acknowledgments and local successes; tests fakecontext/error/cleanup and actual gesture UI.
- [ ] Backend audit: identify safe bandwidth/hardening improvements and actual hosting prerequisites; implement only approved scoped changes; rerun socket tests/load with measured cadence.
- [ ] Integrate: fresh tests/lint/build, deployed browser walkthrough, screenshot, verify exact remote tree and candidate. Distinguish code completion from unmet release gates.
