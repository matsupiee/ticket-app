import { z } from "zod";

import { updatePlatformOrganizerStatusHandler } from "./handler";
import { platformProcedure } from "../../../../index";

const updateStatusInputSchema = z.object({
  organizerId: z.string().min(1),
  status: z.enum(["UNDER_REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"]),
  reason: z.string().min(1).optional(),
});

const updateStatusOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const updateStatusRoute = platformProcedure
  .route({
    method: "PATCH",
    path: "/platform/organizers/{organizerId}/status",
    summary: "Update platform organizer status",
  })
  .input(updateStatusInputSchema)
  .output(updateStatusOutputSchema)
  .handler(updatePlatformOrganizerStatusHandler);
