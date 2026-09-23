import type { AIProvider } from "@/types/ai";

/**
 * Universal provider registry: one OpenAI-compatible chat transport plus a
 * dedicated Anthropic client covers every entry (Anthropic's API is not
 * OpenAI-compatible, everything else here is).
 *
 * Each entry ships its endpoint pre-filled — the user only ever pastes a
 * key and picks/types a model. Endpoint editing is enabled only where ports
 * genuinely vary (local servers, custom) or as an Advanced override.
 */

export type ProviderKind = "openai-compatible" | "anthropic" | "browser";

export interface ModelPreset {
  value: string;
  label: string;
}

export interface ProviderDef {
  id: AIProvider;
  label: string;
  kind: ProviderKind;
  /** Local (no key, no data leaves the machine) vs API (BYOK). */
  local: boolean;
  needsKey: boolean;
  keyPlaceholder?: string;
  keyUrl?: string;
  keyUrlLabel?: string;
  /** Pre-filled endpoint. Editable only when `editableEndpoint`. */
  baseURL: string;
  editableEndpoint: boolean;
  models: ModelPreset[];
  defaultModel: string;
  /** Setup notes rendered in Settings (CORS gotchas, install steps). */
  hint: string;
  freeNote?: string;
}

const EMPTY_MODELS: ModelPreset[] = [];

