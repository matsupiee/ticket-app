import { ORPCError } from "@orpc/server";

import { getFirstOrganizerMembership } from "../../../../shared/organizer-access";

export async function getMyOrganizerAccountHandler({
  context,
}: {
  context: {
    session: {
      user: {
        id: string;
      };
    };
  };
}) {
  const membership = await getFirstOrganizerMembership(context.session.user.id);

  if (!membership) {
    throw new ORPCError("FORBIDDEN");
  }

  return {
    eventOrganizerId: membership.organizerId,
    name: membership.organizer.name,
    slug: membership.organizer.slug,
    role: membership.role,
  };
}
