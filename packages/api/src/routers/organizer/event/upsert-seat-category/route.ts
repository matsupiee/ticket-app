import { z } from "zod";

import { upsertSeatCategoryHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const upsertSeatCategoryInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  seatCategoryId: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string(),
  active: z.boolean(),
  displayOrder: z.number().int().min(0),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type UpsertSeatCategoryInput = z.infer<typeof upsertSeatCategoryInputSchema>;
export type UpsertSeatCategoryOutput = z.infer<typeof mutationOutputSchema>;

export const upsertSeatCategoryRoute = protectedProcedure
  .route({
    method: "PUT",
    path: "/organizer/events/{eventId}/seat-categories",
    summary: "Upsert seat category",
  })
  .input(upsertSeatCategoryInputSchema)
  .output(mutationOutputSchema)
  .handler(upsertSeatCategoryHandler);