export const PROVIDERS: ProviderDef[] = [
  {
    id: "ollama",
    label: "Ollama (local)",
    kind: "openai-compatible",
    local: true,
    needsKey: false,
    baseURL: "http://localhost:11434/v1",
    editableEndpoint: true,
    models: [
      { value: "llama3.1", label: "Llama 3.1 (good all-rounder)" },
      { value: "qwen2.5", label: "Qwen 2.5 (strong multilingual)" },
      { value: "mistral", label: "Mistral (fast)" },
      { value: "gemma2", label: "Gemma 2 (efficient)" },
    ],
    defaultModel: "llama3.1",
    hint: "Free and private — models run on your machine. Install from ollama.com, then pull a model (`ollama pull llama3.1`) and serve it (`ollama serve`). Type any model you have installed; the list above is just suggestions.",
    freeNote: "Free · private",
  },
  {
    id: "lmstudio",
    label: "LM Studio (local)",
    kind: "openai-compatible",
    local: true,
    needsKey: false,
    baseURL: "http://localhost:1234/v1",
    editableEndpoint: true,
    models: [],
    defaultModel: "",
    hint: "Free and private. Load any GGUF model in LM Studio, start its local server (default port 1234), then type the exact model identifier shown in LM Studio.",
    freeNote: "Free · private",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    kind: "openai-compatible",
    local: false,
    needsKey: true,
    keyPlaceholder: "sk-or-...",
    keyUrl: "https://openrouter.ai/keys",
    keyUrlLabel: "openrouter.ai/keys",
    baseURL: "https://openrouter.ai/api/v1",
    editableEndpoint: false,
    models: [
      { value: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (free)" },
      { value: "qwen/qwen-2.5-72b-instruct:free", label: "Qwen 2.5 72B (free)" },
      { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash (cheap)" },
      { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
    ],
    defaultModel: "meta-llama/llama-3.1-8b-instruct:free",
    hint: "One key for hundreds of models, including free ones (the :free suffix). Free-tier model ids change often — if one stops working, pick another or type any current id.",
    freeNote: "Free models available",
  },
  {
    id: "tokenharbor",
    label: "Token Harbor",
    kind: "openai-compatible",
    local: false,
    needsKey: true,
    keyPlaceholder: "th-...",
    keyUrl: "https://tokenharbor.ai/dashboard/api-keys",
    keyUrlLabel: "tokenharbor.ai dashboard",
    baseURL: "https://tokenharbor.ai/v1",
    editableEndpoint: false,
    models: [
      { value: "mimo-v2.6-flash:free", label: "MiMo Flash (free, verified)" },
      { value: "mimo-v2.5:free", label: "MiMo (free)" },
      { value: "deepseek-v4-flash:free", label: "DeepSeek Flash (free)" },
      { value: "deepseek-v4.1-flash:free", label: "DeepSeek 4.1 Flash (free)" },
      { value: "qwen3.8-flash:free", label: "Qwen Flash (free)" },
    ],
    defaultModel: "mimo-v2.6-flash:free",
    hint: "One key for many models with a free allowance. Free models use the :free suffix (verified live); paid ones 402 when the balance is $0. If a preset stops working, list /v1/models with your key and type any $0-priced id.",
    freeNote: "Free allowance",
  },
  {
    id: "opencodezen",
    label: "OpenCode Zen",
    kind: "openai-compatible",
    local: false,
    needsKey: true,
    keyPlaceholder: "opencode-...",
    keyUrl: "https://opencode.ai",
    keyUrlLabel: "opencode.ai dashboard",
    baseURL: "https://opencode.ai/zen/v1",
    editableEndpoint: false,
    models: [
      { value: "big-pickle", label: "Big Pickle (free, reasoning)" },
      { value: "laguna-s-2.1-free", label: "Laguna S (free, coding)" },
      { value: "ling-2.6-flash-free", label: "Ling Flash (free)" },
      { value: "deepseek-v4-flash-free", label: "DeepSeek Flash (free)" },
      { value: "mimo-v2.5-free", label: "MiMo (free, multilingual)" },
      { value: "nemotron-3-super-free", label: "Nemotron Super (free)" },
      { value: "muse-spark-free", label: "Muse Spark (free)" },
    ],
    defaultModel: "big-pickle",
    hint: "OpenCode's free model promo: no per-token billing, but the roster rotates without notice and the account may need activation first. If a preset 404s, it rotated away — type any current -free id.",
    freeNote: "Free promo",
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    kind: "openai-compatible",
    local: false,
    needsKey: true,
    keyPlaceholder: "hf_...",
    keyUrl: "https://huggingface.co/settings/tokens",
    keyUrlLabel: "huggingface.co/settings/tokens",
    baseURL: "https://router.huggingface.co/v1",
    editableEndpoint: false,
    models: [
      { value: "meta-llama/Meta-Llama-3.1-8B-Instruct", label: "Llama 3.1 8B" },
      { value: "Qwen/Qwen2.5-72B-Instruct", label: "Qwen 2.5 72B" },
      { value: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B (fast)" },
    ],
    defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    hint: "Serverless inference with a free allowance. Needs a user token with inference permissions. If the browser can't reach the router (CORS), use the Custom endpoint as fallback.",
    freeNote: "Free allowance",
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    kind: "openai-compatible",
    local: false,
    needsKey: true,
    keyPlaceholder: "nvapi-...",
    keyUrl: "https://build.nvidia.com",
    keyUrlLabel: "build.nvidia.com",
    baseURL: "https://integrate.api.nvidia.com/v1",
    editableEndpoint: false,
    models: [
      { value: "nvidia/nemotron-3.5-lightning-30b-a3b", label: "Nemotron Lightning 30B (verified)" },
      { value: "nvidia/nemotron-3-super-120b-a12b", label: "Nemotron Super 120B" },
      { value: "mistralai/mistral-nemotron", label: "Mistral Nemotron (agentic)" },
      { value: "nvidia/llama-3.1-nemotron-70b-instruct", label: "Nemotron 70B" },
    ],
    defaultModel: "nvidia/nemotron-3.5-lightning-30b-a3b",
    hint: "NVIDIA-hosted open models with free credits to start. Generate a key at build.nvidia.com (NIM section). Model ids retire often — pick from the live list at build.nvidia.com/models if one 404s. NOTE (verified Sep 2026): integrate.api.nvidia.com answers no CORS headers, so browsers cannot call it directly and PageSmith can't use it yet — same models are reachable through OpenRouter or Groq below.",
    freeNote: "Free credits",
  },
  {
    id: "groq",
    label: "Groq",
    kind: "openai-compatible",
    local: false,
    needsKey: true,
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    keyUrlLabel: "console.groq.com/keys",
    baseURL: "https://api.groq.com/openai/v1",
    editableEndpoint: false,
    models: [
      { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B (very fast)" },
      { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    ],
    defaultModel: "llama-3.1-8b-instant",
    hint: "Extremely fast inference with a generous free tier. Great default for translate/edit if you don't run Ollama.",
    freeNote: "Generous free tier",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    kind: "openai-compatible",
    local: false,
    needsKey: true,
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/apikey",
    keyUrlLabel: "aistudio.google.com/apikey",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    editableEndpoint: false,
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (free tier)" },
      { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
    ],
    defaultModel: "gemini-2.0-flash",
    hint: "Google AI Studio keys carry a free allowance. Served here through Gemini's OpenAI-compatible endpoint.",
    freeNote: "Free allowance",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    kind: "openai-compatible",
    local: false,
    needsKey: true,
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyUrlLabel: "platform.deepseek.com",
    baseURL: "https://api.deepseek.com/v1",
    editableEndpoint: false,
    models: [
      { value: "deepseek-chat", label: "DeepSeek V3 (cheap, strong)" },
    ],
    defaultModel: "deepseek-chat",
    hint: "Very cheap frontier-class quality. No free tier, but translate/edit usage costs fractions of a cent.",
  },
  {
    id: "openai",
    label: "OpenAI",
    kind: "openai-compatible",
    local: false,
    needsKey: true,
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "platform.openai.com",
    baseURL: "https://api.openai.com/v1",
    editableEndpoint: false,
    models: [
      { value: "gpt-4o-mini", label: "GPT-4o Mini (fast, cheap)" },
      { value: "gpt-4o", label: "GPT-4o (best quality)" },
    ],
    defaultModel: "gpt-4o-mini",
    hint: "Pay-as-you-go. Calls go straight from your browser to OpenAI with your key.",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    kind: "anthropic",
    local: false,
    needsKey: true,
    keyPlaceholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/",
    keyUrlLabel: "console.anthropic.com",
    baseURL: "https://api.anthropic.com/v1",
    editableEndpoint: false,
    models: [
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (fast)" },
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (best)" },
    ],
    defaultModel: "claude-3-5-haiku-20241022",
    hint: "The only non-OpenAI-compatible API here — served by a dedicated client with browser-access headers. Pay-as-you-go.",
  },
  {
    id: "custom",
    label: "Custom endpoint",
    kind: "openai-compatible",
    local: true,
    needsKey: false,
    baseURL: "",
    editableEndpoint: true,
    models: EMPTY_MODELS,
    defaultModel: "",
    hint: "Any OpenAI-compatible server: vLLM, text-generation-webui, LocalAI, llama.cpp server, company gateway. Paste the base URL (…/v1), add a key only if yours needs one, and type the model id it serves. Note: this cannot unblock a provider that refuses browser calls (CORS) — same URL, same block.",
    freeNote: "Your infrastructure",
  },
  {
    id: "browser",
    label: "In-Browser (readability only)",
    kind: "browser",
    local: true,
    needsKey: false,
    baseURL: "",
    editableEndpoint: false,
    models: EMPTY_MODELS,
    defaultModel: "",
    hint: "No model calls at all — readability scores compute locally. Translate/edit need a real provider above.",
    freeNote: "Free · private",
  },
];

export const PROVIDER_MAP: Record<AIProvider, ProviderDef> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p])
) as Record<AIProvider, ProviderDef>;

export const DEFAULT_PROVIDER: AIProvider = "ollama";

/** Endpoint actually used: explicit override wins, else the registry default. */
export function resolveBaseURL(def: ProviderDef, override?: string): string {
  const raw = (override ?? "").trim() || def.baseURL;
  return raw.replace(/\/+$/, "");
}

/** "Ollama (local)" → "Ollama" — labels carry context the prose shouldn't. */
export function displayName(def: ProviderDef): string {
  return def.label.replace(/\s*\(.*?\)\s*$/, "");
}
