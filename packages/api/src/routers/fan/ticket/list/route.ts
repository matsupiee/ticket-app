import { z } from "zod";

import { listTicketsHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const listTicketsInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const listTicketsOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      eventId: z.string().min(1),
      eventName: z.string().min(1),
      performanceId: z.string().min(1),
      performanceName: z.string().min(1),
      startsAt: z.string().min(1),
      venueName: z.string().min(1),
      seatCategoryName: z.string().min(1),
      seatLabel: z.string().min(1).optional(),
      entryNumber: z.number().int().min(1).optional(),
      status: z.enum(["ACTIVE", "USED", "CANCELED", "REFUNDED", "VOIDED"]),
      serialNumber: z.string().min(1),
    }),
  ),
  nextCursor: z.string().min(1).optional(),
});

export const listTicketsRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/fan/tickets",
    summary: "List fan tickets",
  })
  .input(listTicketsInputSchema)
  .output(listTicketsOutputSchema)
  .handler(listTicketsHandler);
