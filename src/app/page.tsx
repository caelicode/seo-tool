"use client";

import { useEffect, useState } from "react";
import { Plus, Globe, FileText, AlertTriangle, Activity, Gauge, Search } from "lucide-react";
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

  // Aggregate stats
  const totalPages = sites.reduce((sum, s) => sum + s._count.pages, 0);
  const totalIssues = sites.reduce(
    (sum, s) => sum + (s.crawls[0]?.issuesFound ?? 0),
    0
  );
  const totalKeywords = sites.reduce((sum, s) => sum + s._count.keywords, 0);
  const sitesWithSpeed = sites.filter((s) => s.speedTests.length > 0);
  const avgSpeedScore =
    sitesWithSpeed.length > 0
      ? Math.round(
          sitesWithSpeed.reduce(
            (sum, s) => sum + s.speedTests[0].performanceScore,
            0
          ) / sitesWithSpeed.length
        )
      : null;
  const connectedGsc = sites.filter((s) => s.gscPropertyId).length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">SEO Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Monitor and optimize your websites
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Add Site
        </button>
      </div>

      {/* Global stats */}
      {sites.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-500">Sites</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {sites.length}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-500">Pages</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {totalPages}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-500">Issues</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {totalIssues}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-500">Keywords</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {totalKeywords}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-500">Avg Speed</span>
            </div>
            <p className={`mt-1 text-2xl font-bold ${
              avgSpeedScore === null
                ? "text-zinc-400"
                : avgSpeedScore >= 90
                ? "text-green-600"
                : avgSpeedScore >= 50
                ? "text-amber-600"
                : "text-red-600"
            }`}>
              {avgSpeedScore ?? "-"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-zinc-400" />
              <span className="text-sm text-zinc-500">GSC</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {connectedGsc}/{sites.length}
            </p>
          </div>
        </div>
      )}

      {/* Sites grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
        </div>
      ) : sites.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 text-center">
          <Globe className="mb-3 h-10 w-10 text-zinc-300" />
          <h3 className="text-base font-medium text-zinc-700">No sites yet</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Add your first website to start monitoring its SEO health.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
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

      <AddSiteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAddSite}
      />
    </div>
  );
}
