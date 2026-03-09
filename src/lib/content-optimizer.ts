import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type AIProvider = "anthropic" | "openai";

const SEO_ANALYSIS_PROMPT = `You are an expert SEO consultant. Analyze the following web page content and provide actionable optimization suggestions.

Evaluate these areas and give specific, practical recommendations:

1. **Title Tag** - Is it compelling? Right length (50-60 chars)? Contains target keyword?
2. **Meta Description** - Is it persuasive? Right length (150-160 chars)? Contains call-to-action?
3. **Heading Structure** - Is there a single H1? Are H2/H3 used logically? Do headings contain keywords?
4. **Content Quality** - Approximate word count, readability, keyword density (if target keyword provided)
5. **Internal Linking** - Are there internal links? Could more be added?
6. **Image Optimization** - Do images have alt text? Are there enough images?
7. **Technical SEO** - Canonical tag present? Open Graph tags? Schema markup recommendations?

For each area, provide:
- Current state (what you see)
- Score (1-10)
- Specific suggestion to improve

Also provide:
- An overall SEO score (1-100)
- Top 3 priority actions to take
- 3 suggested title tag alternatives
- 3 suggested meta description alternatives

Respond in JSON format with this structure:
{
  "overallScore": number,
  "priorityActions": [string, string, string],
  "titleTag": {
    "current": string,
    "score": number,
    "suggestions": [string, string, string],
    "feedback": string
  },
  "metaDescription": {
    "current": string,
    "score": number,
    "suggestions": [string, string, string],
    "feedback": string
  },
  "headings": {
    "h1": string | null,
    "h2Count": number,
    "h3Count": number,
    "score": number,
    "feedback": string
  },
  "content": {
    "wordCount": number,
    "readabilityLevel": string,
    "score": number,
    "feedback": string
  },
  "internalLinks": {
    "count": number,
    "score": number,
    "feedback": string
  },
  "images": {
    "total": number,
    "withAlt": number,
    "withoutAlt": number,
    "score": number,
    "feedback": string
  },
  "technical": {
    "hasCanonical": boolean,
    "hasOpenGraph": boolean,
    "score": number,
    "feedback": string,
    "schemaRecommendation": string
  }
}`;

export interface PageContent {
  url: string;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  headings: { tag: string; text: string }[];
  bodyText: string;
  internalLinks: string[];
  externalLinks: string[];
  images: { src: string; alt: string | null }[];
  canonical: string | null;
  ogTags: Record<string, string>;
  wordCount: number;
}

export interface SEOAnalysis {
  overallScore: number;
  priorityActions: string[];
  titleTag: {
    current: string;
    score: number;
    suggestions: string[];
    feedback: string;
  };
  metaDescription: {
    current: string;
    score: number;
    suggestions: string[];
    feedback: string;
  };
  headings: {
    h1: string | null;
    h2Count: number;
    h3Count: number;
    score: number;
    feedback: string;
  };
  content: {
    wordCount: number;
    readabilityLevel: string;
    score: number;
    feedback: string;
  };
  internalLinks: {
    count: number;
    score: number;
    feedback: string;
  };
  images: {
    total: number;
    withAlt: number;
    withoutAlt: number;
    score: number;
    feedback: string;
  };
  technical: {
    hasCanonical: boolean;
    hasOpenGraph: boolean;
    score: number;
    feedback: string;
    schemaRecommendation: string;
  };
}

/**
 * Check which AI providers are configured.
 */
export function getAvailableProviders(): { provider: AIProvider; label: string }[] {
  const providers: { provider: AIProvider; label: string }[] = [];
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({ provider: "anthropic", label: "Claude (Anthropic)" });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ provider: "openai", label: "GPT-4o (OpenAI)" });
  }
  return providers;
}

/**
 * Fetch and parse a web page for SEO-relevant content.
 */
