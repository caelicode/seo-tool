"use client";

import Link from "next/link";
import { Globe, Activity, AlertTriangle, FileText, Trash2 } from "lucide-react";
import type { SiteWithStats } from "@/lib/types";

interface SiteCardProps {
  site: SiteWithStats;
  onDelete: (id: string) => void;
}

export function SiteCard({ site, onDelete }: SiteCardProps) {
  const lastCrawl = site.crawls[0] ?? null;
  const lastSpeed = site.speedTests[0] ?? null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50";
    if (score >= 50) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "running":
        return "text-blue-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-zinc-500";
    }
  };

  return (
    <div className="group relative rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          if (confirm(`Delete "${site.name}" and all its data?`)) {
            onDelete(site.id);
          }
        }}
        className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        aria-label="Delete site"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Link href={`/sites/${site.id}`} className="block">
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
            <Globe className="h-5 w-5 text-zinc-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-zinc-900">
              {site.name}
            </h3>
            <p className="truncate text-sm text-zinc-500">{site.domain}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-50 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-500">Pages</span>
            </div>
            <p className="mt-0.5 text-lg font-semibold text-zinc-900">
              {site._count.pages}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-50 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-500">Issues</span>
            </div>
            <p className="mt-0.5 text-lg font-semibold text-zinc-900">
              {lastCrawl?.issuesFound ?? "-"}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-50 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-500">Crawl</span>
            </div>
            <p
              className={`mt-0.5 text-sm font-medium ${
                lastCrawl ? getStatusColor(lastCrawl.status) : "text-zinc-400"
              }`}
            >
              {lastCrawl ? lastCrawl.status : "Never"}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-50 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-500">Speed</span>
            </div>
            {lastSpeed ? (
              <span
                className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-sm font-semibold ${getScoreColor(
                  lastSpeed.performanceScore
                )}`}
              >
                {Math.round(lastSpeed.performanceScore)}
              </span>
            ) : (
              <p className="mt-0.5 text-sm font-medium text-zinc-400">-</p>
            )}
          </div>
        </div>

        {site._count.keywords > 0 && (
          <div className="mt-3 text-xs text-zinc-500">
            Tracking {site._count.keywords} keyword
            {site._count.keywords !== 1 ? "s" : ""}
          </div>
        )}
      </Link>
    </div>
  );
}
