"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Search,
  FileText,
  Image,
  Link2,
  Code,
  Heading1,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";

interface PageSummary {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  images: number;
  imagesWithAlt: number;
}

interface SEOAnalysis {
  overallScore: number;
  priorityActions: string[];
  titleTag: {
    current: string;
    score: number;
    suggestions: string[];
    feedback: string;
  };
  metaDescription: {
    current: string;
    score: number;
    suggestions: string[];
    feedback: string;
  };
  headings: {
    h1: string | null;
    h2Count: number;
    h3Count: number;
    score: number;
    feedback: string;
  };
  content: {
    wordCount: number;
    readabilityLevel: string;
    score: number;
    feedback: string;
  };
  internalLinks: {
    count: number;
    score: number;
    feedback: string;
  };
  images: {
    total: number;
    withAlt: number;
    withoutAlt: number;
    score: number;
    feedback: string;
  };
  technical: {
    hasCanonical: boolean;
    hasOpenGraph: boolean;
    score: number;
    feedback: string;
    schemaRecommendation: string;
  };
}

interface AnalysisResult {
  url: string;
  provider: string;
  pageContent: PageSummary;
  analysis: SEOAnalysis;
}

interface ProviderOption {
  provider: string;
  label: string;
}

export default function ContentOptimizerPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [url, setUrl] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Fetch available providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const res = await fetch("/api/content/optimize");
        if (res.ok) {
          const data = await res.json();
          setProviders(data.providers || []);
          // Default to first available provider
          if (data.providers?.length > 0) {
            setProvider(data.providers[0].provider);
          }
        }
      } catch {
        // Providers will show empty, user will see error on analyze
      }
    };
    fetchProviders();
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/content/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          targetKeyword: targetKeyword.trim() || undefined,
          provider,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-zinc-900">
          AI Content Optimizer
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Analyze any page and get AI-powered SEO recommendations for titles,
          meta descriptions, headings, and more.
        </p>
      </div>

      {/* Input form */}
      <form
        onSubmit={handleAnalyze}
        className="mb-6 rounded-xl border border-zinc-200 bg-white p-5"
      >
        {providers.length === 0 && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            No AI providers configured. Add <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> and/or{" "}
            <code className="rounded bg-amber-100 px-1">OPENAI_API_KEY</code> to your .env file, then restart the dev server.
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Page URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              required
            />
          </div>
          <div className="sm:w-48">
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Target Keyword (optional)
            </label>
            <input
              type="text"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="e.g. beauty salon"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            />
          </div>
          {providers.length > 1 && (
            <div className="sm:w-44">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                AI Model
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              >
                {providers.map((p) => (
                  <option key={p.provider} value={p.provider}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={analyzing || providers.length === 0}
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
            <Sparkles className="h-5 w-5 animate-pulse text-purple-600" />
            <div>
              <p className="text-sm font-medium text-purple-800">
                AI is analyzing your page...
              </p>
              <p className="text-xs text-purple-600">
                Fetching content, parsing structure, and generating recommendations. This takes 10-20 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Overall score */}
          <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:flex-row sm:items-start">
            <ScoreCircle score={result.analysis.overallScore} size={100} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-zinc-900">
                Overall SEO Score
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Analyzed: {result.url}
                <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
                  {result.provider === "openai" ? "GPT-4o" : "Claude"}
                </span>
              </p>
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Priority Actions
                </p>
                <ol className="space-y-1">
                  {result.analysis.priorityActions.map((action, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-700"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Page summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              icon={FileText}
              label="Words"
              value={result.pageContent.wordCount.toLocaleString()}
            />
            <MiniStat
              icon={Link2}
              label="Internal Links"
              value={result.pageContent.internalLinks.toString()}
            />
            <MiniStat
              icon={Image}
              label="Images"
              value={`${result.pageContent.imagesWithAlt}/${result.pageContent.images} with alt`}
            />
            <MiniStat
              icon={Heading1}
              label="H1"
              value={result.pageContent.h1 ? "Present" : "Missing"}
            />
          </div>

          {/* Detailed sections */}
          <AnalysisSection
            icon={FileText}
            title="Title Tag"
            score={result.analysis.titleTag.score}
            current={result.analysis.titleTag.current}
            feedback={result.analysis.titleTag.feedback}
            suggestions={result.analysis.titleTag.suggestions}
          />

          <AnalysisSection
            icon={Search}
            title="Meta Description"
            score={result.analysis.metaDescription.score}
            current={result.analysis.metaDescription.current}
            feedback={result.analysis.metaDescription.feedback}
            suggestions={result.analysis.metaDescription.suggestions}
          />

          <AnalysisSection
            icon={Heading1}
            title="Heading Structure"
            score={result.analysis.headings.score}
            current={
              result.analysis.headings.h1
                ? `H1: "${result.analysis.headings.h1}" | ${result.analysis.headings.h2Count} H2s, ${result.analysis.headings.h3Count} H3s`
                : "No H1 found"
            }
            feedback={result.analysis.headings.feedback}
          />

          <AnalysisSection
            icon={FileText}
            title="Content Quality"
            score={result.analysis.content.score}
            current={`${result.analysis.content.wordCount} words, ${result.analysis.content.readabilityLevel} readability`}
            feedback={result.analysis.content.feedback}
          />

          <AnalysisSection
            icon={Link2}
            title="Internal Linking"
            score={result.analysis.internalLinks.score}
            current={`${result.analysis.internalLinks.count} internal links found`}
            feedback={result.analysis.internalLinks.feedback}
          />

          <AnalysisSection
            icon={Image}
            title="Image Optimization"
            score={result.analysis.images.score}
            current={`${result.analysis.images.total} images, ${result.analysis.images.withAlt} with alt text, ${result.analysis.images.withoutAlt} missing alt`}
            feedback={result.analysis.images.feedback}
          />

          <AnalysisSection
            icon={Code}
            title="Technical SEO"
            score={result.analysis.technical.score}
            current={`Canonical: ${result.analysis.technical.hasCanonical ? "Yes" : "No"} | OG Tags: ${result.analysis.technical.hasOpenGraph ? "Yes" : "No"}`}
            feedback={result.analysis.technical.feedback}
            extra={
              result.analysis.technical.schemaRecommendation && (
                <div className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                  <strong>Schema recommendation:</strong>{" "}
                  {result.analysis.technical.schemaRecommendation}
                </div>
              )
            }
          />
        </div>
      )}
    </div>
  );
}

function ScoreCircle({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const color =
    score >= 80
      ? "#16a34a"
      : score >= 50
      ? "#f59e0b"
      : "#dc2626";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-xs text-zinc-500">{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function AnalysisSection({
  icon: Icon,
  title,
  score,
  current,
  feedback,
  suggestions,
  extra,
}: {
  icon: React.ElementType;
  title: string;
  score: number;
  current: string;
  feedback: string;
  suggestions?: string[];
  extra?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(score < 7);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const scoreColor =
    score >= 8
      ? "text-green-600 bg-green-50"
      : score >= 5
      ? "text-amber-600 bg-amber-50"
      : "text-red-600 bg-red-50";

  const scoreIcon =
    score >= 8 ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertCircle className={`h-4 w-4 ${score >= 5 ? "text-amber-600" : "text-red-600"}`} />
    );

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-zinc-600" />
          <span className="text-sm font-semibold text-zinc-900">{title}</span>
          {scoreIcon}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${scoreColor}`}
          >
            {score}/10
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 px-5 py-4">
          <div className="mb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Current
            </p>
            <p className="mt-1 text-sm text-zinc-700">{current}</p>
          </div>
          <div className="mb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Feedback
            </p>
            <p className="mt-1 text-sm text-zinc-600">{feedback}</p>
          </div>

          {suggestions && suggestions.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Suggestions
              </p>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between rounded-lg bg-zinc-50 px-3 py-2"
                  >
                    <p className="flex-1 text-sm text-zinc-700">{s}</p>
                    <button
                      onClick={() => copyToClipboard(s, i)}
                      className="ml-2 shrink-0 text-zinc-400 hover:text-zinc-600"
                      title="Copy to clipboard"
                    >
                      {copiedIdx === i ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {extra}
        </div>
      )}
    </div>
  );
}
