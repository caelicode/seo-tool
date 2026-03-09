"use client";

import { useState } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import type { SiteFormData } from "@/lib/types";

interface AddSiteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SiteFormData) => Promise<void>;
}

export function AddSiteDialog({ open, onClose, onSubmit }: AddSiteDialogProps) {
  const [formData, setFormData] = useState<SiteFormData>({
    name: "",
    domain: "",
    sitemapUrl: "",
    gscPropertyId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSubmit(formData);
      setFormData({ name: "", domain: "", sitemapUrl: "", gscPropertyId: "" });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add site");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Add New Site</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Site Name *
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="My Website"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label htmlFor="domain" className="mb-1.5 block text-sm font-medium text-slate-700">
              Domain *
            </label>
            <input
              id="domain"
              type="text"
              required
              placeholder="example.com"
              value={formData.domain}
              onChange={(e) => setFormData((prev) => ({ ...prev, domain: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Enter without protocol (e.g., example.com)
            </p>
          </div>

          <div>
            <label htmlFor="sitemapUrl" className="mb-1.5 block text-sm font-medium text-slate-700">
              Sitemap URL
            </label>
            <input
              id="sitemapUrl"
              type="url"
              placeholder="https://example.com/sitemap.xml"
              value={formData.sitemapUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, sitemapUrl: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label htmlFor="gscPropertyId" className="mb-1.5 block text-sm font-medium text-slate-700">
              Google Search Console Property
            </label>
            <input
              id="gscPropertyId"
              type="text"
              placeholder="sc-domain:example.com"
              value={formData.gscPropertyId}
              onChange={(e) => setFormData((prev) => ({ ...prev, gscPropertyId: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Usually sc-domain:yourdomain.com or https://yourdomain.com/
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Site
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
