# R11b normal-input comparison — 2026-10-10

## Exact tested artifact

Dot Chrome owned tab34, public candidate `/qa-r11/`, Site v38, application
R11b / 0.11.0-reimplementation.3. Tested executable source is
`d931877352b4b0d95e479b9f83ef7babfa0ae157`, project tree
`5d46d06198e21a4ca594c25f59f0e89b1022bfd0`. Site source commit is
`82d8a5c98ae664659131d606bc0e0cb9351c20f9`; official deployment
`appgdep_6ac9d9e4209c8191937e11b7bc5a0f80` succeeded at06:23:57UTC.
Public root remains R7a4. The designated development branch was fast-forwarded
**locally**; no GitHub remote push was performed or verified.

Final pre-play automatic suite1924/1924 passed. That count is synthetic handler,
UI and source validation, separate from the following native input evidence.
Original167 inputs and84-file static build are preserved. Aggregate pnpm
registry/Vercel tasks remain blocked by the recorded pnpm home-directory error.

## Profiles and normal setup

First restored the completed R11a1 `qa-r11-west-20261010` without playing or
resetting its combat: L18,1477G,725.5/900XP,32SP,131/184HP,98MP,104stamina,
five potions. Mace/shield+1, all keys and50unspent attributes were preserved,
with allocated STR18/DEX5/INT12. Localized `회수한 봉화핵 · 비소모`
appears in inventory instead of the raw identifier. Saved/title exited normally.

Then title controls copied untouched `qa-r10-channel-20261010` from qa-r10 into
new `qa-r11b-roles-20261010`. No imported file, developer console mutation,
resource, skill, enemy or position injection was used. This is an earned-profile
comparison, not a new first-to-last campaign playthrough.

Starting L16,1331G (120 reserved),125.5/780XP,34SP,131/176HP,94MP,98stamina,
four potions. Normal promotion consumed120G without healing or free points.
Normal3SP buttons bought Banner1, Protection1, Onslaught1 and Lance1, leaving
22SP. Zeal was visibly disabled. Slots1/2 were explicitly assigned Onslaught/
Banner and bound through normal capture to2/3. Existing E/T/Q/F/R and attack/
guard bindings were retained. Trainer displayed four pulses and25/50/75/100%.
No healer rest or attribute/gear/rank change was used. This profile has no
Trial by Fire; E costs30MP and creates no persistent fire area.

The previous a1 comparison started its continuation after an earlier death and
one west kill, at148HP. The present run starts at131HP and no B kills. Offensive
build matches, but starting pools, action order and approach differ. Survival,
continuous duration or DPS cannot be attributed to this patch from this pair.

## Actual sequence and resource ledger

| Checkpoint | Visible progression/resources | Native observation |
|---|---|---|
| West entry | L16,1211G,131HP,94MP,98stamina | Normal Eda acceptance and separated town portal. Travel itself does not heal. |
| West six defeated |1265G,665.5/780XP,109HP,18MP,98stamina| Short2 channel, E/basic cleave, Banner and Q; first three frontline kills grouped, later targets separately approached. |
| West relay | L17,1300G,165.5/840XP,27SP,109/180HP,19/96MP,98/101stamina,5potions | Ready message explicitly says all six are defeated. One280XP/35G payment; level-up does not refill. |
| East first offense |1318G,345.5/840XP,101HP,27MP,92stamina| Existing binder/hexer danger lines remained after the initial E/charge attempt; two kills, not the entire group. |
| East six defeated |1354G,705.5/840XP,172HP,14MP,101stamina| Shifted target to northern binder and southern hexer. One potion used while poisoned; no idle heal or reset. |
| East relay | L18,1389G,145.5/900XP,32SP,172/184HP,15/98MP,101/104stamina,5potions | One280XP/35G payment and center route opened. |
| Boss first Q |1389G,172HP,9MP,104stamina| Invested Hammer4 visibly removes roughly71% of the200HP boss bar. |
| Boss held2 |1389G,172HP,17MP,86stamina|1600ms native hold consumed18stamina, moved to boss and released; boss bar did not visibly fall. No isolated Lance-hit claim. |
| Boss cone escape |172HP unchanged,22MP,96stamina| Immediate upward movement left the committed cone; screenshot before/after, no heal/guard/potion used during this escape. |
| Boss defeated |1437G,385.5/900XP,159HP,6MP| Normal E finished it. Fire damage occurred during this later exchange, distinct from the clean prior cone escape. |
| Beacon separate recovery |1457G,545.5/900XP| Explicit160XP/20G button, no automatic recovery on boss death. Burn continued to151HP. |
| Eda separate report |1537G,725.5/900XP,151HP,98MP,104stamina| Explicit180XP/80G report. MP regenerated during ordinary travel and unpaused town observation; report/transition is not credited with refill. |

