import { useState } from "react";

const folders = ["app", "assets", "data", "prompts", "tests", "notes"];

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Prototype Lab sample</p>
        <h1>Sample Project</h1>
        <p>This project is served through the Launcher.</p>
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          State changes: {count}
        </button>
      </section>

      <section className="structure-card">
        <h2>Project structure</h2>
        <p>
          App code, assets, data, prompts, tests, and notes belong to this project
          folder. The launcher only receives a generated build artifact.
        </p>
        <div className="folder-grid">
          {folders.map((folder) => (
            <span key={folder}>{folder}/</span>
          ))}
        </div>
      </section>
    </main>
  );
}
