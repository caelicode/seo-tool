import { NextRequest, NextResponse } from "next/server";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const KEYWORD_RESEARCH_PROMPT = `You are an expert local SEO specialist. Generate a comprehensive list of search keywords that potential customers would use to find this type of business.

Given the business details below, generate keywords across these categories:
1. **Core Service Keywords** - Direct services offered (e.g., "hair braiding", "box braids", "knotless braids")
2. **Location Keywords** - Service + city/area combos (e.g., "hair braiding in Forney TX", "braids near Forney")
3. **Long-tail Keywords** - Specific queries with intent (e.g., "best hair braiding salon in Forney", "affordable box braids near me")
4. **Question Keywords** - Questions people search (e.g., "where to get braids in Forney TX", "how much do braids cost in Forney")
5. **Competitor/Alternative Keywords** - Related searches (e.g., "hair salon Forney TX", "African hair braiding near me")
6. **Seasonal/Trending** - Time-sensitive queries (e.g., "back to school braids Forney", "prom hairstyles Forney TX")

For each keyword, estimate:
- **searchVolume**: "high", "medium", or "low" (relative to local market)
- **competition**: "high", "medium", or "low"
- **intent**: "transactional", "informational", or "navigational"
- **priority**: 1-5 (1 = must target, 5 = nice to have)

Return JSON with this structure:
{
  "keywords": [
    {
      "keyword": string,
      "category": string,
      "searchVolume": "high" | "medium" | "low",
      "competition": "high" | "medium" | "low",
      "intent": "transactional" | "informational" | "navigational",
      "priority": number,
      "reasoning": string
    }
  ],
  "summary": string,
  "topRecommendations": [string, string, string, string, string]
}

Generate at least 30 keywords. Focus on keywords with transactional intent and low-to-medium competition that a small local business can realistically rank for.`;

interface KeywordSuggestion {
  keyword: string;
  category: string;
  searchVolume: string;
  competition: string;
  intent: string;
  priority: number;
  reasoning: string;
}

interface ResearchResult {
  keywords: KeywordSuggestion[];
  summary: string;
  topRecommendations: string[];
}

function parseResponse(text: string): ResearchResult {
  let jsonStr = text.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }
  return JSON.parse(jsonStr) as ResearchResult;
}

// POST /api/keywords/research - AI-powered keyword research
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();

    if (!body.business || !body.location) {
      return NextResponse.json(
        { error: "business and location are required" },
        { status: 400 }
      );
    }

    const provider = body.provider || "openai";
    const businessContext = `
Business Type: ${body.business}
Location: ${body.location}
Website: ${body.website || "(not provided)"}
${body.services ? `Services Offered: ${body.services}` : ""}
${body.additionalContext ? `Additional Context: ${body.additionalContext}` : ""}
`;

    const fullPrompt = `${KEYWORD_RESEARCH_PROMPT}\n\nBusiness Details:\n${businessContext}`;

    let responseText: string;

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "OPENAI_API_KEY is not configured" },
          { status: 400 }
        );
      }
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are an expert local SEO specialist. Always respond in valid JSON." },
          { role: "user", content: fullPrompt },
        ],
      });
      responseText = response.choices[0]?.message?.content || "";
    } else {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "ANTHROPIC_API_KEY is not configured" },
          { status: 400 }
        );
      }
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [
          { role: "user", content: fullPrompt },
        ],
      });
      const textBlock = response.content.find((b) => b.type === "text");
      responseText = textBlock && textBlock.type === "text" ? textBlock.text : "";
    }

    const result = parseResponse(responseText);

    return NextResponse.json({
      provider,
      ...result,
    });
  } catch (error) {
    console.error("Keyword research error:", error);
    const message =
      error instanceof Error ? error.message : "Keyword research failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
