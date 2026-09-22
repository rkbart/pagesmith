import type {
  AIConfig,
  TranslationRequest,
  TranslationResult,
  EditRequest,
  EditResult,
  ReadabilityResult,
  Language,
} from "@/types/ai";
import { generateId } from "@/lib/utils/text";

export function loadAIConfig(): AIConfig {
  if (typeof window === "undefined") return { provider: "browser" };
  try {
    const stored = localStorage.getItem("pagesmith-ai-settings");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        provider: parsed.provider ?? "browser",
        apiKey: parsed.provider === "openai" ? parsed.openaiKey : parsed.anthropicKey,
        model: parsed.model,
        temperature: 0.3,
      };
    }
  } catch {
    // fall through
  }
  return { provider: "browser" };
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message ?? `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? "";
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

async function callAI(config: AIConfig, systemPrompt: string, userPrompt: string): Promise<string> {
  if (config.provider === "openai") {
    if (!config.apiKey) throw new Error("OpenAI API key not configured. Go to Settings.");
    return callOpenAI(config.apiKey, config.model || "gpt-4o-mini", systemPrompt, userPrompt);
  }
  if (config.provider === "anthropic") {
    if (!config.apiKey) throw new Error("Anthropic API key not configured. Go to Settings.");
    return callAnthropic(config.apiKey, config.model || "claude-3-5-haiku-20241022", systemPrompt, userPrompt);
  }
  // Browser mode - basic fallback
  return browserTranslate(systemPrompt, userPrompt);
}

async function browserTranslate(_systemPrompt: string, userPrompt: string): Promise<string> {
  // In browser mode, we use a simple dictionary-based approach
  // For real translation, users should configure an API key
  throw new Error(
    "Browser-mode translation is limited. Configure an AI API key in Settings for full translation support."
  );
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
  text: string,
  chapterTitle: string,
  config: AIConfig = loadAIConfig()
): Promise<string> {
  const systemPrompt =
    "You are a professional book editor. Generate a concise summary of the following chapter (2-3 sentences). Only output the summary.";
  const userPrompt = `Chapter: ${chapterTitle}\n\n${text.substring(0, 4000)}`;

  return callAI(config, systemPrompt, userPrompt);
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
): Promise<string> {
  const systemPrompt =
    "You are a professional book editor. Analyze the following chapters for consistency issues: character names, plot holes, timeline issues, contradictions. Provide a numbered list of findings. Be specific and reference chapter titles.";
  const userPrompt = chapters
    .map((ch) => `## ${ch.title}\n${ch.content.replace(/<[^>]+>/g, " ").substring(0, 2000)}`)
    .join("\n\n---\n\n")
    .substring(0, 12000);

  return callAI(config, systemPrompt, userPrompt);
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
