import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@ticket-app/env/server";

import { PrismaClient } from "./generated/prisma/client";

export type { Prisma, PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __ticketAppPrisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const db = globalForPrisma.__ticketAppPrisma ?? new PrismaClient({ adapter });

if (typeof process === "undefined" || process.env.NODE_ENV !== "production") {
  globalForPrisma.__ticketAppPrisma = db;
}

export function createDb() {
  return db;
}
