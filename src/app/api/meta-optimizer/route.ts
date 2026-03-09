import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const META_OPTIMIZATION_PROMPT = `You are an expert SEO specialist. Analyze the following page data and generate optimized meta tags.

For each page, provide:
1. An optimized title tag (50-60 characters, includes primary keyword naturally)
2. An optimized meta description (150-160 characters, compelling with call to action)
3. A list of issues with the current meta tags
4. Priority score (1-10, where 10 is most urgent to fix)

Return JSON:
{
  "pages": [
    {
      "url": string,
      "currentTitle": string,
      "currentDescription": string,
      "optimizedTitle": string,
      "optimizedDescription": string,
      "issues": string[],
      "priorityScore": number,
      "reasoning": string
    }
  ],
  "summary": {
    "totalPages": number,
    "pagesNeedingFixes": number,
    "criticalIssues": number,
    "averageScore": number
  }
}`;

/**
 * GET /api/meta-optimizer?siteId=xxx - Get pages with meta tag analysis.
 */
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  try {
    const pages = await prisma.page.findMany({
      where: { siteId },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        url: true,
        title: true,
        description: true,
        h1: true,
        statusCode: true,
        lastCrawled: true,
      },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch pages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meta-optimizer - Run AI analysis on crawled pages to optimize meta tags.
 * Body: { siteId, provider?, pageIds? }
 */
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { siteId, provider = "openai", pageIds } = body;

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    // Get site info and pages
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        keywords: { take: 20, select: { keyword: true } },
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const whereClause: Record<string, unknown> = { siteId };
    if (pageIds && Array.isArray(pageIds) && pageIds.length > 0) {
      whereClause.id = { in: pageIds };
    }

    const pages = await prisma.page.findMany({
      where: whereClause,
      take: 30, // Limit to avoid token overflow
      select: {
        id: true,
        url: true,
        title: true,
        description: true,
        h1: true,
        statusCode: true,
      },
    });

    if (pages.length === 0) {
      return NextResponse.json(
        { error: "No crawled pages found. Run a site crawl first." },
        { status: 400 }
      );
    }

    const trackedKeywords = site.keywords.map((k) => k.keyword);

    const context = `
Site: ${site.name} (${site.domain})
Tracked Keywords: ${trackedKeywords.join(", ") || "None"}

Pages to Optimize:
${pages
  .map(
    (p) => `
URL: ${p.url}
Current Title: ${p.title || "(missing)"}
Current Description: ${p.description || "(missing)"}
H1: ${p.h1 || "(missing)"}
Status: ${p.statusCode || "unknown"}
`
  )
  .join("\n---\n")}
`;

    let aiResult: Record<string, unknown> = {};

    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: META_OPTIMIZATION_PROMPT },
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
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `${META_OPTIMIZATION_PROMPT}\n\n${context}`,
          },
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
        { error: "No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." },
        { status: 400 }
      );
    }

    return NextResponse.json(aiResult);
  } catch (error) {
    console.error("Meta optimizer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to optimize meta tags" },
      { status: 500 }
    );
  }
}
