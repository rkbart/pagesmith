"use client";

import { useState, useEffect } from "react";
import {
  Key,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  Lock,
  Globe,
  Coffee,
  Zap,
  Copy,
  Check,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  PROVIDERS,
  PROVIDER_MAP,
  DEFAULT_PROVIDER,
  type ProviderDef,
} from "@/lib/ai/providers";
import {
  loadSettingsStore,
  saveSettingsStore,
  testConnection,
  type AISettingsStore,
} from "@/lib/ai";

const DEFAULT_SETTINGS: AISettingsStore = {
  provider: DEFAULT_PROVIDER,
  keys: {},
  models: {},
  baseURLs: {},
};

const CUSTOM_MODEL = "custom";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AISettingsStore>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  useEffect(() => {
    // Deferred so settings state isn't set synchronously in the effect.
    const t = setTimeout(() => setSettings(loadSettingsStore()), 0);
    return () => clearTimeout(t);
  }, []);

  const def: ProviderDef =
    PROVIDER_MAP[settings.provider] ?? PROVIDER_MAP[DEFAULT_PROVIDER];
  const key = settings.keys[def.id] ?? "";
  const model = settings.models[def.id] ?? "";
  const baseURL = settings.baseURLs[def.id] ?? "";
  const effectiveModel = model.trim() || def.defaultModel;
  const inPresets = def.models.some((m) => m.value === model);

  const patch = (p: Partial<AISettingsStore>) => {
    setSettings((s) => ({ ...s, ...p }));
    setTestResult(null);
  };
  const setKey = (value: string) =>
    patch({ keys: { ...settings.keys, [def.id]: value } });
  const setModel = (value: string) =>
    patch({ models: { ...settings.models, [def.id]: value } });
  const setBaseURL = (value: string) =>
    patch({ baseURLs: { ...settings.baseURLs, [def.id]: value } });

  const save = () => {
    saveSettingsStore(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const message = await testConnection({
        provider: def.id,
        apiKey: key,
        model: effectiveModel,
        baseURL: baseURL,
      });
      setTestResult({ ok: true, message });
    } catch (err) {
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const copyCmd = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmd(cmd);
      setTimeout(() => setCopiedCmd((c) => (c === cmd ? null : c)), 2000);
    } catch {
      // clipboard unavailable — the command is still visible to type out
    }
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <p className="eyebrow mb-2">Settings</p>
        <h1 className="heading-lg">Configure the apprentice</h1>
        <p className="body-md-loose mt-2 text-muted-foreground">
          Pick any model — local or cloud, free or paid — with your own key.
          Everything stays on this device.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">AI Provider</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={def.id}
                onValueChange={(v) =>
                  v &&
                  patch({
                    provider: v as AISettingsStore["provider"],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                      {p.freeNote ? ` — ${p.freeNote}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{def.hint}</p>
            </div>

            {def.id === "ollama" && <OllamaGuide onCopy={copyCmd} copiedCmd={copiedCmd} />}

            {def.needsKey && (
              <div className="space-y-2">
                <Label htmlFor="provider-key">{def.label} API Key</Label>
                <div className="relative">
                  <Input
                    id="provider-key"
                    type={showKey ? "text" : "password"}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={def.keyPlaceholder ?? "paste key…"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    aria-label={showKey ? "Hide key" : "Show key"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {def.keyUrl && (
                  <p className="text-xs text-muted-foreground">
                    Get your key at{" "}
                    <a
                      href={def.keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {def.keyUrlLabel ?? def.keyUrl}
                    </a>
                  </p>
                )}
              </div>
            )}

            {def.kind !== "browser" && (
              <div className="space-y-2">
                <Label>Model</Label>
                {def.models.length > 0 ? (
                  <>
                    <Select
                      value={inPresets ? model : CUSTOM_MODEL}
                      onValueChange={(v) => {
                        if (v) setModel(v === CUSTOM_MODEL ? "" : v);
                      }}
                    >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {def.models.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                        <SelectItem value={CUSTOM_MODEL}>Custom model id…</SelectItem>
                      </SelectContent>
                    </Select>
                    {!inPresets && (
                      <Input
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={def.defaultModel || "model-id"}
                        aria-label="Custom model id"
                      />
                    )}
                  </>
                ) : (
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder={
                      def.id === "custom"
                        ? "e.g. mistral-7b-instruct"
                        : "Type the exact model id your server shows"
                    }
                    aria-label="Model id"
                  />
                )}
                {effectiveModel && (
                  <p className="text-xs text-muted-foreground">
                    Using <code>{effectiveModel}</code>
                  </p>
                )}
              </div>
            )}

            {def.editableEndpoint && def.id !== "custom" && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Advanced: endpoint override
                </summary>
                <div className="mt-2 space-y-2">
                  <Label htmlFor="provider-endpoint">Endpoint base URL</Label>
                  <Input
                    id="provider-endpoint"
                    value={baseURL}
                    onChange={(e) => setBaseURL(e.target.value)}
                    placeholder={def.baseURL}
                  />
                  <p className="text-xs text-muted-foreground">
                    Blank = default ({def.baseURL}). Only change this if your
                    server runs on another host or port.
                  </p>
                </div>
              </details>
            )}

            {def.id === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="provider-endpoint">Endpoint base URL *</Label>
                <Input
                  id="provider-endpoint"
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder="https://…/v1"
                />
                <p className="text-xs text-muted-foreground">
                  Any OpenAI-compatible server (vLLM, text-generation-webui,
                  LocalAI, llama.cpp server, company gateway). Add a key above
                  only if yours requires one.
                </p>
              </div>
            )}

            {def.kind !== "browser" && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={runTest}
                  disabled={testing}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {testing ? "Testing…" : "Test connection"}
                </Button>
                {testResult && (
                  <p
                    className={`text-sm ${testResult.ok ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
                    role={testResult.ok ? "status" : "alert"}
                  >
                    {testResult.ok ? "✓ " : ""}
                    {testResult.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="border-t pt-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Current Mode</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {def.local && !def.needsKey
                    ? `${def.label} — no data leaves your device`
                    : def.needsKey
                      ? `${def.label} with your key${effectiveModel ? ` · ${effectiveModel}` : ""}`
                      : def.label}
                </p>
              </div>
              <Badge variant={def.local && !def.needsKey ? "secondary" : "brass"}>
                <span className="inline-flex items-center gap-1">
                  {def.local && !def.needsKey ? (
                    <Lock className="size-3" aria-hidden="true" />
                  ) : (
                    <Globe className="size-3" aria-hidden="true" />
                  )}
                  {def.local && !def.needsKey ? "Local" : "API"}
                </span>
              </Badge>
            </div>
          </Card>

          <Button onClick={save} size="lg">
            {saved ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Settings
              </>
            )}
          </Button>
        </div>

        <div className="pt-4 text-center">
          <p className="mb-2 text-sm text-muted-foreground">
            If PageSmith helps you publish, consider supporting development:
          </p>
          <a
            href="https://www.buymeacoffee.com/rkbart"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-brass hover:underline"
          >
            <Coffee className="size-4" aria-hidden="true" />
            Buy Me a Coffee
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Layman Ollama onboarding: install → pull → serve (with the CORS gotcha
 * spelled out), each command one click to copy.
 */
function OllamaGuide({
  onCopy,
  copiedCmd,
}: {
  onCopy: (cmd: string) => void;
  copiedCmd: string | null;
}) {
  const steps: { text: string; cmd?: string }[] = [
    {
      text: "Install Ollama from ollama.com for your system.",
    },
    {
      text: "Download a model (one time, ~5GB for the suggested one):",
      cmd: "ollama pull llama3.1",
    },
    {
      text: "Start the server. Browsers need permission to reach it, so include OLLAMA_ORIGINS:",
      cmd: "OLLAMA_ORIGINS=* ollama serve",
    },
  ];
  return (
    <div className="rounded-xl border bg-muted/40 p-4 text-sm">
      <p className="mb-3 flex items-center gap-1.5 font-medium">
        <Terminal className="size-4" aria-hidden="true" />
        Get Ollama talking to PageSmith in 3 steps
      </p>
      <ol className="list-decimal space-y-3 pl-5">
        {steps.map((step, i) => (
          <li key={i} className="space-y-1.5">
            <span className="text-muted-foreground">{step.text}</span>
            {step.cmd && (
              <span className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-2 py-1 text-xs">
                  {step.cmd}
                </code>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Copy: ${step.cmd}`}
                  onClick={() => onCopy(step.cmd as string)}
                >
                  {copiedCmd === step.cmd ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="size-3.5" aria-hidden="true" />
                  )}
                </Button>
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
