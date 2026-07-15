export type ProjectStatus = "idea" | "prototype" | "active" | "paused" | "archived";
export type ProjectType = "webapp" | "tool" | "demo" | "poc" | "site";
export type ProjectRuntime = "static-artifact";

export type ProjectMetadata = {
  id: string;
  name: string;
  status: ProjectStatus;
  type: ProjectType;
  runtime: ProjectRuntime;
  version: string;
  /**
   * ISO-8601 timestamp of the project's last change. Derived automatically
   * from git history when the launcher registry is synced, so it is not part
   * of the hand-written project.json and may be absent until the first sync.
   */
  updatedAt?: string;
  summary: string;
  tags: string[];
  projectRoot: string;
  entry: {
    kind: "iframe";
    path: string;
  };
  docs: {
    brief: string;
    spec: string;
    eval: string;
    readme: string;
    changelog: string;
  };
  assets: {
    cover?: string;
  };
  commands: {
    dev: string;
    build: string;
    test: string;
  };
};

const statuses = new Set<ProjectStatus>(["idea", "prototype", "active", "paused", "archived"]);
const types = new Set<ProjectType>(["webapp", "tool", "demo", "poc", "site"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: Record<string, unknown>, field: string, errors: string[]): string {
  const item = value[field];
  if (typeof item !== "string" || item.trim() === "") {
    errors.push(`${field} must be a non-empty string`);
    return "";
  }
  return item;
}

export function validateProjectMetadata(value: unknown): ProjectMetadata {
  const errors: string[] = [];

  if (!isRecord(value)) {
    throw new Error("project metadata must be an object");
  }

  const id = requireString(value, "id", errors);
  const name = requireString(value, "name", errors);
  const status = requireString(value, "status", errors);
  const type = requireString(value, "type", errors);
  const runtime = requireString(value, "runtime", errors);
  const version = requireString(value, "version", errors);
  const summary = requireString(value, "summary", errors);
  const projectRoot = requireString(value, "projectRoot", errors);

  if (id && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    errors.push("id must be a lowercase kebab-case slug");
  }
  if (version && !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)*$/.test(version)) {
    errors.push("version must be a semantic version like 1.2.3");
  }
  if (value.updatedAt !== undefined && typeof value.updatedAt !== "string") {
    errors.push("updatedAt must be a string when present");
  }
  if (status && !statuses.has(status as ProjectStatus)) {
    errors.push(`status must be one of ${Array.from(statuses).join(", ")}`);
  }
  if (type && !types.has(type as ProjectType)) {
    errors.push(`type must be one of ${Array.from(types).join(", ")}`);
  }
  if (runtime && runtime !== "static-artifact") {
    errors.push("runtime must be static-artifact");
  }
  if (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== "string")) {
    errors.push("tags must be an array of strings");
  }

  if (!isRecord(value.entry)) {
    errors.push("entry must be an object");
  } else {
    if (value.entry.kind !== "iframe") {
      errors.push("entry.kind must be iframe");
    }
    if (typeof value.entry.path !== "string" || value.entry.path.trim() === "") {
      errors.push("entry.path must be a non-empty string");
    }
  }

  for (const field of ["docs", "assets", "commands"]) {
    if (!isRecord(value[field])) {
      errors.push(`${field} must be an object`);
    }
  }

  if (isRecord(value.docs)) {
    for (const field of ["brief", "spec", "eval", "readme", "changelog"]) {
      const item = value.docs[field];
      if (typeof item !== "string" || item.trim() === "") {
        errors.push(`docs.${field} must be a non-empty string`);
      }
    }
  }

  if (isRecord(value.commands)) {
    for (const field of ["dev", "build", "test"]) {
      const item = value.commands[field];
      if (typeof item !== "string" || item.trim() === "") {
        errors.push(`commands.${field} must be a non-empty string`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  return value as ProjectMetadata;
}
