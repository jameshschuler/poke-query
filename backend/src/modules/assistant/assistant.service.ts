import { generateMetadata } from "../../utils/pogo-parser.js";
import type { AssistantMode } from "./assistant.schemas.js";
type AssistantProviderName = "gemini" | "openai" | "claude" | "hybrid";

type AssistantProviderResult = {
  title: string;
  query: string;
  description: string | null;
  tags: string[];
  explanation?: string;
  warnings?: string[];
};

export type GenerateAssistantSearchStringInput = {
  prompt: string;
  mode?: AssistantMode;
  context?: Record<string, unknown>;
  previousResultId?: string;
};

export type GenerateAssistantSearchStringResult = {
  resultId: string;
  title: string;
  query: string;
  description: string | null;
  tags: string[];
  explanation?: string;
  warnings?: string[];
  provider: AssistantProviderName;
  model: string;
};

const PROVIDER_TIMEOUT_MS = Number(process.env.ASSISTANT_PROVIDER_TIMEOUT_MS ?? "15000");
const MAX_TAGS = 5;
const WRITING_STYLE_POLICY =
  'When generating or revising text, write in a way that feels natural, human, and context-aware rather than formulaic or AI-like. Preserve the original meaning, but replace generic, inflated, or promotional wording with clear, specific, and factual language. Avoid vague attributions such as unnamed "experts" or "studies" unless concrete details are provided. Prefer direct, plain phrasing over abstract or filler-heavy expressions, and cut unnecessary phrases like "in order to" or "at this point in time." Reduce excessive hedging and remove stock structures that feel templated, such as predictable intros, summaries, or "challenges/future outlook" sections unless they are genuinely required. Vary sentence length and rhythm so the prose does not sound uniform or mechanical, and add light human texture or perspective only when it fits the intended tone. Avoid overusing em dashes, and remove assistant-style artifacts like sign-offs, disclaimers, or references to being an AI. The final output should read smoothly, sound like it was written by a person, rely on concrete details over generalities, and maintain a consistent tone appropriate for the audience and purpose.';
const OUTPUT_FORMAT_POLICY =
  "Return only JSON with keys: title (string), query (string), description (string or null), tags (array of strings). Do not include markdown, code fences, labels, or extra prose.";

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

function getGeminiApiKey(): string {
  return process.env.GEMINI_API_KEY ?? "";
}

class AssistantProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistantProviderError";
  }
}

function titleFromPrompt(prompt: string): string {
  const title = prompt.trim().slice(0, 100);
  return title || "Generated Search String";
}

function normalizeTag(rawTag: string): string {
  return rawTag
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .trim();
}

function tagsFromQuery(query: string): string[] {
  const metadata = generateMetadata(query);

  return Array.from(new Set(metadata.autoTags.map(normalizeTag)))
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

function normalizeTags(rawTags: unknown, query: string): string[] {
  if (!Array.isArray(rawTags)) {
    return tagsFromQuery(query);
  }

  const modelTags = Array.from(
    new Set(
      rawTags
        .filter((value): value is string => typeof value === "string")
        .map(normalizeTag)
        .filter(Boolean),
    ),
  ).slice(0, MAX_TAGS);

  if (modelTags.length === 0) {
    return tagsFromQuery(query);
  }

  return modelTags;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, providerName: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer);
      reject(new AssistantProviderError(`${providerName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

async function callGemini(prompt: string): Promise<string> {
  const geminiApiKey = getGeminiApiKey();
  const geminiModel = getGeminiModel();

  if (!geminiApiKey) {
    throw new AssistantProviderError("GEMINI_API_KEY is not configured.");
  }

  const response = await withTimeout(
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        geminiModel,
      )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: WRITING_STYLE_POLICY },
                { text: OUTPUT_FORMAT_POLICY },
                { text: prompt },
              ],
            },
          ],
        }),
      },
    ),
    PROVIDER_TIMEOUT_MS,
    "gemini",
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new AssistantProviderError(`Gemini request failed (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const text = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new AssistantProviderError("Gemini returned an empty response.");
  }

  return text;
}

function extractJsonObject(text: string): string {
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

function parseGeminiResult(prompt: string, text: string): AssistantProviderResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch {
    throw new AssistantProviderError("Gemini response was not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AssistantProviderError("Gemini response JSON must be an object.");
  }

  const payload = parsed as {
    title?: unknown;
    query?: unknown;
    description?: unknown;
    tags?: unknown;
  };

  const query = typeof payload.query === "string" ? payload.query.replace(/\s+/g, "").trim() : "";
  if (!query) {
    throw new AssistantProviderError("Gemini JSON did not include a valid query string.");
  }

  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim().slice(0, 100)
      : titleFromPrompt(prompt);

  const description =
    typeof payload.description === "string"
      ? payload.description.trim() || null
      : payload.description === null
        ? null
        : null;

  return {
    title,
    query,
    description,
    tags: normalizeTags(payload.tags, query),
    explanation: "Generated from prompt using Gemini.",
  };
}

export async function generateAssistantSearchString(
  input: GenerateAssistantSearchStringInput,
): Promise<GenerateAssistantSearchStringResult> {
  const prompt = input.prompt.trim();
  if (prompt.length < 3) {
    throw new AssistantProviderError("Prompt must be at least 3 characters.");
  }

  const geminiText = await callGemini(prompt);
  const result = parseGeminiResult(prompt, geminiText);

  return {
    resultId: crypto.randomUUID(),
    title: result.title,
    query: result.query,
    description: result.description,
    tags: result.tags,
    ...(result.explanation ? { explanation: result.explanation } : {}),
    ...(result.warnings ? { warnings: result.warnings } : {}),
    provider: "gemini",
    model: getGeminiModel(),
  };
}
