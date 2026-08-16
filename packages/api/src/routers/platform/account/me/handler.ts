import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

export async function getMyPlatformAccountHandler({
  context,
}: {
  context: {
    session: {
      user: {
        id: string;
      };
    };
    platformMember: {
      role: "OWNER" | "OPERATOR" | "VIEWER";
    };
  };
}) {
  const user = await db.user.findUnique({
    where: {
      id: context.session.user.id,
    },
  });

  if (!user) {
    throw new ORPCError("FORBIDDEN");
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: context.platformMember.role,
  };
}