export async function fetchPageContent(url: string): Promise<PageContent> {
  // Dynamic import cheerio (ESM module)
  const cheerio = await import("cheerio");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "SEOTool/1.0 (Content Analyzer)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Remove script and style tags for clean text
  $("script, style, noscript").remove();

  const title = $("title").text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;
  const h1 = $("h1").first().text().trim() || null;
  const canonical = $('link[rel="canonical"]').attr("href") || null;

  // Collect all headings
  const headings: { tag: string; text: string }[] = [];
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    headings.push({
      tag: $(el).prop("tagName")?.toLowerCase() || "h1",
      text: $(el).text().trim(),
    });
  });

  // Body text for word count and analysis
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 0).length;

  // Parse URL base for internal vs external link detection
  const parsedUrl = new URL(url);
  const baseDomain = parsedUrl.hostname;

  const internalLinks: string[] = [];
  const externalLinks: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const linkUrl = new URL(href, url);
      if (linkUrl.hostname === baseDomain) {
        internalLinks.push(linkUrl.href);
      } else {
        externalLinks.push(linkUrl.href);
      }
    } catch {
      // Relative or malformed
      internalLinks.push(href);
    }
  });

  // Images
  const images: { src: string; alt: string | null }[] = [];
  $("img").each((_, el) => {
    images.push({
      src: $(el).attr("src") || "",
      alt: $(el).attr("alt") || null,
    });
  });

  // Open Graph tags
  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr("property");
    const content = $(el).attr("content");
    if (property && content) {
      ogTags[property] = content;
    }
  });

  return {
    url,
    title,
    metaDescription,
    h1,
    headings,
    bodyText: bodyText.substring(0, 5000), // Limit text sent to AI
    internalLinks: [...new Set(internalLinks)],
    externalLinks: [...new Set(externalLinks)],
    images,
    canonical,
    ogTags,
    wordCount,
  };
}

/**
 * Build the page context string for the AI prompt.
 */
function buildPageContext(pageContent: PageContent, targetKeyword?: string): string {
  return `
URL: ${pageContent.url}
Title: ${pageContent.title || "(none)"}
Meta Description: ${pageContent.metaDescription || "(none)"}
H1: ${pageContent.h1 || "(none)"}
Word Count: ${pageContent.wordCount}
Headings: ${JSON.stringify(pageContent.headings.slice(0, 20))}
Internal Links: ${pageContent.internalLinks.length}
External Links: ${pageContent.externalLinks.length}
Images: ${pageContent.images.length} total, ${pageContent.images.filter((i) => i.alt).length} with alt text
Canonical: ${pageContent.canonical || "(none)"}
OG Tags: ${Object.keys(pageContent.ogTags).length > 0 ? JSON.stringify(pageContent.ogTags) : "(none)"}
${targetKeyword ? `Target Keyword: ${targetKeyword}` : ""}

Body Text (first 3000 chars):
${pageContent.bodyText.substring(0, 3000)}
`;
}

/**
 * Parse JSON from AI response text, handling markdown code blocks.
 */
function parseAIResponse(text: string): SEOAnalysis {
  let jsonStr = text.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr) as SEOAnalysis;
  } catch {
    throw new Error(
      "Failed to parse AI response as JSON. Raw response: " +
        jsonStr.substring(0, 200)
    );
  }
}

/**
 * Analyze content using Anthropic Claude.
 */
async function analyzeWithAnthropic(
  pageContent: PageContent,
  targetKeyword?: string
): Promise<SEOAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env file."
    );
  }

  const client = new Anthropic({ apiKey });
  const pageContext = buildPageContext(pageContent, targetKeyword);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `${SEO_ANALYSIS_PROMPT}\n\nHere is the page to analyze:\n${pageContext}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Anthropic");
  }

  return parseAIResponse(textBlock.text);
}

/**
 * Analyze content using OpenAI GPT-4o.
 */
async function analyzeWithOpenAI(
  pageContent: PageContent,
  targetKeyword?: string
): Promise<SEOAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your .env file."
    );
  }

  const client = new OpenAI({ apiKey });
  const pageContext = buildPageContext(pageContent, targetKeyword);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: SEO_ANALYSIS_PROMPT,
      },
      {
        role: "user",
        content: `Here is the page to analyze:\n${pageContext}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("No response from OpenAI");
  }

  return parseAIResponse(text);
}

/**
 * Analyze page content using the specified AI provider.
 */
export async function analyzeContent(
  pageContent: PageContent,
  targetKeyword?: string,
  provider: AIProvider = "anthropic"
): Promise<SEOAnalysis> {
  if (provider === "openai") {
    return analyzeWithOpenAI(pageContent, targetKeyword);
  }
  return analyzeWithAnthropic(pageContent, targetKeyword);
}
