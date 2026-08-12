import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// Single shared PrismaClient (and connection pool) across hot reloads in
// dev and across warm serverless-function invocations in production —
// without this, Next.js's dev-mode module reloading (and, on Vercel,
// function reuse between requests) would otherwise open a fresh Postgres
// connection pool on every request.
declare global {
  // eslint-disable-next-line no-var
  var __botrailPrisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __botrailPgPool: Pool | undefined;
}

function buildClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const pool = globalThis.__botrailPgPool ?? new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  globalThis.__botrailPgPool = pool;
  return new PrismaClient({ adapter });
}

// Cached on globalThis unconditionally, not just in dev: a Vercel
// serverless function instance can stay warm across multiple invocations
// within the same process, and reusing the pool there matters just as much
// as it does for Next.js dev-mode hot reloading. A cold start gets a fresh
// globalThis (and thus a fresh pool) either way.
export const prisma = globalThis.__botrailPrisma ?? buildClient();
globalThis.__botrailPrisma = prisma;
