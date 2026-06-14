import { projects } from "@prototype-lab/registry";
import { ProjectCard } from "../components/project-card";

export default function HomePage() {
  return (
    <div className="page">
      <section className="intro">
        <div>
          <p className="eyebrow">Single repo, single launcher</p>
          <h1>Prototype Lab Monorepo</h1>
          <p>
            A catalog and runner for early production apps, prototypes, PoCs, and
            internal tools. Each project owns its app code, assets, data, prompts,
            tests, and notes under its own folder.
          </p>
        </div>
      </section>

      <section className="section-heading">
        <h2>Registered Projects</h2>
        <p>{projects.length} project{projects.length === 1 ? "" : "s"} available</p>
      </section>

      <div className="project-grid">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
