import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import { crawlPage } from "@/lib/crawler";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// POST /api/competitors/analyze - Run AI analysis comparing your site vs competitor
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const body = await req.json();
  if (!body.competitorId) {
    return NextResponse.json(
      { error: "competitorId is required" },
      { status: 400 }
    );
  }

  const provider = body.provider || "openai";

  try {
    const competitor = await prisma.competitor.findUnique({
      where: { id: body.competitorId },
      include: {
        site: {
          include: {
            keywords: {
              include: {
                rankings: { orderBy: { date: "desc" }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!competitor) {
      return NextResponse.json(
        { error: "Competitor not found" },
        { status: 404 }
      );
    }

    // Crawl both sites (homepage)
    const [yourSite, competitorSite] = await Promise.all([
      crawlPage(`https://${competitor.site.domain}`),
      crawlPage(`https://${competitor.domain}`),
    ]);

    // Build comparison context
    const yourKeywords = competitor.site.keywords.map((k) => ({
      keyword: k.keyword,
      position: k.rankings[0]?.position || null,
      clicks: k.rankings[0]?.clicks || 0,
    }));

    const prompt = `You are an expert SEO competitive analyst. Compare these two websites and provide a detailed competitive analysis.

YOUR SITE: ${competitor.site.domain}
- Title: ${yourSite.title || "None"}
- Description: ${yourSite.description || "None"}
- H1: ${yourSite.h1 || "None"}
- Issues found: ${yourSite.issues.length} (${yourSite.issues.map((i) => i.type).join(", ") || "none"})
- Internal links: ${yourSite.links.length}
- Tracked keywords: ${JSON.stringify(yourKeywords.slice(0, 15))}

COMPETITOR: ${competitor.domain}
- Title: ${competitorSite.title || "None"}
- Description: ${competitorSite.description || "None"}
- H1: ${competitorSite.h1 || "None"}
- Issues found: ${competitorSite.issues.length} (${competitorSite.issues.map((i) => i.type).join(", ") || "none"})
- Internal links: ${competitorSite.links.length}

Provide your analysis as JSON with this structure:
{
  "overallComparison": "brief summary of how you compare",
  "yourStrengths": ["strength 1", "strength 2", ...],
  "competitorStrengths": ["strength 1", "strength 2", ...],
  "opportunities": ["opportunity 1", "opportunity 2", ...],
  "contentGaps": ["topics/keywords competitor targets that you don't", ...],
  "technicalComparison": {
    "yourScore": number (1-10),
    "competitorScore": number (1-10),
    "details": "explanation"
  },
  "actionItems": [
    { "priority": "high" | "medium" | "low", "action": "what to do", "impact": "expected impact" }
  ],
  "keywordOpportunities": ["keywords your competitor likely ranks for that you should target"]
}`;

    let responseText: string;

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 400 });
      }
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        max_tokens: 3000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are an expert SEO analyst. Always respond in valid JSON." },
          { role: "user", content: prompt },
        ],
      });
      responseText = response.choices[0]?.message?.content || "";
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 400 });
      }
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      });
      const textBlock = response.content.find((b) => b.type === "text");
      responseText = textBlock && textBlock.type === "text" ? textBlock.text : "";
    }

    // Parse response
    let analysisData;
    try {
      let jsonStr = responseText.trim();
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
      analysisData = JSON.parse(jsonStr);
    } catch {
      analysisData = { overallComparison: responseText, error: "Failed to parse structured analysis" };
    }

    // Save analysis
    const analysis = await prisma.competitorAnalysis.create({
      data: {
        competitorId: competitor.id,
        type: "seo_overview",
        data: JSON.stringify(analysisData),
        provider,
      },
    });

    return NextResponse.json({
      id: analysis.id,
      provider,
      analysis: analysisData,
    });
  } catch (error) {
    console.error("Competitor analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}
