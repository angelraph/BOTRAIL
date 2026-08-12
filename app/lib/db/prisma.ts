import { PrismaClient } from "../../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Single shared PrismaClient across hot reloads in dev (Next.js reloads
// modules on every request in dev mode, which would otherwise open a new
// SQLite connection each time).
declare global {
  // eslint-disable-next-line no-var
  var __botrailPrisma: PrismaClient | undefined;
}

function buildClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__botrailPrisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__botrailPrisma = prisma;
}
