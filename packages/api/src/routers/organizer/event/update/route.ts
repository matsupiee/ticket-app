import { z } from "zod";

import { handler } from "./handler";
import { protectedProcedure } from "../../../../index";

const updateEventInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
});

const updateEventOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;
export type UpdateEventOutput = z.infer<typeof updateEventOutputSchema>;

export const updateEventRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/organizer/events/{eventId}",
    summary: "Update organizer event settings",
  })
  .input(updateEventInputSchema)
  .output(updateEventOutputSchema)
  .handler(handler);
