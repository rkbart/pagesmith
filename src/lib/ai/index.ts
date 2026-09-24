import type {
  AIConfig,
  AIProvider,
  TranslationRequest,
  TranslationResult,
  EditRequest,
  EditResult,
  ReadabilityResult,
  Language,
  SummaryResult,
  ChapterSummary,
  ConsistencyResult,
  ConsistencyFinding,
} from "@/types/ai";
import {
  PROVIDERS,
  PROVIDER_MAP,
  DEFAULT_PROVIDER,
  displayName,
  resolveBaseURL,
  type ProviderDef,
} from "./providers";

/* ------------------------------------------------------------------ */
/* Settings storage. Shape: { provider, keys, models, baseURLs } with  */
/* automatic adoption of the legacy { openaiKey, anthropicKey, model }. */
/* ------------------------------------------------------------------ */

const STORE_KEY = "pagesmith-ai-settings";

export interface AISettingsStore {
  provider: AIProvider;
  keys: Partial<Record<string, string>>;
  models: Partial<Record<string, string>>;
  baseURLs: Partial<Record<string, string>>;
}

const EMPTY_STORE: AISettingsStore = {
  provider: DEFAULT_PROVIDER,
  keys: {},
  models: {},
  baseURLs: {},
};

function isProvider(id: unknown): id is AIProvider {
  return typeof id === "string" && PROVIDERS_IDS.includes(id);
}

const PROVIDERS_IDS: readonly string[] = PROVIDERS.map((p) => p.id);

export function loadSettingsStore(): AISettingsStore {
  if (typeof window === "undefined") return { ...EMPTY_STORE };
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...EMPTY_STORE };
    const parsed = JSON.parse(raw) as Partial<AISettingsStore> & {
      openaiKey?: string;
      anthropicKey?: string;
      model?: string;
    };
    const store: AISettingsStore = {
      provider: isProvider(parsed.provider) ? parsed.provider : DEFAULT_PROVIDER,
      keys: { ...(parsed.keys ?? {}) },
      models: { ...(parsed.models ?? {}) },
      baseURLs: { ...(parsed.baseURLs ?? {}) },
    };
    // Legacy adoption (pre-registry shape).
    if (parsed.openaiKey && !store.keys.openai) store.keys.openai = parsed.openaiKey;
    if (parsed.anthropicKey && !store.keys.anthropic)
      store.keys.anthropic = parsed.anthropicKey;
    if (parsed.model && !store.models[store.provider]) {
      if (store.provider === "openai" || store.provider === "anthropic") {
        store.models[store.provider] = parsed.model;
      }
    }
    return store;
  } catch {
    return { ...EMPTY_STORE };
  }
}

export function saveSettingsStore(store: AISettingsStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export interface ResolvedConfig {
  def: ProviderDef;
  apiKey: string;
  model: string;
  baseURL: string;
  temperature: number;
}

/** Merge stored settings with registry defaults for the active provider. */
export function resolveConfig(config?: AIConfig): ResolvedConfig {
  const store = loadSettingsStore();
  const provider = config?.provider ?? store.provider;
  const def = PROVIDER_MAP[provider] ?? PROVIDER_MAP[DEFAULT_PROVIDER];
  const apiKey =
    config?.apiKey ?? store.keys[def.id] ?? "";
  const model =
    (config?.model ?? store.models[def.id] ?? "").trim() || def.defaultModel;
  return {
    def,
    apiKey,
    model,
    baseURL: resolveBaseURL(def, config?.baseURL ?? store.baseURLs[def.id]),
    temperature: config?.temperature ?? 0.3,
  };
}

export function loadAIConfig(): AIConfig {
  const store = loadSettingsStore();
  const def = PROVIDER_MAP[store.provider] ?? PROVIDER_MAP[DEFAULT_PROVIDER];
  return {
    provider: def.id,
    apiKey: store.keys[def.id] ?? "",
    model: store.models[def.id] ?? "",
    baseURL: store.baseURLs[def.id] ?? "",
    temperature: 0.3,
  };
}

/* ------------------------------------------------------------------ */
/* Transports. One OpenAI-compatible chat client covers every provider  */
/* except Anthropic (dedicated client) and browser (local stub).        */
/* ------------------------------------------------------------------ */

function localUnreachableHint(def: ProviderDef, baseURL: string): string {
  if (def.id === "ollama") {
    return (
      `Ollama isn't reachable at ${baseURL}. Start it with \`ollama serve\` ` +
      `(first run: \`ollama pull ${def.defaultModel}\`). Browsers also need CORS: ` +
      `serve with OLLAMA_ORIGINS set, e.g. \`OLLAMA_ORIGINS=* ollama serve\`.`
    );
  }
  if (def.id === "lmstudio") {
    return (
      `LM Studio isn't reachable at ${baseURL}. In LM Studio open the ` +
      `Developer tab, load a model, and press Start Server.`
    );
  }
  return (
    `Nothing is listening at ${baseURL}. Start your server (or fix the ` +
    `endpoint in Settings → Advanced) and make sure it allows browser ` +
    `requests (CORS).`
  );
}

async function openAICompatible(args: {
  def: ProviderDef;
  apiKey: string;
  model: string;
  baseURL: string;
  system: string;
  user: string;
  temperature: number;
  signal?: AbortSignal;
}): Promise<string> {
  const { def, apiKey, model, baseURL, system, user, temperature, signal } = args;
  if (!model) {
    throw new Error(
      `No model set for ${displayName(def)}. Pick or type one in Settings → AI Provider.`
    );
  }
  let response: Response;
  try {
    response = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature,
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    if (def.local) throw new Error(localUnreachableHint(def, baseURL));
    throw new Error(
      `Could not reach ${displayName(def)} from the browser. If it blocks ` +
        `browser calls (CORS), no endpoint setting fixes that — use the same ` +
        `model family through OpenRouter or Groq instead.`
    );
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({} as Record<string, unknown>));
    const message =
      (err as { error?: { message?: string } }).error?.message ??
      (typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : null);
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `${displayName(def)} rejected the key (HTTP ${response.status}). Check it in Settings → AI Provider.`
      );
    }
    throw new Error(
      `${displayName(def)} error (HTTP ${response.status})${message ? `: ${message}` : "."}`
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) {
    throw new Error(
      `${displayName(def)} returned an empty reply — is "${model}" a valid model id for it?`
    );
  }
  return text;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

