# R7a1 normal-input regression, 2026-10-09 21:47–21:59 UTC

Public Site v21 `/qa-r7/`, app0.7.0-reimplementation.2; root R5a4 and all previous candidate files unchanged. Dot Chrome, owned tab21, ordinary keyboard/mouse/UI only. No injected XP, kill flags, positions or save import. Tab safely saved and closed at21:59.

## Existing earned profile and goal panel
- Existing `qa-r7a-earned-20261009`: restored L10,628G,2835.5 cumulativeXP (235.5/500),64kills5deaths,148/152HP,82MP,80stamina,8SP and10attributes, potions2 and retained J/Q/Space/F/R/T/E bindings.
- HUD normal goal button opened a paused detail panel stating the completed Pass and still-unimplemented later campaign. It explains isometric region directions separately from screen-relative movement. Actual input during combat also opened this pause panel; health stayed60/87 while the panel was read.
- One AX indexed click failed with detached-node error because objective HTML was rebuilt every HUD update. A stable DOM button locator succeeded. This observed tool issue prompted a bounded R7a2 source fix to preserve the button across unchanged HUD updates and keyboard focus; it does not establish that every ordinary human click failed.

## Deliberate death and retry
- Created `qa-r7a1-death-20261009` with the explicit non-overwriting UI copy of owned qa-r6 `qa-r6a-earned-20261009`. Original L8 state was1845.5XP,426G,49kills5deaths,60/87HP,58MP,69stamina,31attributes13SP,one potion. Source profile untouched.
- Normally accepted Pass quest and entered it. One Q cast killed one35XP/4G guard:1880.5XP,430G,50kills. Deliberately remained exposed without dodging/healing for a death test. This is a failure/persistence test, not ordinary balance/difficulty evidence.
- Death deducted floor(430*0.05)=21G exactly once:409G. Reload→typed the same profile→Continue immediately displayed the dead/retry panel without movement input, HP0/87,49MP,one potion and retained XP.
- Retry restored87/87HP,58MP,69stamina in town, retaining409G,1880.5XP,50kills6deaths and all prior objectives/items/keys. Menu showed540G total earned/131G total spent, correctly including the21G loss.
- Spent the previously earned31attribute points using ordinary +1 buttons:STR+16,DEX+5,INT+10, yielding total STR18/DEX5/INT12 and maxima119HP/78MP/74stamina. No further skill purchases; the previously trained Qrank3 and mace2 remain, unlike the other L10 profile. Attribute purchases did not fill87HP to119.
- Returned normally: objective detail explicitly counted four remaining entrance foes. Normal Q/mace combat killed only those four, yielding2045.5XP/429G/54kills. The earlier dead guard did not respawn or pay twice.

## Continued gameplay, rescue and corrected shortcut
- Clue normal confirmation gave80XP/10G once, total2125.5XP/439G. Normal T healing was paused during its action after cost; resuming finished the heal to119HP without a second cost. This is same-session action pause, not an interrupted-save action guarantee.
- Used opened bridge and normal Q plus melee to clear five rescue guards:earnedL9,2325.5XP/463G/59kills. Rescue gave90XP/20G, total2415.5XP/483G. Completed guide panel now says rescue/reward complete and shows only Back.
- Walked from guide toward the adjacent locked return portal/rope area. Normal F selected the rope connection panel, then normal button connected it before any signal fight/alignment. No XP/gold/resource award. Completed rope text now says return portal is usable and has no repeat connect action.
- Back→F immediately used the now-open return portal. Town HUD preserved483G,115/123HP,43/80MP,77stamina,XP275.5/460,17SP,one potion. After time naturally elapsed in town, F returned via the shortcut; HP stayed115/123,MP naturally regenerated to80,XP/gold/kill count unchanged. This is not a free portal refill claim; exact no-reset recovery is separately covered by automated handlers.
- Saved and closed at L9,2415.5XP,483G,59kills6deaths,17SP5attributes,115/123HP,80MP,77stamina,clue/rescue/shortcut complete,signal foes still alive.

## Timing and remaining quality limits
After death/reload, session menu showed62s active play,18s combat,17s movement,454s menus and7s protected arrival. Combat/movement overlap. Numerous observations intentionally paused between actions; these are not continuous-player campaign-time measurements. Full campaign timing, sustained fun, higher difficulties, mobile and audible sound review remain open.

Exact old Pass portal-priority reproduction at(864,688), reach/LOS and quarry overlap are automated geometry/reducer tests. This browser pass confirms natural F selection and post-unlock travel in the problematic zone, not a readout of hidden player coordinates. Goal directions help interpretation but tall-wall/corridor readability still needs a stronger navigation solution; no minimap was added. Elite patterns can be bypassed by strong Q damage, roles still share close silhouettes, and there is no complete replay loop or Expert/Master campaign yet.
