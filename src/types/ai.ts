export type AIProvider =
  | "browser"
  | "ollama"
  | "lmstudio"
  | "openrouter"
  | "tokenharbor"
  | "opencodezen"
  | "huggingface"
  | "nvidia"
  | "groq"
  | "gemini"
  | "deepseek"
  | "openai"
  | "anthropic"
  | "custom";

export type AITask =
  | "translate"
  | "edit"
  | "summarize"
  | "detect-chapters"
  | "analyze"
  | "consistency";

export type Language =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "ru"
  | "ja"
  | "ko"
  | "zh"
  | "ar"
  | "hi"
  | "tr";

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  /** Endpoint override. Blank = the registry default for the provider. */
  baseURL?: string;
  temperature?: number;
}

export interface TranslationRequest {
  text: string;
  sourceLang?: Language;
  targetLang: Language;
}

export interface TranslationResult {
  translatedText: string;
  sourceLang: Language;
  targetLang: Language;
}

export interface EditRequest {
  text: string;
  style?: "grammar" | "style" | "concise" | "formal" | "casual";
}

export interface EditResult {
  editedText: string;
  changes: EditChange[];
}

export interface EditChange {
  original: string;
  replacement: string;
  reason: string;
}

export interface ReadabilityResult {
  fleschKincaidGrade: number;
  fleschReadingEase: number;
  averageSentenceLength: number;
  averageWordLength: number;
  wordCount: number;
  sentenceCount: number;
}

export interface AnalysisResult {
  readability: ReadabilityResult;
  tone: ToneAnalysis;
  characters: string[];
}

export interface ToneAnalysis {
  overall: string;
  chapters: ChapterTone[];
}

export interface ChapterTone {
  chapterId: string;
  sentiment: "positive" | "negative" | "neutral";
  mood: string;
  confidence: number;
}

export interface SummaryResult {
  chapterSummaries: ChapterSummary[];
  bookSynopsis: string;
}

export interface ChapterSummary {
  chapterId: string;
  summary: string;
}

export interface ConsistencyFinding {
  type: "character" | "plot" | "timeline";
  severity: "low" | "medium" | "high";
  description: string;
  chapters: string[];
}

export interface ConsistencyResult {
  findings: ConsistencyFinding[];
  overall: string;
}

export interface AnalysisResult {
  readability: ReadabilityResult;
  tone: ToneAnalysis;
  characters: string[];
}
