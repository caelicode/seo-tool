"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Zap,
} from "lucide-react";

interface KeywordData {
  id: string;
  keyword: string;
  pageUrl: string | null;
  currentPosition: number | null;
  currentClicks: number;
  currentImpressions: number;
  currentCtr: number;
  positionChange: number;
  lastUpdated: string | null;
  history: {
    date: string;
    position: number;
    clicks: number;
    impressions: number;
  }[];
}

export default function KeywordsPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPageUrl, setNewPageUrl] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await fetch(`/api/keywords?siteId=${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch keywords");
      setKeywords(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  const handleSync = async (autoDiscover = false) => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/keywords/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, autoDiscover }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync failed");
      }
      const data = await res.json();
      // Refresh the list
      await fetchKeywords();
      alert(`Synced ${data.synced} keyword rankings.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          keyword: newKeyword.trim(),
          pageUrl: newPageUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add keyword");
      }
      setNewKeyword("");
      setNewPageUrl("");
      setShowAddForm(false);
      await fetchKeywords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add keyword");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, keyword: string) => {
    if (!confirm(`Remove "${keyword}" from tracking?`)) return;
    try {
      const res = await fetch(`/api/keywords?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

  const totalClicks = keywords.reduce((s, k) => s + k.currentClicks, 0);
  const totalImpressions = keywords.reduce((s, k) => s + k.currentImpressions, 0);
  const avgPosition =
    keywords.length > 0
      ? keywords.reduce((s, k) => s + (k.currentPosition || 0), 0) / keywords.filter((k) => k.currentPosition).length
      : 0;
  const improved = keywords.filter((k) => k.positionChange > 0).length;
  const declined = keywords.filter((k) => k.positionChange < 0).length;

  return (
    <div>
      <Link
        href={`/sites/${siteId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Keyword Tracking</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track search rankings, clicks, and impressions for your target keywords.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Rankings
          </button>
          <button
            onClick={() => handleSync(true)}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            title="Sync rankings and auto-discover top 20 keywords from GSC"
          >
            <Zap className="h-4 w-4" />
            Auto-Discover
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Add Keyword
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add keyword form */}
      {showAddForm && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Keyword
              </label>
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. beauty parlor near me"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Target Page URL (optional)
              </label>
              <input
                type="text"
                value={newPageUrl}
                onChange={(e) => setNewPageUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </form>
        </div>
      )}

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Keywords</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{keywords.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Total Clicks</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totalClicks}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Impressions</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">{totalImpressions.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Avg Position</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">
            {avgPosition ? avgPosition.toFixed(1) : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Improved / Declined</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900">
            <span className="text-green-600">{improved}</span>
            {" / "}
            <span className="text-red-600">{declined}</span>
          </p>
        </div>
      </div>

      {/* Keywords table */}
      {keywords.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16">
          <Search className="mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-600">No keywords tracked yet</p>
          <p className="mt-1 text-sm text-zinc-400">
            Add keywords manually or use Auto-Discover to import from Google Search Console.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  <th className="px-4 py-3">Keyword</th>
                  <th className="px-4 py-3 text-right">Position</th>
                  <th className="px-4 py-3 text-right">Change</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Impressions</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                  <th className="px-4 py-3 text-right">Trend</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {keywords.map((kw) => (
                  <tr key={kw.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-900">{kw.keyword}</p>
                      {kw.pageUrl && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-zinc-400">
                          {kw.pageUrl}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-zinc-900">
                        {kw.currentPosition !== null
                          ? kw.currentPosition.toFixed(1)
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PositionChange change={kw.positionChange} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">
                      {kw.currentClicks}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">
                      {kw.currentImpressions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-zinc-700">
                      {(kw.currentCtr * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MiniSparkline data={kw.history.map((h) => h.position)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(kw.id, kw.keyword)}
                        className="text-zinc-400 hover:text-red-600"
                        title="Remove keyword"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PositionChange({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-zinc-400">
        <Minus className="h-3 w-3" />
        0
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
        <TrendingUp className="h-3 w-3" />
        +{change.toFixed(1)}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
      <TrendingDown className="h-3 w-3" />
      {change.toFixed(1)}
    </span>
  );
}

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <span className="text-xs text-zinc-300">-</span>;

  // Reverse so oldest is first (data comes newest-first)
  const points = [...data].reverse();
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const width = 60;
  const height = 20;

  const pathPoints = points.map((val, i) => {
    const x = (i / (points.length - 1)) * width;
    // Invert Y: lower position = better = higher on chart
    const y = ((val - min) / range) * (height - 4) + 2;
    return `${x},${y}`;
  });

  const d = `M ${pathPoints.join(" L ")}`;

  // Determine color based on trend (lower position is better)
  const first = points[0];
  const last = points[points.length - 1];
  const color = last < first ? "#16a34a" : last > first ? "#dc2626" : "#a1a1aa";

  return (
    <svg width={width} height={height} className="inline-block">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
