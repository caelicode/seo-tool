"use client";

import { useEffect, useState } from "react";
import { Plus, Globe, FileText, AlertTriangle, Activity, Gauge, Search, TrendingUp } from "lucide-react";
import { SiteCard } from "@/components/site-card";
import { AddSiteDialog } from "@/components/add-site-dialog";
import type { SiteWithStats, SiteFormData } from "@/lib/types";

export default function DashboardPage() {
  const [sites, setSites] = useState<SiteWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSites = async () => {
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) throw new Error("Failed to fetch sites");
      const data = await res.json();
      setSites(data);
    } catch (err) {
      console.error("Failed to fetch sites:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleAddSite = async (data: SiteFormData) => {
    const res = await fetch("/api/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to add site");
    }

    await fetchSites();
  };

  const handleDeleteSite = async (id: string) => {
    try {
      const res = await fetch(`/api/sites/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete site");
      setSites((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete site:", err);
    }
  };

  const totalPages = sites.reduce((sum, s) => sum + s._count.pages, 0);
  const totalIssues = sites.reduce((sum, s) => sum + (s.crawls[0]?.issuesFound ?? 0), 0);
  const totalKeywords = sites.reduce((sum, s) => sum + s._count.keywords, 0);
  const sitesWithSpeed = sites.filter((s) => s.speedTests.length > 0);
  const avgSpeedScore =
    sitesWithSpeed.length > 0
      ? Math.round(
          sitesWithSpeed.reduce((sum, s) => sum + s.speedTests[0].performanceScore, 0) /
            sitesWithSpeed.length
        )
      : null;
  const connectedGsc = sites.filter((s) => s.gscPropertyId).length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor and optimize your websites</p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/30"
        >
          <Plus className="h-4 w-4" />
          Add Site
        </button>
      </div>

      {/* Global stats */}
      {sites.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <GlassStatCard icon={Globe} label="Sites" value={sites.length} color="blue" />
          <GlassStatCard icon={FileText} label="Pages" value={totalPages} color="slate" />
          <GlassStatCard
            icon={AlertTriangle}
            label="Issues"
            value={totalIssues}
            color={totalIssues > 0 ? "red" : "green"}
          />
          <GlassStatCard icon={Activity} label="Keywords" value={totalKeywords} color="violet" />
          <GlassStatCard
            icon={Gauge}
            label="Avg Speed"
            value={avgSpeedScore ?? "-"}
            color={
              avgSpeedScore === null ? "slate" : avgSpeedScore >= 90 ? "green" : avgSpeedScore >= 50 ? "amber" : "red"
            }
          />
          <GlassStatCard
            icon={Search}
            label="GSC"
            value={`${connectedGsc}/${sites.length}`}
            color={connectedGsc > 0 ? "green" : "slate"}
          />
        </div>
      )}

      {/* Sites grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        </div>
      ) : sites.length === 0 ? (
        <div className="flex h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100">
            <TrendingUp className="h-7 w-7 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No sites yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Add your first website to start monitoring its SEO health, track keywords, and optimize content.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20"
          >
            <Plus className="h-4 w-4" />
            Add Site
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} onDelete={handleDeleteSite} />
          ))}
        </div>
      )}

      <AddSiteDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSubmit={handleAddSite} />
    </div>
  );
}

function GlassStatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  const iconBg: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    violet: "bg-violet-100 text-violet-600",
    green: "bg-emerald-100 text-emerald-600",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-600",
    slate: "bg-slate-100 text-slate-500",
  };
  const valColor: Record<string, string> = {
    blue: "text-slate-900",
    violet: "text-slate-900",
    green: "text-emerald-700",
    red: "text-red-700",
    amber: "text-amber-700",
    slate: "text-slate-900",
  };

  return (
    <div className="card-hover rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg[color] || iconBg.slate}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${valColor[color] || valColor.slate}`}>{value}</p>
    </div>
  );
}
