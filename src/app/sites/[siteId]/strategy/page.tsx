"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  Sparkles,
  Target,
  Calendar,
  Wrench,
  Link2,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  FileText,
  TrendingUp,
} from "lucide-react";

interface Competitor {
  domain: string;
  strengths: string[];
  weaknesses: string[];
}

interface KeywordCluster {
  theme: string;
  keywords: {
    keyword: string;
    type: "quick_win" | "high_value" | "long_tail";
    currentPosition: number | null;
    suggestedAction: string;
  }[];
}

interface ContentCalendarItem {
  day: number;
  primaryKeyword: string;
  secondaryKeywords: string[];
  title: string;
  contentType: string;
  wordCount: number;
  priority: number;
  brief: string;
}

interface TechnicalFix {
  issue: string;
  impact: "high" | "medium" | "low";
  fix: string;
}

interface OnPageOpt {
  page: string;
  improvements: string[];
}

interface Strategy {
  executiveSummary: string;
  competitors: Competitor[];
  keywordClusters: KeywordCluster[];
  contentCalendar: ContentCalendarItem[];
  technicalFixes: TechnicalFix[];
  onPageOptimizations: OnPageOpt[];
  backlinkStrategy: {
    targets: string[];
    localDirectories: string[];
    guestPostIdeas: string[];
  };
  projectedTimeline: Record<string, string>;
}

