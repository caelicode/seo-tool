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
  Sparkles,
  Check,
  X,
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

interface KeywordSuggestion {
  keyword: string;
  category: string;
  searchVolume: string;
  competition: string;
  intent: string;
  priority: number;
  reasoning: string;
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
  const [siteDomain, setSiteDomain] = useState("");

  // Research state
  const [showResearch, setShowResearch] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchBusiness, setResearchBusiness] = useState("");
  const [researchLocation, setResearchLocation] = useState("");
  const [researchServices, setResearchServices] = useState("");
  const [suggestions, setSuggestions] = useState<KeywordSuggestion[]>([]);
  const [researchSummary, setResearchSummary] = useState("");
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [addingSuggestions, setAddingSuggestions] = useState(false);

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
    // Fetch site domain for auto-filling URL on keyword add
    const fetchSite = async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}`);
        if (res.ok) {
          const site = await res.json();
          setSiteDomain(site.domain || "");
        }
      } catch {
        // Non-critical
      }
    };
    fetchSite();
  }, [fetchKeywords, siteId]);

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

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchBusiness.trim() || !researchLocation.trim()) return;

    setResearching(true);
    setError(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());

    try {
      const res = await fetch("/api/keywords/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: researchBusiness.trim(),
          location: researchLocation.trim(),
          services: researchServices.trim() || undefined,
          website: siteDomain ? `https://${siteDomain}` : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Research failed");
      }

      const data = await res.json();
      setSuggestions(data.keywords || []);
      setResearchSummary(data.summary || "");
      // Auto-select priority 1 and 2 keywords
      const autoSelect = new Set<string>();
      for (const kw of data.keywords || []) {
        if (kw.priority <= 2) autoSelect.add(kw.keyword);
      }
      setSelectedSuggestions(autoSelect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research failed");
    } finally {
      setResearching(false);
    }
  };

  const toggleSuggestion = (keyword: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(keyword)) {
        next.delete(keyword);
      } else {
        next.add(keyword);
      }
      return next;
    });
  };

  const addSelectedKeywords = async () => {
    if (selectedSuggestions.size === 0) return;

    setAddingSuggestions(true);
    setError(null);
    let added = 0;

    // Auto-generate the site URL from the domain
    const siteUrl = siteDomain ? `https://${siteDomain}/` : undefined;

    // Get existing keywords to avoid duplicates
    const existingSet = new Set(keywords.map((k) => k.keyword.toLowerCase()));

    for (const keyword of selectedSuggestions) {
      if (existingSet.has(keyword.toLowerCase())) continue;
      try {
        const res = await fetch("/api/keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId, keyword, pageUrl: siteUrl }),
        });
        if (res.ok) added++;
      } catch {
        // Skip failures (likely duplicates)
      }
    }

    await fetchKeywords();
    setAddingSuggestions(false);
    setSuggestions([]);
    setShowResearch(false);
    setSelectedSuggestions(new Set());
    alert(`Added ${added} new keywords to tracking.`);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
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
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keyword Tracking</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track search rankings, clicks, and impressions for your target keywords.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
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
            onClick={() => setShowResearch(!showResearch)}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
          >
            <Sparkles className="h-4 w-4" />
            Research Keywords
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              // Pre-fill URL when opening the add form
              if (!showAddForm && siteDomain && !newPageUrl) {
                setNewPageUrl(`https://${siteDomain}/`);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
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
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Keyword
              </label>
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. beauty parlor near me"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Target Page URL (optional)
              </label>
              <input
                type="text"
                value={newPageUrl}
                onChange={(e) => setNewPageUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </form>
        </div>
      )}

      {/* AI Keyword Research panel */}
      {showResearch && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                AI Keyword Research
              </h3>
            </div>
            <button
              onClick={() => { setShowResearch(false); setSuggestions([]); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {suggestions.length === 0 ? (
            <form onSubmit={handleResearch} className="space-y-3">
              <p className="text-sm text-slate-500">
                Describe your business and location, and AI will generate keyword ideas
                tailored to your market.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Business Type *
                  </label>
                  <input
                    type="text"
                    value={researchBusiness}
                    onChange={(e) => setResearchBusiness(e.target.value)}
                    placeholder="e.g. Hair braiding salon"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={researchLocation}
                    onChange={(e) => setResearchLocation(e.target.value)}
                    placeholder="e.g. Forney, TX"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    Services (optional)
                  </label>
                  <input
                    type="text"
                    value={researchServices}
                    onChange={(e) => setResearchServices(e.target.value)}
                    placeholder="e.g. braids, locs, hair installation, weaves"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={researching}
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                <Sparkles className={`h-4 w-4 ${researching ? "animate-pulse" : ""}`} />
                {researching ? "Researching... (10-20s)" : "Find Keywords"}
              </button>
            </form>
          ) : (
            <div>
              {researchSummary && (
                <p className="mb-4 text-sm text-slate-600">{researchSummary}</p>
              )}

              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {selectedSuggestions.size} of {suggestions.length} selected
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSuggestions(new Set(suggestions.map((s) => s.keyword)))}
                    className="text-xs text-purple-600 hover:text-purple-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedSuggestions(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="mb-4 max-h-80 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2 w-8" />
                      <th className="px-3 py-2">Keyword</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Volume</th>
                      <th className="px-3 py-2">Competition</th>
                      <th className="px-3 py-2">Intent</th>
                      <th className="px-3 py-2">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suggestions.map((s) => {
                      const isTracked = keywords.some(
                        (k) => k.keyword.toLowerCase() === s.keyword.toLowerCase()
                      );
                      return (
                        <tr
                          key={s.keyword}
                          className={`text-sm ${isTracked ? "bg-green-50 opacity-60" : "hover:bg-slate-50"}`}
                        >
                          <td className="px-3 py-2">
                            {isTracked ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={selectedSuggestions.has(s.keyword)}
                                onChange={() => toggleSuggestion(s.keyword)}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {s.keyword}
                            {isTracked && (
                              <span className="ml-2 text-xs text-green-600">already tracked</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-500">{s.category}</td>
                          <td className="px-3 py-2">
                            <VolumeBadge level={s.searchVolume} />
                          </td>
                          <td className="px-3 py-2">
                            <CompetitionBadge level={s.competition} />
                          </td>
                          <td className="px-3 py-2 text-slate-500">{s.intent}</td>
                          <td className="px-3 py-2">
                            <PriorityBadge priority={s.priority} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addSelectedKeywords}
                  disabled={addingSuggestions || selectedSuggestions.size === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {addingSuggestions
                    ? "Adding..."
                    : `Add ${selectedSuggestions.size} Keywords to Tracking`}
                </button>
                <button
                  onClick={() => setSuggestions([])}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
                >
                  Research Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Keywords</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{keywords.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Clicks</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalClicks}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Impressions</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalImpressions.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Avg Position</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {avgPosition ? avgPosition.toFixed(1) : "-"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Improved / Declined</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            <span className="text-green-600">{improved}</span>
            {" / "}
            <span className="text-red-600">{declined}</span>
          </p>
        </div>
      </div>

      {/* Keywords table */}
      {keywords.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <Search className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No keywords tracked yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Add keywords manually or use Auto-Discover to import from Google Search Console.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
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
              <tbody className="divide-y divide-slate-100">
                {keywords.map((kw) => (
                  <tr key={kw.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{kw.keyword}</p>
                      {kw.pageUrl && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                          {kw.pageUrl}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-slate-900">
                        {kw.currentPosition !== null
                          ? kw.currentPosition.toFixed(1)
                          : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PositionChange change={kw.positionChange} />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                      {kw.currentClicks}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                      {kw.currentImpressions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-700">
                      {(kw.currentCtr * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MiniSparkline data={kw.history.map((h) => h.position)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(kw.id, kw.keyword)}
                        className="text-slate-400 hover:text-red-600"
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

function VolumeBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-slate-100 text-slate-600",
  };
  const cls = colors[level.toLowerCase()] || colors.medium;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {level}
    </span>
  );
}

function CompetitionBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-orange-100 text-orange-700",
    low: "bg-green-100 text-green-700",
  };
  const cls = colors[level.toLowerCase()] || colors.medium;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {level}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const colors: Record<number, string> = {
    1: "bg-purple-100 text-purple-700",
    2: "bg-blue-100 text-blue-700",
    3: "bg-slate-100 text-slate-600",
    4: "bg-slate-50 text-slate-400",
    5: "bg-slate-50 text-slate-400",
  };
  const cls = colors[priority] || colors[3];
  const labels: Record<number, string> = {
    1: "Top",
    2: "High",
    3: "Medium",
    4: "Low",
    5: "Low",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      P{priority} {labels[priority] || ""}
    </span>
  );
}

function PositionChange({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-slate-400">
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
  if (data.length < 2) return <span className="text-xs text-slate-300">-</span>;

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
