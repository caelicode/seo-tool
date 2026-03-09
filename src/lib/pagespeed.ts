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
 * Uses the free PSI API v5. An API key is optional but helps avoid
 * anonymous rate limits. Set PAGESPEED_API_KEY in .env if you have one.
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

  // Retry up to 2 times with a delay for rate limit errors
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // Wait before retrying (5s, then 15s)
      await new Promise((resolve) => setTimeout(resolve, attempt * 10000));
    }

    try {
      const response = await fetch(`${PSI_API_URL}?${params.toString()}`, {
        signal: AbortSignal.timeout(90000), // PSI can take a while
      });

      if (response.status === 429) {
        const err = await response.text();
        lastError = new Error(
          "PageSpeed API rate limit reached. This usually resolves within a few minutes. " +
          "If it persists, create a PageSpeed API key at " +
          "https://console.cloud.google.com/apis/credentials and add it as " +
          "PAGESPEED_API_KEY in your .env file."
        );
        console.warn(`PSI rate limited (attempt ${attempt + 1}/3):`, err);
        continue;
      }

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`PageSpeed API error (${response.status}): ${err}`);
      }

      const data = await response.json();

      const lighthouse = data.lighthouseResult;
      if (!lighthouse) {
        throw new Error("PageSpeed API returned no Lighthouse data. The target URL may be unreachable.");
      }

      const perfScore = (lighthouse.categories?.performance?.score ?? 0) * 100;

      // Extract Core Web Vitals from audits
      const audits = lighthouse.audits || {};

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
    } catch (err) {
      if (err instanceof Error && err.message.includes("rate limit")) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("PageSpeed API request failed after retries");
}
