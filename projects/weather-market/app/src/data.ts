import type { ConceptGameConfig } from "@prototype-lab/shared-ui";

export const config: ConceptGameConfig = {
  title: "Weather Market",
  subtitle: "Buy, bottle, and sell weather without bankrupting the city ecology.",
  concept: "Select a district, play weather contracts, and earn Profit while keeping Reputation from crashing.",
  coreVerb: "Trade bottled weather",
  sessionGoal: "Earn Profit 44 before Reputation hits zero.",
  winLabel: "Market Day Won",
  loseLabel: "Public Outrage",
  themeClass: "theme-weather",
  tracks: [
    { key: "profit", label: "Profit", value: 10, max: 50 },
    { key: "reputation", label: "Reputation", value: 32, max: 40, dangerBelow: 8 },
    { key: "stability", label: "Climate Stability", value: 24, max: 35, dangerBelow: 7 }
  ],
  resources: [
    { key: "rain", label: "Rain Bottles", value: 2 },
    { key: "sun", label: "Sun Jars", value: 2 }
  ],
  zones: [
    { key: "festival", name: "Festival Row", description: "High-margin sun", effect: "Sun sales spike profit and heat risk." },
    { key: "farms", name: "Terrace Farms", description: "Rain demand", effect: "Rain restores reputation and stability." },
    { key: "harbor", name: "Fog Harbor", description: "Special orders", effect: "Fog contracts convert stability into profit." }
  ],
  deck: [
    { key: "sun-sale", name: "Sell Sunlight", cost: 1, verb: "uncork bright weather", text: "+8 Profit, -3 Stability.", effects: { profit: 8, stability: -3 }, resourceEffects: { sun: -1 } },
    { key: "rain-relief", name: "Rain Relief", cost: 1, verb: "ship rain clouds", text: "+6 Reputation, +3 Stability.", effects: { reputation: 6, stability: 3 }, resourceEffects: { rain: -1 } },
    { key: "fog-auction", name: "Fog Auction", cost: 2, verb: "sell mystery fog", text: "+11 Profit, -4 Reputation.", effects: { profit: 11, reputation: -4 } },
    { key: "barometer", name: "Barometer Hedge", cost: 1, verb: "hedge the forecast", text: "+4 Stability, +1 Profit.", effects: { stability: 4, profit: 1 } },
    { key: "restock", name: "Restock Clouds", cost: 1, verb: "buy cheap weather", text: "+1 Rain and +1 Sun.", effects: { stability: -1 }, resourceEffects: { rain: 1, sun: 1 } }
  ],
  encounters: [
    "A dry wind makes every district impatient.",
    "Guild inspectors audit the market ledger.",
    "Farmers and festival planners both demand priority."
  ],
  victory: { profit: 44 },
  failure: { reputation: 0 }
};
