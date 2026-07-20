import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

import { getFirstOrganizerMembership } from "../../../../shared/organizer-access";

type CreatedOrganizerAccountRow = {
  eventOrganizerId: string;
  name: string;
  slug: string;
  role: "VIEWER" | "EDITOR";
};

export async function signUpOrganizerAccountHandler({
  input,
  context,
}: {
  input: {
    organizerName: string;
  };
  context: {
    session: {
      user: {
        id: string;
        email: string;
      };
    };
  };
}) {
  const existingMembership = await getFirstOrganizerMembership(context.session.user.id);

  if (existingMembership) {
    return {
      eventOrganizerId: existingMembership.organizerId,
      name: existingMembership.organizer.name,
      slug: existingMembership.organizer.slug,
      role: existingMembership.role,
    };
  }

  const slug = await buildUniqueOrganizerSlug(input.organizerName, context.session.user.email);
  const companyId = crypto.randomUUID();
  const organizerId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  // Keep this as one raw SQL statement: Miniflare hangs on Prisma model writes for these tables.
  const [account] = await db.$queryRaw<CreatedOrganizerAccountRow[]>`
    WITH new_company AS (
      INSERT INTO "Company" (id, name, "createdAt", "updatedAt")
      VALUES (${companyId}, ${`${input.organizerName} 運営会社 (${slug})`}, now(), now())
      RETURNING id
    ),
    new_organizer AS (
      INSERT INTO "Organizer" (
        id,
        name,
        slug,
        "companyId",
        "inquiryEmail",
        "createdAt",
        "updatedAt"
      )
      SELECT
        ${organizerId},
        ${input.organizerName},
        ${slug},
        id,
        ${context.session.user.email},
        now(),
        now()
      FROM new_company
      RETURNING id, name, slug
    ),
    new_member AS (
      INSERT INTO "OrganizerMember" (
        id,
        "userId",
        "organizerId",
        role,
        "createdAt",
        "updatedAt"
      )
      SELECT
        ${memberId},
        ${context.session.user.id},
        id,
        'EDITOR'::"OrganizerMemberRole",
        now(),
        now()
      FROM new_organizer
      RETURNING role
    )
    SELECT
      o.id AS "eventOrganizerId",
      o.name,
      o.slug,
      m.role
    FROM new_organizer o
    CROSS JOIN new_member m
  `;

  if (!account) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  return {
    eventOrganizerId: account.eventOrganizerId,
    name: account.name,
    slug: account.slug,
    role: account.role,
  };
}

async function buildUniqueOrganizerSlug(name: string, email: string) {
  const baseSlug = toSlug(name) || toSlug(email.split("@")[0] ?? "") || "organizer";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const [existing] = await db.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM "Organizer"
      WHERE slug = ${slug}
      LIMIT 1
    `;

    if (!existing) {
      return slug;
    }
  }

  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

function toSlug(value: string) {
  return value
    .toLocaleLowerCase("ja-JP")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
