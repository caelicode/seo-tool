import { NextRequest, NextResponse } from "next/server";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import {
  fetchPageContent,
  analyzeContent,
  getAvailableProviders,
  type AIProvider,
} from "@/lib/content-optimizer";

// GET /api/content/optimize - Return available AI providers
export async function GET(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const providers = getAvailableProviders();
  return NextResponse.json({ providers });
}

// POST /api/content/optimize - Analyze a page for SEO optimization
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();

    if (!body.url) {
      return NextResponse.json(
        { error: "url is required" },
        { status: 400 }
      );
    }

    // Validate provider choice
    const provider: AIProvider = body.provider || "anthropic";
    if (provider !== "anthropic" && provider !== "openai") {
      return NextResponse.json(
        { error: "provider must be 'anthropic' or 'openai'" },
        { status: 400 }
      );
    }

    // Check the chosen provider has an API key configured
    const available = getAvailableProviders();
    if (!available.find((p) => p.provider === provider)) {
      const keyName =
        provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
      return NextResponse.json(
        {
          error: `${keyName} is not configured. Add it to your .env file to use this provider.`,
        },
        { status: 400 }
      );
    }

    // Normalize URL
    let url = body.url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Step 1: Fetch and parse the page
    const pageContent = await fetchPageContent(url);

    // Step 2: Send to AI for analysis
    const analysis = await analyzeContent(
      pageContent,
      body.targetKeyword,
      provider
    );

    return NextResponse.json({
      url: pageContent.url,
      provider,
      pageContent: {
        title: pageContent.title,
        metaDescription: pageContent.metaDescription,
        h1: pageContent.h1,
        wordCount: pageContent.wordCount,
        internalLinks: pageContent.internalLinks.length,
        externalLinks: pageContent.externalLinks.length,
        images: pageContent.images.length,
        imagesWithAlt: pageContent.images.filter((i) => i.alt).length,
      },
      analysis,
    });
  } catch (error) {
    console.error("Content optimization error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyze content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
