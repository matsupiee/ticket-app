import { z } from "zod";

import { disableFeeRuleHandler } from "../../../handlers/organizer-event/disable-fee-rule";
import { protectedProcedure } from "../../../index";

const disableFeeRuleInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  feeRuleId: z.string().min(1),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const disableFeeRuleRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/events/{eventId}/fee-rules/{feeRuleId}/disable",
    summary: "Disable fee rule",
  })
  .input(disableFeeRuleInputSchema)
  .output(mutationOutputSchema)
  .handler(disableFeeRuleHandler);
