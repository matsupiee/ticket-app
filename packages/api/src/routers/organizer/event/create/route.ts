import { z } from "zod";

import { createEventHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const createEventInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  publicTicketing: z
    .object({
      venueName: z.string().min(1),
      performanceName: z.string().min(1),
      doorsOpenAt: z.string().min(1),
      startsAt: z.string().min(1),
      seatCategoryName: z.string().min(1),
      rateTypeName: z.string().min(1),
      price: z.number().int().min(0),
      capacity: z.number().int().min(1).max(10_000),
      maxQuantityPerOrder: z.number().int().min(1).max(20),
      saleWindowName: z.string().min(1),
      saleStartsAt: z.string().min(1),
      saleEndsAt: z.string().min(1),
      saleMethod: z.enum(["FIRST_COME", "LOTTERY"]),
    })
    .optional(),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;
export type CreateEventOutput = z.infer<typeof mutationOutputSchema>;

export const createEventRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/events",
    summary: "Create organizer event",
  })
  .input(createEventInputSchema)
  .output(mutationOutputSchema)
  .handler(createEventHandler);
