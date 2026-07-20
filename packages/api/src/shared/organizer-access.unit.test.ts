import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    organizerMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    organizer: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@ticket-app/db", () => ({
  db: mocks.db,
}));

import { getFirstOrganizerMembership } from "./organizer-access";

describe("getFirstOrganizerMembership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("主催者メンバーがない場合は主催者を読まない", async () => {
    mocks.db.organizerMember.findFirst.mockResolvedValue(null);

    await expect(getFirstOrganizerMembership("user-1")).resolves.toBeNull();
    expect(mocks.db.organizer.findUnique).not.toHaveBeenCalled();
  });

  it("メンバーと主催者を個別に読み込む", async () => {
    mocks.db.organizerMember.findFirst.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      organizerId: "organizer-1",
      role: "EDITOR",
    });
    mocks.db.organizer.findUnique.mockResolvedValue({
      id: "organizer-1",
      name: "Shinjuku Live",
      slug: "shinjuku-live",
    });

    await expect(getFirstOrganizerMembership("user-1")).resolves.toEqual({
      id: "member-1",
      userId: "user-1",
      organizerId: "organizer-1",
      role: "EDITOR",
      organizer: {
        id: "organizer-1",
        name: "Shinjuku Live",
        slug: "shinjuku-live",
      },
    });
    expect(mocks.db.organizerMember.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    expect(mocks.db.organizer.findUnique).toHaveBeenCalledWith({
      where: {
        id: "organizer-1",
      },
    });
  });

  it("メンバーの主催者が存在しない場合は内部エラーにする", async () => {
    mocks.db.organizerMember.findFirst.mockResolvedValue({
      id: "member-1",
      userId: "user-1",
      organizerId: "missing-organizer",
      role: "EDITOR",
    });
    mocks.db.organizer.findUnique.mockResolvedValue(null);

    await expect(getFirstOrganizerMembership("user-1")).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
