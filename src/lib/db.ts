import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export function getPrisma(): PrismaClient {
  if (global.__prisma) return global.__prisma;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  global.__prisma = new PrismaClient({
    datasourceUrl: url,
  });
  return global.__prisma;
}

export type { DriveToken, DriveDocument, DriveChunk } from "@prisma/client";