async function callAI(
  config: AIConfig,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const r = resolveConfig(config);
  if (r.def.kind === "browser") {
    throw new Error(
      "Browser mode only computes readability locally. Pick a provider in Settings → AI Provider for translate/edit."
    );
  }
  if (r.def.kind === "anthropic") {
    if (!r.apiKey)
      throw new Error("Anthropic API key not configured. Go to Settings.");
    return callAnthropic(r.apiKey, r.model, systemPrompt, userPrompt);
  }
  if (r.def.needsKey && !r.apiKey) {
    throw new Error(
      `Add your ${displayName(r.def)} key. Add yours in Settings → AI Provider.`
    );
  }
  return openAICompatible({
    def: r.def,
    apiKey: r.apiKey,
    model: r.model,
    baseURL: r.baseURL,
    system: systemPrompt,
    user: userPrompt,
    temperature: r.temperature,
  });
}

/** Tiny liveness probe for the Settings test button. */
export async function testConnection(config?: AIConfig): Promise<string> {
  const r = resolveConfig(config);
  if (r.def.kind === "browser") {
    return "Readability runs locally — nothing to test.";
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    if (r.def.kind === "anthropic") {
      if (!r.apiKey) throw new Error("Add an Anthropic key first.");
      await callAnthropic(r.apiKey, r.model, "Reply with exactly: ok", "ok");
      return "Connected.";
    }
    if (r.def.needsKey && !r.apiKey) {
      throw new Error(`Add your ${displayName(r.def)} key first.`);
    }
    await openAICompatible({
      def: r.def,
      apiKey: r.apiKey,
      model: r.model || r.def.defaultModel,
      baseURL: r.baseURL,
      system: "Reply with exactly: ok",
      user: "ok",
      temperature: 0,
      signal: controller.signal,
    });
    return "Connected.";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`${displayName(r.def)} timed out after 20s — wrong endpoint or model?`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function translateText(
  request: TranslationRequest,
  config: AIConfig = loadAIConfig()
): Promise<TranslationResult> {
  const systemPrompt = `You are a professional literary translator. Translate the following text from ${request.sourceLang ?? "the source language"} to ${getLanguageName(request.targetLang)}. Preserve the meaning, tone, and style of the original. Maintain paragraph breaks with double newlines. Only output the translation, no explanations.`;
  const userPrompt = request.text;

  const translatedText = await callAI(config, systemPrompt, userPrompt);

  return {
    translatedText,
    sourceLang: request.sourceLang ?? "en",
    targetLang: request.targetLang,
  };
}

export async function editChapter(
  request: EditRequest,
  config: AIConfig = loadAIConfig()
): Promise<EditResult> {
  const styleInstructions: Record<string, string> = {
    grammar: "Fix all grammar, spelling, and punctuation errors. Keep the original style.",
    style: "Improve the writing style. Make it more engaging, clear, and polished while preserving meaning.",
    concise: "Make the text more concise. Remove unnecessary words and redundant phrases.",
    formal: "Make the text more formal and professional in tone.",
    casual: "Make the text more casual, conversational, and relaxed in tone.",
  };

  const style = request.style ?? "grammar";
  const systemPrompt = `You are a professional book editor. ${styleInstructions[style]} Preserve the paragraph structure (double newlines). Only output the edited text, no explanations.`;
  const userPrompt = request.text;

  const editedText = await callAI(config, systemPrompt, userPrompt);

  return {
    editedText,
    changes: [], // Detailed change tracking would require a diff approach
  };
}

export async function generateSummary(
  chapters: { title: string; content: string; id: string }[],
  config: AIConfig = loadAIConfig()
): Promise<SummaryResult> {
  const systemPrompt =
    "You are a professional book editor. Generate a summary of the entire book below. Output ONLY a JSON object: {\"chapterSummaries\": [{\"chapterId\": \"id\", \"summary\": \"2-3 sentence summary\"}], \"bookSynopsis\": \"overall book synopsis\"}. Include a summary for each chapter listed and a book synopsis at the end.";
  const userPrompt = chapters
    .map((ch) => `## ${ch.title}\n${ch.content.replace(/<[^>]+>/g, " ").substring(0, 4000)}`)
    .join("\n\n---\n\n");

  const result = await callAI(config, systemPrompt, userPrompt);
  let chapterSummaries: ChapterSummary[];
  let bookSynopsis: string;
  try {
    const parsed = JSON.parse(result);
    chapterSummaries = parsed.chapterSummaries ?? [];
    bookSynopsis = parsed.bookSynopsis ?? result;
  } catch {
    chapterSummaries = [{ chapterId: "all", summary: result }];
    bookSynopsis = result;
  }

  return { chapterSummaries, bookSynopsis };
}

export async function detectChaptersAI(
  text: string,
  config: AIConfig = loadAIConfig()
): Promise<{ title: string; content: string }[]> {
  const systemPrompt = `You are a book structure analyzer. Split the following text into logical chapters. Output as JSON array: [{"title": "Chapter Title", "content": "chapter content"}]. Each chapter should have a meaningful title. Output ONLY the JSON array.`;
  const userPrompt = text.substring(0, 8000);

  const result = await callAI(config, systemPrompt, userPrompt);
  try {
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed : [{ title: "Content", content: text }];
  } catch {
    return [{ title: "Content", content: text }];
  }
}

export async function analyzeConsistency(
  chapters: { title: string; content: string }[],
  config: AIConfig = loadAIConfig()
): Promise<ConsistencyResult> {
  const systemPrompt =
    "You are a professional book editor. Analyze the following chapters for consistency issues: character names, plot holes, timeline issues, contradictions. Output ONLY a JSON array of findings: [{\"type\":\"character\"|\"plot\"|\"timeline\",\"severity\":\"low\"|\"medium\"|\"high\",\"description\":\"...\",\"chapters\":[\"...\"]}]. After the array, add an overall assessment paragraph.";
  const userPrompt = chapters
    .map((ch) => `## ${ch.title}\n${ch.content.replace(/<[^>]+>/g, " ").substring(0, 2000)}`)
    .join("\n\n---\n\n")
    .substring(0, 12000);

  const result = await callAI(config, systemPrompt, userPrompt);

  const findings: ConsistencyFinding[] = [];
  const jsonMatch = result.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.type && item.severity && item.description) {
            findings.push({
              type: item.type,
              severity: item.severity,
              description: item.description,
              chapters: item.chapters ?? [],
            });
          }
        }
      }
    } catch {
      // Fall through to string-based result
    }
  }

  const overall =
    findings.length > 0
      ? `Found ${findings.length} consistency issue(s): ${findings.map((f) => `${f.type} (${f.severity})`).join(", ")}.`
      : "No significant consistency issues detected across chapters.";

  return { findings, overall };
}

export function calculateReadability(text: string): ReadabilityResult {
  const cleanText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);

  const sentenceCount = sentences.length || 1;
  const wordCount = words.length || 1;

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgSyllablesPerWord = totalSyllables / wordCount;
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / wordCount;

  const fleschKincaidGrade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  const fleschReadingEase =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  return {
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
    fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
    averageSentenceLength: Math.round(avgWordsPerSentence * 10) / 10,
    averageWordLength: Math.round(avgWordLength * 10) / 10,
    wordCount,
    sentenceCount,
  };
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function getLanguageName(code: Language): string {
  const map: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    ru: "Russian",
    ja: "Japanese",
    ko: "Korean",
    zh: "Chinese",
    ar: "Arabic",
    hi: "Hindi",
    tr: "Turkish",
  };
  return map[code] ?? code;
}
