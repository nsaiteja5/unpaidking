import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool, type PoolOptions } from "mysql2/promise";
import { loadEnvConfig } from "@next/env";
import * as schema from "./schema";
import { ensureDatabaseReady } from "./bootstrap";

loadEnvConfig(process.cwd());

declare global {
  var unpaidKingPool: Pool | undefined;
}

function parsePoolConfig(rawUrl: string): PoolOptions {
  try {
    const url = new URL(rawUrl);
    const sslMode = url.searchParams.get("ssl-mode") || url.searchParams.get("sslmode");
    
    // Remove unrecognized query parameters so mysql2 won't emit warnings or throw errors
    url.searchParams.delete("ssl-mode");
    url.searchParams.delete("sslmode");

    const isRemote = url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
    const useSsl = Boolean(sslMode) || isRemote;

    return {
      uri: url.toString(),
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
    };
  } catch {
    return { uri: rawUrl };
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

export const pool = global.unpaidKingPool ?? createPool(parsePoolConfig(databaseUrl));
if (process.env.NODE_ENV !== "production") {
  global.unpaidKingPool = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });

// Automatically trigger database schema & table bootstrap in the background
ensureDatabaseReady(pool).catch((err) => {
  console.error("[db] Background database bootstrap error:", err);
});

export { ensureDatabaseReady };
