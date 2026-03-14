import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const STRATEGY_PROMPT = `You are an elite SEO strategist. Based on the website data, competitor info, keyword rankings, and crawl data provided, create a comprehensive SEO strategy.

Your strategy must include:

1. **Executive Summary**: 2-3 sentences on the site's current SEO state and biggest opportunities.

2. **Competitive Analysis**: Who are the top 3-5 competitors in this niche/location? What are they doing well?

3. **Keyword Strategy**: Organize keywords into clusters/themes. Identify:
   - Quick wins (keywords close to page 1 that need a small push)
   - High-value targets (competitive but worth pursuing long-term)
   - Long-tail opportunities (low competition, easy to rank)

4. **Content Calendar**: Plan 20 articles over the next 30 days. Each article should:
   - Target a specific primary keyword
   - Include 3-5 secondary keywords
   - Have a suggested title
   - Specify content type (blog post, guide, listicle, FAQ, comparison)
   - Estimated word count (1500-2000)
   - Priority order (which to publish first)

5. **Technical SEO Fixes**: Based on crawl data, list the most impactful technical fixes.

6. **On-Page Optimization**: Pages that need meta tag updates, content improvements, or schema markup.

7. **Backlink Strategy**: Outreach targets, guest post opportunities, local directories to list in.

Return JSON:
{
  "executiveSummary": string,
  "competitors": [{ "domain": string, "strengths": string[], "weaknesses": string[] }],
  "keywordClusters": [
    {
      "theme": string,
      "keywords": [{ "keyword": string, "type": "quick_win" | "high_value" | "long_tail", "currentPosition": number | null, "suggestedAction": string }]
    }
  ],
  "contentCalendar": [
    {
      "day": number,
      "primaryKeyword": string,
      "secondaryKeywords": string[],
      "title": string,
      "contentType": string,
      "wordCount": number,
      "priority": number,
      "brief": string
    }
  ],
  "technicalFixes": [{ "issue": string, "impact": "high" | "medium" | "low", "fix": string }],
  "onPageOptimizations": [{ "page": string, "improvements": string[] }],
  "backlinkStrategy": {
    "targets": string[],
    "localDirectories": string[],
    "guestPostIdeas": string[]
  },
  "projectedTimeline": {
    "week1": string,
    "week2": string,
    "week3": string,
    "week4": string,
    "month3": string,
    "month6": string
  }
}`;

/**
 * POST /api/seo-strategy - Generate a full SEO strategy for a site.
 * Body: { siteId, provider? }
 */
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { siteId, provider = "openai" } = body;

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    // Gather all available data about the site
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        pages: {
          take: 30,
          select: { url: true, title: true, description: true, h1: true, statusCode: true },
        },
        keywords: {
          take: 50,
          include: {
            rankings: { take: 1, orderBy: { date: "desc" } },
          },
        },
        competitors: {
          take: 10,
          include: {
            analyses: { take: 1, orderBy: { createdAt: "desc" } },
          },
        },
        crawls: {
          take: 1,
          orderBy: { startedAt: "desc" },
          include: {
            issues: {
              take: 30,
              include: { page: { select: { url: true } } },
            },
          },
        },
        speedTests: {
          take: 2,
          orderBy: { createdAt: "desc" },
        },
        backlinks: {
          take: 20,
          where: { isLive: true },
        },
        sitemapChecks: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        contentArticles: {
          select: { targetKeyword: true, title: true },
        },
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const context = `
WEBSITE DATA:
Domain: ${site.domain}
Name: ${site.name}
Total Crawled Pages: ${site.pages.length}
Total Tracked Keywords: ${site.keywords.length}
Total Backlinks: ${site.backlinks.length}
Articles Already Written: ${site.contentArticles.length}

PAGES (${site.pages.length}):
${site.pages.map((p) => `- ${p.url} | Title: "${p.title || "MISSING"}" | Description: "${p.description || "MISSING"}" | H1: "${p.h1 || "MISSING"}" | Status: ${p.statusCode}`).join("\n")}

KEYWORD RANKINGS (${site.keywords.length}):
${site.keywords.map((k) => {
  const rank = k.rankings[0];
  return `- "${k.keyword}" | Position: ${rank ? rank.position : "Not ranked"} | Clicks: ${rank ? rank.clicks : 0} | Impressions: ${rank ? rank.impressions : 0} | Page: ${k.pageUrl || "N/A"}`;
}).join("\n")}

COMPETITORS:
${site.competitors.map((c) => {
  const analysis = c.analyses[0];
  return `- ${c.domain} (${c.name}) ${analysis ? `| Analysis: ${analysis.data.substring(0, 200)}...` : ""}`;
}).join("\n") || "None tracked yet"}

LATEST CRAWL ISSUES:
${site.crawls[0]?.issues?.map((i) => `- [${i.severity}] ${i.type}: ${i.detail} (${i.page?.url})`).join("\n") || "No crawl data"}

SPEED TEST:
${site.speedTests.map((s) => `- ${s.strategy}: Performance ${s.performanceScore}% | LCP: ${s.lcp}ms | CLS: ${s.cls}`).join("\n") || "No speed tests"}

LIVE BACKLINKS (${site.backlinks.length}):
${site.backlinks.slice(0, 10).map((b) => `- ${b.sourceUrl} -> ${b.targetUrl} (${b.isDoFollow ? "DoFollow" : "NoFollow"})`).join("\n") || "None"}

ARTICLES ALREADY WRITTEN:
${site.contentArticles.map((a) => `- "${a.title}" targeting "${a.targetKeyword}"`).join("\n") || "None yet"}
`;

    let aiResult: Record<string, unknown> = {};

    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        max_tokens: 10000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: STRATEGY_PROMPT },
          { role: "user", content: context },
        ],
      });

      const text = completion.choices[0]?.message?.content;
      if (text) {
        try {
          aiResult = JSON.parse(text);
        } catch {
          aiResult = { error: "Failed to parse AI response" };
        }
      }
    } else if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10000,
        messages: [
          { role: "user", content: `${STRATEGY_PROMPT}\n\n${context}` },
        ],
      });

      const textBlock = msg.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        let jsonStr = textBlock.text.trim();
        const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeMatch) jsonStr = codeMatch[1].trim();
        try {
          aiResult = JSON.parse(jsonStr);
        } catch {
          aiResult = { error: "Failed to parse AI response" };
        }
      }
    } else {
      return NextResponse.json(
        { error: "No AI provider configured." },
        { status: 400 }
      );
    }

    return NextResponse.json(aiResult);
  } catch (error) {
    console.error("SEO strategy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate strategy" },
      { status: 500 }
    );
  }
}
