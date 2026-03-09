"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  PenTool,
  Sparkles,
  Lightbulb,
  FileText,
  Clock,
  BarChart3,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Trash2,
  Zap,
  Target,
  BookOpen,
} from "lucide-react";

interface ArticleIdea {
  targetKeyword: string;
  secondaryKeywords: string[];
  suggestedTitle: string;
  rationale: string;
  difficulty: "easy" | "medium" | "hard";
  contentType: string;
  estimatedWordCount: number;
}

interface Article {
  id: string;
  targetKeyword: string;
  secondaryKeywords: string[] | string;
  title: string;
  metaDescription: string | null;
  slug: string | null;
  outline: string[] | string | null;
  content: string;
  wordCount: number;
  readingTime: number;
  seoScore: number;
  status: string;
  provider: string;
  createdAt: string;
}

export default function ContentEnginePage() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [activeTab, setActiveTab] = useState<"generate" | "ideas" | "library">("generate");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [provider, setProvider] = useState("openai");
  const [tone, setTone] = useState("professional");
  const [contentType, setContentType] = useState("blog post");
  const [generating, setGenerating] = useState(false);
  const [generatingIdeas, setGeneratingIdeas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [ideas, setIdeas] = useState<ArticleIdea[]>([]);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newArticle, setNewArticle] = useState<Article | null>(null);

  // Load existing articles
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch(`/api/content-engine?siteId=${siteId}`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles || []);
        }
      } catch {
        // Non-critical
      }
    };
    fetchArticles();
  }, [siteId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetKeyword.trim()) return;

    setGenerating(true);
    setError(null);
    setNewArticle(null);

    try {
      const res = await fetch("/api/content-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          targetKeyword: targetKeyword.trim(),
          secondaryKeywords: secondaryKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          provider,
          tone,
          contentType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      setNewArticle(data.article);

      // Refresh article list
      const listRes = await fetch(`/api/content-engine?siteId=${siteId}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        setArticles(listData.articles || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleGetIdeas = async () => {
    setGeneratingIdeas(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/content-engine?siteId=${siteId}&action=ideas&provider=${provider}`
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate ideas");
      }

      const data = await res.json();
      setIdeas(data.ideas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate ideas");
    } finally {
      setGeneratingIdeas(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this article?")) return;

    try {
      await fetch("/api/content-engine", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // Silently fail
    }
  };

  const handleUseIdea = (idea: ArticleIdea) => {
    setTargetKeyword(idea.targetKeyword);
    setSecondaryKeywords(idea.secondaryKeywords.join(", "));
    setContentType(idea.contentType);
    setActiveTab("generate");
  };

  const copyContent = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parseJsonField = (field: string[] | string | null): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  };

  const scoreColor = (score: number) =>
    score >= 70
      ? "text-emerald-600 bg-emerald-50 ring-emerald-200"
      : score >= 40
        ? "text-amber-600 bg-amber-50 ring-amber-200"
        : "text-red-600 bg-red-50 ring-red-200";

  const difficultyColor = (d: string) =>
    d === "easy"
      ? "bg-emerald-50 text-emerald-700"
      : d === "medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  const statusColor = (s: string) =>
    s === "published"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : s === "review"
        ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
        : s === "archived"
          ? "bg-slate-50 text-slate-500 ring-1 ring-slate-200"
          : "bg-violet-50 text-violet-700 ring-1 ring-violet-200";

  return (
    <div>
      <Link
        href={`/sites/${siteId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to site
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-md shadow-rose-500/20">
            <PenTool className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Content Engine</h1>
            <p className="text-sm text-slate-500">
              AI-powered article generation targeting your ranking keywords.
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100/80 p-1">
        {[
          { id: "generate" as const, label: "Generate Article", icon: Sparkles },
          { id: "ideas" as const, label: "Get Ideas", icon: Lightbulb },
          { id: "library" as const, label: "Article Library", icon: BookOpen },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.id === "library" && articles.length > 0 && (
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {articles.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <div className="space-y-6">
          <form
            onSubmit={handleGenerate}
            className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Article Configuration
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Target Keyword *
                </label>
                <input
                  type="text"
                  value={targetKeyword}
                  onChange={(e) => setTargetKeyword(e.target.value)}
                  placeholder='e.g., "best hair salon near me"'
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Secondary Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={secondaryKeywords}
                  onChange={(e) => setSecondaryKeywords(e.target.value)}
                  placeholder='e.g., "hair styling, haircut, salon services"'
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  AI Model
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="openai">GPT-4.1 mini (OpenAI)</option>
                  <option value="anthropic">Claude (Anthropic)</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="blog post">Blog Post</option>
                  <option value="how-to guide">How-To Guide</option>
                  <option value="listicle">Listicle</option>
                  <option value="comparison">Comparison</option>
                  <option value="case study">Case Study</option>
                  <option value="pillar page">Pillar Page</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  Writing Tone
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="professional">Professional</option>
                  <option value="conversational">Conversational</option>
                  <option value="authoritative">Authoritative</option>
                  <option value="friendly">Friendly</option>
                  <option value="technical">Technical</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-rose-500/20 transition-all hover:shadow-lg hover:shadow-rose-500/30 disabled:opacity-50 sm:w-auto"
            >
              <Sparkles className={`h-4 w-4 ${generating ? "animate-pulse" : ""}`} />
              {generating ? "Generating Article..." : "Generate Article"}
            </button>
          </form>

          {/* Generation loading state */}
          {generating && (
            <div className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100">
                  <PenTool className="h-6 w-6 animate-pulse text-rose-600" />
                </div>
                <div>
                  <p className="font-medium text-rose-800">
                    Writing your article...
                  </p>
                  <p className="text-sm text-rose-600">
                    Researching keyword context, structuring content, and optimizing for SEO. This may take 30-60 seconds.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* New article result */}
          {newArticle && (
            <ArticlePreview
              article={newArticle}
              parseJsonField={parseJsonField}
              scoreColor={scoreColor}
              copyContent={copyContent}
              copiedId={copiedId}
            />
          )}
        </div>
      )}

      {/* Ideas Tab */}
      {activeTab === "ideas" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                AI Article Ideas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Get topic suggestions based on your tracked keywords and ranking data.
              </p>
            </div>
            <button
              onClick={handleGetIdeas}
              disabled={generatingIdeas}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/20 transition-all hover:shadow-lg disabled:opacity-50"
            >
              <Lightbulb className={`h-4 w-4 ${generatingIdeas ? "animate-pulse" : ""}`} />
              {generatingIdeas ? "Thinking..." : "Generate Ideas"}
            </button>
          </div>

          {ideas.length > 0 && (
            <div className="space-y-3">
              {ideas.map((idea, i) => (
                <div
                  key={i}
                  className="card-hover rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {idea.suggestedTitle}
                        </h3>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${difficultyColor(idea.difficulty)}`}
                        >
                          {idea.difficulty}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {idea.contentType}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-500">{idea.rationale}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                          <Target className="h-3 w-3" />
                          {idea.targetKeyword}
                        </span>
                        {idea.secondaryKeywords.slice(0, 3).map((kw, j) => (
                          <span
                            key={j}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500"
                          >
                            {kw}
                          </span>
                        ))}
                        <span className="text-xs text-slate-400">
                          ~{idea.estimatedWordCount} words
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUseIdea(idea)}
                      className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Zap className="inline h-3 w-3" /> Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {ideas.length === 0 && !generatingIdeas && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <Lightbulb className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-400">
                Click &quot;Generate Ideas&quot; to get AI-powered article suggestions based on your keyword data.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Library Tab */}
      {activeTab === "library" && (
        <div className="space-y-4">
          {articles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-400">
                No articles generated yet. Switch to the Generate tab to create your first article.
              </p>
            </div>
          ) : (
            articles.map((article) => (
              <div
                key={article.id}
                className="rounded-2xl border border-slate-200/60 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {article.title}
                        </h3>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColor(article.status)}`}
                        >
                          {article.status}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {article.targetKeyword}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {article.wordCount} words
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.readingTime} min read
                        </span>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${scoreColor(article.seoScore)}`}
                        >
                          SEO: {article.seoScore}
                        </span>
                        <span className="text-slate-300">
                          {new Date(article.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setExpandedArticle(
                            expandedArticle === article.id ? null : article.id
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        {expandedArticle === article.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {expandedArticle === article.id && (
                  <div className="border-t border-slate-100 p-5">
                    {article.metaDescription && (
                      <div className="mb-4 rounded-xl bg-slate-50 p-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                          Meta Description
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {article.metaDescription}
                        </p>
                      </div>
                    )}

                    <div className="relative">
                      <div className="max-h-96 overflow-auto rounded-xl bg-slate-900 p-5">
                        <pre className="whitespace-pre-wrap text-xs leading-relaxed text-slate-200">
                          {article.content}
                        </pre>
                      </div>
                      <button
                        onClick={() => copyContent(article.content, article.id)}
                        className="absolute right-3 top-3 rounded-lg bg-slate-700 p-2 text-slate-300 transition-colors hover:bg-slate-600 hover:text-white"
                        title="Copy article"
                      >
                        {copiedId === article.id ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Article preview component for newly generated articles
function ArticlePreview({
  article,
  parseJsonField,
  scoreColor,
  copyContent,
  copiedId,
}: {
  article: Article;
  parseJsonField: (f: string[] | string | null) => string[];
  scoreColor: (s: number) => string;
  copyContent: (text: string, id: string) => void;
  copiedId: string | null;
}) {
  const outline = parseJsonField(article.outline);

  return (
    <div className="space-y-4">
      {/* Article overview card */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <span className={`text-xl font-bold ${scoreColor(article.seoScore).split(" ")[0]}`}>
              {article.seoScore}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{article.title}</h2>
            {article.metaDescription && (
              <p className="mt-1 text-sm text-slate-600">{article.metaDescription}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-xs font-medium text-slate-600">
                <FileText className="h-3 w-3" />
                {article.wordCount} words
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-xs font-medium text-slate-600">
                <Clock className="h-3 w-3" />
                {article.readingTime} min read
              </span>
              {article.slug && (
                <span className="flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-xs text-slate-500">
                  /{article.slug}
                </span>
              )}
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                {article.provider === "openai" ? "GPT-4.1 mini" : "Claude"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Outline */}
      {outline.length > 0 && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Article Outline
          </h3>
          <div className="space-y-1.5">
            {outline.map((section, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold text-slate-500">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700">{section}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full content */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Full Article Content
          </h3>
          <button
            onClick={() => copyContent(article.content, "new-" + article.id)}
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
          >
            {copiedId === "new-" + article.id ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy Markdown
              </>
            )}
          </button>
        </div>
        <div className="max-h-[500px] overflow-auto p-5">
          <div className="prose prose-sm prose-slate max-w-none">
            <pre className="whitespace-pre-wrap rounded-none border-none bg-transparent p-0 text-sm leading-relaxed text-slate-700">
              {article.content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
