export type {
  ProjectMetadata,
  ProjectRuntime,
  ProjectStatus,
  ProjectType
} from "./schema";
export { validateProjectMetadata } from "./schema";
export { projects } from "./generated/projects";

import { projects } from "./generated/projects";

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.id === slug);
}
