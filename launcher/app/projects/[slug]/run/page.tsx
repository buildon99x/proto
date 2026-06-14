import { getProjectBySlug, projects } from "@prototype-lab/registry";
import Link from "next/link";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.id }));
}

export default async function ProjectRunPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const hasIframeEntry = project.entry.kind === "iframe" && project.entry.path;

  return (
    <div className="run-page">
      <header className="run-header">
        <div>
          <p className="eyebrow">{project.status}</p>
          <h1>{project.name}</h1>
        </div>
        <Link href={`/projects/${project.id}`}>Project details</Link>
      </header>

      {hasIframeEntry ? (
        <iframe
          className="project-frame"
          src={project.entry.path}
          title={`${project.name} runtime`}
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
        />
      ) : (
        <div className="empty-state">
          <h2>No runnable entry configured</h2>
          <p>Set an iframe entry path in this project's project.json.</p>
        </div>
      )}
    </div>
  );
}
