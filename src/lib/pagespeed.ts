const PSI_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export interface PageSpeedResult {
  performanceScore: number;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  inp: number | null;
  ttfb: number | null;
  strategy: "mobile" | "desktop";
  url: string;
}

/**
 * Run a PageSpeed Insights test for a URL.
 * Uses the free PSI API (25K requests/day, no API key required but recommended).
 */
export async function runPageSpeedTest(
  url: string,
  strategy: "mobile" | "desktop" = "mobile"
): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY || "";
  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });

  if (apiKey) {
    params.set("key", apiKey);
  }

  const response = await fetch(`${PSI_API_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(60000), // PSI can take a while
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PageSpeed API error (${response.status}): ${err}`);
  }

  const data = await response.json();

  const lighthouse = data.lighthouseResult;
  const perfScore = (lighthouse?.categories?.performance?.score ?? 0) * 100;

  // Extract Core Web Vitals from audits
  const audits = lighthouse?.audits || {};

  const lcp = audits["largest-contentful-paint"]?.numericValue ?? null;
  const fid = audits["max-potential-fid"]?.numericValue ?? null;
  const cls = audits["cumulative-layout-shift"]?.numericValue ?? null;
  const inp = audits["interaction-to-next-paint"]?.numericValue ?? null;
  const ttfb = audits["server-response-time"]?.numericValue ?? null;

  return {
    performanceScore: Math.round(perfScore),
    lcp: lcp !== null ? Math.round(lcp) : null,
    fid: fid !== null ? Math.round(fid) : null,
    cls: cls !== null ? Math.round(cls * 1000) / 1000 : null,
    inp: inp !== null ? Math.round(inp) : null,
    ttfb: ttfb !== null ? Math.round(ttfb) : null,
    strategy,
    url,
  };
}
