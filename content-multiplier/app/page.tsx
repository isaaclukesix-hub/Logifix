"use client";

import { useState, useCallback } from "react";
import type { GenerateResponse } from "./api/generate/route";

const PLATFORMS = ["TikTok", "Instagram Reels", "YouTube Shorts"] as const;
const TONES = ["Casual", "Aggressive", "Educational", "Storytelling"] as const;

const RATE_LIMIT = 5;
const RATE_KEY = "cm_generations";

type Platform = (typeof PLATFORMS)[number];
type Tone = (typeof TONES)[number];

interface RateData {
  date: string;
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getRateData(): RateData {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) return { date: today(), count: 0 };
    const data: RateData = JSON.parse(raw);
    if (data.date !== today()) return { date: today(), count: 0 };
    return data;
  } catch {
    return { date: today(), count: 0 };
  }
}

function incrementRate(): number {
  const data = getRateData();
  const next = { date: today(), count: data.count + 1 };
  localStorage.setItem(RATE_KEY, JSON.stringify(next));
  return next.count;
}

const LOADING_MESSAGES = [
  "Analyzing viral patterns…",
  "Crafting scroll-stopping hooks…",
  "Writing platform-native scripts…",
  "Optimizing for the algorithm…",
  "Finalizing your content…",
];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [platform, setPlatform] = useState<Platform>("TikTok");
  const [tone, setTone] = useState<Tone>("Casual");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number>(() => {
    if (typeof window === "undefined") return RATE_LIMIT;
    return Math.max(0, RATE_LIMIT - getRateData().count);
  });

  const handleGenerate = useCallback(async () => {
    if (!idea.trim()) return;
    const rateData = getRateData();
    if (rateData.count >= RATE_LIMIT) {
      setError(`Daily limit reached (${RATE_LIMIT}/day). Come back tomorrow.`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    let msgIdx = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[msgIdx]);
    }, 1800);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim(), platform, tone }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }

      const newCount = incrementRate();
      setRemaining(Math.max(0, RATE_LIMIT - newCount));
      setResult(data as GenerateResponse);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      clearInterval(msgInterval);
      setLoading(false);
    }
  }, [idea, platform, tone]);

  const copyToClipboard = useCallback(async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Content{" "}
            <span className="text-violet-400">Multiplier</span>
          </h1>
          <p className="text-gray-400 text-base">
            Turn one idea into viral hooks, scripts, captions, and more.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <textarea
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            rows={3}
            placeholder="Enter your content idea (e.g. gym motivation, study tips, investing advice)"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            maxLength={500}
            disabled={loading}
          />
          <div className="flex items-center justify-end mt-1 mb-4">
            <span className="text-xs text-gray-600">{idea.length}/500</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Platform
              </label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                disabled={loading}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Tone
              </label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                disabled={loading}
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !idea.trim() || remaining === 0}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner />
                {loadingMsg}
              </span>
            ) : remaining === 0 ? (
              "Daily limit reached"
            ) : (
              "Generate Content"
            )}
          </button>

          <p className="text-center text-xs text-gray-600 mt-3">
            {remaining} of {RATE_LIMIT} free generations remaining today
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <OutputSection
              title="Viral Hooks"
              subtitle="10 scroll-stopping openers"
              items={result.hooks}
              copyPrefix="hook"
              copied={copied}
              onCopy={copyToClipboard}
            />
            <OutputSection
              title="Short Video Scripts"
              subtitle="5 scripts · Hook → Value → CTA"
              items={result.scripts}
              copyPrefix="script"
              copied={copied}
              onCopy={copyToClipboard}
              multiline
            />
            <OutputSection
              title="Captions"
              subtitle="10 ready-to-post captions"
              items={result.captions}
              copyPrefix="caption"
              copied={copied}
              onCopy={copyToClipboard}
            />
            <OutputSection
              title="Post Ideas"
              subtitle="5 specific video concepts"
              items={result.ideas}
              copyPrefix="idea"
              copied={copied}
              onCopy={copyToClipboard}
            />
          </div>
        )}
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

interface OutputSectionProps {
  title: string;
  subtitle: string;
  items: string[];
  copyPrefix: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  multiline?: boolean;
}

function OutputSection({
  title,
  subtitle,
  items,
  copyPrefix,
  copied,
  onCopy,
  multiline,
}: OutputSectionProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-2.5">
        {items.map((item, i) => {
          const key = `${copyPrefix}-${i}`;
          return (
            <div
              key={key}
              className="flex items-start gap-3 bg-gray-800 rounded-xl px-4 py-3 group"
            >
              <span className="text-xs text-gray-600 font-mono mt-0.5 w-4 shrink-0">
                {i + 1}
              </span>
              <p
                className={`flex-1 text-sm text-gray-200 leading-relaxed ${
                  multiline ? "whitespace-pre-wrap" : ""
                }`}
              >
                {item}
              </p>
              <button
                onClick={() => onCopy(item, key)}
                className="shrink-0 text-xs px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                title="Copy"
              >
                {copied === key ? "Copied!" : "Copy"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
