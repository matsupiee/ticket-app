import { db } from "@ticket-app/db";
import { describe, expect, it } from "vitest";

import { requirePlatformMember } from "./require-platform-member";

describe("requirePlatformMember", () => {
  it("PlatformMemberがない場合はFORBIDDENを投げる", async () => {
    const user = await db.user.create({
      data: {
        name: "Require Platform Member Integration",
        email: `require-platform-member-${crypto.randomUUID()}@example.com`,
      },
    });

    await expect(requirePlatformMember(user.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("存在しないユーザーIDの場合もFORBIDDENを投げる", async () => {
    await expect(requirePlatformMember(crypto.randomUUID())).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("PlatformMemberがある場合はロールとユーザーを返す", async () => {
    const suffix = crypto.randomUUID();
    const user = await db.user.create({
      data: {
        name: "Require Platform Member Integration",
        email: `require-platform-member-${suffix}@example.com`,
      },
    });
    await db.platformMember.create({
      data: {
        userId: user.id,
        role: "VIEWER",
      },
    });

    await expect(requirePlatformMember(user.id)).resolves.toMatchObject({
      userId: user.id,
      role: "VIEWER",
      user: {
        id: user.id,
        email: `require-platform-member-${suffix}@example.com`,
      },
    });
  });
});
