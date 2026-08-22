import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const upsertRateTypeInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  rateTypeId: z.string().min(1).optional(),
  name: z.string().min(1),
  displayOrder: z.number().int().min(0),
});

const upsertRateTypeOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type UpsertRateTypeInput = z.infer<typeof upsertRateTypeInputSchema>;
export type UpsertRateTypeOutput = z.infer<typeof upsertRateTypeOutputSchema>;

export const upsertRateTypeRoute = protectedProcedure
  .route({
    method: "PUT",
    path: "/organizer/events/{eventId}/rate-types",
    summary: "Upsert rate type",
  })
  .input(upsertRateTypeInputSchema)
  .output(upsertRateTypeOutputSchema)
  .handler(handler);
