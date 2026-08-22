import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const applicationListInputSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const applicationListOutputSchema = z.object({
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

export const applicationListRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/fan/applications",
    summary: "List fan applications",
  })
  .input(applicationListInputSchema)
  .output(applicationListOutputSchema)
  .handler(handler);
