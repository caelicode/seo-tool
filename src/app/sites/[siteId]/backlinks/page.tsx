"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Link2,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Shield,
  ShieldOff,
  Globe,
} from "lucide-react";

interface Backlink {
  id: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string | null;
  isDoFollow: boolean;
  isLive: boolean;
  statusCode: number | null;
  firstSeen: string;
  lastChecked: string;
}

interface BacklinkStats {
  total: number;
  live: number;
  lost: number;
  doFollow: number;
  noFollow: number;
  uniqueDomains: number;
}

export default function BacklinksPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [stats, setStats] = useState<BacklinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceUrl, setSourceUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchBacklinks = async () => {
    try {
      const res = await fetch(`/api/backlinks?siteId=${siteId}`);
      if (res.ok) {
        const data = await res.json();
        setBacklinks(data.backlinks);
        setStats(data.stats);
      }
    } catch {
      setError("Failed to load backlinks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBacklinks();
  }, [siteId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl.trim()) return;

    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/backlinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, sourceUrl: sourceUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add backlink");
      }

      const data = await res.json();
      setSourceUrl("");
      setShowForm(false);
      fetchBacklinks();

      if (!data.verified) {
        setError("Backlink added, but no link to your site was found on that page.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add backlink");
    } finally {
      setAdding(false);
    }
  };

  const handleCheckAll = async () => {
    setChecking(true);
    setError(null);

    try {
      const res = await fetch("/api/backlinks/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });

      if (res.ok) {
        fetchBacklinks();
      }
    } catch {
      setError("Failed to check backlinks");
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/backlinks?id=${id}`, { method: "DELETE" });
      fetchBacklinks();
    } catch {
      setError("Failed to delete backlink");
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  return (
    <div>
      <Link
        href={`/sites/${siteId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Backlink Monitor</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track and verify external links pointing to your site.
          </p>
        </div>
        <div className="flex gap-2">
          {backlinks.length > 0 && (
            <button
              onClick={handleCheckAll}
              disabled={checking}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking..." : "Re-check All"}
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Add Backlink
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mb-6 rounded-xl border border-zinc-200 bg-white p-5"
        >
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Source URL (the page linking to your site)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/page-with-link"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {adding ? "Verifying..." : "Add & Verify"}
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            We will fetch the page and verify it contains a link to your site.
          </p>
        </form>
      )}

      {/* Stats cards */}
      {stats && stats.total > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat label="Total" value={stats.total} />
          <MiniStat label="Live" value={stats.live} color="green" />
          <MiniStat label="Lost" value={stats.lost} color="red" />
          <MiniStat label="DoFollow" value={stats.doFollow} color="green" />
          <MiniStat label="NoFollow" value={stats.noFollow} color="amber" />
          <MiniStat label="Unique Domains" value={stats.uniqueDomains} />
        </div>
      )}

      {/* Backlinks table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
        </div>
      ) : backlinks.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <Link2 className="mx-auto h-10 w-10 text-zinc-300" />
          <p className="mt-3 text-sm font-medium text-zinc-600">No backlinks tracked yet</p>
          <p className="mt-1 text-xs text-zinc-400">
            Add backlinks to monitor whether external sites are still linking to you.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Anchor Text</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">First Seen</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {backlinks.map((bl) => (
                <tr key={bl.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0 text-zinc-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-700">
                          {getDomain(bl.sourceUrl)}
                        </p>
                        <a
                          href={bl.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
                        >
                          View page <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {bl.anchorText || <span className="text-zinc-300">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {bl.isDoFollow ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Shield className="h-3 w-3" />
                        DoFollow
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <ShieldOff className="h-3 w-3" />
                        NoFollow
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {bl.isLive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Live
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        <XCircle className="h-3 w-3" />
                        Lost
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(bl.firstSeen).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(bl.id)}
                      className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete backlink"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "red" | "amber";
}) {
  const textColor =
    color === "green"
      ? "text-green-700"
      : color === "red"
      ? "text-red-700"
      : color === "amber"
      ? "text-amber-700"
      : "text-zinc-900";

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
