import * as cheerio from "cheerio";

export interface CrawlPageResult {
  url: string;
  statusCode: number;
  title: string | null;
  description: string | null;
  h1: string | null;
  issues: CrawlIssue[];
  links: string[];
}

export interface CrawlIssue {
  type: string;
  severity: "critical" | "warning" | "info";
  detail: string;
}

const USER_AGENT =
  "SEOTool-Crawler/1.0 (internal; +https://github.com/seo-tool)";

const FETCH_TIMEOUT = 15000; // 15 seconds

/**
 * Fetch a single page and analyze it for SEO issues.
 */
export async function crawlPage(url: string): Promise<CrawlPageResult> {
  const issues: CrawlIssue[] = [];
  let statusCode = 0;
  let title: string | null = null;
  let description: string | null = null;
  let h1: string | null = null;
  const links: string[] = [];

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    statusCode = response.status;

    if (statusCode >= 400) {
      issues.push({
        type: "http_error",
        severity: "critical",
        detail: `HTTP ${statusCode} response`,
      });
      return { url, statusCode, title, description, h1, issues, links };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return { url, statusCode, title, description, h1, issues, links };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    title = $("title").first().text().trim() || null;
    if (!title) {
      issues.push({
        type: "missing_title",
        severity: "critical",
        detail: "Page is missing a <title> tag",
      });
    } else if (title.length < 10) {
      issues.push({
        type: "short_title",
        severity: "warning",
        detail: `Title is too short (${title.length} chars): "${title}"`,
      });
    } else if (title.length > 60) {
      issues.push({
        type: "long_title",
        severity: "warning",
        detail: `Title is too long (${title.length} chars, recommended max 60)`,
      });
    }

    // Extract meta description
    description =
      $('meta[name="description"]').attr("content")?.trim() || null;
    if (!description) {
      issues.push({
        type: "missing_meta_description",
        severity: "critical",
        detail: "Page is missing a meta description",
      });
    } else if (description.length < 50) {
      issues.push({
        type: "short_meta_description",
        severity: "warning",
        detail: `Meta description is too short (${description.length} chars)`,
      });
    } else if (description.length > 160) {
      issues.push({
        type: "long_meta_description",
        severity: "warning",
        detail: `Meta description is too long (${description.length} chars, recommended max 160)`,
      });
    }

    // Extract H1
    const h1Elements = $("h1");
    if (h1Elements.length === 0) {
      issues.push({
        type: "missing_h1",
        severity: "critical",
        detail: "Page is missing an <h1> tag",
      });
    } else {
      h1 = h1Elements.first().text().trim() || null;
      if (h1Elements.length > 1) {
        issues.push({
          type: "multiple_h1",
          severity: "warning",
          detail: `Page has ${h1Elements.length} <h1> tags (should have exactly 1)`,
        });
      }
    }

    // Check for images missing alt text
    const images = $("img");
    let missingAlt = 0;
    images.each((_, el) => {
      const alt = $(el).attr("alt");
      if (alt === undefined || alt.trim() === "") {
        missingAlt++;
      }
    });
    if (missingAlt > 0) {
      issues.push({
        type: "missing_alt_text",
        severity: "warning",
        detail: `${missingAlt} image${missingAlt > 1 ? "s" : ""} missing alt text`,
      });
    }

    // Check canonical
    const canonical = $('link[rel="canonical"]').attr("href");
    if (!canonical) {
      issues.push({
        type: "missing_canonical",
        severity: "info",
        detail: "Page is missing a canonical link tag",
      });
    }

    // Check meta robots
    const robots = $('meta[name="robots"]').attr("content");
    if (robots && (robots.includes("noindex") || robots.includes("nofollow"))) {
      issues.push({
        type: "noindex_nofollow",
        severity: "info",
        detail: `Meta robots: "${robots}"`,
      });
    }

    // Check Open Graph tags
    const ogTitle = $('meta[property="og:title"]').attr("content");
    const ogDescription = $('meta[property="og:description"]').attr("content");
    if (!ogTitle || !ogDescription) {
      const missing = [];
      if (!ogTitle) missing.push("og:title");
      if (!ogDescription) missing.push("og:description");
      issues.push({
        type: "missing_og_tags",
        severity: "info",
        detail: `Missing Open Graph tags: ${missing.join(", ")}`,
      });
    }

    // Extract internal links
    const baseUrl = new URL(url);
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      try {
        const resolved = new URL(href, url);
        if (resolved.hostname === baseUrl.hostname) {
          // Normalize: strip hash, keep path + query
          resolved.hash = "";
          const normalized = resolved.toString();
          if (!links.includes(normalized)) {
            links.push(normalized);
          }
        }
      } catch {
        // Invalid URL, skip
      }
    });
  } catch (error) {
    statusCode = 0;
    const message =
      error instanceof Error ? error.message : "Unknown fetch error";
    issues.push({
      type: "fetch_error",
      severity: "critical",
      detail: `Failed to fetch page: ${message}`,
    });
  }

  return { url, statusCode, title, description, h1, issues, links };
}

/**
 * Check if a URL returns a successful response (HEAD request).
 */
export async function checkLink(url: string): Promise<{
  url: string;
  statusCode: number;
  ok: boolean;
}> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    return { url, statusCode: response.status, ok: response.ok };
  } catch {
    return { url, statusCode: 0, ok: false };
  }
}

/**
 * Parse a sitemap.xml and return the list of page URLs.
 */
export async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) return [];

    const xml = await response.text();
    const $ = cheerio.load(xml, { xml: true });

    const urls: string[] = [];

    // Standard sitemap
    $("url > loc").each((_, el) => {
      const loc = $(el).text().trim();
      if (loc) urls.push(loc);
    });

    // Sitemap index (contains other sitemaps)
    if (urls.length === 0) {
      const sitemapLocs: string[] = [];
      $("sitemap > loc").each((_, el) => {
        const loc = $(el).text().trim();
        if (loc) sitemapLocs.push(loc);
      });

      // Recursively parse child sitemaps (max 5 to avoid runaway)
      for (const loc of sitemapLocs.slice(0, 5)) {
        const childUrls = await parseSitemap(loc);
        urls.push(...childUrls);
      }
    }

    return urls;
  } catch {
    return [];
  }
}

/**
 * Discover pages to crawl for a site.
 * Priority: sitemap > homepage crawl.
 */
export async function discoverPages(
  domain: string,
  sitemapUrl?: string | null
): Promise<string[]> {
  const pages: Set<string> = new Set();
  const baseUrl = `https://${domain}`;

  // Try sitemap first
  if (sitemapUrl) {
    const sitemapPages = await parseSitemap(sitemapUrl);
    for (const p of sitemapPages) {
      pages.add(p);
    }
  }

  // If no sitemap or empty, try default sitemap locations
  if (pages.size === 0) {
    for (const path of ["/sitemap.xml", "/sitemap_index.xml"]) {
      const sitemapPages = await parseSitemap(`${baseUrl}${path}`);
      for (const p of sitemapPages) {
        pages.add(p);
      }
      if (pages.size > 0) break;
    }
  }

  // Always include the homepage
  pages.add(`${baseUrl}/`);
  pages.add(baseUrl);

  // Cap at 50 pages for free tier
  return Array.from(pages).slice(0, 50);
}
