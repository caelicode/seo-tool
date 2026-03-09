"use client";

import Link from "next/link";
import { Globe, Activity, AlertTriangle, FileText, Trash2, ArrowUpRight } from "lucide-react";
import type { SiteWithStats } from "@/lib/types";

interface SiteCardProps {
  site: SiteWithStats;
  onDelete: (id: string) => void;
}

export function SiteCard({ site, onDelete }: SiteCardProps) {
  const lastCrawl = site.crawls[0] ?? null;
  const lastSpeed = site.speedTests[0] ?? null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-700 bg-emerald-50 ring-emerald-200";
    if (score >= 50) return "text-amber-700 bg-amber-50 ring-amber-200";
    return "text-red-700 bg-red-50 ring-red-200";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
      case "running":
        return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
      case "failed":
        return "bg-red-50 text-red-700 ring-1 ring-red-200";
      default:
        return "bg-slate-50 text-slate-500 ring-1 ring-slate-200";
    }
  };

  return (
    <div className="group relative card-hover rounded-2xl border border-slate-200/60 bg-white shadow-sm">
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          if (confirm(`Delete "${site.name}" and all its data?`)) {
            onDelete(site.id);
          }
        }}
        className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        aria-label="Delete site"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <Link href={`/sites/${site.id}`} className="block p-5">
        {/* Header */}
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-md shadow-blue-500/20">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-slate-900">
              {site.name}
            </h3>
            <p className="flex items-center gap-1 truncate text-sm text-slate-400">
              {site.domain}
              <ArrowUpRight className="h-3 w-3" />
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3 w-3 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-400">Pages</span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-800">
              {site._count.pages}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-400">Issues</span>
            </div>
            <p className={`mt-1 text-lg font-bold ${
              (lastCrawl?.issuesFound ?? 0) > 0 ? "text-red-600" : "text-slate-800"
            }`}>
              {lastCrawl?.issuesFound ?? "-"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-400">Crawl</span>
            </div>
            <p className="mt-1">
              {lastCrawl ? (
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadge(lastCrawl.status)}`}>
                  {lastCrawl.status}
                </span>
              ) : (
                <span className="text-sm font-medium text-slate-300">Never</span>
              )}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-400">Speed</span>
            </div>
            <p className="mt-1">
              {lastSpeed ? (
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${getScoreColor(
                    lastSpeed.performanceScore
                  )}`}
                >
                  {Math.round(lastSpeed.performanceScore)}
                </span>
              ) : (
                <span className="text-sm font-medium text-slate-300">-</span>
              )}
            </p>
          </div>
        </div>

        {site._count.keywords > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            <span className="text-xs text-slate-500">
              Tracking {site._count.keywords} keyword{site._count.keywords !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </Link>
    </div>
  );
}
