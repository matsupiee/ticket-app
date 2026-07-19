import { ORPCError } from "@orpc/server";
import { db } from "@ticket-app/db";

export async function useTicketHandler({
  input,
  context,
}: {
  input: {
    ticketId: string;
  };
  context: {
    session: {
      user: {
        id: string;
      };
    };
  };
}) {
  const now = new Date();
  const ticket = await db.ticket.findFirst({
    where: {
      id: input.ticketId,
      ownerUserId: context.session.user.id,
    },
    include: {
      ticketEntitlements: true,
    },
  });

  if (!ticket) {
    throw new ORPCError("NOT_FOUND");
  }

  if (ticket.status === "USED") {
    const usedAt = ticket.ticketEntitlements[0]?.usedAt ?? ticket.updatedAt;

    return {
      id: ticket.id,
      status: ticket.status,
      usedAt: usedAt.toISOString(),
    };
  }

  if (ticket.status !== "ACTIVE") {
    throw new ORPCError("BAD_REQUEST", {
      message: "入場に使えないチケットです",
    });
  }

  const updatedTicket = await db.$transaction(async (tx) => {
    await tx.ticketEntitlement.updateMany({
      where: {
        ticketId: ticket.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    return await tx.ticket.update({
      where: {
        id: ticket.id,
      },
      data: {
        status: "USED",
      },
    });
  });

  return {
    id: updatedTicket.id,
    status: updatedTicket.status,
    usedAt: now.toISOString(),
  };
}