export default function StrategyPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [provider, setProvider] = useState("openai");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["summary", "calendar", "keywords"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setStrategy(null);

    try {
      const res = await fetch("/api/seo-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, provider }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Strategy generation failed");
      }

      const data = await res.json();
      setStrategy(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate strategy");
    } finally {
      setGenerating(false);
    }
  };

  const generateArticleFromCalendar = async (item: ContentCalendarItem) => {
    try {
      const res = await fetch("/api/content-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          targetKeyword: item.primaryKeyword,
          secondaryKeywords: item.secondaryKeywords,
          provider,
          contentType: item.contentType,
          tone: "professional",
        }),
      });
      if (res.ok) {
        alert(`Article "${item.title}" generated! Check the Content Engine library.`);
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error}`);
      }
    } catch {
      alert("Failed to generate article");
    }
  };

  const impactColor = (impact: string) =>
    impact === "high"
      ? "bg-red-50 text-red-700 ring-red-200"
      : impact === "medium"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-50 text-slate-600 ring-slate-200";

  const kwTypeColor = (type: string) =>
    type === "quick_win"
      ? "bg-emerald-50 text-emerald-700"
      : type === "high_value"
        ? "bg-violet-50 text-violet-700"
        : "bg-blue-50 text-blue-700";

  const kwTypeLabel = (type: string) =>
    type === "quick_win" ? "Quick Win" : type === "high_value" ? "High Value" : "Long Tail";

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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">SEO Autopilot Strategy</h1>
            <p className="text-sm text-slate-500">
              AI deep-analyzes your site, competitors, and keywords to build a full ranking strategy.
            </p>
          </div>
        </div>
      </div>

      {/* Launch controls */}
      {!strategy && !generating && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-8 text-center">
          <Brain className="mx-auto mb-4 h-14 w-14 text-indigo-400" />
          <h2 className="mb-2 text-lg font-bold text-slate-900">
            Generate Your SEO Strategy
          </h2>
          <p className="mx-auto mb-6 max-w-lg text-sm text-slate-600">
            The AI will analyze your crawled pages, keyword rankings, competitors, speed tests,
            backlinks, and sitemap data to create a comprehensive strategy with a 30-day content
            calendar.
          </p>
          <div className="mb-4 flex items-center justify-center gap-3">
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="openai">GPT-4.1 mini (OpenAI)</option>
              <option value="anthropic">Claude (Anthropic)</option>
            </select>
          </div>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
          >
            <Sparkles className="h-5 w-5" />
            Build My Strategy
          </button>
        </div>
      )}

      {generating && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">
              <Brain className="h-7 w-7 animate-pulse text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-indigo-900">Building your SEO strategy...</p>
              <p className="text-sm text-indigo-600">
                Analyzing site data, researching competitors, clustering keywords, and planning
                content. This takes 30-60 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Strategy results */}
      {strategy && (
        <div className="space-y-4">
          {/* Regenerate button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Regenerate
            </button>
          </div>

          {/* Executive Summary */}
          <SectionCard
            title="Executive Summary"
            icon={TrendingUp}
            color="indigo"
            expanded={expandedSections.has("summary")}
            onToggle={() => toggleSection("summary")}
          >
            <p className="text-sm leading-relaxed text-slate-700">{strategy.executiveSummary}</p>
          </SectionCard>

          {/* Projected Timeline */}
          {strategy.projectedTimeline && (
            <SectionCard
              title="Projected Timeline"
              icon={Clock}
              color="blue"
              expanded={expandedSections.has("timeline")}
              onToggle={() => toggleSection("timeline")}
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(strategy.projectedTimeline).map(([period, desc]) => (
                  <div key={period} className="rounded-xl bg-blue-50/50 p-3">
                    <p className="text-xs font-bold uppercase text-blue-600">{period.replace("_", " ")}</p>
                    <p className="mt-1 text-sm text-slate-700">{desc}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Keyword Clusters */}
          <SectionCard
            title="Keyword Strategy"
            icon={Target}
            color="violet"
            expanded={expandedSections.has("keywords")}
            onToggle={() => toggleSection("keywords")}
          >
            <div className="space-y-4">
              {strategy.keywordClusters.map((cluster, i) => (
                <div key={i}>
                  <h4 className="mb-2 text-sm font-semibold text-slate-800">{cluster.theme}</h4>
                  <div className="space-y-1.5">
                    {cluster.keywords.map((kw, j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${kwTypeColor(kw.type)}`}>
                            {kwTypeLabel(kw.type)}
                          </span>
                          <span className="text-sm text-slate-800">{kw.keyword}</span>
                          {kw.currentPosition && (
                            <span className="text-xs text-slate-400">#{kw.currentPosition}</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">{kw.suggestedAction}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Content Calendar */}
          <SectionCard
            title="30-Day Content Calendar"
            icon={Calendar}
            color="rose"
            expanded={expandedSections.has("calendar")}
            onToggle={() => toggleSection("calendar")}
          >
            <div className="space-y-3">
              {strategy.contentCalendar.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-[10px] font-bold text-rose-700">
                          D{item.day}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {item.contentType}
                        </span>
                        <span className="text-[10px] text-slate-400">~{item.wordCount} words</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">{item.brief}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                          {item.primaryKeyword}
                        </span>
                        {item.secondaryKeywords.slice(0, 3).map((kw, j) => (
                          <span
                            key={j}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => generateArticleFromCalendar(item)}
                      className="shrink-0 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all hover:shadow-md"
                      title="Generate this article now"
                    >
                      <Zap className="inline h-3 w-3" /> Write
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Competitors */}
          {strategy.competitors.length > 0 && (
            <SectionCard
              title="Competitive Analysis"
              icon={Target}
              color="amber"
              expanded={expandedSections.has("competitors")}
              onToggle={() => toggleSection("competitors")}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {strategy.competitors.map((comp, i) => (
                  <div key={i} className="rounded-xl bg-slate-50 p-4">
                    <h4 className="text-sm font-bold text-slate-800">{comp.domain}</h4>
                    <div className="mt-2">
                      <p className="text-[10px] font-bold uppercase text-emerald-600">Strengths</p>
                      {comp.strengths.map((s, j) => (
                        <p key={j} className="text-xs text-slate-600">+ {s}</p>
                      ))}
                    </div>
                    <div className="mt-2">
                      <p className="text-[10px] font-bold uppercase text-red-600">Weaknesses</p>
                      {comp.weaknesses.map((w, j) => (
                        <p key={j} className="text-xs text-slate-600">- {w}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Technical Fixes */}
          {strategy.technicalFixes.length > 0 && (
            <SectionCard
              title="Technical SEO Fixes"
              icon={Wrench}
              color="orange"
              expanded={expandedSections.has("technical")}
              onToggle={() => toggleSection("technical")}
            >
              <div className="space-y-2">
                {strategy.technicalFixes.map((fix, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                    <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${impactColor(fix.impact)}`}>
                      {fix.impact}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{fix.issue}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{fix.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Backlink Strategy */}
          {strategy.backlinkStrategy && (
            <SectionCard
              title="Backlink Strategy"
              icon={Link2}
              color="teal"
              expanded={expandedSections.has("backlinks")}
              onToggle={() => toggleSection("backlinks")}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Outreach Targets
                  </p>
                  {strategy.backlinkStrategy.targets.map((t, i) => (
                    <p key={i} className="text-sm text-slate-700">{t}</p>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Local Directories
                  </p>
                  {strategy.backlinkStrategy.localDirectories.map((d, i) => (
                    <p key={i} className="text-sm text-slate-700">{d}</p>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Guest Post Ideas
                  </p>
                  {strategy.backlinkStrategy.guestPostIdeas.map((g, i) => (
                    <p key={i} className="text-sm text-slate-700">{g}</p>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {/* On-Page Optimizations */}
          {strategy.onPageOptimizations.length > 0 && (
            <SectionCard
              title="On-Page Optimizations"
              icon={FileText}
              color="cyan"
              expanded={expandedSections.has("onpage")}
              onToggle={() => toggleSection("onpage")}
            >
              <div className="space-y-3">
                {strategy.onPageOptimizations.map((opt, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-800">{opt.page}</p>
                    <div className="mt-1 space-y-0.5">
                      {opt.improvements.map((imp, j) => (
                        <p key={j} className="text-xs text-slate-500">- {imp}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  color,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const gradients: Record<string, string> = {
    indigo: "from-indigo-500 to-indigo-600",
    blue: "from-blue-500 to-blue-600",
    violet: "from-violet-500 to-violet-600",
    rose: "from-rose-500 to-rose-600",
    amber: "from-amber-500 to-amber-600",
    orange: "from-orange-500 to-orange-600",
    teal: "from-teal-500 to-teal-600",
    cyan: "from-cyan-500 to-cyan-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${gradients[color] || gradients.indigo} shadow-sm`}
          >
            <Icon className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {expanded && <div className="border-t border-slate-100 px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}
