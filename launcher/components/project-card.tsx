import type { ProjectMetadata } from "@prototype-lab/registry";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export function ProjectCard({ project }: { project: ProjectMetadata }) {
  const updated = formatDate(project.updatedAt);

  return (
    <article className="project-card">
      <div>
        <div className="meta">
          <span>{project.status}</span>
          <span>{project.type}</span>
          <span className="version">v{project.version}</span>
        </div>
        <h2>{project.name}</h2>
        <p>{project.summary}</p>
      </div>
      <div className="tags">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      {updated ? <p className="updated">Updated {updated}</p> : null}
      <div className="actions">
        <Link className="button secondary" href={`/projects/${project.id}`}>
          Open project
        </Link>
        <Link className="button" href={`/projects/${project.id}/run`}>
          Run
        </Link>
      </div>
    </article>
  );
}
