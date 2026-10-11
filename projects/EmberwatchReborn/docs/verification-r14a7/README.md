# R14a7 controls/visual review work surface — not published

## Scope and provenance
This is a new copy of frozen a6, which builds on a5. Those prior source surfaces are unchanged. Combat balance, skill costs/damage/cooldowns/timing, AI, maps, growth and saves remain byte-identical to that base. No original art/audio/font changes. User priority is normal-input controls/visual polish; AAA is a goal, not a quality result.

Public inspected build is still Sitev58/R14a4. a5 has saved Sitev59 but deployment was rejected twice and is awaiting user approval; a6/a7 are not public. Local preview did not work: default HTTP process readiness failed; escalated readiness hit `bwrap: Can't mkdir parents for /root/.codex: Not a directory`; browser loopback returned `ERR_CONNECTION_REFUSED`; no supported port-forward capability was present. Started test servers were stopped, no new hosted preview was used. These observations do not establish filesystem loss or a browser-host topology cause.

## Changes
1. Default-OFF, session-only contact/path observer. Explicit candidate-only menu controls. Copies bounded current body geometry and last simulation-slice path after actual step, draws ground-space rings, sampled/inferred trails and labelled geometric proximity/bend markers. It does not assert collision causation or recreate a different collision solver. Existing scene visibility is respected. See contact-trace-contract.md.
2. Default-OFF frame observation with separate browser-rAF interval and synchronous JS step/render/HUD spans. Fixed windows and separate menu/save/arrival/activity buckets. Retains the most recent active segment through a long pause so the UI can be read normally. Errors, transition intervals and ≥500ms gaps cannot be turned into fake successful zero-cost frames. See frame-observation-contract.md.
3. First-combat screenshots show large centre toast traffic. Only desktop fine-pointer layout at ≥901px width / ≥600px height moves the notice above the lower controls, keeping status role, text, lifetime and pointer transparency. Narrow/coarse layouts are unchanged. Actual a7 layout/long-key-wrap acceptance remains open.
4. Main/title/recovery/package/build identity is R14a7. No publication claim.

## Verification distinction
Dedicated modules use real combat/renderer calls with synthetic clocks/canvas probes. Integration tests use actual production click/key/frame/controller/store functions, with DOM/render/audio boundaries as probes and scripted earned-state fixtures. They establish invariance/ownership and routing, not pixels, sound or real browser frame rates. Full final run/lint/build results are in this directory after completion; do not inherit prior counts.

The first integrated run had3910/3915 passes and five failures because upgrade-backup's extracted title harness had not imported the two new observer dependencies. Only that fixture dependency was repaired, with prior expectations preserved. Separate initial new tests also caught the reserved `qa-*` action prefix routing new diagnostic buttons to profile load; production actions were renamed `observe-*`, and real handler tests pass.

## Actual current play
Fresh v58 normal play from first arrival to first report reached L2,6kills,XP37/150,gold42 and produced a parser-verified selected QA export. Screenshots and export are preserved separately as first-entry evidence, not a7 evidence. See the accompanying v58-first-entry QA archive. Prior L18 restore is already complete; centreline large-body rejection remains unverified from pixels.

## Remaining acceptance gates (do not mark complete by test count)
- Run a7 through an allowed visible HTTP preview or explicitly approved candidate, with its exact build label verified.
- Same normal earned L18 boss-alive profile: enable contact trace via UI, approach centreline with ordinary walk then dodge; capture body rings and actual path. Any contact marker is geometric inference unless actual engine event evidence exists. No HP/AI/input-state injection.
- Record baseline observer OFF/ON cases and actual frame windows under the same fight/effects; use rAF and JS spans separately, retained active buckets only. GPU/display latency remains outside this instrumentation.
- Normal short taps, opposite movement/aim, held attack→dodge→held restart; actual immediate visual start and contact are separate events. Rebinding, menu/blur/death safety remain required.
- First-entry and full8slot long-bound-key layouts: compact toast must not overlap hotbar/hint or hide warnings. Flash0, multi-skill contrast and warning priority need actual captures.
- Full action phase readability and listening remain open. Current fantasy audio cannot be heard with available tools.
