import { useState } from "react";

export default function App() {
  const [ready, setReady] = useState(false);

  return (
    <main className="app-shell">
      <section>
        <p className="eyebrow">Prototype Lab</p>
        <h1>Stackflow</h1>
        <p>
          This Vite React project owns its app code, assets, data, prompts,
          tests, notes, and docs.
        </p>
        <button type="button" onClick={() => setReady((value) => !value)}>
          {ready ? "Ready" : "Mark ready"}
        </button>
      </section>
    </main>
  );
}
