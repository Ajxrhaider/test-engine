"use client";

import { FormEvent, useMemo, useRef, useState } from "react";

/* ============================================================================
   test-engine — main UI (Hizaki Labs dark theme)
   - Plain-English description form
   - Loading skeleton + error banner with retry
   - Syntax-highlighted JSON output
   - Copy to Clipboard + Download JSON
   ============================================================================ */

type Status = "idle" | "loading" | "success" | "error";

interface GenerateResponse {
  success: boolean;
  data?: unknown[];
  count?: number;
  model?: string;
  error?: string;
}

const EXAMPLES = [
  "10 users with id, fullName, email, age, isActive and a signupDate",
  "5 gaming laptops with brand, model, priceUSD, ramGB, gpu and inStock",
  "8 support tickets with ticketId, subject, priority, status, assignee and createdAt",
  "6 e-commerce products with name, category, price, tags (array) and rating",
];

function highlightJson(json: string): string {
  const escaped = json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = "text-sky-300";
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-indigo-400 font-medium";
        } else {
          cls = "text-emerald-300";
        }
      } else if (/true|false/.test(match)) {
        cls = "text-amber-400 font-semibold";
      } else if (/null/.test(match)) {
        cls = "text-rose-400 italic";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export default function HomePage() {
  const [description, setDescription] = useState("");
  const [count, setCount] = useState<number>(5);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<unknown[] | null>(null);
  const [copied, setCopied] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);

  const formattedJson = useMemo(() => {
    if (!data) return "";
    return JSON.stringify(data, null, 2);
  }, [data]);

  const highlightedHtml = useMemo(() => {
    if (!formattedJson) return "";
    return highlightJson(formattedJson);
  }, [formattedJson]);

  async function handleGenerate(e?: FormEvent) {
    if (e) e.preventDefault();

    const trimmed = description.trim();
    if (!trimmed) {
      setErrorMessage("Please enter a description of the schema you need.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setCopied(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed, count }),
      });

      const body: GenerateResponse = await res.json();

      if (!res.ok || !body.success || !Array.isArray(body.data)) {
        throw new Error(
          body.error || `Generation failed with status ${res.status}.`
        );
      }

      setData(body.data);
      setStatus("success");

      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      setStatus("error");
    }
  }

  async function handleCopy() {
    if (!formattedJson) return;
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = formattedJson;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleDownload() {
    if (!formattedJson) return;
    const blob = new Blob([formattedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-engine-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative min-h-screen bg-hizaki-bg text-hizaki-text overflow-x-hidden">
      {/* Background radial glow accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-hizaki-primary/15 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[400px] bg-hizaki-cyan/10 blur-[140px] rounded-full" />
      </div>

      {/* Header */}
      <header className="border-b border-hizaki-border/60 bg-hizaki-bg/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-linear-to-br from-hizaki-primary to-hizaki-cyan flex items-center justify-center font-display font-bold text-white shadow-glow-sm">
              TE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold tracking-tight text-lg text-white">
                test-engine
              </span>
              <span className="text-xs text-hizaki-text-faint font-mono">
                v1.0
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge">
              <span className="w-1.5 h-1.5 rounded-full bg-hizaki-emerald animate-pulse" />
              Qwen 3.8 27B via Groq
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-hizaki-text-dim hover:text-white transition-colors hidden sm:inline"
            >
              Hizaki Labs
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-hizaki-border-glow/60 bg-hizaki-surface/60 text-xs font-mono text-hizaki-primary-light">
            <span className="w-2 h-2 rounded-full bg-hizaki-primary animate-ping" />
            AI-Powered Mock Data Generator
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Turn plain English into{" "}
            <span className="gradient-text">schema-accurate</span> JSON.
          </h1>
          <p className="text-hizaki-text-dim text-base sm:text-lg">
            Describe the dummy data you need. We invoke Qwen 3.8 27B on Groq to
            generate realistic, validated, production-ready JSON in milliseconds.
          </p>
        </section>

        {/* Input Form Panel */}
        <section className="panel p-6 sm:p-8 space-y-6">
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-white flex items-center justify-between"
              >
                <span>Describe your schema</span>
                <span className="text-xs text-hizaki-text-faint font-normal">
                  English or list of keys
                </span>
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 5 customers with id, full name, email, subscriptionTier (free, pro, enterprise), creditBalance and lastLoginDate"
                className="input-hizaki resize-y"
                disabled={status === "loading"}
              />
            </div>

            {/* Quick-fill pills */}
            <div className="space-y-2">
              <span className="text-xs text-hizaki-text-faint block">
                Quick examples:
              </span>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDescription(ex)}
                    className="text-xs px-2.5 py-1 rounded-md bg-hizaki-surface-2 border border-hizaki-border hover:border-hizaki-primary/60 text-hizaki-text-dim hover:text-white transition-all text-left"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Controls row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-hizaki-border/50">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="count"
                  className="text-xs font-mono text-hizaki-text-dim uppercase tracking-wider"
                >
                  Rows:
                </label>
                <div className="inline-flex rounded-lg border border-hizaki-border bg-hizaki-surface p-0.5">
                  {[3, 5, 10, 25].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCount(val)}
                      className={`px-3 py-1 text-xs font-mono rounded-md transition-all ${
                        count === val
                          ? "bg-hizaki-primary text-white font-bold shadow-glow-sm"
                          : "text-hizaki-text-dim hover:text-white"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={status === "loading" || !description.trim()}
                className="btn btn-primary sm:w-auto w-full justify-center"
              >
                {status === "loading" ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Synthesizing...
                  </>
                ) : (
                  <>
                    Generate JSON
                    <span aria-hidden="true">&rarr;</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Error Banner with Retry */}
          {status === "error" && errorMessage && (
            <div className="rounded-xl border border-hizaki-danger/40 bg-hizaki-danger/10 p-4 text-sm text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <span className="font-bold text-hizaki-danger">&times;</span>
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => handleGenerate()}
                className="btn btn-ghost text-xs border-hizaki-danger/40 hover:bg-hizaki-danger/20 shrink-0"
              >
                Try again
              </button>
            </div>
          )}
        </section>

        {/* Loading Skeleton */}
        {status === "loading" && (
          <section className="panel p-6 space-y-3 animate-pulse">
            <div className="flex items-center justify-between pb-3 border-b border-hizaki-border">
              <div className="h-4 w-32 bg-hizaki-surface-2 rounded" />
              <div className="h-8 w-24 bg-hizaki-surface-2 rounded" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 w-1/4 bg-hizaki-surface-2 rounded" />
              <div className="h-3 w-3/4 bg-hizaki-surface-2 rounded" />
              <div className="h-3 w-2/3 bg-hizaki-surface-2 rounded" />
              <div className="h-3 w-4/5 bg-hizaki-surface-2 rounded" />
              <div className="h-3 w-1/2 bg-hizaki-surface-2 rounded" />
            </div>
          </section>
        )}

        {/* Output Panel */}
        {status === "success" && data && (
          <section ref={outputRef} className="panel overflow-hidden">
            <div className="px-6 py-3.5 bg-hizaki-surface-2 border-b border-hizaki-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs uppercase tracking-wider text-hizaki-text-dim">
                  Output
                </span>
                <span className="badge text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  {data.length} {data.length === 1 ? "row" : "rows"} validated
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="btn btn-ghost text-xs"
                >
                  {copied ? (
                    <>
                      <span className="text-hizaki-emerald">&#x2713;</span>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="btn btn-ghost text-xs"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .json
                </button>
              </div>
            </div>

            <div className="p-6 overflow-x-auto bg-[#04060b] max-h-[550px] scrollbar-thin">
              <pre
                className="font-mono text-xs sm:text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-hizaki-border/50 py-8 text-center text-xs text-hizaki-text-faint space-y-1">
        <p>Built with Next.js &middot; Tailwind CSS v4 &middot; Groq Qwen 3.8 27B</p>
        <p>&copy; 2026 Hizaki Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}