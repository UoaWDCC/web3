import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const normalizeDatabaseUrl = (value?: string) => {
  if (!value) return undefined;
  return value.trim().replace(/^['\"]+|['\"]+$/g, "");
};

const createPrismaClient = () => {
  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  let protocol: string;
  try {
    protocol = new URL(databaseUrl).protocol;
  } catch {
    throw new Error(
      "DATABASE_URL is invalid. Check for extra quotes or invalid characters.",
    );
  }

  if (protocol !== "postgresql:" && protocol !== "postgres:") {
    throw new Error("DATABASE_URL must start with postgresql:// or postgres://");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

/**
 * Lazy Prisma accessor.
 * Safe to import during `next build` because it does not read env / connect
 * until you call it inside a request handler.
 */
export const getPrisma = (): PrismaClient => {
      globalThis.prismaGlobal ??= createPrismaClient();
    return globalThis.prismaGlobal;
};
