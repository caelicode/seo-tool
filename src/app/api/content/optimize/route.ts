import { NextRequest, NextResponse } from "next/server";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import { fetchPageContent, analyzeContent } from "@/lib/content-optimizer";

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

    // Normalize URL
    let url = body.url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Step 1: Fetch and parse the page
    const pageContent = await fetchPageContent(url);

    // Step 2: Send to AI for analysis
    const analysis = await analyzeContent(pageContent, body.targetKeyword);

    return NextResponse.json({
      url: pageContent.url,
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
