import { describe, expect, it } from "vitest";

import { checkDependencyPolicy } from "./check-dependency-policy";

describe("checkDependencyPolicy", () => {
  it("allows Prisma adapter dependencies", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/db/package.json",
        source: JSON.stringify({
          dependencies: {
            "@prisma/adapter-pg": "7.8.0",
            "@prisma/client": "7.8.0",
          },
        }),
      },
    ]);

    expect(issues).toEqual([]);
  });

  it("reports direct pg dependencies", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/db/package.json",
        source: JSON.stringify({
          dependencies: {
            pg: "8.22.0",
          },
          devDependencies: {
            "@types/pg": "8.20.0",
          },
        }),
      },
    ]);

    expect(issues).toEqual([
      {
        path: "packages/db/package.json",
        rule: "direct database dependency",
        message:
          "dependencies に pg を直接追加しないでください。DBアクセスは @ticket-app/db のPrismaクライアントに集約してください。",
      },
      {
        path: "packages/db/package.json",
        rule: "direct database dependency",
        message:
          "devDependencies に @types/pg を直接追加しないでください。DBアクセスは @ticket-app/db のPrismaクライアントに集約してください。",
      },
    ]);
  });

  it("reports direct postgres client imports", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/db/src/postgres.ts",
        source: `
          import pg from "pg";
          const postgres = await import("postgres");
        `,
      },
    ]);

    expect(issues).toEqual([
      {
        path: "packages/db/src/postgres.ts",
        line: 2,
        rule: "direct database import",
        message:
          "pg を直接importしないでください。DBアクセスは @ticket-app/db のPrismaクライアントに集約してください。",
      },
      {
        path: "packages/db/src/postgres.ts",
        line: 3,
        rule: "direct database import",
        message:
          "postgres を直接importしないでください。DBアクセスは @ticket-app/db のPrismaクライアントに集約してください。",
      },
    ]);
  });

  it("ignores comments and generated Prisma imports", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/api/src/index.ts",
        source: `// import pg from "pg";`,
      },
      {
        path: "packages/db/src/generated/prisma/client.ts",
        source: `import "postgres-array";`,
      },
    ]);

    expect(issues).toEqual([]);
  });

  it("reports raw Prisma queries in API implementation", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/api/src/routers/organizer/account/sign-up/handler.ts",
        source: `
          await db.$queryRaw\`SELECT 1\`;
        `,
      },
    ]);

    expect(issues).toEqual([
      {
        path: "packages/api/src/routers/organizer/account/sign-up/handler.ts",
        line: 2,
        rule: "raw Prisma query",
        message:
          "API実装でPrisma raw queryを使わないでください。必要な場合はADRで理由と削除条件を残してください。",
      },
    ]);
  });

  it("reports bracket raw Prisma queries in API implementation", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/api/src/routers/organizer/account/sign-up/handler.ts",
        source: `
          await db["$queryRaw"]\`SELECT 1\`;
        `,
      },
    ]);

    expect(issues).toEqual([
      {
        path: "packages/api/src/routers/organizer/account/sign-up/handler.ts",
        line: 2,
        rule: "raw Prisma query",
        message:
          "API実装でPrisma raw queryを使わないでください。必要な場合はADRで理由と削除条件を残してください。",
      },
    ]);
  });

  it("reports typed raw Prisma queries in API implementation", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/api/src/routers/organizer/account/sign-up/handler.ts",
        source: `
          await db.$queryRawTyped(query);
        `,
      },
    ]);

    expect(issues).toEqual([
      {
        path: "packages/api/src/routers/organizer/account/sign-up/handler.ts",
        line: 2,
        rule: "raw Prisma query",
        message:
          "API実装でPrisma raw queryを使わないでください。必要な場合はADRで理由と削除条件を残してください。",
      },
    ]);
  });

  it("reports PrismaClient construction outside the db package boundary", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/api/src/db.ts",
        source: `
          import { PrismaClient as Client } from "@ticket-app/db";
          const db = new Client();
        `,
      },
      {
        path: "packages/db/src/index.ts",
        source: `
          const db = new PrismaClient();
        `,
      },
    ]);

    expect(issues).toEqual([
      {
        path: "packages/api/src/db.ts",
        line: 3,
        rule: "direct Prisma client construction",
        message:
          "PrismaClientを直接newしないでください。DB clientのライフサイクルは @ticket-app/db に集約してください。",
      },
    ]);
  });

  it("reports createDb imports outside the db package boundary", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/api/src/db.ts",
        source: `
          import { createDb } from "@ticket-app/db";
        `,
      },
      {
        path: "packages/db/src/index.ts",
        source: `
          import { createDb } from "@ticket-app/db";
        `,
      },
    ]);

    expect(issues).toEqual([
      {
        path: "packages/api/src/db.ts",
        line: 2,
        rule: "direct db client factory import",
        message:
          "createDbをDBパッケージ外からimportしないでください。Prisma Clientのsingletonは @ticket-app/db のdbに集約してください。",
      },
    ]);
  });

  it("allows Prisma transactions through the shared db client", () => {
    const issues = checkDependencyPolicy([
      {
        path: "packages/api/src/routers/organizer/account/sign-up/handler.ts",
        source: `
          await db.$transaction([db.user.findMany()]);
        `,
      },
    ]);

    expect(issues).toEqual([]);
  });
});
