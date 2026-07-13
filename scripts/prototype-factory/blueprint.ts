import { readFile } from "node:fs/promises";
import { slugify } from "../project-utils";

export const themes = ["warm", "mystic", "ocean", "forest", "neon"] as const;
export type FactoryTheme = (typeof themes)[number];

export type FactoryBlueprint = {
  name: string;
  slug: string;
  pitch: string;
  theme: FactoryTheme;
  actionLabel: string;
  resourceName: string;
  itemName: string;
  goalCount: number;
  rewardPerAction: number;
  upgradeCost: number;
  tags: string[];
  playerGoal: string;
  successMessage: string;
};

const themeDetails: Record<FactoryTheme, { action: string; resource: string; item: string }> = {
  warm: { action: "정성껏 작업하기", resource: "온기", item: "주문" },
  mystic: { action: "마력 불어넣기", resource: "마력", item: "유물" },
  ocean: { action: "항로 개척하기", resource: "파도 조각", item: "항해" },
  forest: { action: "숲 돌보기", resource: "생명력", item: "새싹" },
  neon: { action: "신호 동기화", resource: "에너지", item: "노드" }
};

function hashText(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function inferTheme(prompt: string): FactoryTheme {
  const text = prompt.toLowerCase();
  if (/바다|해양|잠수|항해|ocean|sea/.test(text)) return "ocean";
  if (/숲|정원|나무|식물|forest|garden/.test(text)) return "forest";
  if (/우주|로봇|네온|사이버|space|robot|cyber/.test(text)) return "neon";
  if (/마법|용|신화|유령|magic|dragon|myth/.test(text)) return "mystic";
  return "warm";
}

function boundedString(value: unknown, field: string, maxLength = 160) {
  if (typeof value !== "string" || value.trim() === "" || value.length > maxLength) {
    throw new Error(`${field} must be a non-empty string up to ${maxLength} characters`);
  }
  return value.trim();
}

function boundedInteger(value: unknown, field: string, minimum: number, maximum: number) {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new Error(`${field} must be an integer between ${minimum} and ${maximum}`);
  }
  return value as number;
}

export function validateBlueprint(value: unknown): FactoryBlueprint {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("blueprint must be an object");
  }
  const input = value as Record<string, unknown>;
  const name = boundedString(input.name, "name", 80);
  const slug = boundedString(input.slug, "slug", 64);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("slug must be lowercase kebab-case");
  }
  if (!themes.includes(input.theme as FactoryTheme)) {
    throw new Error(`theme must be one of ${themes.join(", ")}`);
  }
  if (!Array.isArray(input.tags) || input.tags.length < 1 || input.tags.length > 6) {
    throw new Error("tags must contain between 1 and 6 entries");
  }
  const tags = input.tags.map((tag, index) => boundedString(tag, `tags[${index}]`, 24));

  return {
    name,
    slug,
    pitch: boundedString(input.pitch, "pitch", 240),
    theme: input.theme as FactoryTheme,
    actionLabel: boundedString(input.actionLabel, "actionLabel", 40),
    resourceName: boundedString(input.resourceName, "resourceName", 32),
    itemName: boundedString(input.itemName, "itemName", 32),
    goalCount: boundedInteger(input.goalCount, "goalCount", 2, 12),
    rewardPerAction: boundedInteger(input.rewardPerAction, "rewardPerAction", 1, 5),
    upgradeCost: boundedInteger(input.upgradeCost, "upgradeCost", 3, 30),
    tags,
    playerGoal: boundedString(input.playerGoal, "playerGoal", 160),
    successMessage: boundedString(input.successMessage, "successMessage", 120)
  };
}

export function createOfflineBlueprint(name: string, prompt: string): FactoryBlueprint {
  const slug = slugify(name);
  if (!slug) throw new Error("name must contain at least one ASCII letter or number");
  const theme = inferTheme(prompt);
  const details = themeDetails[theme];
  const hash = hashText(`${name}:${prompt}`);
  const goalCount = 3 + (hash % 3);
  return validateBlueprint({
    name,
    slug,
    pitch: prompt.trim(),
    theme,
    actionLabel: details.action,
    resourceName: details.resource,
    itemName: details.item,
    goalCount,
    rewardPerAction: 2 + (hash % 2),
    upgradeCost: 8 + (hash % 5),
    tags: ["factory-generated", theme, "microgame"],
    playerGoal: `${details.item} ${goalCount}개를 완성하고 작업 효율을 한 번 강화하세요.`,
    successMessage: `${name}의 첫 번째 운영 사이클을 완성했습니다!`
  });
}

const blueprintSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "slug", "pitch", "theme", "actionLabel", "resourceName", "itemName",
    "goalCount", "rewardPerAction", "upgradeCost", "tags", "playerGoal", "successMessage"
  ],
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    pitch: { type: "string" },
    theme: { type: "string", enum: themes },
    actionLabel: { type: "string" },
    resourceName: { type: "string" },
    itemName: { type: "string" },
    goalCount: { type: "integer", minimum: 2, maximum: 12 },
    rewardPerAction: { type: "integer", minimum: 1, maximum: 5 },
    upgradeCost: { type: "integer", minimum: 3, maximum: 30 },
    tags: { type: "array", minItems: 1, maxItems: 6, items: { type: "string" } },
    playerGoal: { type: "string" },
    successMessage: { type: "string" }
  }
};

function extractResponseText(response: Record<string, unknown>) {
  const output = Array.isArray(response.output) ? response.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? ((item as { content: unknown[] }).content)
      : [];
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
    }
  }
  throw new Error("AI response did not contain JSON text");
}

export async function createAiBlueprint(name: string, prompt: string): Promise<FactoryBlueprint> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured; rerun with --offline");
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: "Design a tiny one-screen interactive prototype. Return only the requested structured blueprint. Keep Korean input and labels in Korean. Never return executable code."
        },
        { role: "user", content: `Project name: ${name}\nIdea: ${prompt}` }
      ],
      text: { format: { type: "json_schema", name: "prototype_blueprint", strict: true, schema: blueprintSchema } }
    })
  });
  if (!response.ok) {
    throw new Error(`AI blueprint request failed (${response.status}): ${await response.text()}`);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const generated = validateBlueprint(JSON.parse(extractResponseText(payload)));
  const expectedSlug = slugify(name);
  if (!expectedSlug) throw new Error("name must contain at least one ASCII letter or number");
  return validateBlueprint({ ...generated, name, slug: expectedSlug });
}

export async function readBlueprint(filePath: string) {
  return validateBlueprint(JSON.parse(await readFile(filePath, "utf8")));
}
