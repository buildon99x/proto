import { getProjectBySlug, projects } from "@prototype-lab/registry";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.id }));
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="page">
      <section className="detail-header">
        <div>
          <p className="eyebrow">{project.status}</p>
          <h1>{project.name}</h1>
          <p>{project.summary}</p>
          <div className="meta">
            <span>{project.type}</span>
            <span>{project.runtime}</span>
            {project.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <Link className="button" href={`/projects/${project.id}/run`}>
          Run
        </Link>
      </section>

      <section className="two-column">
        <div>
          <h2>Project Root</h2>
          <code>{project.projectRoot}</code>
        </div>
        <div>
          <h2>Commands</h2>
          <dl>
            {Object.entries(project.commands).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>
                  <code>{value}</code>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section-heading">
        <h2>Docs</h2>
      </section>
      <div className="doc-list">
        {Object.entries(project.docs).map(([key, value]) => (
          <div key={key}>
            <span>{key}</span>
            <code>{value}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
