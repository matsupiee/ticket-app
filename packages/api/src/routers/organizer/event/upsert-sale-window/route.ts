import { z } from "zod";

import { upsertSaleWindowHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const upsertSaleWindowInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  saleWindowId: z.string().min(1).optional(),
  name: z.string().min(1),
  publishesAt: z.string().min(1).optional(),
  applicationStartsAt: z.string().min(1),
  applicationEndsAt: z.string().min(1),
  isSmsAuthRequired: z.boolean(),
  method: z.enum(["FIRST_COME", "LOTTERY"]),
  lotteryMode: z.enum(["MANUAL", "AUTO"]),
  notifyLotteryResultAt: z.string().min(1).optional(),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const upsertSaleWindowRoute = protectedProcedure
  .route({
    method: "PUT",
    path: "/organizer/events/{eventId}/sale-windows",
    summary: "Upsert sale window",
  })
  .input(upsertSaleWindowInputSchema)
  .output(mutationOutputSchema)
  .handler(upsertSaleWindowHandler);
