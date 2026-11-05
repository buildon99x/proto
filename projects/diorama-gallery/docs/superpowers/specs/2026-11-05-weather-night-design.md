# Timelapse weather and night

Intent: add the four requested weather types and a night sky to the existing formation candidate without changing the original world or construction controls.

Approach: reuse the current Three.js scene and runtime clock through an opt-in environment factory. A shared procedural effect group lives outside the construction content, so effects never grow with buildings or affect bounds/batching. Controls select weather and day/night independently.

Alternatives: a CSS overlay cannot relight the actual model and would not share the scene clock; duplicating full worlds for eight modes would multiply maintenance. Keep one scene with independent environment state.

Builder choices: default clear/day; selectable rather than automatic weather; readable blue night light, moon and stars, reduced star visibility under cloud/storm cover. No new dependencies. Existing world reset changes construction pose, retaining the selected environment. Full environment reset occurs on scene reopen.

Non-goals: historical weather reconstruction, real-time forecasts, new cameras, production promotion or replacing the original dioramas.
