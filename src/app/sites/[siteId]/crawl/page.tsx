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

export default function CrawlPage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [crawls, setCrawls] = useState<CrawlSummary[]>([]);
  const [activeCrawl, setActiveCrawl] = useState<CrawlData | null>(null);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState("");

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
        return <Clock className="h-4 w-4 text-zinc-400" />;
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/sites/${siteId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {siteName}
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Site Crawler</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Crawl pages to find SEO issues
          </p>
        </div>
        <button
          onClick={startCrawl}
          disabled={starting || activeCrawl?.status === "running"}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
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
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">
            Crawl History
          </h2>
          {crawls.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No crawls yet. Hit &quot;Start Crawl&quot; to begin.
            </p>
          ) : (
            <div className="space-y-2">
              {crawls.map((c) => (
                <button
                  key={c.id}
                  onClick={() => viewCrawl(c.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-zinc-50 ${
                    activeCrawl?.id === c.id
                      ? "border-zinc-400 bg-zinc-50"
                      : "border-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {statusIcon(c.status)}
                    <span className="text-sm font-medium capitalize text-zinc-700">
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-zinc-500">
                    <span>{c.pagesFound} pages</span>
                    <span>{c.issuesFound} issues</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
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
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200">
              <RefreshCw className="mb-2 h-8 w-8 text-zinc-300" />
              <p className="text-sm text-zinc-500">
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
                  <p className="text-sm font-medium capitalize text-zinc-800">
                    Crawl {activeCrawl.status}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {activeCrawl.pagesFound} pages scanned,{" "}
                    {activeCrawl.issuesFound} issues found
                  </p>
                </div>
              </div>

              {/* Issue summary */}
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

              {/* Issues table */}
              {activeCrawl.issues.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Page</th>
                        <th className="px-4 py-3">Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {activeCrawl.issues.map((issue) => (
                        <tr key={issue.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-3">
                            <IssueBadge severity={issue.severity} />
                          </td>
                          <td className="px-4 py-3">
                            <IssueTypeBadge type={issue.type} />
                          </td>
                          <td className="max-w-[200px] truncate px-4 py-3 text-sm text-zinc-600">
                            {issue.page.url}
                          </td>
                          <td className="max-w-[300px] truncate px-4 py-3 text-sm text-zinc-500">
                            {issue.detail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeCrawl.status === "running" ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                </div>
              ) : (
                <p className="text-center text-sm text-zinc-500">
                  No issues found. Your site looks good!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
