import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Prompt for generating a full SEO-optimized article
const ARTICLE_GENERATION_PROMPT = `You are an expert SEO content writer. Generate a comprehensive, well-structured blog article optimized for search engines.

Requirements:
1. Target the primary keyword naturally (2-3% density, never forced)
2. Include secondary keywords where relevant
3. Write in a professional but engaging tone
4. Use proper heading hierarchy (H2, H3)
5. Include an introduction that hooks the reader
6. Add a conclusion with a call to action
7. Aim for 1200-1800 words
8. Write content that provides genuine value to readers
9. Include internal linking suggestions as [INTERNAL_LINK: anchor text](suggested-path)

Return JSON:
{
  "title": "SEO-optimized title (50-60 chars ideal)",
  "metaDescription": "Compelling meta description (150-160 chars)",
  "slug": "url-friendly-slug",
  "outline": ["H2 section titles as array"],
  "content": "Full article in markdown format",
  "seoScore": number (0-100 estimated SEO quality),
  "wordCount": number,
  "readingTime": number (minutes),
  "secondaryKeywordsUsed": ["keywords actually used in the article"]
}`;

// Prompt for generating article ideas based on keyword data
const IDEAS_PROMPT = `You are an SEO strategist. Based on the provided keyword data and site context, suggest 5 article ideas that would help this site rank higher.

For each idea, provide:
1. A target keyword (primary)
2. Secondary keywords to include
3. A suggested title
4. Why this topic has ranking potential
5. Estimated difficulty (easy, medium, hard)
6. Content type (how-to, listicle, guide, comparison, case-study)

Return JSON:
{
  "ideas": [
    {
      "targetKeyword": string,
      "secondaryKeywords": string[],
      "suggestedTitle": string,
      "rationale": string,
      "difficulty": "easy" | "medium" | "hard",
      "contentType": string,
      "estimatedWordCount": number
    }
  ]
}`;

/**
 * GET /api/content-engine?siteId=xxx - List generated articles for a site.
 * GET /api/content-engine?siteId=xxx&action=ideas - Get AI article ideas.
 */
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const siteId = req.nextUrl.searchParams.get("siteId");
  const action = req.nextUrl.searchParams.get("action");

  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  try {
    if (action === "ideas") {
      return await generateIdeas(siteId, req);
    }

    // Default: list articles
    const articles = await prisma.contentArticle.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ articles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content-engine - Generate a new article.
 * Body: { siteId, targetKeyword, secondaryKeywords?, provider?, tone?, contentType? }
 */
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const {
      siteId,
      targetKeyword,
      secondaryKeywords = [],
      provider = "openai",
      tone = "professional",
      contentType = "blog post",
    } = body;

    if (!siteId || !targetKeyword) {
      return NextResponse.json(
        { error: "siteId and targetKeyword are required" },
        { status: 400 }
      );
    }

    // Get site context
    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        keywords: { take: 20, orderBy: { createdAt: "desc" } },
        pages: { take: 10, select: { url: true, title: true } },
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const context = `
Site: ${site.name} (${site.domain})
Target Keyword: ${targetKeyword}
Secondary Keywords: ${secondaryKeywords.join(", ") || "None specified"}
Tone: ${tone}
Content Type: ${contentType}
Existing Pages (for internal linking): ${site.pages.map((p) => `${p.title || p.url} - ${p.url}`).join("\n")}
Tracked Keywords: ${site.keywords.map((k) => k.keyword).join(", ")}
`;

    let aiResult: Record<string, unknown> = {};

    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        max_tokens: 8000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: ARTICLE_GENERATION_PROMPT },
          { role: "user", content: context },
        ],
      });

      const text = completion.choices[0]?.message?.content;
      if (text) {
        try {
          aiResult = JSON.parse(text);
        } catch {
          aiResult = { error: "Failed to parse AI response", raw: text };
        }
      }
    } else if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: `${ARTICLE_GENERATION_PROMPT}\n\n${context}`,
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
          aiResult = { error: "Failed to parse AI response", raw: textBlock.text };
        }
      }
    } else {
      return NextResponse.json(
        { error: "No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." },
        { status: 400 }
      );
    }

    // Save article to database
    const article = await prisma.contentArticle.create({
      data: {
        siteId,
        targetKeyword,
        secondaryKeywords: JSON.stringify(secondaryKeywords),
        title: (aiResult.title as string) || `Article about ${targetKeyword}`,
        metaDescription: (aiResult.metaDescription as string) || null,
        slug: (aiResult.slug as string) || targetKeyword.toLowerCase().replace(/\s+/g, "-"),
        outline: aiResult.outline ? JSON.stringify(aiResult.outline) : null,
        content: (aiResult.content as string) || "",
        wordCount: (aiResult.wordCount as number) || 0,
        readingTime: (aiResult.readingTime as number) || 0,
        seoScore: (aiResult.seoScore as number) || 0,
        status: "draft",
        provider,
      },
    });

    return NextResponse.json({
      article: {
        ...article,
        secondaryKeywords: JSON.parse(article.secondaryKeywords || "[]"),
        outline: article.outline ? JSON.parse(article.outline) : [],
      },
    });
  } catch (error) {
    console.error("Content engine error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate article" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/content-engine - Delete an article.
 * Body: { id }
 */
export async function DELETE(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Article id is required" }, { status: 400 });
    }

    await prisma.contentArticle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete article" },
      { status: 500 }
    );
  }
}

/**
 * Generate article ideas based on site keyword data.
 */
async function generateIdeas(siteId: string, req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider") || "openai";

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      keywords: {
        take: 30,
        include: {
          rankings: { take: 1, orderBy: { date: "desc" } },
        },
      },
      pages: { take: 20, select: { url: true, title: true } },
      contentArticles: { select: { targetKeyword: true } },
    },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const existingTopics = site.contentArticles.map((a) => a.targetKeyword);

  const context = `
Site: ${site.name} (${site.domain})
Industry/Niche: Infer from the domain and existing content

Tracked Keywords with Rankings:
${site.keywords
  .map((k) => {
    const rank = k.rankings[0];
    return `- "${k.keyword}" ${rank ? `(Position: ${rank.position}, Clicks: ${rank.clicks}, Impressions: ${rank.impressions})` : "(No ranking data)"}`;
  })
  .join("\n")}

Existing Pages:
${site.pages.map((p) => `- ${p.title || p.url}`).join("\n")}

Already Written Topics (avoid duplicates):
${existingTopics.length > 0 ? existingTopics.join(", ") : "None yet"}
`;

  let aiResult: Record<string, unknown> = {};

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: IDEAS_PROMPT },
        { role: "user", content: context },
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (text) {
      try {
        aiResult = JSON.parse(text);
      } catch {
        aiResult = { ideas: [] };
      }
    }
  } else if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `${IDEAS_PROMPT}\n\n${context}`,
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
        aiResult = { ideas: [] };
      }
    }
  } else {
    return NextResponse.json(
      { error: "No AI provider configured." },
      { status: 400 }
    );
  }

  return NextResponse.json(aiResult);
}
