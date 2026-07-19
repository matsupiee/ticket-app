import { z } from "zod";

import { createEventHandler } from "../../../handlers/organizer-event/create-event";
import { protectedProcedure } from "../../../index";

const createEventInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const createEventRoute = protectedProcedure
  .route({
    method: "POST",
    path: "/organizer/events",
    summary: "Create organizer event",
  })
  .input(createEventInputSchema)
  .output(mutationOutputSchema)
  .handler(createEventHandler);
