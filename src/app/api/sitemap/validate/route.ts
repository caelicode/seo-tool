import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";
import * as cheerio from "cheerio";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  status?: number;
  isValid?: boolean;
  error?: string;
}

interface SitemapWarning {
  type: string;
  message: string;
  url?: string;
}

/**
 * POST /api/sitemap/validate - Validate a sitemap and check its URLs.
 */
export async function POST(req: NextRequest) {
  if (!validateRequest(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { siteId, sitemapUrl } = body;

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    // Use provided sitemap URL or try defaults
    const urlsToTry: string[] = [];
    if (sitemapUrl) {
      urlsToTry.push(sitemapUrl);
    } else if (site.sitemapUrl) {
      urlsToTry.push(site.sitemapUrl);
    } else {
      urlsToTry.push(
        `https://${site.domain}/sitemap.xml`,
        `https://${site.domain}/sitemap_index.xml`
      );
    }

    let resolvedSitemapUrl: string | null = null;
    let sitemapXml = "";
    let sitemapStatusCode = 0;
    let lastError = "";

    // Try multiple user agents in case bot protection blocks the first
    const userAgents = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "SEOTool/1.0 (Sitemap Validator)",
    ];

    for (const tryUrl of urlsToTry) {
      for (const ua of userAgents) {
        try {
          const response = await fetch(tryUrl, {
            headers: {
              "User-Agent": ua,
              "Accept": "application/xml, text/xml, */*",
            },
            signal: AbortSignal.timeout(15000),
            redirect: "follow",
          });
          sitemapStatusCode = response.status;
          if (response.ok) {
            sitemapXml = await response.text();
            resolvedSitemapUrl = tryUrl;
            break;
          } else {
            lastError = `HTTP ${response.status} from ${tryUrl}`;
          }
        } catch (fetchErr) {
          lastError = fetchErr instanceof Error ? fetchErr.message : "Fetch failed";
          continue;
        }
      }
      if (resolvedSitemapUrl) break;
    }

    if (!resolvedSitemapUrl || !sitemapXml) {
      return NextResponse.json({
        error: `No sitemap found. ${lastError}`,
        triedUrls: urlsToTry,
        statusCode: sitemapStatusCode,
        hint: "If the sitemap loads in your browser but not here, your hosting may be blocking server-side requests. Check Cloudflare or firewall settings.",
      }, { status: 404 });
    }

    // Parse the sitemap
    const $ = cheerio.load(sitemapXml, { xml: true });
    const warnings: SitemapWarning[] = [];
    const urls: SitemapUrl[] = [];

    // Check if it's a sitemap index
    const isSitemapIndex = $("sitemapindex").length > 0;
    const childSitemaps: string[] = [];

    if (isSitemapIndex) {
      $("sitemap > loc").each((_, el) => {
        childSitemaps.push($(el).text().trim());
      });

      // Parse child sitemaps (limit to 5)
      for (const childUrl of childSitemaps.slice(0, 5)) {
        try {
          const childResponse = await fetch(childUrl, {
            headers: { "User-Agent": "SEOTool/1.0 (Sitemap Validator)" },
            signal: AbortSignal.timeout(15000),
          });

          if (!childResponse.ok) {
            warnings.push({
              type: "broken_child_sitemap",
              message: `Child sitemap returned HTTP ${childResponse.status}`,
              url: childUrl,
            });
            continue;
          }

          const childXml = await childResponse.text();
          const child$ = cheerio.load(childXml, { xml: true });
          child$("url").each((_, el) => {
            const loc = child$(el).find("loc").text().trim();
            if (loc) {
              urls.push({
                loc,
                lastmod: child$(el).find("lastmod").text().trim() || undefined,
                changefreq: child$(el).find("changefreq").text().trim() || undefined,
                priority: child$(el).find("priority").text().trim() || undefined,
              });
            }
          });
        } catch {
          warnings.push({
            type: "fetch_error",
            message: `Failed to fetch child sitemap`,
            url: childUrl,
          });
        }
      }
    } else {
      // Standard sitemap
      $("url").each((_, el) => {
        const loc = $(el).find("loc").text().trim();
        if (loc) {
          urls.push({
            loc,
            lastmod: $(el).find("lastmod").text().trim() || undefined,
            changefreq: $(el).find("changefreq").text().trim() || undefined,
            priority: $(el).find("priority").text().trim() || undefined,
          });
        }
      });
    }

    // Validate sitemap structure
    if (urls.length === 0) {
      warnings.push({
        type: "empty_sitemap",
        message: "Sitemap contains no URLs",
      });
    }

    if (urls.length > 50000) {
      warnings.push({
        type: "too_many_urls",
        message: `Sitemap contains ${urls.length} URLs (max recommended: 50,000 per sitemap)`,
      });
    }

    // Check a sample of URLs (up to 20)
    const sampleSize = Math.min(20, urls.length);
    const sampleIndices = new Set<number>();
    while (sampleIndices.size < sampleSize) {
      sampleIndices.add(Math.floor(Math.random() * urls.length));
    }

    let validUrls = 0;
    let brokenUrls = 0;

    for (const idx of sampleIndices) {
      const urlEntry = urls[idx];
      try {
        const response = await fetch(urlEntry.loc, {
          method: "HEAD",
          headers: { "User-Agent": "SEOTool/1.0 (Sitemap Validator)" },
          signal: AbortSignal.timeout(10000),
          redirect: "follow",
        });

        urlEntry.status = response.status;
        urlEntry.isValid = response.ok;

        if (response.ok) {
          validUrls++;
        } else {
          brokenUrls++;
          warnings.push({
            type: "broken_url",
            message: `URL returned HTTP ${response.status}`,
            url: urlEntry.loc,
          });
        }
      } catch {
        urlEntry.status = 0;
        urlEntry.isValid = false;
        brokenUrls++;
        warnings.push({
          type: "unreachable_url",
          message: "URL could not be reached",
          url: urlEntry.loc,
        });
      }
    }

    // Check for common issues
    const urlsWithoutLastmod = urls.filter((u) => !u.lastmod).length;
    if (urlsWithoutLastmod > urls.length * 0.5) {
      warnings.push({
        type: "missing_lastmod",
        message: `${urlsWithoutLastmod} of ${urls.length} URLs are missing lastmod dates`,
      });
    }

    // Check for duplicate URLs
    const uniqueLocs = new Set(urls.map((u) => u.loc));
    if (uniqueLocs.size < urls.length) {
      warnings.push({
        type: "duplicate_urls",
        message: `Sitemap contains ${urls.length - uniqueLocs.size} duplicate URLs`,
      });
    }

    // Check URLs belong to the site domain
    const siteDomain = site.domain.toLowerCase();
    const offDomainUrls = urls.filter((u) => {
      try {
        return !new URL(u.loc).hostname.toLowerCase().includes(siteDomain);
      } catch {
        return true;
      }
    });
    if (offDomainUrls.length > 0) {
      warnings.push({
        type: "off_domain_urls",
        message: `${offDomainUrls.length} URLs don't match the site domain (${site.domain})`,
      });
    }

    // Save to database
    const estimatedValidRate = sampleSize > 0 ? validUrls / sampleSize : 0;
    const estimatedValidUrls = Math.round(urls.length * estimatedValidRate);
    const estimatedBrokenUrls = Math.round(urls.length * (1 - estimatedValidRate));

    await prisma.sitemapCheck.create({
      data: {
        siteId,
        sitemapUrl: resolvedSitemapUrl,
        urlCount: urls.length,
        validUrls: estimatedValidUrls,
        brokenUrls: estimatedBrokenUrls,
        warnings: warnings.length,
        details: JSON.stringify({
          isSitemapIndex,
          childSitemaps: childSitemaps.length,
          sampleChecked: sampleSize,
          sampleValid: validUrls,
          sampleBroken: brokenUrls,
          warnings,
          checkedUrls: urls.filter((u) => u.status !== undefined),
        }),
      },
    });

    return NextResponse.json({
      sitemapUrl: resolvedSitemapUrl,
      isSitemapIndex,
      childSitemaps: childSitemaps.length,
      urlCount: urls.length,
      sampleChecked: sampleSize,
      sampleValid: validUrls,
      sampleBroken: brokenUrls,
      estimatedValidUrls,
      estimatedBrokenUrls,
      warnings,
      checkedUrls: urls.filter((u) => u.status !== undefined),
      allUrls: urls.map((u) => ({
        loc: u.loc,
        lastmod: u.lastmod,
        changefreq: u.changefreq,
        priority: u.priority,
      })),
    });
  } catch (error) {
    console.error("Sitemap validation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to validate sitemap" },
      { status: 500 }
    );
  }
}
