import { describe, expect, it } from "vitest";

import { checkCodingPatterns } from "./check-coding-patterns";

describe("checkCodingPatterns", () => {
  it("backend and frontend directories that follow docs/coding-pattern pass", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/fan/event/get/handler.ts",
        "packages/api/src/routers/fan/event/get/handler.integration.test.ts",
        "packages/api/src/routers/fan/event/get/route.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
        "apps/web/src/features/event/_components/event-card.tsx",
        "apps/web/src/features/event/_components/event-card.unit.test.tsx",
        "apps/web/src/features/event/_utils/ticketing.ts",
        "apps/web/src/features/event/detail/page.tsx",
        "apps/web/src/lib/orpc.ts",
        "apps/web/src/main.tsx",
        "apps/web/src/routes/index.tsx",
        "apps/web/src/routes/events.$eventId.apply.tsx",
        "apps/web/src/shared/_components/header.tsx",
        "packages/db/src/generated/prisma/models/ApplicationPreference.ts",
        "scripts/check-coding-patterns.unit.test.ts",
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

  it("reports backend route directories missing required files", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/fan/application/submit/handler.ts",
        "packages/api/src/routers/fan/application/submit/route.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
      ],
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        path: "packages/api/src/routers/fan/application/submit/handler.integration.test.ts",
        rule: "backend route files",
      }),
    );
  });

  it("reports backend route directories that contain files outside the required three", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/fan/event/list/handler.ts",
        "packages/api/src/routers/fan/event/list/handler.integration.test.ts",
        "packages/api/src/routers/fan/event/list/handler.unit.test.ts",
        "packages/api/src/routers/fan/event/list/route.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
      ],
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        path: "packages/api/src/routers/fan/event/list/handler.unit.test.ts",
        rule: "backend route file",
      }),
    );
  });

  it("reports API test files placed under src/test", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/fan/event/get/handler.ts",
        "packages/api/src/routers/fan/event/get/handler.integration.test.ts",
        "packages/api/src/routers/fan/event/get/route.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
        "packages/api/src/test/global-setup.ts",
        "packages/api/src/test/organizer-event-summary.unit.test.ts",
      ],
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        path: "packages/api/src/test/organizer-event-summary.unit.test.ts",
        rule: "api test placement",
      }),
    );
    expect(issues).not.toContainEqual(
      expect.objectContaining({
        path: "packages/api/src/test/global-setup.ts",
        rule: "api test placement",
      }),
    );
  });

  it("reports backend index files outside routers root and router type roots", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/event/index.ts",
        "packages/api/src/routers/fan/event/get/handler.ts",
        "packages/api/src/routers/fan/event/get/handler.integration.test.ts",
        "packages/api/src/routers/fan/event/get/route.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
      ],
    });

    expect(issues).toContainEqual(
      expect.objectContaining({
        path: "packages/api/src/routers/fan/event/index.ts",
        rule: "backend route index",
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

  it("reports implementation files that are not kebab-case", () => {
    const issues = checkCodingPatterns({
      files: [
        "packages/api/src/routers/index.ts",
        "packages/api/src/routers/fan/index.ts",
        "packages/api/src/routers/fan/event/get/handler.ts",
        "packages/api/src/routers/fan/event/get/handler.integration.test.ts",
        "packages/api/src/routers/fan/event/get/route.ts",
        "packages/api/src/routers/organizer/index.ts",
        "packages/api/src/routers/platform/index.ts",
        "apps/web/src/features/event/_components/eventCard.tsx",
        "apps/web/src/features/event/_utils/eventLabels.unit.test.ts",
        "apps/web/src/lib/authClient.ts",
        "scripts/checkCodingPatterns.ts",
      ],
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "apps/web/src/features/event/_components/eventCard.tsx",
          rule: "file naming",
        }),
        expect.objectContaining({
          path: "apps/web/src/features/event/_utils/eventLabels.unit.test.ts",
          rule: "file naming",
        }),
        expect.objectContaining({
          path: "apps/web/src/lib/authClient.ts",
          rule: "file naming",
        }),
        expect.objectContaining({
          path: "scripts/checkCodingPatterns.ts",
          rule: "file naming",
        }),
      ]),
    );
  });
});
