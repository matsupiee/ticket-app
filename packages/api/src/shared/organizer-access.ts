import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

type OrganizerMembershipRow = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  organizerId: string;
  role: "VIEWER" | "EDITOR";
  organizerCreatedAt: Date;
  organizerUpdatedAt: Date;
  organizerName: string;
  organizerSlug: string;
  organizerCompanyId: string;
  organizerInquiryEmail: string | null;
  organizerInquiryPhoneNumber: string | null;
};

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
  // Miniflare hangs on Prisma relation reads for these quoted tables, so keep this lookup raw.
  const [member] = await db.$queryRaw<OrganizerMembershipRow[]>`
    SELECT
      m.id,
      m."createdAt",
      m."updatedAt",
      m."userId",
      m."organizerId",
      m.role,
      o."createdAt" AS "organizerCreatedAt",
      o."updatedAt" AS "organizerUpdatedAt",
      o.name AS "organizerName",
      o.slug AS "organizerSlug",
      o."companyId" AS "organizerCompanyId",
      o."inquiryEmail" AS "organizerInquiryEmail",
      o."inquiryPhoneNumber" AS "organizerInquiryPhoneNumber"
    FROM "OrganizerMember" m
    INNER JOIN "Organizer" o ON o.id = m."organizerId"
    WHERE m."userId" = ${userId}
    ORDER BY m."createdAt" ASC
    LIMIT 1
  `;

  if (!member) {
    return null;
  }

  return {
    id: member.id,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
    userId: member.userId,
    organizerId: member.organizerId,
    role: member.role,
    organizer: {
      id: member.organizerId,
      createdAt: member.organizerCreatedAt,
      updatedAt: member.organizerUpdatedAt,
      name: member.organizerName,
      slug: member.organizerSlug,
      companyId: member.organizerCompanyId,
      inquiryEmail: member.organizerInquiryEmail,
      inquiryPhoneNumber: member.organizerInquiryPhoneNumber,
    },
  };
}
