import { z } from "zod";

import { useTicketHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const useTicketInputSchema = z.object({
  ticketId: z.string().min(1),
});

const useTicketOutputSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "USED", "CANCELED", "REFUNDED", "VOIDED"]),
  usedAt: z.string().min(1),
});

export const useTicketRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/fan/tickets/{ticketId}/use",
    summary: "Use fan ticket for admission",
  })
  .input(useTicketInputSchema)
  .output(useTicketOutputSchema)
  .handler(useTicketHandler);
