# R14a17 independent static merge and cache-safety review

Reviewed 2026-10-11 UTC against the frozen R14a16 death-overlay candidate, with R14a15 and the frozen scene-validation-cache patch as additional comparisons.

## Result

No static merge or cache-safety blocker found in the inspected candidate. This conclusion does not establish native-browser performance, AX/focus, rendering, or listening acceptance. The coordinator owns final aggregate, lint/build, publication, and supported-browser results; this review did not start another aggregate suite or change runtime/tests.

## Exact preservation checks

Machine-checked evidence is in `reviewer-source-integrity.json`.

- Of 125 existing source files, only `main.js`, `wilderness.js`, and the two build-label files (`index.html`, `recovery-page.js`) differ from a16. `immutable-snapshot.js` is the only new source file.
- Removing the new import, reverting the three canonical-copy receipt assignments and build label, and restoring only the `wildernessView` function makes the entire `main.js` byte-identical to a16. No other main handler, death gate, blocked-save branch, input boundary, observation bracket, or render call was silently replaced.
- Both original wilderness validator bodies are byte-identical. Removing the new import/cache wrapper block and restoring the two function declaration names makes the complete wilderness module byte-identical to a16. The a16 and a15 wilderness modules also match exactly.
- The new canonical-copy module and final wilderness module match the frozen performance patch exactly.
- `frame(now)` through end of `main.js`, `frame-observation.js`, `dialog-focus.js`, and all 14 checked source assets match a16 exactly. `runtime-clock.js` is unchanged, including the strict `now-last > 500` suspension threshold and 0–0.05-second dt clamp.

## Canonical-copy and validation-cache safety

`app/src/immutable-snapshot.js`:

- A private `WeakSet` certifies only returned roots constructed by the module. Ordinary mutable objects, shallow/deep externally frozen trees, Proxy wrappers around certified objects, and structured clones do not inherit certification.
- Copying accepts finite primitive JSON values, ordinary-object/array prototypes, enumerable own data descriptors, dense index-only arrays, and acyclic graphs within the traversal limits. Accessors, hidden/symbol/reserved keys, custom prototypes, sparse/extended arrays, cycles, unsupported values, and failing inspection are rejected.
- The output is a detached, recursively frozen plain tree. Repeated acyclic references remain detached and consistently shared. Inputs and their aliases are not frozen or retained as cache keys.
- Descriptor inspection avoids reading property getters and dynamic missing-property values. Proxy reflection traps can still run during inspection; the implementation is not a sandbox for arbitrary Proxy code. Their returned data is copied into ordinary frozen values before certification, so dynamic traps are not retained by a canonical key.
- Certification means immutable provenance only. An invalid game state can be copied, but it still goes through the original validators before a result is cached.

`app/src/wilderness.js:66–111`:

- Two private `WeakMap`s use whole canonical root identity, never an objective revision, profile name, or caller-provided validity bit.
- Every external mutable/frozen/Proxy root takes the original uncached path on every call. Its original rejection/exception semantics are preserved; freezing an external object does not turn it into a trusted result.
- Both success and failure results are computed from the unchanged validators. Cached results are frozen private copies, and every return is a new object. Current result fields are primitives, so shallow copying does not leave a nested mutable route to poison the cache.
- Dependencies remain deterministic state reads over the existing frozen catalogs. State replacement creates a new key; equal revisions across different profiles cannot reuse a decision.
- Weak references do not pin discarded profile/state roots. No cache-reset or cache-forging API is exposed.

`app/src/main.js:208,223–230,512,638`:

- Dispatch, profile load/start, and reload use the returned canonical copy. No non-null main state receipt was missed.
- Controller-owned state and `controller.snapshot()` retain their original detached mutable-copy contract. Controller/store/state validation code is unchanged, and copying happens only on successful receipt paths. Failed saves keep the previous main root.
- `wildernessView` reuses views only for certified roots; external/test snapshots are read afresh. Existing view consumers use the returned values for display/scene selection and do not mutate the cached view objects.

## a16 death, accessibility, and save boundaries

- `panel` still focuses the dialog before applying background `inert`/`aria-hidden`; valid `closePanel` restores background state and focus. Blocked/dead close paths remain guarded.
- The integration-sensitive profile-load line still contains both `modal.hidden=true` and `setDialogBackground(modal,false)` after battle creation. The performance hunk did not discard the a16 restoration change on that shared line.
- HUD-menu and `showMenu` death checks remain; current-modal containment and the Retry/Reload/read-only death-observation action allowlist remain. Settings changes still reject all three death markers.
- The modal polite status region, read-only death diagnostics, Retry return path, and blocked-save panel handling are unchanged.
- Existing strengthened a16 stale-dead-action assertions were retained. The `expert-main-input` integration appends the new receipt test without replacing the a16 tests. The profile-load fixture adds a canvas focus stub and its new snapshot-ownership test; existing ownership assertions remain.

## Verification performed by this reviewer

- Exact source/body normalization and byte comparisons described above.
- `node --test app/tests/immutable-snapshot.test.mjs`: **15 passed, 0 failed**, approximately 140 ms. See `reviewer-immutable.log` and `.exit`. Coverage includes copy isolation, mutable aliases, returned-root provenance, getter rejection, hostile inspection, malformed canonical input, dynamic missing properties on a frozen Proxy, and a Proxy wrapping a certified root.
- Read the candidate's actual-main focused result: **2 passed, 0 failed** in `focused-main-merge.log`; covers successful checkpoint/controls/rest and failed save, plus load/reload/profile ownership. This is existing coordinator evidence, not a second reviewer execution.
- Inspected the new earned-route cache/view/simulation tests and their real dependency imports. Their aggregate outcome must be taken from the coordinator's final log, not inferred from this static review.

## Remaining supported-browser gates

1. Verify real death-dialog AX membership and Tab/Shift+Tab containment: background menu, hotbar/touch controls, and canvas must be absent/inert; Escape must not resume a dead character.
2. With recording enabled before an encounter, verify death diagnostics contain only the allowed read-only controls and return correctly to death; ordinary Retry restores healthy controls/focus once. Check ordinary menu/nested-panel closure and alive profile switching as well.
3. Observe modal status announcements if a normal recoverable error occurs; do not corrupt live storage to manufacture one.
4. Repeat ordinary-input wilderness combat and traversal, comparing frame records and cold state-reception moments. The reported cold synchronous scene speedup does not prove that native rAF stalls are resolved, identify every remaining stall source, or establish rendered input/audio latency.
5. Use the publisher-owned supported browser and isolated authorized QA profile. This review neither ran nor authorizes alternate nativeCanvas/isolated-Chromium retries, save imports, Git publication, or deployment.
