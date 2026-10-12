# R14a18 independent recovery-feedback copy

Baseline: `5b767fd3724d382f81569c77054c73bfceca135f`, `codex/emberwatch-rebuild`, separate `/workspace/emberwatch-proto` checkout. `cb-ll` and original Emberwatch remain untouched. No a19 writer/JSON-hook changes were imported or recreated.

## Diff boundary

Only three display strings in `app/src/main.js` change:

- Existing recovery toast: `후딜 중 · 동작이 끝나기 직전에 다시 누르세요.`
- Existing same-sequence save-wait row: `저장·안전 처리 대기 상태 관측 · 대기 시간 미측정`.
- Common diagnostic clarification: `대기 상태 관측과 입력 연결 종료 사유는 별개입니다.`

No duplicate alert, new UI state, persisted field, CSS, observer, input queue, combat, resource, cooldown, save, serialization or migration changes. Reversing these three substitutions reproduces baseline main.js exactly. Existing status region, same-skill action-start dismissal, safety dismissal and 3.3-second expiry stay intact. OS key repeat does not renew the recovery toast; repeated fresh presses retain existing behavior.

Project and root AGENTS read. `.agents/skills` is absent; `.codex/skills/verify-project/SKILL.md` read. Canonical Library plan version2/v1.1 read (623 lines) and local requirement trace reviewed without retrying its historical materialization block.

## Verification and limits

Focused production-handler/observation regression: 208 passed, zero failures/skips/cancellations (`focused-tests.txt`). Two added checks cover same-sequence waiting isolation, rejection without a waiting observation, read-only state/revision, existing status markup and repeat/blur notice behavior. Existing notice ownership, expiry and held restart checks remain.

Fresh full suite: 4485/4485 passed, zero failures/skips/cancellations (`full-tests.tap`).

Syntax: pass (`lint.txt`). App build: pass, 125 payload files / 16,744,302 bytes (`build.txt`); 124 copied source hashes match. Built main.js matches source, SHA256 `54aa6762761673aac3e894991e5ace0e21cb2b34f4569b187d762c2ebd350ac1`.

`pnpm sync:registry` failed before the script: fallback pnpm tried its dependency status/install path and could not create `/home/agent/.local/share/pnpm` (ENOENT). No dependency installation completed. `corepack pnpm build:vercel` failed before execution because the configured package manager was unavailable and its cache directory `/home/agent/.cache/node/corepack/v1` could not be created (`vercel-blocked.txt`). No installation, permission escalation or alternate authorization path was attempted. These repository-wide gates remain blocked; the standalone project checks require no installation and passed.

No release label/version change, deployment, actual dot play, visual acceptance, listening or native AX acceptance is asserted.

## Native QA required

At enemy melee range: RMB hammer → Q → Space → hold A+J. Confirm the existing toast explains the rejected Q/first J immediately; later accepted mace start clears its own notice and contact is separately observed. Q remains a resource-cost HUD label; this patch does not add a dynamic rejection label.

Try repeated fresh taps and OS repeat, then blur/refocus and menu open/close. Check that stale notices disappear at existing safety boundaries and do not obscure later messages. Verify screen-reader announcements and focus containment in the supported dot browser. In input diagnostics, waiting wording must appear only on an input sequence containing save-wait, never imply that a recovery rejection was caused by saving, and remain separate from later held-start rows.

## Authorized aggregate follow-up

After explicit dependency-install authorization, original `sync:registry` and `build:vercel` commands both passed (exit0). See [aggregate-followup/README.md](aggregate-followup/README.md), exact logs and package/hash summary. Earlier blocked results above are historical. Runtime source is unchanged; this follow-up adds evidence only. Native QA and the existing launcher root-vs-qa-r14 entry mismatch remain separate gates.
