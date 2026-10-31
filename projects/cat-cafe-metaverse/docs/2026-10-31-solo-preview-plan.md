# Active cats preview and honest live entry
User explicitly requests seeing implemented cats active and a cute SD block-toy player. Preserve the existing café/cat style. No branded assets.

1. Fix misleading unavailable live entry: disabled button, prominent all-room unavailable explanation, accessible status. No public backend readiness claim.
2. Add explicit browser-only solo preview with 18 locally simulated cats and one local player. Walking/resting/play cycles; keyboard/touch and nearby actions use local state only. Shared bounds/collisions, bounded deterministic time updates.
3. Preview starts only via clearly labeled solo button. Close sockets/clear membership before preview. Leaving or live join clears preview. Never display fake other visitors/online counts; show persistent “혼자 둘러보기 · 실시간 연결 아님”.
4. Original SD block-toy avatar with large head/short limbs; keep remote crowd two instanced batches.
5. Red/green tests for disabled availability, deterministic movement/actions/bounds, preview/live transition separation and rendering budgets. Actual browser verifies visible controls/state; WebGL-disabled dot cannot approve 3D rendering. Publish working-branch candidate only and verify live URL.
