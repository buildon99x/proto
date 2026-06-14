import type { ConceptGameConfig } from "@prototype-lab/shared-ui";

export const config: ConceptGameConfig = {
  title: "Mirror Poker Court",
  subtitle: "Flip poker hands into courtroom verdicts before the jury loses trust.",
  concept: "Select a courtroom lane, spend energy on evidence cards, and push Verdict above 42 while keeping Trust alive.",
  coreVerb: "Invert evidence into verdicts",
  sessionGoal: "Win by reaching Verdict 42 before Trust collapses.",
  winLabel: "Case Won",
  loseLabel: "Mistrial",
  themeClass: "theme-mirror",
  tracks: [
    { key: "verdict", label: "Verdict", value: 12, max: 50 },
    { key: "trust", label: "Jury Trust", value: 34, max: 40, dangerBelow: 8 },
    { key: "chaos", label: "Mirror Chaos", value: 8, max: 35 }
  ],
  resources: [
    { key: "precedent", label: "Precedent", value: 2 },
    { key: "jokers", label: "Mirror Jokers", value: 1 }
  ],
  zones: [
    { key: "bench", name: "Judge Bench", description: "Stable rulings", effect: "Verdict cards are safer here." },
    { key: "mirror", name: "Mirror Stand", description: "High-risk reversal", effect: "Chaos is worth extra verdict momentum." },
    { key: "jury", name: "Jury Rail", description: "Trust recovery", effect: "Social proof keeps the run alive." }
  ],
  deck: [
    { key: "straight", name: "Straight Argument", cost: 1, verb: "chain a clean sequence", text: "+7 Verdict.", effects: { verdict: 7 } },
    { key: "reflect", name: "Reflect Testimony", cost: 2, verb: "flip testimony", text: "+11 Verdict, +3 Chaos.", effects: { verdict: 11, chaos: 3 }, resourceEffects: { precedent: 1 } },
    { key: "sustain", name: "Calm the Jury", cost: 1, verb: "restore trust", text: "+6 Trust.", effects: { trust: 6 } },
    { key: "joker", name: "Mirror Joker", cost: 2, verb: "bend the rules", text: "+9 Verdict and spend doubt into spectacle.", effects: { verdict: 9, chaos: 5 }, resourceEffects: { jokers: 1 } },
    { key: "objection", name: "Objection Seal", cost: 1, verb: "seal a contradiction", text: "-4 Chaos, +2 Trust.", effects: { chaos: -4, trust: 2 } }
  ],
  encounters: [
    "The prosecutor cites a hostile precedent. All tracks drift.",
    "The mirror doubles a weak witness.",
    "A jury member asks why the hand changed suits."
  ],
  victory: { verdict: 42 },
  failure: { trust: 0 }
};
