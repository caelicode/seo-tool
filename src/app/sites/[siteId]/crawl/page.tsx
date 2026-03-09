"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Wrench,
  ExternalLink,
  Lightbulb,
  AlertCircle,
  AlertTriangle as AlertTriangleIcon,
  Info,
} from "lucide-react";
import { IssueBadge, IssueTypeBadge } from "@/components/issue-badge";

interface CrawlData {
  id: string;
  status: string;
  pagesFound: number;
  issuesFound: number;
  startedAt: string;
  completedAt: string | null;
  site: { id: string; domain: string; name: string };
  issues: {
    id: string;
    type: string;
    severity: string;
    detail: string;
    page: { id: string; url: string; title: string | null };
  }[];
}

interface CrawlSummary {
  id: string;
  status: string;
  pagesFound: number;
  issuesFound: number;
  startedAt: string;
  completedAt: string | null;
}

interface IssueGuide {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  howToFix: string[];
  resources: { label: string; url: string }[];
}

export default function CrawlPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [crawls, setCrawls] = useState<CrawlSummary[]>([]);
  const [activeCrawl, setActiveCrawl] = useState<CrawlData | null>(null);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState("");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [guides, setGuides] = useState<Record<string, IssueGuide>>({});
  const [loadingGuide, setLoadingGuide] = useState<string | null>(null);

  // Fetch site details and crawl history
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}`);
        if (!res.ok) return;
        const site = await res.json();
        setSiteName(site.name);
        setCrawls(site.crawls || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [siteId]);

  // Poll active crawl status
  const pollCrawl = useCallback(async (crawlId: string) => {
    try {
      const res = await fetch(`/api/crawl/${crawlId}`);
      if (!res.ok) return;
      const data: CrawlData = await res.json();
      setActiveCrawl(data);

      if (data.status === "running") {
        setTimeout(() => pollCrawl(crawlId), 3000);
      } else {
        // Refresh crawl list
        const siteRes = await fetch(`/api/sites/${data.site.id}`);
        if (siteRes.ok) {
          const site = await siteRes.json();
          setCrawls(site.crawls || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const startCrawl = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to start crawl");
        return;
      }

      const crawl = await res.json();
      setActiveCrawl({
        ...crawl,
        site: { id: siteId, domain: "", name: siteName },
        issues: [],
      });
      pollCrawl(crawl.id);
    } catch (err) {
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  const viewCrawl = async (crawlId: string) => {
    const res = await fetch(`/api/crawl/${crawlId}`);
    if (res.ok) {
      setActiveCrawl(await res.json());
      setExpandedIssue(null);
    }
  };

  const toggleIssue = async (issueId: string, issueType: string) => {
    if (expandedIssue === issueId) {
      setExpandedIssue(null);
      return;
    }

    setExpandedIssue(issueId);

    // Fetch guide if not cached
    if (!guides[issueType]) {
      setLoadingGuide(issueType);
      try {
        const res = await fetch(`/api/issues/guide?type=${issueType}`);
        if (res.ok) {
          const guide = await res.json();
          setGuides((prev) => ({ ...prev, [issueType]: guide }));
        }
      } catch (err) {
        console.error("Failed to fetch guide:", err);
      } finally {
        setLoadingGuide(null);
      }
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  // Group issues by severity for summary
  const issueSummary = activeCrawl?.issues.reduce(
    (acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Group issues by page for organized view
  const issuesByPage = activeCrawl?.issues.reduce(
    (acc, issue) => {
      const pageUrl = issue.page.url;
      if (!acc[pageUrl]) {
        acc[pageUrl] = { page: issue.page, issues: [] };
      }
      acc[pageUrl].issues.push(issue);
      return acc;
    },
    {} as Record<string, { page: { id: string; url: string; title: string | null }; issues: typeof activeCrawl.issues }>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/sites/${siteId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {siteName}
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Site Crawler</h1>
          <p className="mt-1 text-sm text-slate-500">
            Crawl pages to find SEO issues, with fix guides for every problem.
          </p>
        </div>
        <button
          onClick={startCrawl}
          disabled={starting || activeCrawl?.status === "running"}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {starting || activeCrawl?.status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {activeCrawl?.status === "running" ? "Crawling..." : "Start Crawl"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Crawl history (left sidebar) */}
        <div className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Crawl History
          </h2>
          {crawls.length === 0 ? (
            <p className="text-sm text-slate-500">
              No crawls yet. Hit &quot;Start Crawl&quot; to begin.
            </p>
          ) : (
            <div className="space-y-2">
              {crawls.map((c) => (
                <button
                  key={c.id}
                  onClick={() => viewCrawl(c.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-slate-50 ${
                    activeCrawl?.id === c.id
                      ? "border-slate-400 bg-slate-50"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {statusIcon(c.status)}
                    <span className="text-sm font-medium capitalize text-slate-700">
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-slate-500">
                    <span>{c.pagesFound} pages</span>
                    <span>{c.issuesFound} issues</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(c.startedAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Crawl results (main area) */}
        <div className="lg:col-span-2">
          {!activeCrawl ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
              <RefreshCw className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                Start a crawl or select one from history
              </p>
            </div>
          ) : (
            <div>
              {/* Status banner */}
              <div
                className={`mb-4 flex items-center gap-3 rounded-lg p-4 ${
                  activeCrawl.status === "running"
                    ? "bg-blue-50"
                    : activeCrawl.status === "completed"
                    ? "bg-green-50"
                    : "bg-red-50"
                }`}
              >
                {statusIcon(activeCrawl.status)}
                <div>
                  <p className="text-sm font-medium capitalize text-slate-800">
                    Crawl {activeCrawl.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    {activeCrawl.pagesFound} pages scanned,{" "}
                    {activeCrawl.issuesFound} issues found
                  </p>
                </div>
              </div>

              {/* Issue summary cards */}
              {issueSummary && Object.keys(issueSummary).length > 0 && (
                <div className="mb-4 flex gap-3">
                  {issueSummary.critical && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                      <p className="text-lg font-bold text-red-700">
                        {issueSummary.critical}
                      </p>
                      <p className="text-xs text-red-600">Critical</p>
                    </div>
                  )}
                  {issueSummary.warning && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                      <p className="text-lg font-bold text-amber-700">
                        {issueSummary.warning}
                      </p>
                      <p className="text-xs text-amber-600">Warnings</p>
                    </div>
                  )}
                  {issueSummary.info && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                      <p className="text-lg font-bold text-blue-700">
                        {issueSummary.info}
                      </p>
                      <p className="text-xs text-blue-600">Info</p>
                    </div>
                  )}
                </div>
              )}

              {/* Issues grouped by page */}
              {activeCrawl.issues.length > 0 && issuesByPage ? (
                <div className="space-y-4">
                  {Object.entries(issuesByPage).map(([pageUrl, { page, issues }]) => (
                    <div
                      key={pageUrl}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      {/* Page header */}
                      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {page.title || page.url}
                        </p>
                        <p className="truncate text-xs text-slate-400">{page.url}</p>
                      </div>

                      {/* Issues for this page */}
                      <div className="divide-y divide-slate-100">
                        {issues.map((issue) => (
                          <div key={issue.id}>
                            {/* Issue row (clickable) */}
                            <button
                              onClick={() => toggleIssue(issue.id, issue.type)}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                            >
                              {expandedIssue === issue.id ? (
                                <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                              )}
                              <IssueBadge severity={issue.severity} />
                              <IssueTypeBadge type={issue.type} />
                              <span className="flex-1 truncate text-sm text-slate-500">
                                {issue.detail}
                              </span>
                              <Wrench className="h-4 w-4 flex-shrink-0 text-slate-300" />
                            </button>

                            {/* Expanded fix guide */}
                            {expandedIssue === issue.id && (
                              <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                                {loadingGuide === issue.type ? (
                                  <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading fix guide...
                                  </div>
                                ) : guides[issue.type] ? (
                                  <FixGuide guide={guides[issue.type]} />
                                ) : (
                                  <p className="text-sm text-slate-500">
                                    No guide available for this issue type.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeCrawl.status === "running" ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-green-400" />
                  <p className="text-sm font-medium text-slate-600">
                    No issues found. Your site looks good!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FixGuide({ guide }: { guide: IssueGuide }) {
  const impactColors = {
    high: "text-red-700 bg-red-50 border-red-200",
    medium: "text-amber-700 bg-amber-50 border-amber-200",
    low: "text-blue-700 bg-blue-50 border-blue-200",
  };

  const impactIcons = {
    high: <AlertCircle className="h-4 w-4" />,
    medium: <AlertTriangleIcon className="h-4 w-4" />,
    low: <Info className="h-4 w-4" />,
  };

  return (
    <div className="space-y-4">
      {/* Guide header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{guide.title}</h4>
          <p className="mt-1 text-sm text-slate-600">{guide.description}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${impactColors[guide.impact]}`}
        >
          {impactIcons[guide.impact]}
          {guide.impact} impact
        </span>
      </div>

      {/* How to fix */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-green-700" />
          <h5 className="text-sm font-semibold text-green-800">How to Fix</h5>
        </div>
        <ol className="space-y-2 pl-1">
          {guide.howToFix.map((step, i) => (
            <li key={i} className="flex gap-2 text-sm text-green-800">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Resources */}
      {guide.resources.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-slate-500">
            Learn more:
          </p>
          <div className="flex flex-wrap gap-2">
            {guide.resources.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {r.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
