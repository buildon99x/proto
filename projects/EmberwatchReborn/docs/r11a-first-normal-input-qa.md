# R11 normal-input QA observations (in progress)

2026-10-10 04:34 UTC, dot Chrome own tab32, public `/qa-r10/` R10a1.
Normal Continue of `qa-r10-channel-20261010` successfully restored L16,
1331G (1211 spendable/120 reserved),131/176HP,94/94MP,98/98stamina,
34SP,125.5/780 current-levelXP and4 potions. Old LMB/J,Q,Space,RMB/Shift,T,E,F,R
HUD bindings remain. No combat/resource/XP/position input was injected.
Screenshot `r11-source-r10-l16-before.jpg` uses actual JPEG bytes.

Read-only Playwright page scope exposes no localStorage; the attempted exact
QA-prefix read returned TypeError before any values were read. No alternative
storage-access path or script mutation was attempted. UI restoration is the
native evidence; automated store-byte preservation is separately tested.

Visual P2 issue observed in the restored town: many identical large gateway
sprites crowd its perimeter, and several long labels overlap/breach viewport.
Bran/Orin/Eda are represented by shrine-like props, making identities depend on
text. This unchanged earlier scene is functional but below requested polished
2D RPG presentation. R11 B acceptance does not resolve this town composition
issue. Revisit travel landmark hierarchy and town NPC readability in a bounded
visual iteration after validating the connected Expert loop.

R11 promotion/B normal-input route not yet attempted at this timestamp.

04:44–04:46 UTC, publishedv36 /qa-r11/ R11a:
Visible copy action created `qa-r11-west-20261010` from the retained R10 profile.
Normal F at Bran opened training. Promotion consumed exactly120 reservedG:
1331→1211 totalG, reserved120→0, spendable1211 unchanged; L16,34SP and
131HP/94MP/98stamina unchanged. No automatic Expert rank or slot appeared.
Banner1(3SP), Protection1(3SP), Onslaught1(3SP) and Lance1(3SP) purchased by
normal buttons; Protection disables opposite Zeal with explicit branch reason.
All earlier E/T/Q and mouse labels remain. Screenshot `r11-expert-promotion.jpg`.
UI P2: unlearned but available rows say “미학습 / 선택 불가”, which can conflict
with the enabled “강화” button. Dense repeated provenance and scalar metrics
make ability comparison slow; separate concise behavior summary from optional
numeric detail in a later bounded UX correction.

04:47–04:52 UTC:
Slots explicitly assigned Onslaught1/Banner2; migrated bindings were blank.
Normal capture UI set2/3, retaining E/T/Q/mouse/F/R. Refresh+Continue restored
Expert L16,1211G,22SP, same pools and both actual HUD2/3 actions.
Native Banner3 cost exactly40MP (94→54), started30sCD; visible Protection banner
pole/label and static footprint persisted at flash0. Footprint contrast is weak
against the blue stone floor: P1 readability issue, especially near NPC labels.
Native2 held1.2s moved the hero, used one9stamina stage and showed10sCD/recovery;
release Lance visual is partially visible but no enemy contact was established.

Eda accepted B with no reward/cost; completed T and Adept text correctly stayed
historical. The new B entrance crowds the existing Furnace cargo/Sluice lift/
Quarry rescue gates; labels overlap and the translucent gate stack obscures the
hero. Normal movement could select B, but new gate separation is a P1 issue.
B first entry preserved176HP/94MP/98stamina and showed explicit start safety.
After movement toward the west yard, ranged red danger was visible. A long
agent observation/planning gap left the character idle in active combat before
the next action batch, causing death (1211→1151G). This is NOT a measured
reaction-time, dodge or fair-difficulty failure. No kills/reward were observed.
Dead reload restored the retry modal and1151G without another loss. Normal
retry restored pools in town while retaining Expert,22SP,2/3,acceptedB0/2.
Future diagnostic combat batches will use the ordinary Esc menu between
observations; tool/menu overhead must be excluded from ordinary-play timing.

04:54–04:59 UTC, first west-yard combat samples:
A normal short batch killed one enemy (+90XP, +9G); current totalXP6435.5,
current-level215.5,117kills,8deaths,1160G. The following2-held/3 inputs showed
“저장 또는 일시정지 처리 후 기술 키를 다시 누르세요.” with no MP/stamina/CD
charge. A second batch immediately after menu Continue and RMB aim, then2 held
for2s, again showed that rejection and no action cost; HP169→148, no new kill.
This proves a real input-loss symptom, but does not identify which member of
busy/paused/gate/safety-pending caused the second rejection. Code analysis must
not claim a measured storage latency from that toast alone. New actions were
not validated against enemy contact in these samples.

The final menu counters:47s active play,6s combat,2s movement,127s menu,19s arrival
wait in this connection. Combat/movement may overlap and are not additive.
The earlier idle death and automation/menu overhead are not ordinary human
campaign duration. Save-and-title succeeded, and only owned tab32 was closed at
04:59UTC for another project's coordinated screen window. Last visible profile:
Expert L16,148HP,94MP,98stamina,1160G,22SP, west yard with one enemy defeated.

Known P1 fixes under development, not yet live or real-QA-passed: bounded save
input acceptance and immediate empty safety drain; actual Banner boundary
contrast; separating the newly added B town entrance from existing gates.
Public root remainsR7a4. R11 source8aa28eb was1761/1761 before these fixes.
