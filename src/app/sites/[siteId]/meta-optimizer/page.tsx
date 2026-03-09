"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Tags,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  ArrowRight,
  Zap,
} from "lucide-react";

interface PageMeta {
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  h1: string | null;
  statusCode: number | null;
  lastCrawled: string | null;
}

interface OptimizedPage {
  url: string;
  currentTitle: string;
  currentDescription: string;
  optimizedTitle: string;
  optimizedDescription: string;
  issues: string[];
  priorityScore: number;
  reasoning: string;
}

interface OptimizationResult {
  pages: OptimizedPage[];
  summary: {
    totalPages: number;
    pagesNeedingFixes: number;
    criticalIssues: number;
    averageScore: number;
  };
}

export default function MetaOptimizerPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [pages, setPages] = useState<PageMeta[]>([]);
  const [provider, setProvider] = useState("openai");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const res = await fetch(`/api/meta-optimizer?siteId=${siteId}`);
        if (res.ok) {
          const data = await res.json();
          setPages(data.pages || []);
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    };
    fetchPages();
  }, [siteId]);

  const handleOptimize = async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/meta-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, provider }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Optimization failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const priorityColor = (score: number) => {
    if (score >= 8) return "text-red-600 bg-red-50 ring-red-200";
    if (score >= 5) return "text-amber-600 bg-amber-50 ring-amber-200";
    return "text-emerald-600 bg-emerald-50 ring-emerald-200";
  };

  return (
    <div>
      <Link
        href={`/sites/${siteId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-md shadow-teal-500/20">
            <Tags className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meta Tag Optimizer</h1>
            <p className="text-sm text-slate-500">
              AI-powered title and description optimization for all your crawled pages.
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">
            {pages.length} crawled page{pages.length !== 1 ? "s" : ""} available
          </p>
          <p className="text-xs text-slate-400">
            {pages.filter((p) => !p.title || !p.description).length} pages missing meta tags
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="openai">GPT-4.1 mini</option>
            <option value="anthropic">Claude</option>
          </select>
          <button
            onClick={handleOptimize}
            disabled={analyzing || pages.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-500/20 transition-all hover:shadow-lg disabled:opacity-50"
          >
            <Zap className={`h-4 w-4 ${analyzing ? "animate-pulse" : ""}`} />
            {analyzing ? "Optimizing..." : "Optimize All"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {analyzing && (
        <div className="mb-6 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
              <Tags className="h-6 w-6 animate-pulse text-teal-600" />
            </div>
            <div>
              <p className="font-medium text-teal-800">Analyzing meta tags...</p>
              <p className="text-sm text-teal-600">
                Reviewing {pages.length} pages and generating optimized titles and descriptions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {result?.summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Pages", value: result.summary.totalPages, color: "text-slate-700" },
            { label: "Need Fixes", value: result.summary.pagesNeedingFixes, color: "text-amber-600" },
            { label: "Critical", value: result.summary.criticalIssues, color: "text-red-600" },
            { label: "Avg Priority", value: result.summary.averageScore.toFixed(1), color: "text-blue-600" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {stat.label}
              </p>
              <p className={`mt-1 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Optimization results */}
      {result?.pages && result.pages.length > 0 && (
        <div className="space-y-4">
          {result.pages
            .sort((a, b) => b.priorityScore - a.priorityScore)
            .map((page, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="truncate text-sm font-medium text-slate-700">{page.url}</p>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${priorityColor(page.priorityScore)}`}
                  >
                    Priority: {page.priorityScore}/10
                  </span>
                </div>

                {/* Title comparison */}
                <div className="mb-3 rounded-xl bg-slate-50 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Title Tag
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                        OLD
                      </span>
                      <p className="text-sm text-slate-500 line-through">
                        {page.currentTitle || "(missing)"}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        NEW
                      </span>
                      <p className="flex-1 text-sm font-medium text-slate-800">
                        {page.optimizedTitle}
                      </p>
                      <button
                        onClick={() => copyText(page.optimizedTitle, `title-${i}`)}
                        className="shrink-0 rounded p-1 text-slate-300 hover:text-slate-600"
                        title="Copy"
                      >
                        {copiedField === `title-${i}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description comparison */}
                <div className="mb-3 rounded-xl bg-slate-50 p-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Meta Description
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                        OLD
                      </span>
                      <p className="text-sm text-slate-500 line-through">
                        {page.currentDescription || "(missing)"}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        NEW
                      </span>
                      <p className="flex-1 text-sm font-medium text-slate-800">
                        {page.optimizedDescription}
                      </p>
                      <button
                        onClick={() => copyText(page.optimizedDescription, `desc-${i}`)}
                        className="shrink-0 rounded p-1 text-slate-300 hover:text-slate-600"
                        title="Copy"
                      >
                        {copiedField === `desc-${i}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Issues and reasoning */}
                {page.issues.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {page.issues.map((issue, j) => (
                      <span
                        key={j}
                        className="flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {issue}
                      </span>
                    ))}
                  </div>
                )}
                {page.reasoning && (
                  <p className="text-xs text-slate-400">{page.reasoning}</p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Empty state for pages */}
      {!loading && pages.length === 0 && !result && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <Tags className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">
            No crawled pages found. Run a site crawl first to analyze meta tags.
          </p>
          <Link
            href={`/sites/${siteId}/crawl`}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Go to Site Crawler <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Pages overview when no analysis has run */}
      {!result && pages.length > 0 && !analyzing && (
        <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Crawled Pages
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {pages.slice(0, 20).map((page) => (
              <div key={page.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700">{page.url}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    {page.title ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                        Title set
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        No title
                      </span>
                    )}
                    {page.description ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                        Description set
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        No description
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
