# AI Features

## Model: Hybrid

1. **In-browser (free)** — readability scoring runs fully offline via `calculateReadability()`.
2. **BYOK API** — users paste their own OpenAI or Anthropic key in `/settings`; calls go directly from the browser to the provider.

Planned: `@huggingface/transformers` for true in-browser translation/editing (package already installed).

## Config

Stored in `localStorage["pagesmith-ai-settings"]`:

```json
{
  "provider": "browser" | "openai" | "anthropic",
  "openaiKey": "sk-...",
  "anthropicKey": "sk-ant-...",
  "model": "gpt-4o-mini"
}
```

Loaded by `loadAIConfig()` in `src/lib/ai/index.ts`.

## API layer (`src/lib/ai/index.ts`)

| Function | Purpose |
|---|---|
| `callOpenAI` | POST `/v1/chat/completions` |
| `callAnthropic` | POST `/v1/messages` (with `anthropic-dangerous-direct-browser-access`) |
| `translateText` | Literary translation, preserves paragraph breaks |
| `editChapter` | Styles: grammar, style, concise, formal, casual |
| `generateSummary` | 2–3 sentence chapter summary |
| `detectChaptersAI` | JSON array split of long text |
| `analyzeConsistency` | Cross-chapter plot/character/timeline check |
| `calculateReadability` | Flesch-Kincaid grade + reading ease (offline) |

## UI

`AIPanel` (`src/components/ai/AIPanel.tsx`) — three tabs (Readability / Translate / Edit), run button, result textarea, Copy, Apply to Chapter.

## Security notes

- Keys live only in localStorage; never sent to PageSmith servers (there are none).
- Anthropic browser access requires the explicit CORS header (already set).
- Temperature fixed at 0.3 for consistency.
