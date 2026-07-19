import { z } from "zod";

import { listSettlementsHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const listSettlementsInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  cursor: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  status: z.enum(["SCHEDULED", "PROCESSING", "PAID"]).optional(),
});

const listSettlementsOutputSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      periodStart: z.string().min(1),
      periodEnd: z.string().min(1),
      status: z.enum(["SCHEDULED", "PROCESSING", "PAID"]),
      transferredAt: z.string().min(1).optional(),
      totalSalesAmount: z.number().int().min(0),
      feeAmount: z.number().int().min(0),
      transferFeeAmount: z.number().int().min(0),
      netAmount: z.number().int().min(0),
    }),
  ),
  nextCursor: z.string().min(1).optional(),
});

export const listSettlementsRoute = protectedProcedure
  .route({
    method: "GET",
    path: "/organizer/settlements",
    summary: "List organizer settlements",
  })
  .input(listSettlementsInputSchema)
  .output(listSettlementsOutputSchema)
  .handler(listSettlementsHandler);
