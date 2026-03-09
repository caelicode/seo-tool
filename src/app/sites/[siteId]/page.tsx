"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  ExternalLink,
  FileText,
  Activity,
  AlertTriangle,
  Search,
  Gauge,
  Target,
  Sparkles,
  Heart,
  Users,
} from "lucide-react";

interface SiteDetail {
  id: string;
  domain: string;
  name: string;
  sitemapUrl: string | null;
  gscPropertyId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    pages: number;
    crawls: number;
    keywords: number;
    speedTests: number;
    searchData: number;
  };
  crawls: {
    id: string;
    status: string;
    pagesFound: number;
    issuesFound: number;
    startedAt: string;
    completedAt: string | null;
  }[];
  speedTests: {
    performanceScore: number;
    strategy: string;
    createdAt: string;
  }[];
  pages: {
    id: string;
    url: string;
    title: string | null;
    statusCode: number | null;
    indexStatus: string | null;
    lastCrawled: string | null;
  }[];
}

export default function SiteDetailPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [site, setSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState<{
    score: number;
    maxScore: number;
    grade: string;
    categories: { category: string; score: number; maxScore: number; details: string }[];
    recommendations: string[];
  } | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/${siteId}/health`);
      if (res.ok) setHealthScore(await res.json());
    } catch {
      // Non-critical
    }
  }, [siteId]);

  useEffect(() => {
    const fetchSite = async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Site not found");
          throw new Error("Failed to fetch site");
        }
        setSite(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSite();
    fetchHealth();
  }, [siteId, fetchHealth]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="text-center">
        <p className="text-red-600">{error || "Site not found"}</p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  const lastCrawl = site.crawls[0] ?? null;

  return (
    <div>
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      {/* Site header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
            <Globe className="h-6 w-6 text-zinc-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{site.name}</h1>
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
            >
              {site.domain}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={FileText} label="Pages Crawled" value={site._count.pages} />
        <StatCard icon={AlertTriangle} label="Issues" value={lastCrawl?.issuesFound ?? 0} />
        <StatCard icon={Search} label="Keywords" value={site._count.keywords} />
        <StatCard icon={Gauge} label="Speed Tests" value={site._count.speedTests} />
      </div>

      {/* SEO Health Score */}
      {healthScore && (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-start gap-6">
            {/* Score ring */}
            <div className="flex-shrink-0">
              <HealthScoreRing score={healthScore.score} grade={healthScore.grade} />
            </div>

            {/* Category breakdown */}
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Heart className="h-5 w-5 text-zinc-600" />
                <h2 className="text-lg font-semibold text-zinc-900">SEO Health Score</h2>
              </div>
              <div className="mt-3 space-y-2">
                {healthScore.categories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600">{cat.category}</span>
                      <span className="font-medium text-zinc-900">
                        {cat.score}/{cat.maxScore}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-zinc-100">
                      <div
                        className={`h-2 rounded-full ${
                          cat.score / cat.maxScore >= 0.7
                            ? "bg-green-500"
                            : cat.score / cat.maxScore >= 0.4
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">{cat.details}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {healthScore.recommendations.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-1 text-xs font-semibold text-amber-800">Top Recommendations</p>
                  <ul className="space-y-1">
                    {healthScore.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-amber-700">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={Activity}
          title="Site Crawler"
          description="Crawl pages to find SEO issues, broken links, and missing metadata."
          status={lastCrawl ? `Last: ${lastCrawl.status}` : "Not run yet"}
          href={`/sites/${site.id}/crawl`}
        />
        <FeatureCard
          icon={Search}
          title="Search Console"
          description="View search performance, clicks, impressions, and indexing status."
          status={site.gscPropertyId ? "Connected" : "Not connected"}
          href={`/sites/${site.id}/search`}
        />
        <FeatureCard
          icon={Target}
          title="Keywords"
          description="Track keyword rankings, position changes, and search visibility."
          status={
            site._count.keywords > 0
              ? `${site._count.keywords} tracked`
              : "No keywords yet"
          }
          href={`/sites/${site.id}/keywords`}
        />
        <FeatureCard
          icon={Gauge}
          title="PageSpeed"
          description="Monitor Core Web Vitals and performance scores over time."
          status={
            site._count.speedTests > 0
              ? `${site._count.speedTests} tests`
              : "No tests yet"
          }
          href={`/sites/${site.id}/speed`}
        />
        <FeatureCard
          icon={Sparkles}
          title="Content Optimizer"
          description="Get AI-powered SEO suggestions for titles, descriptions, and content."
          status="Ready"
          href={`/sites/${site.id}/content`}
        />
        <FeatureCard
          icon={Users}
          title="Competitor Tracking"
          description="Track competitors and get AI-powered competitive analysis and gap identification."
          status="Ready"
          href={`/sites/${site.id}/competitors`}
        />
      </div>

      {/* Recent pages */}
      {site.pages.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">
            Recent Pages
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">URL</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {site.pages.map((page) => (
                  <tr key={page.id} className="hover:bg-zinc-50">
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-zinc-700">
                      {page.url}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-zinc-600">
                      {page.title || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge code={page.statusCode} />
                    </td>
                    <td className="px-4 py-3">
                      <IndexBadge status={page.indexStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Site config */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">
          Site Configuration
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ConfigItem label="Domain" value={site.domain} />
          <ConfigItem label="Sitemap" value={site.sitemapUrl || "Not configured"} />
          <ConfigItem label="GSC Property" value={site.gscPropertyId || "Not connected"} />
          <ConfigItem label="Added" value={new Date(site.createdAt).toLocaleDateString()} />
        </dl>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-zinc-400" />
        <span className="text-sm text-zinc-500">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  status,
  href,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  status: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-zinc-600" />
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      </div>
      <p className="text-sm text-zinc-500">{description}</p>
      <p className="mt-3 text-xs font-medium text-zinc-400">{status}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md">
      {content}
    </div>
  );
}

function StatusBadge({ code }: { code: number | null }) {
  const className =
    code === 200
      ? "bg-green-50 text-green-700"
      : code && code >= 400
      ? "bg-red-50 text-red-700"
      : "bg-zinc-100 text-zinc-600";

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${className}`}>
      {code ?? "-"}
    </span>
  );
}

function IndexBadge({ status }: { status: string | null }) {
  const className =
    status === "indexed"
      ? "bg-green-50 text-green-700"
      : status === "not_indexed"
      ? "bg-amber-50 text-amber-700"
      : "bg-zinc-100 text-zinc-600";

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${className}`}>
      {status ?? "unknown"}
    </span>
  );
}

function HealthScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80
      ? "#16a34a"
      : score >= 60
      ? "#eab308"
      : score >= 40
      ? "#f97316"
      : "#dc2626";

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#f4f4f5"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {grade}
        </span>
        <span className="text-xs text-zinc-500">{score}/100</span>
      </div>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value}</dd>
    </div>
  );
}
