# R12a1 safe Wilderness integration

2026-10-10. Candidate source only, app0.12.0-reimplementation.2. W baseline
`ddee4c007a9402da01fa2676ce46b10e93908ffa`; verified R11b6 baseline
`17b13fa04fec8336d2c08f3c4603a0d2e8d00276`. Neither baseline's old test count is
inherited as a current pass. Original Emberwatch remains unchanged.

## Integrated boundaries

- Keep the existing W world/state5/epoch-based command/UI integration, authored
  town geometry and keeper pattern. No new combat or reward balance changes.
- Preserve R11 profile-selection intent, owner and presentation guards across
  copy/load/start awaits. Keep W checkpoint busy/safety/checkpoint/capture order.
- Restore R11 UPGRADE_* immediate controller blocking and immutable pre-v4
  recovery semantics. Add separate actual-source1..4 pre-v5 storage/fence and
  explicit dual-checkpoint UI, not a rewrite of the earlier historical sidecar.
- Restore/candidate-copy target occupancy includes head, both slots and both
  sidecars, even if bytes are corrupt. Both involved locks are acquired in a
  consistent sorted order. Source namespaces and records never change.
- Existing historical pre-v4 unit assertions and the R7→R11 check retain their
  version4 expectations against a byte-preserved real R11b6 fixture. New tests
  exercise current production pre-v4 APIs as well as v5. The actual R11→R12
  helper tests common known namespaces in isolated memory; a qa-r12 namespace
  rejection is explicitly not old-reader fencing evidence.
- Pre-v5 restoration inside qa-r12 is not directly playable by unmodified R11,
  whose namespace allowlist ends at qa-r11. Keep the original qa-r11 profile;
  there is no hidden backward namespace copy or automatic restored-game load.

The historical module manifests record exact source commits, file sizes,
SHA256s and Git blob IDs. Historical module bytes are not edited to make a test
pass. Direct old-version writes/edited fault adapters are synthetic fixtures,
not browser imports, actual earned gameplay, or live exploit demonstrations.

## Packaging and deployment boundary

Both default and recovery-only builds are local artifacts. Parent publication
must replace only `/qa-r12/` and its candidate recovery files, retaining root
R11b6 and its independent release-recovery directory byte-for-byte. This task
never operates those deployment files. Root receives no W content.

A bounded candidate-route guard now refuses unsupported QA-looking gameplay
paths before start/load/copy/recovery storage access. Supported qa-r4..12 and
existing ordinary release/root/index paths retain their prior meaning. This is
not a general URL-router redesign. Standalone candidate recovery return links,
including storage-unavailable startup, remain in the same candidate namespace.
Parent packaging must still keep W files only under qa-r12; root remains R11b6.
Actual hosted `.html`→extensionless recovery aliases need native QA.

## Verification record

- `verification-r12a1/historical-v4.txt`: retained39/39, 1144.497686ms.
- `verification-r12a1/storage-focused.txt`: current storage/state/candidate107/107,
  including66 new v5 storage checks; 4665.780326ms (raw log is authoritative).
- `verification-r12a1/r11-legacy-reader.txt`: one wrapper,31 named actual-R11
  scenarios; source hashes checked, common release/qa-r11 namespaces.
- UI, combined W/upgrade, syntax, complete serial aggregate and build/hash
  results are recorded below after their final runs.

## Remaining acceptance

No browser, Site, Library or remote Git action is performed by this task. Source
and build preservation/publication are owned by the integrating parent. W native
Normal/Hard comparisons with the actual earned L18 invested Hammer build and a
lower-investment legal build remain required. Legitimate strong output is not a
reason to inflate HP or force survival. Keeper tension, exploration/readability,
audio/mobile quality, Master and the complete campaign remain unverified.

### Final focused integration results

- Recovery/W/profile UI153/153,55904.370905ms. One earlier run was stopped
  during serial-lane coordination (exit130); its partial log is retained and
  is not a passing aggregate or an assertion failure.
- Combined actual-R11 + earned B→W upgrade + metadata9/9,4816.802292ms.
- Final bounded QA-route/recovery/ownership136/136,1045.736727ms.
- Storage and independent UI/source reviews found no additional blocker within
  atomic-localStorage/cooperating-Web-Lock assumptions. Known corrupt-head
  staging limitations remain explicit in the storage contract.

