# Performance evidence scope

These are recorded scripts and receipts, not production runtime files. They were run from `/workspace/shared/r14a17-save-input-diagnosis` after native browser inputs ended16:00:36UTC and supported browser reads ended16:03UTC. Their source/baseline/fixture paths are relative to that diagnosis working directory; use that recorded layout to rerun the unchanged scripts. `prepare-profile.py` creates a separate instrumented JS graph and never edits the production sources. Original fixture location: `/workspace/shared/r14a15-scene-cost-audit/earned-scene-fixtures.json`.

`head-first-paired-results.json` is the authoritative before/after comparison:32 pairs (four stages×8), two untimed warmups per variant/stage, alternating execution order. It uses actual uninstrumented baseline and candidate modules, in-memory exact-string storage and an immediate fake Web Lock. Each pair checks full result/state/events, stored bytes and every storage read/write operation. This measures repeated CPU-heavy checkpoint work, not actual browser localStorage/lock contention, input-to-pixel latency or the whole input-expiry problem.

Stage medians in milliseconds: entered122.48→106.81; chosen120.46→105.32; approach123.93→106.35; evidence139.67→115.88. Median reduction is12.6–17.0%. All32 individual paired differences were positive in this small sample. Eight samples per stage do not establish tail performance or native acceptance.

`checkpoint-profile.json` is the earlier baseline-only instrumented attribution batch; seven full validateState invocations dominate it. `checkpoint-uninstrumented.json` is a separate baseline-only confirmation batch. Do not compare those separate batches to claim a candidate speedup. Inclusive phase times overlap their child phases; use exclusive times or the full dispatch totals appropriately. Aggregate process CPU may exceed wall time due runtime helper threads.

`input-expiry-reproduction.json` uses synthetic logical time and a probe at the combat-delivery boundary. It proves the retained150ms pending-pulse contract, not a real save duration, real battle, native input acceptance or the identity of the live expired pulse.
