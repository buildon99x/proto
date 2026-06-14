import type { ConceptGameConfig } from "@prototype-lab/shared-ui";

export const config: ConceptGameConfig = {
  title: "Deep Lighthouse",
  subtitle: "Rotate a beam through the abyss to lure monsters and reveal safe routes.",
  concept: "Pick a depth sector, play lens cards, and build Signal before Pressure crushes the tower.",
  coreVerb: "Turn the saving light",
  sessionGoal: "Reach Signal 43 while Pressure remains survivable.",
  winLabel: "Beacon Lit",
  loseLabel: "Light Out",
  themeClass: "theme-lighthouse",
  tracks: [
    { key: "signal", label: "Signal", value: 10, max: 50 },
    { key: "pressure", label: "Tower Pressure", value: 34, max: 40, dangerBelow: 8 },
    { key: "terror", label: "Terror", value: 8, max: 30 }
  ],
  resources: [
    { key: "lenses", label: "Lenses", value: 2 },
    { key: "oxygen", label: "Oxygen", value: 3 }
  ],
  zones: [
    { key: "reef", name: "Glass Reef", description: "Reflective maze", effect: "Beam cards reveal extra Signal." },
    { key: "trench", name: "Black Trench", description: "Monster route", effect: "Luring here raises Terror fast." },
    { key: "engine", name: "Lamp Engine", description: "Repair deck", effect: "Oxygen and Pressure stabilize here." }
  ],
  deck: [
    { key: "beam-sweep", name: "Beam Sweep", cost: 1, verb: "scan the dark", text: "+7 Signal.", effects: { signal: 7 } },
    { key: "lure-eye", name: "Lure the Eye", cost: 2, verb: "turn the monster", text: "+10 Signal, +4 Terror.", effects: { signal: 10, terror: 4 }, resourceEffects: { lenses: -1 } },
    { key: "brace", name: "Brace the Tower", cost: 1, verb: "seal the glass", text: "+7 Pressure safety.", effects: { pressure: 7 } },
    { key: "dim-light", name: "Dim the Light", cost: 1, verb: "hide the beacon", text: "-4 Terror, +1 Oxygen.", effects: { terror: -4 }, resourceEffects: { oxygen: 1 } },
    { key: "focus-lens", name: "Focus Lens", cost: 2, verb: "burn a path", text: "+12 Signal, -3 Pressure.", effects: { signal: 12, pressure: -3 }, resourceEffects: { lenses: 1 } }
  ],
  encounters: [
    "A whale-sized shadow crosses the beam.",
    "The glass reef fractures under pressure.",
    "Something below copies the lighthouse rhythm."
  ],
  victory: { signal: 43 },
  failure: { pressure: 0 }
};
