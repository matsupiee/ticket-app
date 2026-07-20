import { z } from "zod";

import { updateEventHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const updateEventInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
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

export const updateEventRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/organizer/events/{eventId}",
    summary: "Update organizer event settings",
  })
  .input(updateEventInputSchema)
  .output(mutationOutputSchema)
  .handler(updateEventHandler);
