"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Map,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface CheckedUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  status?: number;
  isValid?: boolean;
}

interface SitemapWarning {
  type: string;
  message: string;
  url?: string;
}

interface ValidationResult {
  sitemapUrl: string;
  isSitemapIndex: boolean;
  childSitemaps: number;
  urlCount: number;
  sampleChecked: number;
  sampleValid: number;
  sampleBroken: number;
  estimatedValidUrls: number;
  estimatedBrokenUrls: number;
  warnings: SitemapWarning[];
  checkedUrls: CheckedUrl[];
  allUrls: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[];
}

export default function SitemapPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [sitemapUrl, setSitemapUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [showAllUrls, setShowAllUrls] = useState(false);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/sitemap/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          sitemapUrl: sitemapUrl.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || "Validation failed";
        const hint = data.hint ? ` ${data.hint}` : "";
        throw new Error(`${msg}${hint}`);
      }

      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const getHealthLabel = (result: ValidationResult) => {
    const validRate =
      result.sampleChecked > 0
        ? result.sampleValid / result.sampleChecked
        : 0;
    if (validRate >= 0.95 && result.warnings.length === 0) return { label: "Healthy", color: "green" };
    if (validRate >= 0.8 && result.warnings.length <= 2) return { label: "Good", color: "green" };
    if (validRate >= 0.6) return { label: "Needs Attention", color: "amber" };
    return { label: "Issues Found", color: "red" };
  };

  return (
    <div>
      <Link
        href={`/sites/${siteId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sitemap Validator</h1>
        <p className="mt-1 text-sm text-slate-500">
          Validate your sitemap structure, check for broken URLs, and ensure search engines can crawl your site effectively.
        </p>
      </div>

      {/* Input form */}
      <form
        onSubmit={handleValidate}
        className="mb-6 rounded-xl border border-slate-200 bg-white p-5"
      >
        <label className="mb-1 block text-xs font-medium text-slate-500">
          Sitemap URL (leave empty to auto-detect)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={sitemapUrl}
            onChange={(e) => setSitemapUrl(e.target.value)}
            placeholder="https://example.com/sitemap.xml"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={validating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Play className={`h-4 w-4 ${validating ? "animate-pulse" : ""}`} />
            {validating ? "Validating..." : "Validate"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {validating && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <Map className="h-5 w-5 animate-pulse text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Validating sitemap...
              </p>
              <p className="text-xs text-blue-600">
                Fetching sitemap, parsing URLs, and checking a sample for accessibility.
              </p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Summary card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Sitemap Summary</h2>
                  <HealthBadge {...getHealthLabel(result)} />
                </div>
                <a
                  href={result.sitemapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                >
                  {result.sitemapUrl} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBox label="Total URLs" value={result.urlCount} />
              <StatBox label="Sample Checked" value={`${result.sampleValid}/${result.sampleChecked}`} color="green" />
              <StatBox label="Sample Broken" value={result.sampleBroken} color={result.sampleBroken > 0 ? "red" : "green"} />
              <StatBox label="Warnings" value={result.warnings.length} color={result.warnings.length > 0 ? "amber" : "green"} />
            </div>

            {result.isSitemapIndex && (
              <p className="mt-3 text-xs text-slate-500">
                This is a sitemap index with {result.childSitemaps} child sitemaps.
              </p>
            )}
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-800">
                  {result.warnings.length} Warning{result.warnings.length !== 1 ? "s" : ""}
                </h3>
              </div>
              <div className="space-y-2">
                {result.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-white/60 p-3">
                    <WarningIcon type={w.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-amber-800">{w.message}</p>
                      {w.url && (
                        <a
                          href={w.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 flex items-center gap-1 truncate text-xs text-amber-600 hover:text-amber-700"
                        >
                          {w.url} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checked URLs */}
          {result.checkedUrls.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Checked URLs ({result.checkedUrls.length} sampled)
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {result.checkedUrls.map((url, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <a
                        href={url.loc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 truncate text-sm text-slate-700 hover:text-slate-900"
                      >
                        {url.loc}
                        <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                      </a>
                      {url.lastmod && (
                        <p className="text-xs text-slate-400">Last modified: {url.lastmod}</p>
                      )}
                    </div>
                    <div className="ml-3 shrink-0">
                      {url.isValid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          {url.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          <XCircle className="h-3 w-3" />
                          {url.status || "Failed"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All URLs toggle */}
          {result.allUrls.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <button
                onClick={() => setShowAllUrls(!showAllUrls)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-900">
                    All URLs ({result.allUrls.length})
                  </span>
                </div>
                {showAllUrls ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>

              {showAllUrls && (
                <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
                  {result.allUrls.map((url, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-2">
                      <a
                        href={url.loc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-slate-600 hover:text-slate-900"
                      >
                        {url.loc}
                      </a>
                      <div className="ml-2 flex shrink-0 gap-3 text-xs text-slate-400">
                        {url.lastmod && <span>{url.lastmod}</span>}
                        {url.changefreq && <span>{url.changefreq}</span>}
                        {url.priority && <span>P:{url.priority}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HealthBadge({ label, color }: { label: string; color: string }) {
  const cls =
    color === "green"
      ? "bg-green-50 text-green-700"
      : color === "amber"
      ? "bg-amber-50 text-amber-700"
      : "bg-red-50 text-red-700";

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  const textColor =
    color === "green"
      ? "text-green-700"
      : color === "red"
      ? "text-red-700"
      : color === "amber"
      ? "text-amber-700"
      : "text-slate-900";

  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${textColor}`}>{value}</p>
    </div>
  );
}

function WarningIcon({ type }: { type: string }) {
  if (type === "broken_url" || type === "unreachable_url" || type === "broken_child_sitemap") {
    return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />;
  }
  return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />;
}
