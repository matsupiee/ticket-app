import { z } from "zod";

import { upsertPerformanceHandler } from "../../../handlers/organizer-event/upsert-performance";
import { protectedProcedure } from "../../../index";

const upsertPerformanceInputSchema = z.object({
  eventOrganizerId: z.string().min(1),
  eventId: z.string().min(1),
  performanceId: z.string().min(1).optional(),
  name: z.string().min(1),
  venueId: z.string().min(1).optional(),
  venueName: z.string().min(1),
  doorsOpenAt: z.string().min(1),
  startsAt: z.string().min(1),
  admissionMethod: z.enum(["GENERAL_ADMISSION", "NUMBERED_ENTRY", "RESERVED_SEAT"]),
  seatLayoutId: z.string().min(1).optional(),
});

const mutationOutputSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const upsertPerformanceRoute = protectedProcedure
  .route({
    method: "PUT",
    path: "/organizer/events/{eventId}/performances",
    summary: "Upsert event performance",
  })
  .input(upsertPerformanceInputSchema)
  .output(mutationOutputSchema)
  .handler(upsertPerformanceHandler);
