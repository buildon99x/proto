import type { ConceptGameConfig } from "@prototype-lab/shared-ui";

export const config: ConceptGameConfig = {
  title: "Origami Fleet",
  subtitle: "Fold paper ships into attack and defense forms on a tactical sea.",
  concept: "Pick a sea lane, play fold cards, and build Formation before Hull integrity tears apart.",
  coreVerb: "Fold the fleet formation",
  sessionGoal: "Reach Formation 45 while Hull stays above zero.",
  winLabel: "Fleet Folded",
  loseLabel: "Hull Torn",
  themeClass: "theme-origami",
  tracks: [
    { key: "formation", label: "Formation", value: 10, max: 50 },
    { key: "hull", label: "Hull", value: 36, max: 40, dangerBelow: 8 },
    { key: "wind", label: "Wind Favor", value: 12, max: 30 }
  ],
  resources: [
    { key: "creases", label: "Creases", value: 3 },
    { key: "signals", label: "Signals", value: 1 }
  ],
  zones: [
    { key: "vanguard", name: "Vanguard Fold", description: "Attack line", effect: "Forward folds build Formation quickly." },
    { key: "lee", name: "Lee Shelter", description: "Defensive pocket", effect: "Shelter maneuvers protect Hull." },
    { key: "current", name: "Ink Current", description: "Wind route", effect: "Current control improves Wind Favor." }
  ],
  deck: [
    { key: "crane", name: "Crane Fold", cost: 1, verb: "open a sharp wing", text: "+7 Formation.", effects: { formation: 7 }, resourceEffects: { creases: 1 } },
    { key: "turtle", name: "Turtle Shell", cost: 1, verb: "crease a shield", text: "+7 Hull.", effects: { hull: 7 } },
    { key: "gust", name: "Gust Signal", cost: 1, verb: "catch the wind", text: "+6 Wind Favor.", effects: { wind: 6 }, resourceEffects: { signals: 1 } },
    { key: "razor", name: "Razor Ray", cost: 2, verb: "slice the lane", text: "+12 Formation, -3 Hull.", effects: { formation: 12, hull: -3 } },
    { key: "unfold", name: "Emergency Unfold", cost: 2, verb: "release tension", text: "-4 Wind, +8 Hull.", effects: { wind: -4, hull: 8 } }
  ],
  encounters: [
    "Enemy cannons telegraph a broadside.",
    "A salt wind stiffens every crease.",
    "Ink current pulls the rear ship out of line."
  ],
  victory: { formation: 45 },
  failure: { hull: 0 }
};
