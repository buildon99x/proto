import { ConceptGame } from "@prototype-lab/shared-ui";
import "@prototype-lab/shared-ui/concept-game.css";
import { config } from "./data";

export default function App() {
  return <ConceptGame config={config} />;
}
