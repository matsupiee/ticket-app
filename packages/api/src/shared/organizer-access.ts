import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

export async function requireOrganizerEditor(input: { organizerId: string; userId: string }) {
  const member = await db.organizerMember.findUnique({
    where: {
      userId_organizerId: {
        userId: input.userId,
        organizerId: input.organizerId,
      },
    },
  });

  if (!member) {
    throw new ORPCError("FORBIDDEN");
  }

  if (member.role !== "EDITOR") {
    throw new ORPCError("FORBIDDEN");
  }

  return member;
}

export async function getFirstOrganizerMembership(userId: string) {
  const member = await db.organizerMember.findFirst({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!member) {
    return null;
  }

  const organizer = await db.organizer.findUnique({
    where: {
      id: member.organizerId,
    },
  });

  if (!organizer) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  return {
    ...member,
    organizer,
  };
}
