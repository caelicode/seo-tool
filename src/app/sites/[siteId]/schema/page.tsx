"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Code,
  Play,
  Sparkles,
  CheckCircle,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";

interface DetectedSchema {
  type: string;
  format: "json-ld" | "microdata" | "rdfa";
  content: Record<string, unknown>;
  raw: string;
}

interface SchemaIssue {
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
}

interface AISuggestion {
  score?: number;
  pageType?: string;
  existingSchemaAssessment?: string;
  missingSchemas?: { type: string; priority: string; reason: string }[];
  recommendations?: { action: string; priority: string; jsonLd?: string }[];
  issues?: { type: string; severity: string; message: string }[];
}

interface AnalysisResult {
  id: string;
  pageUrl: string;
  detectedSchemas: DetectedSchema[];
  issues: SchemaIssue[];
  aiAnalysis: AISuggestion;
  provider: string;
}

interface HistoryItem {
  id: string;
  pageUrl: string;
  score: number;
  createdAt: string;
  schemas: DetectedSchema[];
  issues: SchemaIssue[];
  suggestions: AISuggestion;
}

export default function SchemaAnalysisPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [pageUrl, setPageUrl] = useState("");
  const [provider, setProvider] = useState("openai");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/schema-markup?siteId=${siteId}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.analyses);
        }
      } catch {
        // Non-critical
      }
    };
    fetchHistory();
  }, [siteId]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageUrl.trim()) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/schema-markup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, pageUrl: pageUrl.trim(), provider }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);

      // Refresh history
      const histRes = await fetch(`/api/schema-markup?siteId=${siteId}`);
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData.analyses);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const copyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const scoreColor = (score: number) =>
    score >= 70 ? "text-green-600" : score >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div>
      <Link
        href={`/sites/${siteId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Schema Markup Analyzer</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Detect and validate structured data (JSON-LD, Microdata, RDFa) on your pages. Get AI-powered recommendations for rich results.
        </p>
      </div>

      {/* Input form */}
      <form
        onSubmit={handleAnalyze}
        className="mb-6 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Page URL to Analyze
            </label>
            <input
              type="url"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              required
            />
          </div>
          <div className="sm:w-44">
            <label className="mb-1 block text-xs font-medium text-zinc-500">AI Model</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="openai">GPT-5.3 (OpenAI)</option>
              <option value="anthropic">Claude (Anthropic)</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={analyzing}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            <Sparkles className={`h-4 w-4 ${analyzing ? "animate-pulse" : ""}`} />
            {analyzing ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {analyzing && (
        <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="flex items-center gap-3">
            <Code className="h-5 w-5 animate-pulse text-purple-600" />
            <div>
              <p className="text-sm font-medium text-purple-800">Analyzing structured data...</p>
              <p className="text-xs text-purple-600">
                Fetching page, detecting schema markup, and generating AI recommendations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Score and overview */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-50">
                <span className={`text-2xl font-bold ${scoreColor(result.aiAnalysis.score || 0)}`}>
                  {result.aiAnalysis.score || 0}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-zinc-900">
                  Schema Analysis Results
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  URL: {result.pageUrl}
                  <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                    {result.provider === "openai" ? "GPT-5.3" : "Claude"}
                  </span>
                </p>
                {result.aiAnalysis.pageType && (
                  <p className="mt-1 text-sm text-zinc-600">
                    Detected page type: <span className="font-medium">{result.aiAnalysis.pageType}</span>
                  </p>
                )}
                {result.aiAnalysis.existingSchemaAssessment && (
                  <p className="mt-2 text-sm text-zinc-600">
                    {result.aiAnalysis.existingSchemaAssessment}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Detected schemas */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-zinc-900">
                Detected Schema Markup ({result.detectedSchemas.length})
              </h3>
            </div>
            {result.detectedSchemas.length === 0 ? (
              <div className="p-5 text-center">
                <XCircle className="mx-auto h-8 w-8 text-red-300" />
                <p className="mt-2 text-sm text-zinc-500">
                  No structured data found on this page
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {result.detectedSchemas.map((schema, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4 text-zinc-500" />
                      <span className="text-sm font-medium text-zinc-900">
                        {schema.type}
                      </span>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                        {schema.format}
                      </span>
                    </div>
                    <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
                      {schema.raw.substring(0, 500)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Issues */}
          {result.issues.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Issues ({result.issues.length})
                </h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {result.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    {issue.severity === "error" ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    ) : issue.severity === "warning" ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    )}
                    <p className="text-sm text-zinc-700">{issue.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Missing schemas */}
          {result.aiAnalysis.missingSchemas && result.aiAnalysis.missingSchemas.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Missing Schema Types
                </h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {result.aiAnalysis.missingSchemas.map((schema, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-900">{schema.type}</span>
                        <PriorityPill priority={schema.priority} />
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{schema.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendations with code */}
          {result.aiAnalysis.recommendations && result.aiAnalysis.recommendations.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white">
              <div className="border-b border-zinc-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-zinc-900">
                  Recommendations
                </h3>
              </div>
              <div className="divide-y divide-zinc-100">
                {result.aiAnalysis.recommendations.map((rec, i) => (
                  <div key={i} className="px-5 py-4">
                    <button
                      onClick={() => setExpandedRec(expandedRec === i ? null : i)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-2">
                        <PriorityPill priority={rec.priority} />
                        <span className="text-sm text-zinc-800">{rec.action}</span>
                      </div>
                      {rec.jsonLd && (
                        expandedRec === i ? (
                          <ChevronUp className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-zinc-400" />
                        )
                      )}
                    </button>

                    {expandedRec === i && rec.jsonLd && (
                      <div className="relative mt-3">
                        <pre className="max-h-60 overflow-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
                          {rec.jsonLd}
                        </pre>
                        <button
                          onClick={() => copyCode(rec.jsonLd!, i)}
                          className="absolute right-2 top-2 rounded bg-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-600 hover:text-white"
                          title="Copy code"
                        >
                          {copiedIdx === i ? (
                            <Check className="h-3.5 w-3.5 text-green-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis history */}
      {history.length > 0 && !result && (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-zinc-900">Previous Analyses</h3>
          </div>
          <div className="divide-y divide-zinc-100">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-700">{item.pageUrl}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(item.createdAt).toLocaleDateString()} -
                    {" "}{item.schemas?.length || 0} schemas detected
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span className={`text-lg font-bold ${scoreColor(item.score)}`}>
                    {item.score}
                  </span>
                  <span className="text-xs text-zinc-400">/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const cls =
    priority === "high"
      ? "bg-red-50 text-red-700"
      : priority === "medium"
      ? "bg-amber-50 text-amber-700"
      : "bg-green-50 text-green-700";

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {priority}
    </span>
  );
}
