import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateRequest, unauthorizedResponse } from "@/lib/auth";

/**
 * GET /api/sites/[id]/health - Calculate SEO health score for a site.
 *
 * Returns an overall score (0-100) based on:
 * - Issue severity breakdown from latest crawl
 * - Keyword ranking performance
 * - PageSpeed scores
 * - GSC connectivity
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateRequest(req)) return unauthorizedResponse();

  const { id } = await params;

  try {
    const site = await prisma.site.findUnique({
      where: { id },
      include: {
        crawls: {
          orderBy: { startedAt: "desc" },
          take: 1,
          include: {
            issues: true,
          },
        },
        keywords: {
          include: {
            rankings: {
              orderBy: { date: "desc" },
              take: 2,
            },
          },
        },
        speedTests: {
          orderBy: { createdAt: "desc" },
          take: 2,
        },
        pages: {
          select: { id: true },
        },
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const scores: { category: string; score: number; maxScore: number; details: string }[] = [];

    // 1. Technical SEO (40 points max)
    const lastCrawl = site.crawls[0];
    if (lastCrawl && lastCrawl.issues) {
      const criticalCount = lastCrawl.issues.filter((i) => i.severity === "critical").length;
      const warningCount = lastCrawl.issues.filter((i) => i.severity === "warning").length;
      const infoCount = lastCrawl.issues.filter((i) => i.severity === "info").length;
      const totalPages = site.pages.length || 1;

      // Deduct points per issue (proportional to pages)
      const criticalPenalty = Math.min(20, (criticalCount / totalPages) * 40);
      const warningPenalty = Math.min(12, (warningCount / totalPages) * 20);
      const infoPenalty = Math.min(8, (infoCount / totalPages) * 10);

      const techScore = Math.max(0, 40 - criticalPenalty - warningPenalty - infoPenalty);

      scores.push({
        category: "Technical SEO",
        score: Math.round(techScore),
        maxScore: 40,
        details: `${criticalCount} critical, ${warningCount} warnings, ${infoCount} info across ${totalPages} pages`,
      });
    } else {
      scores.push({
        category: "Technical SEO",
        score: 0,
        maxScore: 40,
        details: "No crawl data yet. Run a crawl to get your technical SEO score.",
      });
    }

    // 2. Keyword Performance (25 points max)
    if (site.keywords.length > 0) {
      const trackedWithData = site.keywords.filter((k) => k.rankings.length > 0);
      const avgPosition =
        trackedWithData.length > 0
          ? trackedWithData.reduce((sum, k) => sum + (k.rankings[0]?.position || 100), 0) /
            trackedWithData.length
          : 100;

      // Score based on average position
      // Position 1 = 25 points, Position 10 = 20, Position 50 = 10, Position 100+ = 0
      let keywordScore: number;
      if (avgPosition <= 3) keywordScore = 25;
      else if (avgPosition <= 10) keywordScore = 20;
      else if (avgPosition <= 20) keywordScore = 15;
      else if (avgPosition <= 50) keywordScore = 10;
      else if (avgPosition <= 80) keywordScore = 5;
      else keywordScore = 2;

      // Bonus for improving keywords
      const improving = trackedWithData.filter((k) => {
        if (k.rankings.length < 2) return false;
        return k.rankings[0].position < k.rankings[1].position;
      }).length;
      const improvingBonus = Math.min(5, (improving / Math.max(1, trackedWithData.length)) * 5);

      scores.push({
        category: "Keyword Rankings",
        score: Math.min(25, Math.round(keywordScore + improvingBonus)),
        maxScore: 25,
        details: `${site.keywords.length} keywords tracked, avg position ${avgPosition.toFixed(1)}, ${improving} improving`,
      });
    } else {
      scores.push({
        category: "Keyword Rankings",
        score: 0,
        maxScore: 25,
        details: "No keywords tracked yet. Add keywords to monitor rankings.",
      });
    }

    // 3. Page Performance (20 points max)
    if (site.speedTests.length > 0) {
      const latestDesktop = site.speedTests.find((t) => t.strategy === "desktop");
      const latestMobile = site.speedTests.find((t) => t.strategy === "mobile");

      const desktopScore = latestDesktop ? latestDesktop.performanceScore * 10 : 0;
      const mobileScore = latestMobile ? latestMobile.performanceScore * 10 : 0;

      // Weight mobile more (60/40)
      const perfScore = mobileScore > 0 && desktopScore > 0
        ? (mobileScore * 0.6 + desktopScore * 0.4) * 2
        : (mobileScore || desktopScore) * 2;

      scores.push({
        category: "Page Performance",
        score: Math.min(20, Math.round(perfScore)),
        maxScore: 20,
        details: `Desktop: ${latestDesktop ? Math.round(latestDesktop.performanceScore * 100) : "N/A"}%, Mobile: ${latestMobile ? Math.round(latestMobile.performanceScore * 100) : "N/A"}%`,
      });
    } else {
      scores.push({
        category: "Page Performance",
        score: 0,
        maxScore: 20,
        details: "No speed tests run yet. Test your site speed.",
      });
    }

    // 4. Search Presence (15 points max)
    const gscConnected = !!site.gscPropertyId;
    const hasKeywords = site.keywords.length > 0;
    const hasImpressions = site.keywords.some(
      (k) => k.rankings.length > 0 && k.rankings[0].impressions > 0
    );
    const hasClicks = site.keywords.some(
      (k) => k.rankings.length > 0 && k.rankings[0].clicks > 0
    );

    let searchScore = 0;
    if (gscConnected) searchScore += 5;
    if (hasKeywords) searchScore += 3;
    if (hasImpressions) searchScore += 4;
    if (hasClicks) searchScore += 3;

    scores.push({
      category: "Search Presence",
      score: searchScore,
      maxScore: 15,
      details: [
        gscConnected ? "GSC connected" : "GSC not connected",
        hasKeywords ? `${site.keywords.length} keywords` : "No keywords",
        hasImpressions ? "Getting impressions" : "No impressions",
        hasClicks ? "Getting clicks" : "No clicks",
      ].join(", "),
    });

    // Calculate overall score
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const totalMax = scores.reduce((sum, s) => sum + s.maxScore, 0);

    // Grade
    let grade: string;
    if (totalScore >= 90) grade = "A+";
    else if (totalScore >= 80) grade = "A";
    else if (totalScore >= 70) grade = "B";
    else if (totalScore >= 60) grade = "C";
    else if (totalScore >= 40) grade = "D";
    else grade = "F";

    // Recommendations
    const recommendations: string[] = [];
    for (const s of scores) {
      const pct = s.score / s.maxScore;
      if (pct < 0.5) {
        if (s.category === "Technical SEO") {
          recommendations.push("Run a crawl and fix critical SEO issues (missing titles, descriptions, broken links).");
        } else if (s.category === "Keyword Rankings") {
          recommendations.push("Track target keywords and optimize your content for better rankings.");
        } else if (s.category === "Page Performance") {
          recommendations.push("Improve page speed by optimizing images, reducing JavaScript, and enabling caching.");
        } else if (s.category === "Search Presence") {
          recommendations.push("Connect Google Search Console and start tracking keyword performance.");
        }
      }
    }

    return NextResponse.json({
      score: totalScore,
      maxScore: totalMax,
      grade,
      categories: scores,
      recommendations,
      lastCrawl: lastCrawl
        ? {
            date: lastCrawl.startedAt,
            pagesFound: lastCrawl.pagesFound,
            issuesFound: lastCrawl.issuesFound,
          }
        : null,
    });
  } catch (error) {
    console.error("Health score error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to calculate health score" },
      { status: 500 }
    );
  }
}
