# October17 pinned build recovery and burst-input feedback

Base `1c93d23edd8e59c88d51662381e679c1712a25c1`, isolated `/workspace/emberwatch-reborn`, branch `codex/emberwatch-rebuild`. This checkpoint repairs ephemeral cooldown feedback and qualifies additional input cases. It does not close overall crusher quality, other melee builds, listening or protected a19 work.

## Root build diagnosis and recovery

The executable named pnpm is the environment fallback wrapper for installed11.19.0. Root package.json pins9.15.4. The installed11 implementation defaults `verify-deps-before-run` to `install`; its pre-script dependency-status path attempted `/home/agent/.local/share/pnpm` and failed before either required script. Existing project dependencies were present. No project dependency install, package upgrade, lock rewrite, integrity suppression, environment HOME change, escalation or approval retry was used.

Corepack supports a writable cache through [COREPACK_HOME](https://github.com/nodejs/corepack#environment-variables). The existing Corepack resolved the repository's exact pinned9.15.4 using its normal verification. Commands from the repository root:

```sh
export COREPACK_HOME=/workspace/emberwatch-reborn/projects/EmberwatchReborn/app/artifacts/qa-build-burst-20261017/corepack
corepack pnpm --version
corepack pnpm sync:registry
corepack pnpm build:vercel
```

Version9.15.4, registry12projects and common build all succeeded. A second common build after the UI fix also succeeded, including all12projects and the Next launcher. Its log is retained here. Nonfatal chunk-size warnings remain. This is a local build, with no deployment or main merge. The global fallback configuration was left intact; use the explicit pinned command above in this environment.

Before root generation, the existing Reborn dist and registry/package/lock were backed up in ignored task artifacts. The generated registry was retained there for evidence, then restored byte-exact to its pre-build source so unrelated catalog/timestamps were not committed. Root package and lock match their backups. Other generated build output is untracked/ignored. Production code changes are limited to main.js and action-feedback.js; protected equipmentAction/dispatch/syncVitals/report/checkpointPanel functions match base exactly. Original Emberwatch167 files and all other project tracked source are preserved.

## New input cases and controlled reproduction

Fifteen production-main tests cover roll remainder .18001/.18/.17999 at30/60/120Hz and E/Q/E during the late roll with held mace under controls4/5. Early input is rejected; the boundary accepts once; latest E wins without Q payment and held mace resumes. Initial six mixed tests incorrectly assumed no asynchronous checkpoint wait immediately after J/roll; yielding to the existing checkpoint fixed the fixture, without changing the writer or gameplay.

The native20-tap trial showed a0.1s rejection after the HUD returned ready. Its first screenshot and later saved cooldown snapshot were not simultaneous and alone would not prove expired cooldown. A subsequent native Q trial read the visible DOM at rejection, after1100ms and immediately after its screenshot: Q was ready while the old message remained. This was executed by cached **old** code, so it is before-fix evidence only (`native-cooldown-expiry-check.json`, screenshot12).

Eight real-main notice tests independently reproduce expiry, same-skill acceptance, newer unrelated message and newer other-skill cooldown under controls4/5. Before the fix six fail and two message-preservation guards pass. The fix tags only the current cooldown notice with its skill ID, clears it on matching acceptance or authoritative cooldown expiry, and releases ownership on safety/normal toast replacement. Generic later messages and another skill's still-live cooldown remain. No command, resource, recovery window, safety threshold, persistence or balance changes.

Focused corrected result25pass (23new plus2existing selected recovery guards). The first full after-fix run was4751pass/16fail/4767: an older resource-display fixture extracted the real event loop but omitted the newly imported dismiss function. Its injection was updated;42/42 resource-display tests pass. This was a test harness ReferenceError, not weakened assertions or a resource-policy correction. Final full result **4767/4767 pass**,0fail/skip/cancel,420183.08929ms. App lint passes; no gameplay acceptance is inferred from these checks. The earlier4759/4759 full run preceded the eight notice tests and is not the final result.

## Browser evidence and cache failure

Installed Chromium151 plus Python Playwright/CDP are available; no dedicated computer/browser tool is exposed. Normal keyboard/mouse/Continue on the existing port4187/profile only. No storage import, direct state injection, store module edits or namespace switch. Current Chromium is headless/muted.

Ordinary reload continued executing an old module; a later reload mixed the new main with a cached old dependency and produced an import error/blank page. Those runs are failures, not post-fix acceptance. Standard DevTools cache disable plus normal page reload loaded the unchanged built files consistently. No game source/cache-busting or security settings were changed. The successful current run records Q rejection tagged `shield_charge`, followed by actual hotbar readiness and empty/invisible toast in the same DOM snapshot; The intended screenshot13 rejection capture had already reached ready by the time pixels were returned; it does not depict the transient rejection. Screenshot14 independently shows ready state with the obsolete message absent, while the rejection itself is confirmed by the preceding DOM record. Screenshot12 remains the before-fix ready-HUD/stale-message comparison. Actual readiness was awaited instead of assuming wall time equals game time under capture/test load. No page errors in the subsequent full native sequence.

Before-fix12-second held J trial reached held observation22; release plus an additional1500ms produced no newer held start. New current-code capture covers12-second J hold, release1500ms, twenty J taps90ms apart, release1500ms, Space then E100ms later, and a fresh E500ms later. Its observation panel shows early E42 rejected `recovery-too-early`, then fresh E43 start0.60ms/contact468.20ms; roll41 start0.90ms. Recent burst inputs include rejected recovery taps and accepted starts93.70/149.00/161.50ms, including existing checkpoint waiting. These clocks are browser instrumentation under capture/load, not physical input/display latency. Only the recent retained observations are exposed; no complete new hold count or repeat interval distribution is inferred from them.

The segment is an already-cleared first pass group: no new target hit, damage, ◆ priming, wave payoff or live-warning readability acceptance. The preceding checkpoint's elite+2rangers evidence remains separate. Current normal reload selects classic mode; no claim that this empty post-roll E proves crusher FX. The source-frame video has no synthesized frames or sound; timing index is retained. Active screenshot16 confirms normal HUD and absence of an obsolete rejection after the accepted E. Actual listening, physical latency, touch and native AX remain unperformed.

## Preserved state and limits

Final bounded state is alive/paused ashwind_pass at(308.999999917,395.0000001),HP104.76578225068619/113,MP31.059591999999984/58,ST69/69,L8 Adept,418G,XP259.5,50kills/1death,15skill/20attribute points. Q moved the player normally; E spent30MP and normal frames regenerated mana. Equipment instance references, ranks, attributes, point banks, exact controls and campaign objectives remain equal to this task's initial snapshot. No new death/retry/expedition completion. Page is left paused/frozen; set lifecycle active before ordinary resume.

The original a19 invocation/diff/review is still unavailable. Growth/save/equipment extension, hand/ring/neck/belt model, Master13 effects and repeat expedition remain incomplete and blocked as described in ../verification-crusher-fx/writer-resumption-scope.md. No retry, alternate hook/writer/namespace, or inferred policy clearance. Balance tuning remains held. Library outcome is recorded separately; local Git/video existence is not Library success.

Library outcome: the one current supported ordered batch (explicit retry of the previous video, current ZIP/video/two new screenshots) failed before app discovery/preparation/transfer/finalization with `hosted apps tools/list request failed: network`. Result stdout0bytes, no IDs and no saved items. Read-only Library listing succeeded; the upload bridge did not. No alternate/direct fallback, historical blocked-file retry or unknown-finalization retry. Source ZIP at ec3d962 contains1821 tracked project files,40,742,556bytes, CRC pass; source-zip-info.json records its SHA256. Local files and remote Git do not substitute for a Library backup.
