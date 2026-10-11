# R11b5 root-upgrade safety gate

2026-10-10. The currently published root is R7a4/schema3, while the ordinary-input
verified R11b4 candidate is schema4. Root promotion was paused after confirming
that forward compatibility is not equivalent to rollback compatibility.

## Reproduced risk and release constraint

The old dual-slot writer preserves one previous receipt. On the first v4 save,
unmodified R7a4 can treat the preceding v3 slot as recovered and write over the
first newer progress. After a second v4 save, both old-readable slots are gone.
An unchanged old browser tab is therefore part of the upgrade test surface.

The bounded implemented contract retains a verified immutable raw pre-v4 sidecar
before touching the live slots. The first upgrade head carries its prior receipt
under a new field instead of old R7's recognized `previousCommit` field. R11 can
still recover it when needed; R7 cannot use the old-version fallback to write
through a committed upgrade. Commit and fencing are one head write, not a later
cleanup step. Exact failure cases and old-module tests must pass before release.

## Recovery experience

The new title-only recovery UI reads a saved historical summary. It explicitly
copies that snapshot to a different, empty qa-* profile within the same namespace.
It never overwrites the source, current progress or another existing profile;
candidate recovery never writes to release. The UI binds the exact inspected
backup checksum to the request. Duplicate clicks, changed selection/panel epochs,
loaded gameplay, delayed success and delayed errors cannot reopen obsolete UI.

The copy is not automatically loaded. Its format, original receipt, level/XP,
backup time and target name are shown. Continuing that copy in the new application
will upgrade it again on its next write. The historical copy is the restoration
point; subsequent new-version progress is retained separately, not magically
converted for the old application. Already-upgraded records and new v4 games have
no fabricated v3 history. No browser save file import, hidden storage injection,
automatic rollback, file download or third-party data transmission is added.

## Validation status at this checkpoint

- UI module19 focused checks plus existing title/selection26:45/45 passed.
  Those UI cases run production renderer/handlers with DOM/save-API probes.
- Storage implementation and old-R7 real-module rollback tests pass. Actual
  browser recovery remains pending here. Integrated focused
  backup/UI tests passed72/72; an additional direct run against the unchanged
  published R7a4 modules passed32conditions. Default and recovery-only builds
  each contain90hashed payloads and240resolved relative imports.
- No R11b5 or W root promotion/publication has occurred from this checkpoint.
- Existing R7a4 root56 static files and hosting manifest are separately preserved
  with CRC/SHA256; this archive contains code, not user browser saves.
- The new W integration remains separate, with2169 automatic checks and its own
  Library source/build checkpoint. It is not covered by R11b5's version4 gate yet.

The recovery-only entry is separately packaged with `node scripts/build.mjs
--recovery`. Its independent deployment path `/save-recovery/` always uses release;
candidate `/qa-r11/recovery.html` always uses qa-r11. Unknown recovery paths fail
closed instead of silently opening release. Neither entry starts the game or
automatically reads/writes a profile. The rollback publication must retain this
independent directory with all its own imports, alongside the R7a4 root. An older
entire Site version without that directory is not the prepared rollback target.

If the original head was already corrupt, a failed upgrade can leave the old
reader unable to locate its preceding receipt; a malformed partial-slot fault
can also make the patched live profile unreadable. The verified sidecar still
provides the original committed state for explicit empty-profile recovery. This
is distinguished from the ordinary intact-head failure path in the storage
contract, not claimed as automatic recovery of every broken envelope.

Read the later final verification section before interpreting this document as
release evidence. Automated corruption/quota/old-tab probes are not native play.

## Final integrated automatic checkpoint — 09:36 UTC

Full serial2116/2116 passed, zero failure/cancellation/skip/TODO,
256039.332557ms. All retained2044 remain, with72new backup/old-reader/UI
checks. The bundled old-reader test additionally performs32conditions, not
32extra top-level test cases. Syntax, both90-payload builds, both240-import/hash
checks and original167Git-blob/SHA256 integrity passed. Registry and Vercel
commands again exited1 at pnpm-home ENOENT and are not counted as passes.
Native recovery and safe rollback-publication gates remain open.
