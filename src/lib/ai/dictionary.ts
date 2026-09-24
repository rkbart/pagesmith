import { callAI, loadAIConfig } from "@/lib/ai";

export interface DictionaryDefinition {
  definition: string;
  example?: string;
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  meanings: DictionaryMeaning[];
}

interface DictionaryAPIResponse {
  word: string;
  phonetics?: { text?: string }[];
  meanings?: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[];
}

export async function lookupWord(word: string): Promise<DictionaryResult | null> {
  const cleaned = word.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${cleaned}`
    );
    if (!res.ok) return null;
    const data: DictionaryAPIResponse[] = await res.json();
    const entry = data[0];
    if (!entry) return null;

    const phonetic = entry.phonetics?.[0]?.text;
    const meanings: DictionaryMeaning[] = (entry.meanings ?? []).map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.map((d) => ({
        definition: d.definition,
        example: d.example,
      })),
    }));

    return { word: entry.word, phonetic, meanings };
  } catch {
    return null;
  }
}

export async function defineWithAI(text: string): Promise<string> {
  const systemPrompt =
    "You are a dictionary. Define the word or phrase clearly and concisely. If it's a multi-word phrase, explain its meaning. Output ONLY the definition, no explanations.";
  const userPrompt = `Define: "${text}"`;

  try {
    const definition = await callAI(loadAIConfig(), systemPrompt, userPrompt);
    return definition;
  } catch {
    return "Definition unavailable. Try again or check your AI provider settings.";
  }
}