Total B budget is exactly2220XP and326G.1331−120+326=1537G; there was no new
death. Final cumulativeXP8565.5,129kills,7historicaldeaths, income1856G/outgo319G.
Materials29iron/17wood/19thread/10ember,5potions,+1mace/+1shield,32SP and50
unspent attributes remained after reload. Report button disappeared and a
second Eda conversation said already received, without changing1537G/XP.

Native save/title, page reload, named continue, inventory and repeated Eda
conversation passed. Final save/title completed and tab34 closed06:39UTC.
Completed B enemy re-entry and death are prior a1 evidence; they were **not**
repeated in this b pass. First input sometimes returned a pre-async DOM snapshot;
the beacon dialog appeared on a later read without a second input. Do not
classify these immediate snapshots alone as new lost-input defects.

## What changed in the actual choices

- East visibly contained crossed telegraphs from the existing binder and
  hexer, not from the two newly repositioned lancers (whose tells are short
  cones). After the initial attack, these surviving threats required choosing
  a target and moving to it. A broad cleave still rapidly removed weak
  frontliners. This demonstrates choices in this run, but does not isolate a
  causal improvement from the R11b formation/footwork change.
- West required leaving the stationary Banner footprint to close on the last
  ranged threats. Central cover was navigated, but this run does not isolate a
  damage-prevention benefit from that cover or a precise side-step effect. The last western ranged foe was a hexer, not
  a lancer.
- A held charge in east ended early despite a long physical hold. Damage/
  control and later wall contact confound it; physical hold duration is not
  active channel duration. Only the boss attempt clearly showed the second
  payment (104→86). Full-power Lance damage/indicator readability remains open.
- Boss repositioning and a missed charge were visible, but screenshot-relative
  aim/camera and changing target position prevent attributing the miss solely
  to the new AI. Do not call the file named `boss-onslaught-contact` proof of a
  hit: its bar is unchanged. Likewise `boss-melee-finish` did not finish/land;
  the final `boss-defeated` E did. The filenames containing `lancer` also
  refer to ranged caster scenes; captions and this corrected identification
  take precedence. Filenames describe intended observations, not proof.
- Boss remains defeated by two effective attacks, Q4 then E1. Other actions
  missed or repositioned. This does not establish enough boss depth, even
  though a readable cone escape was successful. HP inflation is not proposed
  as the solution; source-bounded role/ability interaction and later-tier
  encounter progression remain the next design problem.

## Timing and quality limits

The HUD at report showed108s active play,35s combat,21s movement,639s menu.
Combat and movement overlap. Active time includes unpaused town/tool review;
menu interruptions split every short diagnostic sample. These counters are
neither total uninterrupted campaign length, encounter TTK nor a DPS benchmark.
Do not derive percentage speed/survival improvement from them.

Flash0 kept enemy telegraphs and friendly Banner boundaries visible. Native
audio listening, mobile/gamepad, all15Expert nodes, Zeal comparison, opposite
B device order, higher difficulties, full4s channel/actual Lance release
damage, Master13, advancedgear, expedition reset/history and whole campaign
remain unaccepted. The1924 automatic checks do not close any of these gates.

## Retained evidence

Original CUA JPEGs `r11b-*.jpg`, three visible-DOM `.txt` snapshots, this report,
exact deployment/save results and the existing comparison/calibration/role
documents are preserved in the QA archive. All byte hashes and ZIP CRC are
checked. No application storage dumps or browser credentials are included.

### Evidence correction at06:44UTC

The initial QA archive v3/source v6 mislabeled the last west and two east long-line
threats as lancers, and over-attributed crossed lines to the new formation.
Pixel labels and authored foe patterns show west hexer, east binder/hexer.
This correction changes interpretation, not the original screenshots or input
history. No definitive native side-step or patch-caused depth gain is claimed.
