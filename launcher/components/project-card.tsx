import type { ProjectMetadata } from "@prototype-lab/registry";
import Link from "next/link";

export function ProjectCard({ project }: { project: ProjectMetadata }) {
  return (
    <article className="project-card">
      <div>
        <div className="meta">
          <span>{project.status}</span>
          <span>{project.type}</span>
        </div>
        <h2>{project.name}</h2>
        <p>{project.summary}</p>
      </div>
      <div className="tags">
        {project.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
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
