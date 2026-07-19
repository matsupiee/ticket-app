import { describe, expect, it } from "vitest";

import { checkCodingPatterns } from "./check-coding-patterns";

describe("checkCodingPatterns", () => {
  it("backend and frontend directories that follow docs/coding-pattern pass", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/fan/event/get/handler.ts",
        "packages/api/src/routers/fan/event/get/route.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
        "apps/web/src/features/event/_components/event-card.tsx",
        "apps/web/src/features/event/_utils/ticketing.ts",
        "apps/web/src/features/event/detail/page.tsx",
        "apps/web/src/lib/orpc.ts",
        "apps/web/src/main.tsx",
        "apps/web/src/routes/index.tsx",
        "apps/web/src/shared/_components/header.tsx",
      ],
    });

    expect(issues).toEqual([]);
  });

  it("reports backend router files that are not route directories", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/fan/event/get.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
        "packages/api/src/handlers/event/get.ts",
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "packages/api/src/handlers/event/get.ts",
          rule: "backend legacy handlers",
        }),
        expect.objectContaining({
          path: "packages/api/src/routers/fan/event/get.ts",
          rule: "backend route file",
        }),
      ]),
    );
  });

  it("reports backend route directories missing route.ts or handler.ts", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/fan/application/submit/route.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
      ],
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        path: "packages/api/src/routers/fan/application/submit/handler.ts",
        rule: "backend route pair",
      }),
    );
  });

  it("reports router roots outside fan organizer and platform", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
        "packages/api/src/routers/system/health-check/handler.ts",
        "packages/api/src/routers/system/health-check/route.ts",
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "packages/api/src/routers/system",
          rule: "backend routers",
        }),
        expect.objectContaining({
          path: "packages/api/src/routers/system/health-check/route.ts",
          rule: "backend route root",
        }),
      ]),
    );
  });

  it("reports frontend helper directories that are outside the vertical slice convention", () => {
    const issues = checkCodingPatterns({
      files: [
        "apps/web/src/features/event/components/event-card.tsx",
        "apps/web/src/routes/index.tsx",
        "apps/web/src/shared/components/header.tsx",
        "apps/web/src/utils/orpc.ts",
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "apps/web/src/features/event/components",
          rule: "frontend layer directory",
        }),
        expect.objectContaining({
          path: "apps/web/src/shared/components",
          rule: "frontend layer directory",
        }),
        expect.objectContaining({
          path: "apps/web/src/utils",
          rule: "frontend src directory",
        }),
      ]),
    );
  });
});