### First complete aggregate and retained correction

Source checkpoint4984053 ran2,406 tests serially:2,405passed and1failed,
396798.162023ms. The sole failure was the retained T title test expecting
`R12a` instead of the actual `R12a1` identity. Only that exact release-label
expectation was updated; the same test retains Normal-scope, incomplete-Master,
R10-forward-copy, Expert-verification and no-release-new-button assertions.
Raw failure evidence is `verification-r12a1/aggregate-initial.txt`. It is not
reported as a full pass. Final complete re-verification remains required.

Whole-diff whitespace checking also reports two whitespace-only lines in the
unchanged inherited R11b3 failed-run log. Those historical raw bytes, and frozen
fixture blank-at-EOF lines, are intentionally preserved rather than rewritten.
Current source/test changes are checked separately.

### Bounded Expert explanation forward-port

After the initial aggregate stopped, the parent authorized display-only patch
`bc0189889924eae44a8cd0d1d8e4b9ef43155f10`. It applies only effectText and the
showTraining next-rank description call, plus40 new checks and its source report.
Conditional reference values remain distinct from learned runtime effects;
unknown values stay unknown. W checkpoint/capture/profile-owner/save code is
unchanged. Public root remains R11b6 and candidate label stays R12a1. A direct
patch check rejected surrounding W journal context without changing files; the
identical formatter body and single call were then applied with exact old-text
match assertions. No broader main.js replacement was performed.

## Final combined automatic checkpoint

Final source `f6dc8fc7948018cc4ca154bbf3fb49162a1ecead`; app source/tests tree `2f07739d1b788d4fd9ad086fcb48eb64e06a5ea2`.
2,446/2,446 passed,0 failed/cancelled/skipped/TODO,399540.152311ms serial
on Node24.19.0. This includes the40 Expert-description checks. Raw complete
output: `verification-r12a1/aggregate-final.txt`. The complete run precedes the later parent-requested wording-only change
recorded below; no subsequent full aggregate is claimed.

Syntax passed for source/tests and both historical helper scripts. Both default
and recovery-only builds passed:95 payload files plus manifest each,272 relative
module dependencies each, every size/SHA256 and local import target verified.
Default payload16,476,417 bytes; recovery payload16,475,408 bytes. Future
expedition modules remain excluded. All167 original project files match their
recorded SHA256 and Git blob IDs. Exact build/commit hashes are in
`verification-r12a1/final-summary.json`.

Required registry and Vercel commands both exited1 before project work because
`/home/agent/.local/share/pnpm` could not be created (ENOENT). They are blocked,
not counted as passes. This does not change the independent static build result.

Parent-provided R11 native evidence from source128aae5 is preserved in
`r11b6-expert-effects-partial-qa.md` and `r11b7-native-description-qa.md`. It records
actual R11 training preview, Inner1/Wrath1–3 purchases and reload. Public Sitev46
retains R11b6 root and R11b7 at qa-r11 per parent report. These are R11 observations,
not W gameplay validation or publication by this task.

The parent owns Library preservation, qa-r12 publication, root/release-recovery
file-hash preservation and native W/recovery alias QA. No remote, Site, Library
or browser operation was performed here.

## Final wording-only checkpoint — 10:37 UTC

Parent final review requested the W return notice distinguish regional transition
from normal walking. Source a93ed235e0f54244e793bdd92091a8cc194b3d10 changes
only “이동은 자원이나 재사용 대기를 회복하지 않습니다.” to
“지역 전환 자체는 자원이나 재사용 대기를 회복하지 않습니다.”. The sentence
about normal regeneration during ordinary walking is unchanged. Added assertions
to the existing actual portal/hints presentation test confirm both sentences.

Focused1/1 passed,2817.039931ms (`reentry-wording.txt`). Source/test syntax and
both builds were rerun after this change, with95 payloads plus manifest and272
resolved relative dependencies each; all size/hash checks pass. Final default
payload16,476,431 bytes; recovery payload16,475,422 bytes. Exact final artifact
hashes are in `verification-r12a1/final-summary.json`; before-wording results are
preserved separately. The full2,446 pass is explicitly before this wording-only
correction, and was not rerun afterward as directed by the parent. No gameplay
formula, save, reward, collision, controller or input code changed.
