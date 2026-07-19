import { z } from "zod";

import { updatePlatformOrganizerStatusHandler } from "./handler";
import { protectedProcedure } from "../../../../index";

const updateStatusInputSchema = z.object({
  organizerId: z.string().min(1),
  status: z.enum(["UNDER_REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"]),
  reason: z.string().min(1).optional(),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const updateStatusRoute = protectedProcedure
  .route({
    method: "PATCH",
    path: "/platform/organizers/{organizerId}/status",
    summary: "Update platform organizer status",
  })
  .input(updateStatusInputSchema)
  .output(mutationOutputSchema)
  .handler(updatePlatformOrganizerStatusHandler);
