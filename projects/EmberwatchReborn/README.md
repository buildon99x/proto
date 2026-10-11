# R14a5 현재 체크포인트

입력 관측의 식별자/렌더 진입·반환·소리 요청 구분과 국소 스킬 FX 대비 보강. 최종 전체3,829 자동검사·lint·정적빌드 통과. 실제 R14a5 후보 QA는 진행 전이며, 이전 v58 실제 QA는 별도로 보존했습니다. docs/verification-r14a5/README.md 참고.

# R14a4 현재 체크포인트

진격 채널의 실제 pulse에 FX를 연결하는 presentation 수정. 전체3,792 자동검사·lint·빌드 통과, 실제 후보 화면 비교는 미완료입니다. docs/verification-r14a4/README.md 참고.

# R14a3 현재 체크포인트

R14a2 실제 입력에서 찾은 관측·키 이름 표시 수정. 전체3,774 자동검사 통과, 정적 빌드 완료. R14a3 실제 후보 검증은 진행 전입니다. docs/verification-r14a3/README.md 참고.

# Emberwatch Reborn — recovery reimplementation

This new work surface starts from preserved original Emberwatch0.4.7, commit7240e49430ef34b08cc1f0ac332fb7912e135a4d. It is a reimplementation after the2026-10-09 environment incident, not recovery of the missing cedd0f2 Reborn source or its Git history.

Original `projects/Emberwatch` remains unchanged. R3a connects first-entry training, Apprentice skills, a25-enemy road, the first patrol, a sealed miniboss chest, death/retry, profile-safe remapping, seven equipment slots, a small blacksmith/crafting loop and isolated save handlers. It is an early playable development slice; ordinary-input gameplay and full campaign acceptance are not established by the automated build. Historical425-test results and the former fresh-gameL8 playthrough are evidence about the lost build, not a passing result for this work surface.

## Current R14a2 controls work

POE-oriented Warrior input transplantation takes priority; balance and R13 expansion are paused. Read `docs/poe2-input/r14a2-integration.md` for exact controls4/5, configurable skills, context click and actor-body contracts. R14a1 was published only at `/qa-r14/`; R14a2 source passed 3,763/3,763 unique automatic tests and its static build; its new normal-input/visual/audio QA is still pending. Existing public root R11b6.1 stays separate. Source/library preservation and actual QA are reported independently of Site source commits and GitHub pushes.

## Historical R12a implementation status

The local R12a candidate connects the earned Expert/B report to W wilderness survey, a reusable hook and return anchor, a persisted receiver clue/puzzle, a pre-fight cover/channel choice, keeper, separate evidence, optional rescue and Eda report. State version5 and a separate qa-r12 profile boundary preserve existing v4 B payloads. Orin's future repair facility, Master and the whole campaign remain unfinished.

See `docs/r12-wilderness-runtime-integration.md` for exact ownership, authored rewards, controller/save races, current verification and remaining normal-input gates. The title/metadata and code registration do not establish actual tactical enjoyment. This branch has not been published or archived externally by this integration worker. Earlier sections below are historical recovery context.

## Inputs
- Canonical plan: `emberwatch-hammerwatch2-mechanics-port-plan.md`, Library version2,2026-10-08. Full source download is currently blocked by HTTP403; accessible Library reading is being used to restore the acceptance checklist. A prior canonical checksum must not be treated as newly verified.
- Original0.4.7 source/resources:167tracked files verified against Git blob IDs and independently archived before new implementation.
- Incident excerpts: partial dialogue diff, equipment UI regression text/reconstruction and observed QA facts. They are not a complete runtime or loadable save.

## Order and safeguards
1. Recover an explicit requirements/source-confidence checklist.
2. Reimplement Warrior first, in small connected and tested increments.
3. Label confirmed reference rules, unknown reference details and authored Emberwatch adjustments separately.
4. Check real runtime handlers and normal-input first-entry→growth→equipment→death/retry→promotion→boss→save continuity.
5. Preserve source, tests, provenance and measured results in user-owned Library archives at each verified checkpoint. A local commit alone is not backup completion.
6. Keep campaign depth and human play-time acceptance separate from test counts, content counts and simulation seconds. Do not lengthen only HP or walking.

The existing remote refs, public0.4.7 and previously pending upload/import approvals are outside this recovery change surface.

## Current verification
Run `npm test` and `npm run lint` in `app/`. See `docs/progression-r1.md` and `docs/state-save-r1.md` for source/tuning separation and fixture limits. The separate public GPT Site is https://emberwatch-reborn.buildon733500.chatgpt.site/ . R2f ordinary-input QA reached level2/13kills through normal inputs; see docs/r2f-normal-input-results.md. R3a equipment UI, full campaign and visual/audio acceptance remain separate unfinished gates. See docs/equipment-r3-integration.md for current checks and limitations.

R14a7 final automated checkpoint:3,923/3,923 unique tests,0fail/skip/cancel,113877.982352ms; lint/build passed. Counts include prior3,853 plus70 new (32 contact,32 frame,6 integrated); overlapping focused runs are not added. Actual a7 browser/FX/frame/voice review remains unverified and no deployment occurred.

## R14a8 local lifecycle feedback candidate
This separate work surface follows the frozen a7 source. It addresses a death/retry action-label inconsistency observed in public v58 normal play. Publication remains on hold; the actual first-boss profile reached L3 and retried, but did not defeat the boss. Read docs/verification-r14a8 for current automated checks and remaining browser gates.

Final R14a8 automated check: **3,940/3,940 unique tests**, 0 fail/skip/cancel, 115268.864147ms; lint and build passed. This includes the existing 3,923 plus 17 new lifecycle tests. Actual a8 browser/FX/contact/frame/audio acceptance remains unverified; no deployment occurred.
