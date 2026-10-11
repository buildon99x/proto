# R7a2 focus QA and R7a3 correction

2026-10-09 22:04–22:07 UTC; public Site v22 /qa-r7/, app0.7.0-reimplementation.3, normal dot Chrome input, owned tab23. Existing earned L10 profile resumed628G/2835.5XP/148HP/82MP/80stamina/8SP and exact custom keys. No data injection.

A first attempt tabbed out to browser chrome, producing a visible blur timestamp22:05:01.415Z and safe automatic pause. This was not treated as a gameplay focus failure. A coordinate click returned focus to the page. Starting from the normal menu button, Escape→Tab focused the HUD goal button. The AX tree still identified the same goal button after live HUD updates, and Enter correctly opened the paused goal explanation. This verifies the R7a2 unchanged-DOM fix.

An additional ordinary-input regression found a different bug: after closing the goal panel, focus remained on its HUD button. Space cast shield charge instead of opening the goal panel; screen showed3.0s charge cooldown and subsequent pause showed2.9s,68/80stamina,position changed from Eda toward healer. No potion/gold/XP changed. The profile was saved and tab23 closed. This is a reproduced UI/game input priority leak, not a timing inference.

R7a3 expands UI ownership to buttons, existing form controls/contenteditable, and open dialogs. Focus/keyup clearing plus explicit canvas focus recovery are implemented. Native activation, Tab/Shift+Tab, mouse recovery, remapping and actual resource checks must be reverified on R7a3 before considering root promotion.

## Pre-publication review correction at22:28UTC
Read-only review of the real keydown/focusin/keyup handlers proved that a held Escape could open the menu on its initial press and close it on OS repeat, because the new focused-UI branch bypassed the router repeat guard. R7a4 adds the same explicit repeat rejection to that UI Escape path. A runtime-handler regression now mutates modal/focus/pause state and checks twelve repeated downs, then release+fresh down. Saved Sitev23/R7a3 was not deployed; release remains v22/R7a2 until corrected candidate publication. This is a local runtime proof; physical held-Escape browser verification remains pending.
