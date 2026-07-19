import { z } from "zod";

import { upsertFeeRuleHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const upsertFeeRuleInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  feeRuleId: z.string().min(1).optional(),
  saleWindowId: z.string().min(1).optional(),
  saleOfferId: z.string().min(1).optional(),
  name: z.string().min(1),
  displayOrder: z.number().int().min(0),
  payer: z.enum(["BUYER", "EVENT_ORGANIZER"]),
  currency: z.string().length(3),
  rateBasisPoints: z.number().int().min(0),
  flatAmount: z.number().int().min(0),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const upsertFeeRuleRoute = protectedProcedure
  .route({
    method: "PUT",
    path: "/organizer/events/{eventId}/fee-rules",
    summary: "Upsert fee rule",
  })
  .input(upsertFeeRuleInputSchema)
  .output(mutationOutputSchema)
  .handler(upsertFeeRuleHandler);
