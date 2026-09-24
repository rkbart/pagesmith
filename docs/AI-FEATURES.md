# AI Features

## Model: Hybrid

1. **In-browser (free)** — readability scoring runs fully offline via `calculateReadability()`.
2. **BYOK providers** — one OpenAI-compatible chat transport plus a dedicated Anthropic client covers the whole registry (`src/lib/ai/providers.ts`): Ollama (local, default), LM Studio, OpenRouter, Token Harbor, OpenCode Zen, Hugging Face, NVIDIA NIM, Groq, Gemini, DeepSeek, OpenAI, Anthropic, and a custom endpoint. Calls go directly from the browser to the provider with the user's key.

No AI SDK dependency: the SDK's v7 provider story is Gateway-based (server-side auth — wrong for local-first BYOK), and the legacy provider packages target older cores. The hand-rolled transport is ~60 lines and covers every OpenAI-compatible endpoint identically.

## Config

Stored in `localStorage["pagesmith-ai-settings"]`:

```json
{
  "provider": "ollama",
  "keys": { "openrouter": "sk-or-..." },
  "models": { "ollama": "llama3.1" },
  "baseURLs": {}
}
```

Legacy `{ openaiKey, anthropicKey, model }` payloads are adopted automatically. Loaded by `loadSettingsStore()` / `resolveConfig()` in `src/lib/ai/index.ts`; each entry merges registry defaults (endpoint, model, hints).

## Provider notes

- Every curated entry ships its endpoint pre-filled — users paste a key and pick/type a model. Endpoints are editable only for local servers and the custom entry (plus a collapsed Advanced override on curated ones).
- Model fields are preset lists with free-text fallback — model ids rot (especially `:free` ones), so nothing is dropdown-only.
- **Ollama CORS gotcha**: browsers can't reach `localhost:11434` unless served with `OLLAMA_ORIGINS` set — the Settings guide spells out `OLLAMA_ORIGINS=* ollama serve`.
- Unverified at implementation time: direct browser calls to the HuggingFace router (CORS). NVIDIA NIM is **verified browser-blocked** (Sep 2026: preflight answers no CORS headers) — its Settings row says so and points at OpenRouter/Groq for the same model families. The Custom endpoint cannot unblock CORS-blocked providers.
- Keys live only in localStorage and are visible to page JS — same threat model as before, documented in Settings copy ("everything stays on this device" = this device, not this page's memory).

## API layer (`src/lib/ai/index.ts`)

| Function | Purpose |
|---|---|
| `openAICompatible` | POST `{baseURL}/chat/completions`, friendly errors (401, unreachable local, empty reply) |
| `callAnthropic` | POST `/v1/messages` (with `anthropic-dangerous-direct-browser-access`) |
| `testConnection` | 20s-timeout liveness probe for the Settings test button |
| `translateText` | Literary translation, preserves paragraph breaks |
| `editChapter` | Styles: grammar, style, concise, formal, casual |
| `generateSummary` | 2–3 sentence chapter summary |
| `detectChaptersAI` | JSON array split of long text |
| `analyzeConsistency` | Cross-chapter plot/character/timeline check |
| `calculateReadability` | Flesch-Kincaid grade + reading ease (offline) |
| `lookupWord` | DictionaryAPI.dev word lookup |
| `defineWithAI` | AI fallback definition for phrases or failed lookups |

## UI

`AIPanel` (`src/components/ai/AIPanel.tsx`) — six tools (Readability / Translate / Edit / Summarize / Detect Chapters / Consistency), run button, result textarea, Copy, Apply to Chapter, Insert as New Chapter, recent results history. Provider badge reads live config.

`DictionaryTooltip` (`src/components/ai/DictionaryTooltip.tsx`) — floating tooltip on word selection in both the reader and editor. Uses DictionaryAPI.dev with `localStorage` caching for instant repeat lookups; AI fallback for multi-word phrases.

`/settings` — registry-driven: provider select (local/free badges), dynamic key/model/endpoint fields, per-provider hints, Ollama 3-step layman guide with copy buttons, Test connection with inline result.

## Security notes

- Keys live only in localStorage; never sent to PageSmith servers (there are none).
- Anthropic browser access requires the explicit CORS header (already set).
- Temperature fixed at 0.3 for consistency.
