import { z } from "zod";

import { updateEventHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const updateEventInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  status: z.enum(["DRAFT", "ON_SALE", "PAUSED", "ENDED", "CANCELED"]),
  location: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
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
