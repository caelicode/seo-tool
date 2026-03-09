"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe,
  ExternalLink,
  MoreVertical,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { AddSiteDialog } from "@/components/add-site-dialog";
import type { SiteWithStats, SiteFormData } from "@/lib/types";

export default function SitesPage() {
  const [sites, setSites] = useState<SiteWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchSites = async () => {
    try {
      const res = await fetch("/api/sites");
      if (!res.ok) throw new Error("Failed to fetch");
      setSites(await res.json());
    } catch (err) {
      console.error(err);
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this site and all related data?")) return;
    try {
      await fetch(`/api/sites/${id}`, { method: "DELETE" });
      setSites((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
    setMenuOpen(null);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">All Sites</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your monitored websites
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Add Site
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
        </div>
      ) : sites.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-zinc-200 p-12 text-center">
          <Globe className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm text-zinc-500">No sites added yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Pages</th>
                <th className="px-4 py-3">Crawls</th>
                <th className="px-4 py-3">Keywords</th>
                <th className="px-4 py-3">Last Crawl</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sites.map((site) => (
                <tr key={site.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/sites/${site.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">
                        <Globe className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {site.name}
                        </p>
                        <p className="text-xs text-zinc-500">{site.domain}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {site._count.pages}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {site._count.crawls}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {site._count.keywords}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {site.crawls[0]
                      ? new Date(site.crawls[0].startedAt).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="relative px-4 py-3 text-right">
                    <button
                      onClick={() =>
                        setMenuOpen(menuOpen === site.id ? null : site.id)
                      }
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen === site.id && (
                      <div className="absolute right-4 top-full z-10 mt-1 w-40 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                        <Link
                          href={`/sites/${site.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                          onClick={() => setMenuOpen(null)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          View Details
                        </Link>
                        <a
                          href={`https://${site.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                          onClick={() => setMenuOpen(null)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Visit Site
                        </a>
                        <button
                          onClick={() => handleDelete(site.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
