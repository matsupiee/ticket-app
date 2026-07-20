import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    organizer: {
      findUnique: vi.fn(),
    },
    organizerMember: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  getFirstOrganizerMembership: vi.fn(),
}));

vi.mock("@ticket-app/db", () => ({
  db: mocks.db,
}));

vi.mock("../../../../shared/organizer-access", () => ({
  getFirstOrganizerMembership: mocks.getFirstOrganizerMembership,
}));

import { signUpOrganizerAccountHandler } from "./handler";

describe("signUpOrganizerAccountHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("既存の主催者メンバーがある場合は新規作成しない", async () => {
    mocks.getFirstOrganizerMembership.mockResolvedValue({
      organizerId: "organizer-1",
      role: "EDITOR",
      organizer: {
        name: "既存主催者",
        slug: "existing-organizer",
      },
    });

    const result = await signUpOrganizerAccountHandler({
      input: {
        organizerName: "新しい主催者",
      },
      context: {
        session: {
          user: {
            id: "user-1",
            email: "owner@example.com",
          },
        },
      },
    });

    expect(result).toEqual({
      eventOrganizerId: "organizer-1",
      name: "既存主催者",
      slug: "existing-organizer",
      role: "EDITOR",
    });
    expect(mocks.db.organizerMember.create).not.toHaveBeenCalled();
  });

  it("新規登録では会社・主催者・メンバーをネスト作成する", async () => {
    mocks.getFirstOrganizerMembership.mockResolvedValue(null);
    mocks.db.organizer.findUnique.mockResolvedValue(null);
    mocks.db.organizerMember.create.mockResolvedValue({
      role: "EDITOR",
      organizer: {
        id: "organizer-1",
        name: "Shinjuku Live",
        slug: "shinjuku-live",
      },
    });

    const result = await signUpOrganizerAccountHandler({
      input: {
        organizerName: "Shinjuku Live",
      },
      context: {
        session: {
          user: {
            id: "user-1",
            email: "owner@example.com",
          },
        },
      },
    });

    expect(mocks.db.organizerMember.create).toHaveBeenCalledWith({
      data: {
        role: "EDITOR",
        user: {
          connect: {
            id: "user-1",
          },
        },
        organizer: {
          create: {
            name: "Shinjuku Live",
            slug: "shinjuku-live",
            inquiryEmail: "owner@example.com",
            company: {
              create: {
                name: "Shinjuku Live 運営会社 (shinjuku-live)",
              },
            },
          },
        },
      },
      include: {
        organizer: true,
      },
    });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(result).toEqual({
      eventOrganizerId: "organizer-1",
      name: "Shinjuku Live",
      slug: "shinjuku-live",
      role: "EDITOR",
    });
  });
});
