import type { ConceptGameConfig } from "@prototype-lab/shared-ui";

export const config: ConceptGameConfig = {
  title: "Museum Heist Deck",
  subtitle: "Read guard intent, spend tools, and steal cursed artifacts without tripping the alarm.",
  concept: "Choose a gallery, play stealth cards, and collect Loot while keeping Alarm below the fail line.",
  coreVerb: "Read intent and steal",
  sessionGoal: "Reach Loot 40 before Cover collapses.",
  winLabel: "Clean Getaway",
  loseLabel: "Caught",
  themeClass: "theme-heist",
  tracks: [
    { key: "loot", label: "Loot", value: 8, max: 50 },
    { key: "cover", label: "Cover", value: 34, max: 40, dangerBelow: 8 },
    { key: "curse", label: "Curse Noise", value: 6, max: 30 }
  ],
  resources: [
    { key: "tools", label: "Tools", value: 3 },
    { key: "intel", label: "Intel", value: 1 }
  ],
  zones: [
    { key: "laser", name: "Laser Hall", description: "Precision route", effect: "Tool plays are stronger but risky." },
    { key: "relic", name: "Cursed Wing", description: "High-value artifacts", effect: "Loot spikes with Curse Noise." },
    { key: "security", name: "Security Desk", description: "Camera blind spot", effect: "Intel can rebuild Cover." }
  ],
  deck: [
    { key: "shadow-step", name: "Shadow Step", cost: 1, verb: "cross a blind spot", text: "+5 Loot, +2 Cover.", effects: { loot: 5, cover: 2 } },
    { key: "glass-cutter", name: "Glass Cutter", cost: 2, verb: "open the case", text: "+12 Loot, -3 Cover.", effects: { loot: 12, cover: -3 }, resourceEffects: { tools: -1 } },
    { key: "fake-loop", name: "Camera Loop", cost: 1, verb: "loop security footage", text: "+7 Cover.", effects: { cover: 7 }, resourceEffects: { intel: -1 } },
    { key: "curse-bait", name: "Curse Bait", cost: 2, verb: "weaponize the relic", text: "+9 Loot, +5 Curse.", effects: { loot: 9, curse: 5 } },
    { key: "quiet-pack", name: "Quiet Pack", cost: 1, verb: "muffle the haul", text: "-4 Curse, +1 Tool.", effects: { curse: -4 }, resourceEffects: { tools: 1 } }
  ],
  encounters: [
    "A guard changes patrol direction.",
    "The relic whispers through the alarm grid.",
    "A camera sweep narrows the safe path."
  ],
  victory: { loot: 40 },
  failure: { cover: 0 }
};
