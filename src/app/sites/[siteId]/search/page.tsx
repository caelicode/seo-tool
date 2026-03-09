"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Loader2,
  MousePointerClick,
  Eye,
  ArrowUpDown,
  Percent,
  Link2,
} from "lucide-react";

interface SearchData {
  connected: boolean;
  totals: {
    clicks: number;
    impressions: number;
    avgPosition: number;
    avgCtr: number;
  };
  topQueries: {
    query: string;
    clicks: number;
    impressions: number;
    avgPosition: number;
    avgCtr: number;
  }[];
  dateTrend: {
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }[];
}

export default function SearchConsolePage() {
  const params = useParams();
  const siteId = params.siteId as string;
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [gscConfigured, setGscConfigured] = useState(false);
  const [gscProperties, setGscProperties] = useState<{ siteUrl: string; permissionLevel: string }[]>([]);
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);
  const [currentGscProperty, setCurrentGscProperty] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch site info
      const siteRes = await fetch(`/api/sites/${siteId}`);
      if (siteRes.ok) {
        const site = await siteRes.json();
        setSiteName(site.name);
        setGscConfigured(!!site.gscPropertyId);
        setCurrentGscProperty(site.gscPropertyId || null);
      }

      // Fetch search analytics
      const res = await fetch(`/api/gsc/sync?siteId=${siteId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const connectGsc = async () => {
    try {
      const res = await fetch("/api/gsc/auth");
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const err = await res.json();
        alert(err.error || "Failed to get auth URL");
      }
    } catch (err) {
      console.error(err);
      alert("Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env");
    }
  };

  const syncData = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/gsc/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Sync failed");
        return;
      }

      const result = await res.json();
      alert(`Synced ${result.synced} records from ${result.startDate} to ${result.endDate}`);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const fetchGscProperties = async () => {
    try {
      const res = await fetch("/api/gsc/sites");
      if (res.ok) {
        const data = await res.json();
        setGscProperties(data.sites || []);
        setShowPropertyPicker(true);
      } else {
        alert("Could not fetch GSC properties. Make sure you are connected to GSC first.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectProperty = async (siteUrl: string) => {
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gscPropertyId: siteUrl }),
      });
      if (res.ok) {
        setCurrentGscProperty(siteUrl);
        setGscConfigured(true);
        setShowPropertyPicker(false);
        await fetchData();
      } else {
        alert("Failed to update GSC property");
      }
    } catch (err) {
      console.error(err);
    }
  };

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
          <h1 className="text-2xl font-bold text-slate-900">
            Search Console
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search performance and indexing data from Google
          </p>
        </div>
        <div className="flex gap-2">
          {!data?.connected && (
            <button
              onClick={connectGsc}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Link2 className="h-4 w-4" />
              Connect GSC
            </button>
          )}
          {data?.connected && gscConfigured && (
            <button
              onClick={syncData}
              disabled={syncing}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync Data
            </button>
          )}
        </div>
      </div>

      {/* Connection status */}
      {!data?.connected && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            Google Search Console not connected
          </p>
          <p className="mt-1 text-sm text-amber-600">
            Connect your Google account to pull search analytics data.
            You need to set up Google OAuth credentials first (see setup guide below).
          </p>
          <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-600">
            <p className="font-medium">Setup steps:</p>
            <ol className="mt-1 list-inside list-decimal space-y-1">
              <li>Go to Google Cloud Console and create a project</li>
              <li>Enable the Search Console API</li>
              <li>Create OAuth 2.0 credentials (Web application type)</li>
              <li>Set redirect URI to: <code className="rounded bg-slate-100 px-1">http://localhost:3000/api/gsc/callback</code></li>
              <li>Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file</li>
              <li>Restart the dev server and click Connect GSC</li>
            </ol>
          </div>
        </div>
      )}

      {(!gscConfigured || showPropertyPicker) && data?.connected && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-800">
            {gscConfigured ? "Change GSC Property" : "Select GSC Property"}
          </p>
          <p className="mt-1 text-sm text-blue-600">
            {currentGscProperty
              ? `Currently set to: ${currentGscProperty}`
              : "Pick the property that matches this site from your Google Search Console account."}
          </p>
          {!showPropertyPicker && (
            <button
              onClick={fetchGscProperties}
              className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Choose from GSC Properties
            </button>
          )}
          {showPropertyPicker && gscProperties.length > 0 && (
            <div className="mt-3 space-y-2">
              {gscProperties.map((prop) => (
                <button
                  key={prop.siteUrl}
                  onClick={() => selectProperty(prop.siteUrl)}
                  className={`block w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                    prop.siteUrl === currentGscProperty
                      ? "border-blue-500 bg-blue-100 font-medium text-blue-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                >
                  <span className="font-medium">{prop.siteUrl}</span>
                  <span className="ml-2 text-xs text-slate-400">({prop.permissionLevel})</span>
                </button>
              ))}
              <button
                onClick={() => setShowPropertyPicker(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          )}
          {showPropertyPicker && gscProperties.length === 0 && (
            <p className="mt-2 text-sm text-amber-600">
              No properties found. Make sure you have sites added in Google Search Console.
            </p>
          )}
        </div>
      )}

      {gscConfigured && !showPropertyPicker && data?.connected && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-slate-400">
            GSC Property: <span className="font-medium text-slate-600">{currentGscProperty}</span>
          </span>
          <button
            onClick={fetchGscProperties}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Change
          </button>
        </div>
      )}

      {/* Stats cards */}
      {data && (data.totals.clicks > 0 || data.totals.impressions > 0) && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              icon={MousePointerClick}
              label="Total Clicks"
              value={data.totals.clicks.toLocaleString()}
            />
            <StatCard
              icon={Eye}
              label="Impressions"
              value={data.totals.impressions.toLocaleString()}
            />
            <StatCard
              icon={ArrowUpDown}
              label="Avg Position"
              value={data.totals.avgPosition.toString()}
            />
            <StatCard
              icon={Percent}
              label="Avg CTR"
              value={`${data.totals.avgCtr}%`}
            />
          </div>

          {/* Date trend (simple table since no chart library yet) */}
          {data.dateTrend.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Performance Trend (Last 28 Days)
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Clicks</th>
                        <th className="px-4 py-3 text-right">Impressions</th>
                        <th className="px-4 py-3 text-right">CTR</th>
                        <th className="px-4 py-3 text-right">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.dateTrend.map((row) => (
                        <tr key={row.date} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm text-slate-700">
                            {row.date}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-slate-900">
                            {row.clicks}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-slate-600">
                            {row.impressions}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-slate-600">
                            {(row.ctr * 100).toFixed(1)}%
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-slate-600">
                            {row.position.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Top queries */}
          {data.topQueries.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-slate-900">
                Top Search Queries
              </h2>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Query</th>
                      <th className="px-4 py-3 text-right">Clicks</th>
                      <th className="px-4 py-3 text-right">Impressions</th>
                      <th className="px-4 py-3 text-right">Avg Position</th>
                      <th className="px-4 py-3 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.topQueries.map((q) => (
                      <tr key={q.query} className="hover:bg-slate-50">
                        <td className="max-w-xs truncate px-4 py-3 text-sm font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <Search className="h-3.5 w-3.5 text-slate-400" />
                            {q.query}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                          {q.clicks}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {q.impressions}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {q.avgPosition}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-600">
                          {q.avgCtr}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state when connected but no data */}
      {data?.connected && gscConfigured && data.totals.clicks === 0 && data.totals.impressions === 0 && (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200">
          <Search className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">
            No search data yet. Click &quot;Sync Data&quot; to pull from GSC.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
