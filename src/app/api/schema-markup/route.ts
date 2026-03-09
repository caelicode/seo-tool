import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

interface DetectedSchema {
  type: string;
  format: "json-ld" | "microdata" | "rdfa";
  content: Record<string, unknown>;
  raw: string;
}

interface SchemaIssue {
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
  schema?: string;
}

const SCHEMA_ANALYSIS_PROMPT = `You are an expert in Schema.org structured data and SEO.
Analyze the following page content and detected schema markup. Provide:

1. Assessment of existing schema markup quality
2. Missing schema types that should be added for this page type
3. Specific JSON-LD code snippets to add or fix
4. Priority recommendations

Respond in JSON format:
{
  "score": number (0-100),
  "pageType": string (e.g., "LocalBusiness", "Article", "Product", "Service"),
  "existingSchemaAssessment": string,
  "missingSchemas": [
    { "type": string, "priority": "high" | "medium" | "low", "reason": string }
  ],
  "recommendations": [
    { "action": string, "priority": "high" | "medium" | "low", "jsonLd": string }
  ],
  "issues": [
    { "type": string, "severity": "error" | "warning" | "info", "message": string }
  ]
}`;

/**
 * GET /api/schema-markup?siteId=xxx - Get schema analysis history.
 * POST /api/schema-markup - Analyze a page for structured data.
 */
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const siteId = req.nextUrl.searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  try {
    const analyses = await prisma.schemaAnalysis.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      analyses: analyses.map((a) => ({
        ...a,
        schemas: JSON.parse(a.schemas),
        issues: JSON.parse(a.issues),
        suggestions: JSON.parse(a.suggestions),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch analyses" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { siteId, pageUrl, provider = "openai" } = body;

    if (!siteId || !pageUrl) {
      return NextResponse.json(
        { error: "siteId and pageUrl are required" },
        { status: 400 }
      );
    }

    // Fetch the page
    const response = await fetch(pageUrl, {
      headers: {
        "User-Agent": "SEOTool/1.0 (Schema Analyzer)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: HTTP ${response.status}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract structured data
    const detectedSchemas: DetectedSchema[] = [];
    const issues: SchemaIssue[] = [];

    // 1. JSON-LD schemas
    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).html() || "";
      try {
        const parsed = JSON.parse(raw);
        const schemas = Array.isArray(parsed) ? parsed : [parsed];
        for (const schema of schemas) {
          detectedSchemas.push({
            type: schema["@type"] || "Unknown",
            format: "json-ld",
            content: schema,
            raw: JSON.stringify(schema, null, 2),
          });
        }
      } catch {
        issues.push({
          type: "invalid_jsonld",
          severity: "error",
          message: "Found a JSON-LD script tag with invalid JSON",
        });
      }
    });

    // 2. Microdata schemas
    $("[itemscope]").each((_, el) => {
      const itemType = $(el).attr("itemtype") || "";
      const typeName = itemType.split("/").pop() || "Unknown";
      const props: Record<string, string> = {};

      $(el)
        .find("[itemprop]")
        .each((_, prop) => {
          const name = $(prop).attr("itemprop") || "";
          const value =
            $(prop).attr("content") ||
            $(prop).attr("href") ||
            $(prop).text().trim();
          if (name) props[name] = value.substring(0, 200);
        });

      detectedSchemas.push({
        type: typeName,
        format: "microdata",
        content: { "@type": typeName, itemtype: itemType, ...props },
        raw: `<div itemscope itemtype="${itemType}">...</div>`,
      });
    });

    // 3. RDFa schemas
    $("[typeof]").each((_, el) => {
      const typeOf = $(el).attr("typeof") || "";
      const props: Record<string, string> = {};

      $(el)
        .find("[property]")
        .each((_, prop) => {
          const name = $(prop).attr("property") || "";
          const value =
            $(prop).attr("content") || $(prop).text().trim();
          if (name) props[name] = value.substring(0, 200);
        });

      detectedSchemas.push({
        type: typeOf,
        format: "rdfa",
        content: { "@type": typeOf, ...props },
        raw: `<div typeof="${typeOf}">...</div>`,
      });
    });

    // Basic validation
    if (detectedSchemas.length === 0) {
      issues.push({
        type: "no_schema",
        severity: "error",
        message: "No structured data found on this page",
      });
    }

    // Check for common missing schemas
    const schemaTypes = detectedSchemas.map((s) => s.type.toLowerCase());
    const title = $("title").text().trim();
    const bodyText = $("body").text().replace(/\s+/g, " ").trim().substring(0, 2000);

    // Get AI-powered analysis
    let aiSuggestions: Record<string, unknown> = {};

    const pageContext = `
URL: ${pageUrl}
Title: ${title}
Detected Schema Types: ${schemaTypes.join(", ") || "None"}
Schema Details: ${JSON.stringify(detectedSchemas.map((s) => ({ type: s.type, format: s.format })))}
Page Text (first 1500 chars): ${bodyText.substring(0, 1500)}
Current Issues: ${JSON.stringify(issues)}
`;

    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: "gpt-5.3-chat-latest",
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SCHEMA_ANALYSIS_PROMPT },
          { role: "user", content: pageContext },
        ],
      });

      const text = completion.choices[0]?.message?.content;
      if (text) {
        try {
          aiSuggestions = JSON.parse(text);
        } catch {
          aiSuggestions = { raw: text };
        }
      }
    } else if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `${SCHEMA_ANALYSIS_PROMPT}\n\n${pageContext}`,
          },
        ],
      });

      const textBlock = msg.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") {
        let jsonStr = textBlock.text.trim();
        const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeMatch) jsonStr = codeMatch[1].trim();
        try {
          aiSuggestions = JSON.parse(jsonStr);
        } catch {
          aiSuggestions = { raw: textBlock.text };
        }
      }
    } else {
      aiSuggestions = {
        score: detectedSchemas.length > 0 ? 40 : 0,
        pageType: "Unknown",
        existingSchemaAssessment: "AI analysis not available. Configure OPENAI_API_KEY or ANTHROPIC_API_KEY.",
        missingSchemas: [],
        recommendations: [],
        issues: issues.map((i) => ({ type: i.type, severity: i.severity, message: i.message })),
      };
    }

    // Save to database
    const analysis = await prisma.schemaAnalysis.create({
      data: {
        siteId,
        pageUrl,
        schemas: JSON.stringify(detectedSchemas),
        score: typeof aiSuggestions === "object" && "score" in aiSuggestions
          ? (aiSuggestions.score as number)
          : 0,
        issues: JSON.stringify(issues),
        suggestions: JSON.stringify(aiSuggestions),
        provider,
      },
    });

    return NextResponse.json({
      id: analysis.id,
      pageUrl,
      detectedSchemas,
      issues,
      aiAnalysis: aiSuggestions,
      provider,
    });
  } catch (error) {
    console.error("Schema analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze schema markup" },
      { status: 500 }
    );
  }
}
