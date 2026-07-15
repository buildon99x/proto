import { projects } from "@prototype-lab/registry";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export default function ProjectsPage() {
  return (
    <div className="page">
      <section className="section-heading">
        <h1>Projects</h1>
        <p>All projects registered from `projects/*/project.json`.</p>
      </section>

      <div className="list">
        {projects.map((project) => {
          const updated = formatDate(project.updatedAt);
          return (
            <Link className="list-row" href={`/projects/${project.id}`} key={project.id}>
              <div>
                <h2>{project.name}</h2>
                <p>{project.summary}</p>
              </div>
              <div className="meta">
                <span>{project.status}</span>
                <span>{project.type}</span>
                <span className="version">v{project.version}</span>
                {updated ? <span className="updated-chip">Updated {updated}</span> : null}
                {project.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
