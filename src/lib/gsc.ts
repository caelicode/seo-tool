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
 * Fetch search analytics data for a site property.
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

  const res = await client.searchanalytics.query({
    siteUrl,
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
 */
export async function fetchSearchAnalyticsByDate(
  accessToken: string,
  refreshToken: string | null,
  siteUrl: string,
  startDate: string,
  endDate: string
) {
  const client = getSearchConsoleClient(accessToken, refreshToken);

  const res = await client.searchanalytics.query({
    siteUrl,
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
 */
export async function inspectUrl(
  accessToken: string,
  refreshToken: string | null,
  siteUrl: string,
  inspectionUrl: string
) {
  const client = getSearchConsoleClient(accessToken, refreshToken);

  try {
    const res = await client.urlInspection.index.inspect({
      requestBody: {
        inspectionUrl,
        siteUrl,
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
