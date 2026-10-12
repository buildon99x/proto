# Apprentice graph training UI

Baseline `3c044a46c8b6522cbea6e1040eb65fabe7e16612` on `codex/emberwatch-rebuild`. Command/file/remote access was explicitly rechecked after connection-end notifications. Same workspace/authorized remote; no new environment, installation or authentication route.

## Actual functionality and scope

Bran's existing training screen gains **입문 그래프 / 목록** buttons. Default list preserves the old route; graph mode projects the9 implemented apprentice nodes and5 actual `baseId` dependency edges from existing reference/runtime metadata. Higher tiers remain their existing lists;13 Master nodes are not newly implemented. Dependency text is also visible rather than relying on decorative lines alone.

Nodes are native keyboard/mouse buttons. Tab and Enter/Space select a node and read current/next effects, ranks, costs, prerequisites and lock reasons from `previewSkill`. Selection does not buy or save. The separate detail purchase button reuses `purchaseTrainingSkill` and the unchanged `purchaseSkill` command. It carries a UI epoch/rank check, retains old owner/profile/life/region/pane checks, busy/double-click/repeat-key guards, and preserves horizontal graph scroll and purchase/reading focus after the final checkpoint refresh. It does not invent a rank, skill point, dependency, effect or respec path.

Back/close during an already accepted transaction does not promise rollback: the existing atomic purchase may commit once, while the obsolete trainer view must not reopen or purchase again. Closing before activation spends nothing. Native repeated Enter/Space keydown is prevented by the existing dialog input handler. Stale removed buttons, stale epoch/rank and in-flight second clicks cannot pay another upgrade.

**전사 기술 배치** reuses explicit8-slot controls5 conversion and `assignSkillSlot` with current revision/life/expected skill. Only learned action skills can be assigned, passive graph nodes cannot be put on the hotbar, and duplicate assignments are rejected. Existing key mappings/prior controls are preserved by that approved API. No new saved field, writer, skill value, slot schema, equipment feature or redistribution is added.

## Verification

Focused production/model/legacy trainer checks:92/92. Five new actual trainer-handler cases cover mouse/native-key activation boundaries, read-only selection, graph/list toggle, point/rank/combat-stat updates, duplicate/stale/delayed purchase, close/back and durable8-slot assignment. Four new model cases check scope/edges, quotes, locks after legally spending earned points and unsupported selection. The upgraded DOM fixture models graph node/detail containment and attributes; all old trainer scroll/disclosure/focus/save-fault assertions remain.

See summary, full/focused tests, lint/registry/build logs and preservation hashes for the final aggregate. Test fixtures use legal earned progression and production reducers/controller/store. DOM geometry is synthetic and does not establish native rendering, touch scrolling, screen-reader experience or AAA quality. Native dot review remains required.

Combat/mode, save/state/equipment/growth/slot/input-domain and numeric balance modules remain unchanged. The frame/safety functions and strict500ms guard/50ms delta cap/observer code are byte checked against baseline. Original167 files remain unchanged. No a19, public root, deployment, new image/audio, installation or alternate store.

## Normal-play QA

Serve the complete extracted root and open `/qa-r14/`. Continue the coordinator's ordinary Lv6 profile, basic warrior saved in town. Walk to Bran, interact and open training. Select **입문 그래프**, inspect9 nodes/5 dependency lines, and use Tab/Enter/Space or mouse to choose a node. Confirm its explanation/locked reason appears without spending. Buy an affordable upgrade explicitly; verify one rank change, the quoted point deduction and corresponding existing stat/effect. Compare list mode and repeat selected purchase/focus/scroll. Do not claim all graph nodes or higher tiers are implemented by this9-node view.

Try double-click, held Enter/Space, stale/deferred clicks and back/close while a transaction is pending: no extra rank payment or old view reopening. An accepted purchase can finish once after closing; this is the existing transaction contract. Open **전사 기술 배치**, explicitly enable the existing full8-slot mode if needed, clear a skill's old slot and move it into a free slot. Check displayed key and actual subsequent combat input through the ordinary UI. Save/reload must keep actual purchased ranks/slots while graph layout/selection stays session UI state.

Check narrow-window horizontal scroll, selected node retention, focus ring, diagram text/reading order and supported-browser AX. Safety-stop findings and the coordinator's partial v75 results are separate in `safety-investigation.md`; they are not a performance fix or a weakened safety gate.

## Remaining scope

Persistent2H/ring-left/right/belt/stash and repeat expedition need currently blocked domain/writer integration. The two expedition foundations remain excluded/unrouted. Three session combat patterns and this initial graph do not complete PoE2 parity, a full graph tree or AAA quality.

Readable terminal logs normalize CR/trailing whitespace; raw-command-logs.zip retains exact outputs with hashes. Initial model failures were a wrong reference display-name expectation and an invalid point-budget fixture; the final test spends points through legal reducers and keeps all production validation.
