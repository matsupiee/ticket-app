import { db } from "@ticket-app/db";
import { describe, expect, it } from "vitest";

import { getFirstOrganizerMembership, requireOrganizerEditor } from "./organizer-access";

describe("getFirstOrganizerMembership", () => {
  it("主催者メンバーがない場合はnullを返す", async () => {
    await expect(getFirstOrganizerMembership(crypto.randomUUID())).resolves.toBeNull();
  });

  it("最初に作成された主催者メンバーと主催者を返す", async () => {
    const suffix = crypto.randomUUID();
    const user = await db.user.create({
      data: {
        name: "Organizer Access Integration",
        email: `organizer-access-${suffix}@example.com`,
      },
    });
    const firstOrganizer = await db.organizer.create({
      data: {
        name: `First Organizer ${suffix}`,
        slug: `first-organizer-${suffix}`,
        inquiryEmail: `first-${suffix}@example.com`,
        company: {
          create: {
            name: `First Company ${suffix}`,
          },
        },
      },
    });
    const secondOrganizer = await db.organizer.create({
      data: {
        name: `Second Organizer ${suffix}`,
        slug: `second-organizer-${suffix}`,
        inquiryEmail: `second-${suffix}@example.com`,
        company: {
          create: {
            name: `Second Company ${suffix}`,
          },
        },
      },
    });
    await db.organizerMember.create({
      data: {
        userId: user.id,
        organizerId: secondOrganizer.id,
        role: "EDITOR",
        createdAt: new Date("2026-07-20T00:00:02.000Z"),
      },
    });
    await db.organizerMember.create({
      data: {
        userId: user.id,
        organizerId: firstOrganizer.id,
        role: "VIEWER",
        createdAt: new Date("2026-07-20T00:00:01.000Z"),
      },
    });

    await expect(getFirstOrganizerMembership(user.id)).resolves.toMatchObject({
      userId: user.id,
      organizerId: firstOrganizer.id,
      role: "VIEWER",
      organizer: {
        id: firstOrganizer.id,
        name: firstOrganizer.name,
        slug: firstOrganizer.slug,
      },
    });
  });
});

describe("requireOrganizerEditor", () => {
  it("EDITORの主催者メンバーを返す", async () => {
    const suffix = crypto.randomUUID();
    const user = await db.user.create({
      data: {
        name: "Organizer Editor Integration",
        email: `organizer-editor-${suffix}@example.com`,
      },
    });
    const organizer = await db.organizer.create({
      data: {
        name: `Editor Organizer ${suffix}`,
        slug: `editor-organizer-${suffix}`,
        inquiryEmail: `editor-${suffix}@example.com`,
        company: {
          create: {
            name: `Editor Company ${suffix}`,
          },
        },
      },
    });
    const member = await db.organizerMember.create({
      data: {
        userId: user.id,
        organizerId: organizer.id,
        role: "EDITOR",
      },
    });

    await expect(
      requireOrganizerEditor({
        organizerId: organizer.id,
        userId: user.id,
      }),
    ).resolves.toMatchObject({
      id: member.id,
      role: "EDITOR",
    });
  });

  it("VIEWERの主催者メンバーはFORBIDDENにする", async () => {
    const suffix = crypto.randomUUID();
    const user = await db.user.create({
      data: {
        name: "Organizer Viewer Integration",
        email: `organizer-viewer-${suffix}@example.com`,
      },
    });
    const organizer = await db.organizer.create({
      data: {
        name: `Viewer Organizer ${suffix}`,
        slug: `viewer-organizer-${suffix}`,
        inquiryEmail: `viewer-${suffix}@example.com`,
        company: {
          create: {
            name: `Viewer Company ${suffix}`,
          },
        },
      },
    });
    await db.organizerMember.create({
      data: {
        userId: user.id,
        organizerId: organizer.id,
        role: "VIEWER",
      },
    });

    await expect(
      requireOrganizerEditor({
        organizerId: organizer.id,
        userId: user.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("未所属ユーザーはFORBIDDENにする", async () => {
    const suffix = crypto.randomUUID();
    const user = await db.user.create({
      data: {
        name: "Organizer Non Member Integration",
        email: `organizer-non-member-${suffix}@example.com`,
      },
    });
    const organizer = await db.organizer.create({
      data: {
        name: `Non Member Organizer ${suffix}`,
        slug: `non-member-organizer-${suffix}`,
        inquiryEmail: `non-member-${suffix}@example.com`,
        company: {
          create: {
            name: `Non Member Company ${suffix}`,
          },
        },
      },
    });

    await expect(
      requireOrganizerEditor({
        organizerId: organizer.id,
        userId: user.id,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
