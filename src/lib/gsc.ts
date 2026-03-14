import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

/**
 * Create an OAuth2 client from env vars.
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/gsc/callback";

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the Google OAuth consent URL.
 */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Create an authenticated Search Console client.
 */
export function getSearchConsoleClient(accessToken: string, refreshToken?: string | null) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return google.searchconsole({ version: "v1", auth: oauth2Client });
}

/**
 * List all sites the user has access to in Search Console.
 */
export async function listGscSites(accessToken: string, refreshToken?: string | null) {
  const client = getSearchConsoleClient(accessToken, refreshToken);
  const res = await client.sites.list();
  return res.data.siteEntry || [];
}

/**
 * Resolve the correct GSC property URL format.
 *
 * GSC has two property types with different URL formats:
 *   - URL-prefix property: "https://example.com/" or "http://example.com/"
 *   - Domain property: "sc-domain:example.com"
 *
 * This function tries the provided siteUrl first, then falls back to
 * alternative formats (sc-domain, https://, http://) to find one that works.
 * Returns the working property URL, or the original if none match.
 */
export async function resolveGscPropertyUrl(
  accessToken: string,
  refreshToken: string | null | undefined,
  siteUrl: string
): Promise<string> {
  try {
    const sites = await listGscSites(accessToken, refreshToken);
    const availableUrls = sites.map((s) => s.siteUrl).filter(Boolean) as string[];

    // If the exact provided URL matches, use it directly
    if (availableUrls.includes(siteUrl)) {
      return siteUrl;
    }

    // Extract the bare domain from the input
    let domain = siteUrl;
    domain = domain.replace(/^sc-domain:/, "");
    domain = domain.replace(/^https?:\/\//, "");
    domain = domain.replace(/\/+$/, "");
    domain = domain.replace(/^www\./, "");

    // Try each possible format in order of preference
    const candidates = [
      `sc-domain:${domain}`,
      `https://${domain}/`,
      `https://www.${domain}/`,
      `http://${domain}/`,
      `http://www.${domain}/`,
    ];

    for (const candidate of candidates) {
      if (availableUrls.includes(candidate)) {
        console.log(`GSC property resolved: "${siteUrl}" -> "${candidate}"`);
        return candidate;
      }
    }

    // No match found; return original and let the API call surface the error
    console.warn(
      `GSC property "${siteUrl}" not found. Available properties: ${availableUrls.join(", ")}`
    );
    return siteUrl;
  } catch (error) {
    // If listing sites fails, just return the original URL
    console.error("Failed to resolve GSC property URL:", error);
    return siteUrl;
  }
}

/**
 * Fetch search analytics data for a site property.
 * Automatically resolves the correct property URL format.
 */
export async function fetchSearchAnalytics(
  accessToken: string,
  refreshToken: string | null,
  siteUrl: string,
  options: {
    startDate: string; // YYYY-MM-DD
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
  }
) {
  const client = getSearchConsoleClient(accessToken, refreshToken);
  const resolvedUrl = await resolveGscPropertyUrl(accessToken, refreshToken, siteUrl);

  const res = await client.searchanalytics.query({
    siteUrl: resolvedUrl,
    requestBody: {
      startDate: options.startDate,
      endDate: options.endDate,
      dimensions: options.dimensions || ["query", "page"],
      rowLimit: options.rowLimit || 1000,
      type: "web",
    },
  });

  return res.data.rows || [];
}

/**
 * Fetch search analytics aggregated by date for trending.
 * Automatically resolves the correct property URL format.
 */
export async function fetchSearchAnalyticsByDate(
  accessToken: string,
  refreshToken: string | null,
  siteUrl: string,
  startDate: string,
  endDate: string
) {
  const client = getSearchConsoleClient(accessToken, refreshToken);
  const resolvedUrl = await resolveGscPropertyUrl(accessToken, refreshToken, siteUrl);

  const res = await client.searchanalytics.query({
    siteUrl: resolvedUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["date"],
      rowLimit: 500,
      type: "web",
    },
  });

  return res.data.rows || [];
}

/**
 * Fetch URL inspection / indexing data for a specific URL.
 * Automatically resolves the correct property URL format.
 */
export async function inspectUrl(
  accessToken: string,
  refreshToken: string | null,
  siteUrl: string,
  inspectionUrl: string
) {
  const client = getSearchConsoleClient(accessToken, refreshToken);
  const resolvedUrl = await resolveGscPropertyUrl(accessToken, refreshToken, siteUrl);

  try {
    const res = await client.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl,
        siteUrl: resolvedUrl,
      },
    });
    return res.data;
  } catch (error) {
    console.error("URL inspection failed:", error);
    return null;
  }
}

/**
 * Helper: get date string N days ago in YYYY-MM-DD format.
 */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
