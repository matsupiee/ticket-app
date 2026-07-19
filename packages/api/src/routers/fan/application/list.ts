import { z } from "zod";

import { listApplicationsHandler } from "../../../handlers/application/list-applications";
import { protectedProcedure } from "../../../index";

const paginationInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const listApplicationsOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      eventId: z.string().min(1),
      eventName: z.string().min(1),
      saleWindowName: z.string().min(1),
      status: z.enum(["APPLIED", "DECIDED", "CANCELED", "EXPIRED"]),
      appliedAt: z.string().min(1),
      lotteryResult: z.enum(["PENDING", "WON", "LOST"]).optional(),
      totalAmount: z.number().int().min(0).optional(),
      currency: z.string().length(3).optional(),
    }),
  ),
  nextCursor: z.string().min(1).optional(),
});

export const listApplicationsRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/fan/applications",
    summary: "List fan applications",
  })
  .input(paginationInputSchema)
  .output(listApplicationsOutputSchema)
  .handler(listApplicationsHandler);
