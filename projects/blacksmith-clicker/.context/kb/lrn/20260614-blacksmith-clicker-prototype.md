# Learning: 대장장이 클릭커 Prototype

## What Worked

- The clicker loop fits a single React state boundary: progress, generated weapon, resources, upgrades, logs, and collection can be reasoned about together.
- CSS-built forge assets were enough for an MVP because the player needs readable feedback more than detailed animation.
- Keeping the completed weapon in a modal prevents accidental progress while the player chooses sell, salvage, enhance, or keep.

## Friction

- The repo template has no game runtime dependency, so adding Phaser would have increased setup and lockfile risk for a prototype whose first version is mostly HUD and economy.
- Initial gold must be high enough to let the player buy an early upgrade quickly, but not so high that sell/salvage decisions stop mattering.

## Next Iteration

- Add save/load so idle progress and collection survive reloads.
- Add sound toggles and lightweight audio feedback once asset policy is decided.
- Split economy constants into `data/` if balancing starts changing frequently.
