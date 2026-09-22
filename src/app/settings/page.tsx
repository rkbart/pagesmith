"use client";

import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Save, CheckCircle2, Lock, Globe, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface AISettings {
  provider: "browser" | "openai" | "anthropic";
  openaiKey: string;
  anthropicKey: string;
  model: string;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: "browser",
  openaiKey: "",
  anthropicKey: "",
  model: "",
};

const MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini (fast, cheap)" },
    { value: "gpt-4o", label: "GPT-4o (best quality)" },
    { value: "gpt-4o-mini-2024-07-18", label: "GPT-4o Mini (pinned)" },
  ],
  anthropic: [
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (fast)" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (best)" },
  ],
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [showOpenAI, setShowOpenAI] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pagesmith-ai-settings");
    if (stored) {
      try {
        const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        // Deferred so settings state isn't set synchronously in the effect.
        const t = setTimeout(() => setSettings(parsed), 0);
        return () => clearTimeout(t);
      } catch {
        // use defaults
      }
    }
  }, []);

  const save = () => {
    localStorage.setItem("pagesmith-ai-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <p className="eyebrow mb-2">Settings</p>
        <h1 className="heading-lg">Configure the apprentice</h1>
        <p className="body-md-loose mt-2 text-muted-foreground">
          AI features and preferences — everything stays on this device.
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
                value={settings.provider}
                onValueChange={(v) =>
                  v && setSettings({ ...settings, provider: v as AISettings["provider"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">
                    In-Browser (Free, no API key needed)
                  </SelectItem>
                  <SelectItem value="openai">OpenAI (bring your own key)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (bring your own key)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {settings.provider === "browser"
                  ? "AI runs locally in your browser. Good quality, no data sent to servers."
                  : "Uses your personal API key. Best quality, but data is sent to the provider's API."}
              </p>
            </div>

            {settings.provider === "openai" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <div className="relative">
                    <Input
                      id="openai-key"
                      type={showOpenAI ? "text" : "password"}
                      value={settings.openaiKey}
                      onChange={(e) => setSettings({ ...settings, openaiKey: e.target.value })}
                      placeholder="sk-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenAI(!showOpenAI)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showOpenAI ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your key at{" "}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      platform.openai.com
                    </a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={settings.model || "gpt-4o-mini"}
                    onValueChange={(v) => v && setSettings({ ...settings, model: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.openai.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {settings.provider === "anthropic" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                  <div className="relative">
                    <Input
                      id="anthropic-key"
                      type={showAnthropic ? "text" : "password"}
                      value={settings.anthropicKey}
                      onChange={(e) => setSettings({ ...settings, anthropicKey: e.target.value })}
                      placeholder="sk-ant-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnthropic(!showAnthropic)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showAnthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Get your key at{" "}
                    <a
                      href="https://console.anthropic.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      console.anthropic.com
                    </a>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={settings.model || "claude-3-5-haiku-20241022"}
                    onValueChange={(v) => v && setSettings({ ...settings, model: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.anthropic.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </Card>

        <div className="border-t pt-6 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Current Mode</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings.provider === "browser"
                    ? "Running locally — no data leaves your device"
                    : `Using ${settings.provider} API with your key`}
                </p>
              </div>
              <Badge variant={settings.provider === "browser" ? "secondary" : "brass"}>
                <span className="inline-flex items-center gap-1">
                  {settings.provider === "browser" ? (
                    <Lock className="size-3" aria-hidden="true" />
                  ) : (
                    <Globe className="size-3" aria-hidden="true" />
                  )}
                  {settings.provider === "browser" ? "Local" : "API"}
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
