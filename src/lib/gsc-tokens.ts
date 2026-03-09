/**
 * Server-side GSC token store.
 *
 * For a single-user internal tool, we store OAuth tokens in a simple JSON file
 * so that cron jobs (which don't have browser cookies) can access them.
 *
 * In production with multiple users, you'd store these in the database per user.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  updatedAt: string;
}

// Store tokens in a .data directory at project root
const DATA_DIR = join(process.cwd(), ".data");
const TOKEN_FILE = join(DATA_DIR, "gsc-tokens.json");

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Save GSC OAuth tokens to disk.
 */
export function saveTokens(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}): void {
  ensureDataDir();

  // Merge with existing tokens (keep refresh_token if new one not provided)
  const existing = getTokens();

  const merged: StoredTokens = {
    access_token: tokens.access_token || existing?.access_token || "",
    refresh_token: tokens.refresh_token || existing?.refresh_token || undefined,
    expiry_date: tokens.expiry_date || existing?.expiry_date || undefined,
    updatedAt: new Date().toISOString(),
  };

  writeFileSync(TOKEN_FILE, JSON.stringify(merged, null, 2));
}

/**
 * Get stored GSC OAuth tokens.
 */
export function getTokens(): StoredTokens | null {
  try {
    if (!existsSync(TOKEN_FILE)) return null;
    const data = readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(data) as StoredTokens;
  } catch {
    return null;
  }
}

/**
 * Check if tokens exist and are potentially valid.
 */
export function hasTokens(): boolean {
  const tokens = getTokens();
  return !!tokens?.access_token;
}

/**
 * Clear stored tokens.
 */
export function clearTokens(): void {
  try {
    if (existsSync(TOKEN_FILE)) {
      writeFileSync(TOKEN_FILE, "{}");
    }
  } catch {
    // Ignore errors
  }
}
