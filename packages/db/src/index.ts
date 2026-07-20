import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@ticket-app/env/server";

import { PrismaClient } from "./generated/prisma/client";

export type { Prisma, PrismaClient } from "./generated/prisma/client";

// globalThis: Node の実行環境全体で共有されるグローバルオブジェクト
const globalForPrisma = globalThis as typeof globalThis & {
  __ticketAppPrismaClient?: PrismaClient; // globalThis に Prisma Clientを保存できる型を追加
};

function createDb() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

export let db: PrismaClient;

if (process.env.NODE_ENV === "production") {
  db = createDb();
} else {
  // 開発環境で `export const db = createDb()` と書いているとホットリロードした際に Prisma Client や DB 接続が増えてしまう
  // globalThis に保存して再利用できるようにする
  db = globalForPrisma.__ticketAppPrismaClient ?? createDb();
  globalForPrisma.__ticketAppPrismaClient = db;
}

export async function disconnectDb() {
  await db.$disconnect();
}
