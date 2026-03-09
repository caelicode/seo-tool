"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Users,
  Loader2,
  Sparkles,
  X,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
  ExternalLink,
} from "lucide-react";

interface Competitor {
  id: string;
  domain: string;
  name: string;
  notes: string | null;
  createdAt: string;
  analyses: {
    id: string;
    type: string;
    data: string;
    provider: string;
    createdAt: string;
  }[];
}

interface AnalysisData {
  overallComparison?: string;
  yourStrengths?: string[];
  competitorStrengths?: string[];
  opportunities?: string[];
  contentGaps?: string[];
  technicalComparison?: {
    yourScore: number;
    competitorScore: number;
    details: string;
  };
  actionItems?: {
    priority: string;
    action: string;
    impact: string;
  }[];
  keywordOpportunities?: string[];
}

export default function CompetitorsPage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisData>>({});

  const fetchCompetitors = useCallback(async () => {
    try {
      const res = await fetch(`/api/competitors?siteId=${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch competitors");
      setCompetitors(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          domain: newDomain.trim(),
          name: newName.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add competitor");
      }
      setNewDomain("");
      setNewName("");
      setShowAddForm(false);
      await fetchCompetitors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, domain: string) => {
    if (!confirm(`Remove ${domain} from competitors?`)) return;
    try {
      await fetch(`/api/competitors?id=${id}`, { method: "DELETE" });
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Failed to delete competitor");
    }
  };

  const handleAnalyze = async (competitorId: string) => {
    setAnalyzing(competitorId);
    setError(null);
    try {
      const res = await fetch("/api/competitors/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }
      const data = await res.json();
      setAnalysisResults((prev) => ({ ...prev, [competitorId]: data.analysis }));
      setExpandedAnalysis(competitorId);
      await fetchCompetitors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(null);
    }
  };

  const toggleAnalysis = (competitorId: string) => {
    if (expandedAnalysis === competitorId) {
      setExpandedAnalysis(null);
    } else {
      setExpandedAnalysis(competitorId);
      // Load cached analysis if available
      const comp = competitors.find((c) => c.id === competitorId);
      if (comp?.analyses[0] && !analysisResults[competitorId]) {
        try {
          const data = JSON.parse(comp.analyses[0].data);
          setAnalysisResults((prev) => ({ ...prev, [competitorId]: data }));
        } catch {
          // Will need fresh analysis
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold text-zinc-900">Competitor Tracking</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track competitors and get AI-powered competitive analysis.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Add Competitor
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add competitor form */}
      {showAddForm && (
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
          <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Competitor Domain *
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="e.g. competitor-salon.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                required
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Competitor Salon"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={adding}
                className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Competitors list */}
      {competitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16">
          <Users className="mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-600">No competitors tracked yet</p>
          <p className="mt-1 text-sm text-zinc-400">
            Add competitor websites to compare SEO performance.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {competitors.map((comp) => {
            const analysis = analysisResults[comp.id];
            const hasAnalysis = analysis || comp.analyses.length > 0;
            const isExpanded = expandedAnalysis === comp.id;

            return (
              <div
                key={comp.id}
                className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
              >
                {/* Competitor header */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                      <Users className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{comp.name}</p>
                      <a
                        href={`https://${comp.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        {comp.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasAnalysis && (
                      <button
                        onClick={() => toggleAnalysis(comp.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        View Analysis
                      </button>
                    )}
                    <button
                      onClick={() => handleAnalyze(comp.id)}
                      disabled={analyzing === comp.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                    >
                      {analyzing === comp.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {analyzing === comp.id ? "Analyzing..." : "Analyze"}
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id, comp.domain)}
                      className="text-zinc-400 hover:text-red-600"
                      title="Remove competitor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded analysis */}
                {isExpanded && analysis && (
                  <div className="border-t border-zinc-100 px-5 py-5">
                    {/* Overview */}
                    {analysis.overallComparison && (
                      <p className="mb-4 text-sm text-zinc-600">
                        {analysis.overallComparison}
                      </p>
                    )}

                    {/* Technical comparison */}
                    {analysis.technicalComparison && (
                      <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-800">
                          Technical SEO Comparison
                        </h4>
                        <div className="flex gap-8">
                          <div>
                            <p className="text-xs text-zinc-500">Your Site</p>
                            <p className="text-2xl font-bold text-zinc-900">
                              {analysis.technicalComparison.yourScore}/10
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Competitor</p>
                            <p className="text-2xl font-bold text-zinc-900">
                              {analysis.technicalComparison.competitorScore}/10
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">
                          {analysis.technicalComparison.details}
                        </p>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Your strengths */}
                      {analysis.yourStrengths && analysis.yourStrengths.length > 0 && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                          <div className="mb-2 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-700" />
                            <h4 className="text-sm font-semibold text-green-800">Your Strengths</h4>
                          </div>
                          <ul className="space-y-1">
                            {analysis.yourStrengths.map((s, i) => (
                              <li key={i} className="text-xs text-green-700">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Competitor strengths */}
                      {analysis.competitorStrengths && analysis.competitorStrengths.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                          <div className="mb-2 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 text-red-700" />
                            <h4 className="text-sm font-semibold text-red-800">Their Strengths</h4>
                          </div>
                          <ul className="space-y-1">
                            {analysis.competitorStrengths.map((s, i) => (
                              <li key={i} className="text-xs text-red-700">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Opportunities */}
                      {analysis.opportunities && analysis.opportunities.length > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                          <div className="mb-2 flex items-center gap-1">
                            <Lightbulb className="h-4 w-4 text-amber-700" />
                            <h4 className="text-sm font-semibold text-amber-800">Opportunities</h4>
                          </div>
                          <ul className="space-y-1">
                            {analysis.opportunities.map((s, i) => (
                              <li key={i} className="text-xs text-amber-700">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Keyword opportunities */}
                      {analysis.keywordOpportunities && analysis.keywordOpportunities.length > 0 && (
                        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                          <div className="mb-2 flex items-center gap-1">
                            <Target className="h-4 w-4 text-purple-700" />
                            <h4 className="text-sm font-semibold text-purple-800">Keyword Opportunities</h4>
                          </div>
                          <ul className="space-y-1">
                            {analysis.keywordOpportunities.map((s, i) => (
                              <li key={i} className="text-xs text-purple-700">{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action items */}
                    {analysis.actionItems && analysis.actionItems.length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-2 text-sm font-semibold text-zinc-800">Action Items</h4>
                        <div className="space-y-2">
                          {analysis.actionItems.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3"
                            >
                              <span
                                className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                  item.priority === "high"
                                    ? "bg-red-100 text-red-700"
                                    : item.priority === "medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-zinc-100 text-zinc-600"
                                }`}
                              >
                                {item.priority}
                              </span>
                              <div>
                                <p className="text-sm text-zinc-800">{item.action}</p>
                                <p className="text-xs text-zinc-500">{item.impact}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
