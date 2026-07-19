import { db } from "@ticket-app/db";

import { getFirstOrganizerMembership } from "../../../../shared/organizer-access";

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
  const result = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: `${input.organizerName} 運営会社 (${slug})`,
      },
    });
    const organizer = await tx.organizer.create({
      data: {
        name: input.organizerName,
        slug,
        companyId: company.id,
        inquiryEmail: context.session.user.email,
      },
    });
    const member = await tx.organizerMember.create({
      data: {
        userId: context.session.user.id,
        organizerId: organizer.id,
        role: "EDITOR",
      },
    });

    return {
      organizer,
      member,
    };
  });

  return {
    eventOrganizerId: result.organizer.id,
    name: result.organizer.name,
    slug: result.organizer.slug,
    role: result.member.role,
  };
}

async function buildUniqueOrganizerSlug(name: string, email: string) {
  const baseSlug = toSlug(name) || toSlug(email.split("@")[0] ?? "") || "organizer";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const existing = await db.organizer.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

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
