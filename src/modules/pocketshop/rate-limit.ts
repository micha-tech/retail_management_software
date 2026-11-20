import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db/client";

type LimitRow = { attempts: number; window_start: Date };

/** Database-backed limiter so it works across serverless instances. */
export async function consumeRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const threshold = new Date(now.getTime() - windowMs);
  const nowValue = now.toISOString();
  const thresholdValue = threshold.toISOString();
  const rows = await db.execute<LimitRow>(sql`
    INSERT INTO ps_rate_limits (key, attempts, window_start)
    VALUES (${key}, 1, ${nowValue})
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN ps_rate_limits.window_start < ${thresholdValue} THEN 1 ELSE ps_rate_limits.attempts + 1 END,
      window_start = CASE WHEN ps_rate_limits.window_start < ${thresholdValue} THEN ${nowValue} ELSE ps_rate_limits.window_start END
    RETURNING attempts, window_start
  `);
  return (rows[0]?.attempts ?? limit + 1) <= limit;
}

export function clientKey(requestHeaders: Headers, scope: string) {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || requestHeaders.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}
