# Remaining acceptance and exact local path

Current source candidate:0.14.0, not the public0.10.0/default or published0.12.0 candidate. The branch is codex/dead-freight-gunplay-v1. Remote commits, source receipts and historical diagnostic records must not be read as human-play evidence.

## Executing this candidate on JH-LAPTOP

The read-only server currently serves app/dist on127.0.0.1:39605. Use **http://127.0.0.1:39605/?testProfile=workshop-qa**. Supported profiles are exactly local-qa, trajectory-qa and workshop-qa; each has its own explicit prefix for bank/settings/all backups. The previously given jh-laptop-qa-* URLs were unsupported and stop before renderer/audio/storage/game initialization. Their HTTP200 results did not prove usable startup. Do not clear, copy or seed normal user profiles.

If the server is absent, run these in this project's root using the existing bundled Node executable (no installation/security changes):

```powershell
Set-Location 'C:\Users\cjh\Documents\Codex\2026-10-14\task\proto\projects\dead-freight'
& 'C:\Users\cjh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' app/build.cjs
& 'C:\Users\cjh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools/rig-preview.cjs
& 'C:\Users\cjh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools/serve-qa.cjs
```

Reuse an existing verified server when the port is occupied. /build-manifest.json identifies actual packaged version/hashes; /rig/ is isolated visual utility inspection, with no inventory/save/audio/pointer lock. Validate the visible test-profile badge and candidate version before Start. Menu bank decode/preparation is silent; use one normal Start gesture. Do not infer active WebGL, relative mouse support or actual sound from HTTP or a queued panel.

The supported CUA route previously fails during MXC/kernel initialization with HRESULT0x80070003 before browser inventory; standalone node_repl needed by Computer Use is not exposed. Codex open_in_codex returned queued for executor thread01a13633-6020-72f7-a268-58dcdff8b08a, not browser-loaded confirmation. No repeated identical helper retry, workaround UI automation, browser security toggle or account change was made. Resume actual inspection/input only after a supported state query establishes a working browser/control surface.

## Source milestones and open work

| Area | Source implemented / bounded | Still required |
| --- | --- | --- |
| Four existing guns |Per-UID state/ledger, finite-speed/gravity120Hz swept trajectories and contact-order damage|Ordinary live firing, cover, arrival/TTK/recoil/ADS/holster/swap/reload acceptance; broader v1 common input/tuning and six-class scope|
| First-person actions |Preserved unpublished rig work, connected joints/grip/pin/throw/treatment/melee/recovery, receipt/interruption guards|Real natural motion/readability and ordinary mouse/input; full equip/melee variants and six-class animation set|
| Audio |Recorded four-gun/contact/utility Foley, source routing/markers/cancellation|Actual device listening, timing captures, surface/room balance and environment/music/voice buses|
| Regions and raid loop |Unchanged Black Pines + original Canal Ward urban canal/two bridges/item-gated exits, loot/home settlement/repeated source loop|Actual travel/two encounters/each exit/death/replay/persistence; two finished authored city maps and device performance|
| Home economy |Existing sales/capacity/overflow plus four catalog-derived scrap recipes and armor-only repair with schema6/UID/receipts|Actual UI usability/disk persistence, larger progression/merchant/restock scope, firearm wear, mods/EMP/signal recipes|
| Existing AI |Current basic opponents/boss and distinct region placement/ranges/leashes|Hearing/shared noise, richer perception/path behavior, autonomous-weapon parts/weakpoints and encounter variety|
| Movement/throwables |Existing sprint/dash/slide and selected frag/preview|Full crouch/cover/lean, impact/smoke/EMP variants, additional classes and five-person play evaluation|

## Human acceptance route after control recovery

1. In workshop-qa choose each region and an actual loadout. Travel, fire and fight encounters with normal relative mouse/keys; record source manifest, screenshots, action transitions, audio sync and frame times.
2. Canal: recover west archive/scrap, kill pump target, take bounty. Ferry needs archive+bounty/8s; winch needs bounty/12s. Test movement, damaged armor, exit departure and required-item removal. Forest retains its original routes/two6s exits.
3. Extract to owned stash; cash is contract cash once, retained loot is not auto-sold. Quote/confirm a craft or damaged armor repair; verify materials/currency/UID/durability, take output into the12-slot/30kg loadout and redeploy. Sell with exact catalog values once. Do not spend archives/bounty as materials.
4. Repeat both regions, death/safe-pocket recovery, reload and storage-failure/retry in isolated profiles. Schema6 must preserve exact prior schema5 bytes in its prefixed backup before first write. Observed stale writers are refused; localStorage has no compare-and-swap, so cross-tab atomicity is not promised.
5. Review genuine frames/sound/device performance and close remaining issues before any overall completion/deployment or new liquid-metal AI gate. Liquid-metal implementation remains reserved for dot after existing acceptance; no local implementation here.

## 0.14.1 source audit gate

Feature scope remains frozen. Isolated adversarial storage tests reproduced and fixed stale workshop draft deadlock, repaired issued-armor return identity mutation, and lost crafted-UID resurrection through the fresh-issued exception. Explicit cancellation preserves the newer record byte-for-byte. New optional deployment/repair ownership fields retain legacy schema6 readability. These source checks require actual two-tab/restart/disk verification after supported browser control works; they do not close any human play/listening/performance gate. Independent audit findings still need reconciliation when supplied. No firearm wear/mods or local liquid-metal implementation was added.

## 0.14.2 independent audit reconciliation

The supplied interim audit identified insufficient fresh-controller raid lifecycle evidence. Added six source tests using new mocked page controllers/storage handles after deployment/settlement failure, termination and acknowledgement loss, plus a shared store for observed stale-tab conflict. They reproduced a display defect: another page committed loss recovery, then the old page claimed its extraction payout was saved despite bank0. The durable outcome now controls that message; other-page settlement remains unchanged. No browser lifecycle acceptance is inferred. Truly simultaneous cross-process read/check/write overlap remains outside the localStorage atomicity contract; sequential observed conflicts do not close that gate. Final independent audit and actual browser close/reload/two-tab evidence remain required.
