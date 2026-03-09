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
  Link2,
  Map,
  Code,
  PenTool,
  Tags,
  ArrowUpRight,
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
    } catch { /* Non-critical */ }
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="text-center">
        <p className="text-red-600">{error || "Site not found"}</p>
        <Link href="/" className="mt-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      </div>
    );
  }

  const lastCrawl = site.crawls[0] ?? null;

  return (
    <div>
      {/* Site header */}
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20">
          <Globe className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{site.name}</h1>
          <a href={`https://${site.domain}`} target="_blank" rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors">
            {site.domain} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickStat icon={FileText} label="Pages Crawled" value={site._count.pages} color="blue" />
        <QuickStat icon={AlertTriangle} label="Issues" value={lastCrawl?.issuesFound ?? 0} color={lastCrawl?.issuesFound ? "red" : "green"} />
        <QuickStat icon={Search} label="Keywords" value={site._count.keywords} color="violet" />
        <QuickStat icon={Gauge} label="Speed Tests" value={site._count.speedTests} color="slate" />
      </div>

      {/* SEO Health Score */}
      {healthScore && (
        <div className="mb-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <HealthScoreRing score={healthScore.score} grade={healthScore.grade} />
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500" />
                <h2 className="text-lg font-bold text-slate-900">SEO Health Score</h2>
              </div>
              <div className="mt-3 space-y-3">
                {healthScore.categories.map((cat) => {
                  const pct = cat.score / cat.maxScore;
                  const barColor = pct >= 0.7 ? "from-emerald-400 to-emerald-500" : pct >= 0.4 ? "from-amber-400 to-amber-500" : "from-red-400 to-red-500";
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{cat.category}</span>
                        <span className="text-xs font-bold text-slate-500">{cat.score}/{cat.maxScore}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-2 rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                          style={{ width: `${pct * 100}%` }} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">{cat.details}</p>
                    </div>
                  );
                })}
              </div>
              {healthScore.recommendations.length > 0 && (
                <div className="mt-4 rounded-xl bg-amber-50/80 p-3 ring-1 ring-amber-200/50">
                  <p className="mb-1.5 text-xs font-bold text-amber-800">Recommendations</p>
                  <ul className="space-y-1">
                    {healthScore.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                        <span className="mt-0.5 block h-1 w-1 shrink-0 rounded-full bg-amber-400" />
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
      <div className="mb-8">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Tools</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ToolCard icon={Activity} title="Site Crawler" description="Find SEO issues, broken links, and missing metadata" status={lastCrawl ? `Last: ${lastCrawl.status}` : "Not run yet"} href={`/sites/${site.id}/crawl`} color="blue" />
          <ToolCard icon={Search} title="Search Console" description="View search performance, clicks, and impressions" status={site.gscPropertyId ? "Connected" : "Not connected"} href={`/sites/${site.id}/search`} color="green" />
          <ToolCard icon={Target} title="Keywords" description="Track rankings, position changes, and visibility" status={site._count.keywords > 0 ? `${site._count.keywords} tracked` : "No keywords yet"} href={`/sites/${site.id}/keywords`} color="violet" />
          <ToolCard icon={Gauge} title="PageSpeed" description="Monitor Core Web Vitals and performance" status={site._count.speedTests > 0 ? `${site._count.speedTests} tests` : "No tests yet"} href={`/sites/${site.id}/speed`} color="amber" />
          <ToolCard icon={Sparkles} title="Content Optimizer" description="AI-powered SEO suggestions for your pages" status="Ready" href={`/sites/${site.id}/content`} color="pink" />
          <ToolCard icon={Users} title="Competitor Tracking" description="AI competitive analysis and gap identification" status="Ready" href={`/sites/${site.id}/competitors`} color="indigo" />
          <ToolCard icon={Link2} title="Backlink Monitor" description="Track external links and DoFollow status" status="Ready" href={`/sites/${site.id}/backlinks`} color="teal" />
          <ToolCard icon={Map} title="Sitemap Validator" description="Validate structure and check for broken URLs" status="Ready" href={`/sites/${site.id}/sitemap`} color="cyan" />
          <ToolCard icon={Code} title="Schema Markup" description="Detect and validate structured data with AI" status="Ready" href={`/sites/${site.id}/schema`} color="orange" />
          <ToolCard icon={PenTool} title="Content Engine" description="AI-generated SEO articles targeting your keywords" status="New" href={`/sites/${site.id}/content-engine`} color="rose" highlight />
          <ToolCard icon={Tags} title="Meta Optimizer" description="AI-optimized title tags and meta descriptions" status="New" href={`/sites/${site.id}/meta-optimizer`} color="teal" highlight />
        </div>
      </div>

      {/* Recent pages */}
      {site.pages.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Recent Pages</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">URL</th>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {site.pages.map((page) => (
                  <tr key={page.id} className="transition-colors hover:bg-blue-50/30">
                    <td className="max-w-xs truncate px-5 py-3 text-sm text-slate-700">{page.url}</td>
                    <td className="max-w-xs truncate px-5 py-3 text-sm text-slate-500">{page.title || "-"}</td>
                    <td className="px-5 py-3"><StatusBadge code={page.statusCode} /></td>
                    <td className="px-5 py-3"><IndexBadge status={page.indexStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Site config */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">Configuration</h2>
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

function QuickStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const iconBg: Record<string, string> = { blue: "bg-blue-100 text-blue-600", violet: "bg-violet-100 text-violet-600", green: "bg-emerald-100 text-emerald-600", red: "bg-red-100 text-red-600", slate: "bg-slate-100 text-slate-500" };
  return (
    <div className="card-hover rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg[color] || iconBg.slate}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ToolCard({ icon: Icon, title, description, status, href, color, highlight }: { icon: React.ElementType; title: string; description: string; status: string; href: string; color: string; highlight?: boolean }) {
  const gradients: Record<string, string> = { blue: "from-blue-500 to-blue-600", green: "from-emerald-500 to-emerald-600", violet: "from-violet-500 to-violet-600", amber: "from-amber-500 to-amber-600", pink: "from-pink-500 to-pink-600", indigo: "from-indigo-500 to-indigo-600", teal: "from-teal-500 to-teal-600", cyan: "from-cyan-500 to-cyan-600", orange: "from-orange-500 to-orange-600", rose: "from-rose-500 to-rose-600" };
  const shadows: Record<string, string> = { blue: "shadow-blue-500/15", green: "shadow-emerald-500/15", violet: "shadow-violet-500/15", amber: "shadow-amber-500/15", pink: "shadow-pink-500/15", indigo: "shadow-indigo-500/15", teal: "shadow-teal-500/15", cyan: "shadow-cyan-500/15", orange: "shadow-orange-500/15", rose: "shadow-rose-500/15" };
  return (
    <Link href={href} className={`card-hover group block rounded-2xl border bg-white p-5 shadow-sm ${highlight ? "border-rose-200 ring-1 ring-rose-100" : "border-slate-200/60"}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradients[color] || gradients.blue} shadow-md ${shadows[color] || shadows.blue}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{title}</h3>
        </div>
        {highlight && <span className="rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">NEW</span>}
        <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-blue-500" />
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      <p className="mt-3 text-[11px] font-semibold text-slate-400">{status}</p>
    </Link>
  );
}

function StatusBadge({ code }: { code: number | null }) {
  const cls = code === 200 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : code && code >= 400 ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-slate-50 text-slate-500 ring-1 ring-slate-200";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{code ?? "-"}</span>;
}

function IndexBadge({ status }: { status: string | null }) {
  const cls = status === "indexed" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : status === "not_indexed" ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200" : "bg-slate-50 text-slate-500 ring-1 ring-slate-200";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{status ?? "unknown"}</span>;
}

function HealthScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black" style={{ color }}>{grade}</span>
        <span className="text-[10px] font-bold text-slate-400">{score}/100</span>
      </div>
    </div>
  );
}

function ConfigItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm text-slate-700">{value}</dd>
    </div>
  );
}
